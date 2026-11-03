
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { rememberCategory } from './categories.js';

const router = Router();

const uploadDir = path.resolve('uploads/products');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed.'));
    }
  },
});

const fields = (body) => ({
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim(),
  category: String(body.category || 'General').trim(),
  image_url: String(body.image_url || '').trim(),
  price: Number(body.price),
  variants: String(body.variants || '').trim(),
});

function validate(p, files = []) {
  if (p.name.length < 2) return 'Product name must be at least 2 characters.';
  if (!p.category) return 'Category is required.';
  if (p.variants) {
    try {
      const variants = JSON.parse(p.variants);
      if (!Array.isArray(variants)) return 'Variants must be a JSON array.';
      for (const [index, variant] of variants.entries()) {
        const hasImage = String(variant.image_url || '').trim()
          || files.some((file) => file.fieldname === `variant_image_${index}`);
        if (!String(variant.name || '').trim() || !String(variant.sku || '').trim() ||
            !Number.isFinite(Number(variant.price)) || Number(variant.price) < 0 ||
            !Number.isInteger(Number(variant.stock)) || Number(variant.stock) < 0 ||
            !hasImage) {
          return 'Each variant needs a color, name, SKU, price, stock, and image.';
        }
      }
    } catch {
      return 'Variants must be valid JSON.';
    }
  }
  return null;
}

async function syncVariants(productId, product, files = []) {
  const parsed = product.variants
    ? JSON.parse(product.variants)
    : [];

  if (!parsed.length) throw Object.assign(new Error('Add at least one variant.'), { status: 400 });
  await pool.query('DELETE FROM product_variants WHERE product_id = $1', [productId]);
  for (const [index, variant] of parsed.entries()) {
    const uploadedFile = files.find((file) => file.fieldname === `variant_image_${index}`);
    const uploadedImage = uploadedFile
      ? `/uploads/products/${uploadedFile.filename}`
      : String(variant.image_url || '').trim();
    await pool.query(
      `INSERT INTO product_variants (product_id, color, name, sku, price, stock, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [productId, String(variant.color || '').trim(), String(variant.name).trim(),
        String(variant.sku).trim(), Number(variant.price), Number(variant.stock), uploadedImage]
    );
  }
  await pool.query(
    `WITH first_variant AS (
       SELECT price, image_url
       FROM product_variants
       WHERE product_id = $1
       ORDER BY id
       LIMIT 1
     ),
     totals AS (
       SELECT COALESCE(SUM(stock), 0)::int AS stock
       FROM product_variants
       WHERE product_id = $1
     )
     UPDATE products
     SET price = first_variant.price,
         stock = totals.stock,
         updated_at = NOW()
     FROM first_variant, totals
     WHERE products.id = $1`,
    [productId]
  );
}

const variantSelect = `COALESCE(
  (SELECT json_agg(json_build_object(
    'id', v.id, 'color', v.color, 'name', v.name, 'sku', v.sku,
    'price', v.price::float, 'stock', v.stock, 'image_url', v.image_url
    ) ORDER BY v.id) FROM product_variants v WHERE v.product_id = p.id),
  '[]'
) AS variants`;

router.get('/', async (req, res, next) => {
  try {
    const q = `%${String(req.query.q || '').trim()}%`;
    const category = String(req.query.category || '').trim();

    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.description, p.category, p.price::float AS price,
              p.image_url,
              COALESCE(SUM(v.stock), p.stock)::int AS stock,
              p.low_stock_threshold,
              COALESCE(SUM(v.stock), p.stock)::int <= p.low_stock_threshold AS low_stock,
              p.created_at, ${variantSelect}
       FROM products p LEFT JOIN product_variants v ON v.product_id = p.id
       WHERE (p.name ILIKE $1 OR p.description ILIKE $1)
         AND ($2 = '' OR p.category = $2)
       GROUP BY p.id
       ORDER BY p.created_at DESC, p.id DESC`,
      [q, category]
    );

    res.json({ products: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/inventory/adjustments', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ia.id, ia.variant_id, p.name AS product_name, v.name AS variant_name,
              ia.quantity_delta, ia.reason, ia.order_id, ia.created_at
       FROM inventory_adjustments ia
       JOIN product_variants v ON v.id = ia.variant_id
       JOIN products p ON p.id = v.product_id
       ORDER BY ia.created_at DESC
       LIMIT 200`
    );
    res.json({ adjustments: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.description, p.category, p.price::float AS price,
              p.image_url,
              COALESCE(SUM(v.stock), p.stock)::int AS stock,
              p.low_stock_threshold,
              COALESCE(SUM(v.stock), p.stock)::int <= p.low_stock_threshold AS low_stock,
              ${variantSelect}
       FROM products p LEFT JOIN product_variants v ON v.product_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [req.params.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ product: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  authenticate,
  requireAdmin,
  upload.any(),
  async (req, res, next) => {
    try {
      const p = fields(req.body);
      const mainImage = req.files?.find((file) => file.fieldname === 'product_image');
      if (mainImage) p.image_url = `/uploads/products/${mainImage.filename}`;
      const error = validate(p, req.files);

      if (error) return res.status(400).json({ message: error });

      const { rows } = await pool.query(
        `INSERT INTO products
          (name, description, category, price, image_url, stock)
         VALUES ($1, $2, $3, 0, $4, 0)
         RETURNING *`,
        [p.name, p.description, p.category, p.image_url]
      );
      await syncVariants(rows[0].id, p, req.files);
      await rememberCategory(p.category);
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'Product created', 'product', $2, $3)`,
        [req.user.id, rows[0].id, p.name]
      );

      res.status(201).json({ product: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  upload.any(),
  async (req, res, next) => {
    try {
      const p = fields(req.body);
      const mainImage = req.files?.find((file) => file.fieldname === 'product_image');
      if (mainImage) p.image_url = `/uploads/products/${mainImage.filename}`;
      const error = validate(p, req.files);

      if (error) return res.status(400).json({ message: error });

      const { rows } = await pool.query(
        `UPDATE products
         SET name = $1,
             description = $2,
             category = $3,
             price = 0,
             image_url = CASE WHEN $4 <> '' THEN $4 ELSE image_url END,
             stock = 0,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          p.name, p.description, p.category, p.image_url,
          req.params.id,
        ]
      );

      if (!rows[0]) {
        return res.status(404).json({ message: 'Product not found.' });
      }

      await syncVariants(rows[0].id, p, req.files);
      await rememberCategory(p.category);
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'Product updated', 'product', $2, $3)`,
        [req.user.id, rows[0].id, p.name]
      );
      res.json({ product: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    await pool.query(
      `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, 'Product deleted', 'product', $2, $3)`,
      [req.user.id, result.rows[0].id, `Product #${result.rows[0].id}`]
    );

    res.json({ message: 'Product deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;