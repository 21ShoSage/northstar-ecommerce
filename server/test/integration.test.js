import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import app from '../src/app.js';
import { pool } from '../src/db/pool.js';

let server;
let baseUrl;
let customer;
let adminToken;
let product;
let variant;
let orderId;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  return { response, data };
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  const email = `test-${Date.now()}@example.com`;
  const registration = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Integration',
      last_name: 'Tester',
      email,
      password: 'Testing1!',
      confirmPassword: 'Testing1!',
      address: '123 Test Street, Manila',
      phone: '09171234567',
      birthday: '1990-01-01'
    })
  });
  assert.equal(registration.response.status, 201);
  customer = { id: registration.data.user.id, email };

  const admin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@northstar.local', password: 'Admin123!' })
  });
  assert.equal(admin.response.status, 200);
  adminToken = admin.data.token;

  const products = await request('/products');
  assert.equal(products.response.status, 200);
  product = products.data.products.find((item) => item.stock > 0);
  assert.ok(product);
  variant = product.variants[0];
});

after(async () => {
  if (orderId) {
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
  }
  if (customer?.id) {
    await pool.query('DELETE FROM users WHERE id = $1', [customer.id]);
  }
  await pool.end();
  await new Promise((resolve) => server.close(resolve));
});

test('rejects invalid login credentials safely', async () => {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: customer.email, password: 'Wrong1!' })
  });
  assert.equal(result.response.status, 401);
  assert.equal(result.data.message, 'Email or password is incorrect.');
});

test('rejects invalid registration and reset tokens', async () => {
  const registration = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Bad',
      last_name: 'Input',
      email: `bad-${Date.now()}@example.com`,
      password: 'weak',
      confirmPassword: 'weak',
      address: '123 Test Street, Manila',
      phone: '09171234567',
      birthday: '1990-01-01'
    })
  });
  assert.equal(registration.response.status, 400);
  assert.match(registration.data.message, /at least 8 characters/i);

  const reset = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: 'invalid-token',
      password: 'Testing1!',
      confirmPassword: 'Testing1!'
    })
  });
  assert.equal(reset.response.status, 400);
  assert.match(reset.data.message, /invalid/i);
});

test('supports address CRUD and default selection', async () => {
  const created = await request('/auth/addresses', {
    method: 'POST',
    token: (await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: customer.email, password: 'Testing1!' })
    })).data.token,
    body: JSON.stringify({
      label: 'Work',
      recipient_name: 'Integration Tester',
      phone: '09171234567',
      address_line: '456 Work Avenue, Manila'
    })
  });
  assert.equal(created.response.status, 201);
  const token = (await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: customer.email, password: 'Testing1!' })
  })).data.token;
  const updated = await request(`/auth/addresses/${created.data.address.id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify({
      label: 'Work',
      recipient_name: 'Integration Tester',
      phone: '09171234567',
      address_line: '789 Updated Avenue, Manila',
      is_default: true
    })
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.address.is_default, true);
  const deleted = await request(`/auth/addresses/${created.data.address.id}`, {
    method: 'DELETE',
    token
  });
  assert.equal(deleted.response.status, 200);
});

test('creates an order, reduces stock, and records status history', async () => {
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: customer.email, password: 'Testing1!' })
  });
  const beforeStock = variant.stock;
  const created = await request('/orders', {
    method: 'POST',
    token: login.data.token,
    body: JSON.stringify({
      customer_name: 'Integration Tester',
      shipping_address: '123 Test Street, Manila',
      phone: '09171234567',
      items: [{ product_id: product.id, variant_id: variant.id, quantity: 1 }]
    })
  });
  assert.equal(created.response.status, 201);
  orderId = created.data.order.id;
  assert.equal(Number(created.data.order.shipping_fee), 100);

  const afterProduct = await request(`/products/${product.id}`);
  const afterVariant = afterProduct.data.product.variants.find((item) => item.id === variant.id);
  assert.equal(afterVariant.stock, beforeStock - 1);

  const status = await request(`/orders/${orderId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: JSON.stringify({ status: 'Processing' })
  });
  assert.equal(status.response.status, 200);

  const orders = await request('/orders/my', { token: login.data.token });
  const order = orders.data.orders.find((item) => item.id === orderId);
  assert.deepEqual(order.status_history.map((item) => item.status), ['Pending', 'Processing']);
});
