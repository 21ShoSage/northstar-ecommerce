import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

router.post('/', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const customerName = String(req.body.customer_name || '').trim();
    const address = String(req.body.shipping_address || '').trim();
    const phone = String(req.body.phone || '').trim();
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (customerName.length < 2 || address.length < 8 || phone.length < 7 || !items.length) {
      return res.status(400).json({ message: 'Provide your name, a complete shipping address, phone number, and at least one cart item.' });
    }
    await client.query('BEGIN');
    let total = 0;
    const checkedItems = [];
    for (const item of items) {
      const id = Number(item.product_id), quantity = Number(item.quantity);
      if (!Number.isInteger(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw Object.assign(new Error('One or more cart quantities are invalid.'), { status: 400 });
      const result = await client.query('SELECT id,name,price,stock FROM products WHERE id=$1 FOR UPDATE', [id]);
      const product = result.rows[0];
      if (!product) throw Object.assign(new Error('A product in your cart no longer exists.'), { status: 400 });
      if (product.stock < quantity) throw Object.assign(new Error(`Not enough stock for ${product.name}.`), { status: 409 });
      const price = Number(product.price);
      total += price * quantity;
      checkedItems.push({ ...product, quantity, price, lineTotal: price * quantity });
    }
    const orderResult = await client.query(
      'INSERT INTO orders (user_id,customer_name,shipping_address,phone,total) VALUES ($1,$2,$3,$4,$5) RETURNING id, status, total::float AS total, created_at',
      [req.user.id, customerName, address, phone, total.toFixed(2)]
    );
    const order = orderResult.rows[0];
    for (const item of checkedItems) {
      await client.query(
        'INSERT INTO order_items (order_id,product_id,product_name,unit_price,quantity,line_total) VALUES ($1,$2,$3,$4,$5,$6)',
        [order.id,item.id,item.name,item.price,item.quantity,item.lineTotal]
      );
      await client.query('UPDATE products SET stock=stock-$1,updated_at=NOW() WHERE id=$2', [item.quantity,item.id]);
    }
    await client.query('COMMIT');
    res.status(201).json({ order, message: 'Order placed successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not place your order.' });
  } finally { client.release(); }
});

router.get('/my', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id,o.customer_name,o.shipping_address,o.phone,o.status,o.total::float AS total,o.created_at,
       COALESCE(json_agg(json_build_object('product_name',oi.product_name,'unit_price',oi.unit_price::float,'quantity',oi.quantity,'line_total',oi.line_total::float))
       FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
       WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (error) { next(error); }
});

router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id,o.customer_name,o.shipping_address,o.phone,o.status,o.total::float AS total,o.created_at,u.email,
       COALESCE(json_agg(json_build_object('product_name',oi.product_name,'unit_price',oi.unit_price::float,'quantity',oi.quantity,'line_total',oi.line_total::float))
       FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN order_items oi ON oi.order_id=o.id
       GROUP BY o.id,u.email ORDER BY o.created_at DESC`
    );
    res.json({ orders: rows });
  } catch (error) { next(error); }
});

router.patch('/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body.status || '');
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Invalid order status.' });
    const { rows } = await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING id,status', [status,req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Order not found.' });
    res.json({ order: rows[0] });
  } catch (error) { next(error); }
});
export default router;
