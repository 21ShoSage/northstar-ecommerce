import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const DEFAULT_CATEGORIES = ['Accessories', 'Electronics', 'Home', 'Fashion', 'General'];

// Creates the categories table on first use, so the feature also works on
// databases that were set up before categories existed (no need to reset the DB).
let ready;
export function ensureCategories() {
  if (!ready) {
    ready = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(80) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_lower ON categories (LOWER(name))');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS category_initialization (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          seeded BOOLEAN NOT NULL DEFAULT FALSE
        )`);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'INSERT INTO category_initialization (id) VALUES (1) ON CONFLICT DO NOTHING'
        );
        const { rows } = await client.query(
          'SELECT seeded FROM category_initialization WHERE id = 1 FOR UPDATE'
        );
        if (!rows[0].seeded) {
          await client.query(
            `INSERT INTO categories (name)
             SELECT name FROM (
               SELECT UNNEST($1::text[]) AS name
               UNION
               SELECT DISTINCT category FROM products WHERE category <> ''
             ) c
             ON CONFLICT DO NOTHING`,
            [DEFAULT_CATEGORIES]
          );
          await client.query('UPDATE category_initialization SET seeded = TRUE WHERE id = 1');
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => { ready = undefined; throw error; });
  }
  return ready;
}

export async function rememberCategory(name) {
  await ensureCategories();
  await pool.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
}

router.get('/', async (_req, res, next) => {
  try {
    await ensureCategories();
    const { rows } = await pool.query(
      `SELECT c.id, c.name, COUNT(p.id)::int AS product_count
       FROM categories c LEFT JOIN products p ON p.category = c.name
       GROUP BY c.id ORDER BY c.id`
    );
    res.json({ categories: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: 'Category name must be 2 to 80 characters.' });
    }
    await ensureCategories();
    const { rows } = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id, name',
      [name]
    );
    if (!rows[0]) {
      return res.status(409).json({ message: `The category "${name}" already exists.` });
    }
    await pool.query(
      `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, 'Category created', 'category', $2, $3)`,
      [req.user.id, rows[0].id, name]
    );
    res.status(201).json({ category: { ...rows[0], product_count: 0 } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  const name = String(req.body.name || '').trim().replace(/\s+/g, ' ');
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Category id is invalid.' });
  }
  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ message: 'Category name must be 2 to 80 characters.' });
  }

  let client;
  let transaction = false;
  try {
    await ensureCategories();
    client = await pool.connect();
    await client.query('BEGIN');
    transaction = true;
    const existing = await client.query(
      'SELECT id, name FROM categories WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      transaction = false;
      return res.status(404).json({ message: 'Category not found.' });
    }

    const updated = await client.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name',
      [name, id]
    );
    const products = await client.query(
      'UPDATE products SET category = $1, updated_at = NOW() WHERE category = $2',
      [name, existing.rows[0].name]
    );
    await client.query(
      `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, 'Category updated', 'category', $2, $3)`,
      [req.user.id, id, `Renamed ${existing.rows[0].name} to ${name}`]
    );
    await client.query('COMMIT');
    transaction = false;
    res.json({
      category: { ...updated.rows[0], product_count: products.rowCount }
    });
  } catch (error) {
    if (transaction) await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ message: `The category "${name}" already exists.` });
    }
    next(error);
  } finally {
    client?.release();
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Category id is invalid.' });
  }

  let client;
  let transaction = false;
  try {
    await ensureCategories();
    client = await pool.connect();
    await client.query('BEGIN');
    transaction = true;
    const existing = await client.query(
      'SELECT id, name FROM categories WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      transaction = false;
      return res.status(404).json({ message: 'Category not found.' });
    }

    const productCount = await client.query(
      'SELECT COUNT(*)::int AS count FROM products WHERE category = $1',
      [existing.rows[0].name]
    );
    let fallback;
    if (productCount.rows[0].count > 0) {
      const available = await client.query(
        `SELECT id, name FROM categories
         WHERE id <> $1
         ORDER BY CASE WHEN LOWER(name) = 'general' THEN 0 ELSE 1 END, id
         LIMIT 1`,
        [id]
      );
      if (available.rows[0]) {
        fallback = available.rows[0];
      } else {
        const fallbackName = existing.rows[0].name.toLowerCase() === 'general'
          ? 'Uncategorized'
          : 'General';
        const created = await client.query(
          'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
          [fallbackName]
        );
        fallback = created.rows[0];
      }
      await client.query(
        'UPDATE products SET category = $1, updated_at = NOW() WHERE category = $2',
        [fallback.name, existing.rows[0].name]
      );
    }

    await client.query('DELETE FROM categories WHERE id = $1', [id]);
    await client.query(
      `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, 'Category deleted', 'category', $2, $3)`,
      [req.user.id, id, `Deleted ${existing.rows[0].name}`]
    );
    await client.query('COMMIT');
    transaction = false;
    res.json({
      message: 'Category deleted.',
      moved_products: productCount.rows[0].count,
      fallback_category: fallback || null
    });
  } catch (error) {
    if (transaction) await client.query('ROLLBACK');
    next(error);
  } finally {
    client?.release();
  }
});

export default router;
