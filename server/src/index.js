import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import path from 'node:path';

dotenv.config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('tinuga')) {
  console.warn('WARNING: Set a unique JWT_SECRET in server/.env before using this app beyond local testing.');
}
const app = express();
app.use('/uploads', express.static(path.resolve('uploads')));
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRoutes);
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch { res.status(503).json({ status: 'error', database: 'unavailable' }); }
});
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use((req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === '23505') return res.status(409).json({ message: 'A record with that value already exists.' });
  res.status(500).json({ message: 'Unexpected server error.' });
});
const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`Northstar Store API listening on http://localhost:${port}`));
