import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from './pool.js';

dotenv.config();
const here = path.dirname(fileURLToPath(import.meta.url));
try {
  const schema = await fs.readFile(path.resolve(here, '../../sql/schema.sql'), 'utf8');
  await pool.query(schema);

  const adminEmail = 'admin@northstar.local';
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash('Admin123!', 12);
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Store Administrator', adminEmail, hash, 'admin']
    );
  }

  const products = [
    ['Everyday Backpack', 'A durable everyday backpack with a padded laptop sleeve.', 'Accessories', 1299.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', 25],
    ['Wireless Headphones', 'Comfortable wireless headphones for work and travel.', 'Electronics', 1899.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', 18],
    ['Classic Wristwatch', 'Minimal analog watch with a clean, timeless design.', 'Accessories', 2499.00, 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80', 12],
    ['Ceramic Coffee Mug', 'A sturdy ceramic mug for your daily coffee or tea.', 'Home', 299.00, '', 40],
    ['Desk Lamp', 'Warm, adjustable desk lighting for your workspace.', 'Home', 899.00, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80', 16],
    ['Running Sneakers', 'Lightweight everyday trainers with a cushioned sole.', 'Fashion', 2199.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', 20]
  ];
  for (const p of products) {
    const result = await pool.query('SELECT id FROM products WHERE name = $1', [p[0]]);
    if (!result.rowCount) {
      await pool.query(
        'INSERT INTO products (name, description, category, price, image_url, stock) VALUES ($1,$2,$3,$4,$5,$6)',
        p
      );
    }
  }
  console.log('Database schema is ready. Demo admin: admin@northstar.local / Admin123!');
} catch (error) {
  console.error('Database setup failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
