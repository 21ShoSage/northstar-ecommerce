
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

const fields = (body, uploadedImage = '') => ({
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim(),
  category: String(body.category || 'General').trim(),
  price: Number(body.price),
  image_url: uploadedImage || String(body.image_url || '').trim(),
  stock: Number(body.stock),
});

function validate(p) {
  if (p.name.length < 2) return 'Product name must be at least 2 characters.';
  if (!Number.isFinite(p.price) || p.price < 0)
    return 'Price must be zero or greater.';
  if (!Number.isInteger(p.stock) || p.stock < 0)
    return 'Stock must be a whole number zero or greater.';
  if (!p.category) return 'Category is required.';
  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const q = `%${String(req.query.q || '').trim()}%`;
    const category = String(req.query.category || '').trim();

    const { rows } = await pool.query(
      `SELECT id, name, description, category, price::float AS price,
              image_url, stock, created_at
       FROM products
       WHERE (name ILIKE $1 OR description ILIKE $1)
         AND ($2 = '' OR category = $2)
       ORDER BY created_at DESC, id DESC`,
      [q, category]
    );

    res.json({ products: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, category, price::float AS price,
              image_url, stock
       FROM products WHERE id = $1`,
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
  upload.single('product_image'),
  async (req, res, next) => {
    try {
      const uploadedImage = req.file
        ? `/uploads/products/${req.file.filename}`
        : '';

      const p = fields(req.body, uploadedImage);
      const error = validate(p);

      if (error) return res.status(400).json({ message: error });

      const { rows } = await pool.query(
        `INSERT INTO products
          (name, description, category, price, image_url, stock)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [p.name, p.description, p.category, p.price, p.image_url, p.stock]
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
  upload.single('product_image'),
  async (req, res, next) => {
    try {
      const uploadedImage = req.file
        ? `/uploads/products/${req.file.filename}`
        : '';

      const p = fields(req.body, uploadedImage);
      const error = validate(p);

      if (error) return res.status(400).json({ message: error });

      const { rows } = await pool.query(
        `UPDATE products
         SET name = $1,
             description = $2,
             category = $3,
             price = $4,
             image_url = CASE
               WHEN $5 <> '' THEN $5
               ELSE image_url
             END,
             stock = $6,
             updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          p.name,
          p.description,
          p.category,
          p.price,
          p.image_url,
          p.stock,
          req.params.id,
        ]
      );

      if (!rows[0]) {
        return res.status(404).json({ message: 'Product not found.' });
      }

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

    res.json({ message: 'Product deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;