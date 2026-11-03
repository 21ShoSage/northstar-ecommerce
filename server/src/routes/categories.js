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
      // Seed the defaults plus any category already used by a product.
      await pool.query(
        `INSERT INTO categories (name)
         SELECT name FROM (
           SELECT UNNEST($1::text[]) AS name
           UNION
           SELECT DISTINCT category FROM products WHERE category <> ''
         ) c
         ON CONFLICT DO NOTHING`,
        [DEFAULT_CATEGORIES]
      );
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

export default router;
