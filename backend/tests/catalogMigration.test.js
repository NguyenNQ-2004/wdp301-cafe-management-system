const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
require('dotenv').config();
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');

test('SWP public catalog ranks global sales without exposing orders and stores uploaded images', async t => {
  const dbName = `aura_catalog_migration_test_${randomBytes(5).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  const app = require('../server');
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^aura_catalog_migration_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const category = await Category.create({ name: 'Coffee' });
  const a = await Product.create({ name: 'Unlabelled best seller', category: category._id, basePrice: 30000 });
  const b = await Product.create({ name: 'Labelled but lower sales', category: category._id, basePrice: 40000, badge: 'BÁN CHẠY' });
  let index = 0;
  for (const [product, status, quantity] of [[a, 'CONFIRMED', 3], [a, 'COMPLETED', 8], [b, 'READY', 4], [b, 'PENDING', 90], [b, 'CANCELLED', 100]]) {
    await Order.create({ orderCode: `CAT-${index++}`, orderType: 'TAKEAWAY', status, totalAmount: 30000, finalAmount: 30000, items: [{ product: product._id, productNameAtTime: product.name, unitPrice: 30000, quantity, subtotal: 30000 * quantity }] });
  }
  const base = `http://127.0.0.1:${server.address().port}`;
  const catalog = await (await fetch(`${base}/api/products`)).json();
  assert.equal(catalog.find(row => row._id === String(a._id)).totalSold, 11);
  assert.equal(catalog.find(row => row._id === String(b._id)).totalSold, 4);
  for (const row of catalog) assert.equal(row.orders, undefined);
  const admin = await User.create({ fullName: 'Admin', phone: '0900000221', email: 'admin-migration@example.com', passwordHash: 'test-only', role: 'ADMIN' });
  const token = jwt.sign({ id: admin._id }, require('../config/jwtSecret')());
  const update = (path, body, auth = token) => fetch(`${base}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body) });
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l3sAAAAASUVORK5CYII=';
  assert.equal((await update(`/api/products/${a._id}`, { imageUrl: png }, '')).status, 401);
  assert.equal((await update(`/api/products/${a._id}`, { imageUrl: png })).status, 200);
  assert.equal((await Product.findById(a._id)).imageUrl, png);
  assert.equal((await update(`/api/categories/${category._id}`, { imageUrl: png })).status, 200);
  assert.equal((await Category.findById(category._id)).image_url, png);
  for (const imageUrl of ['data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)', 'data:image/png;base64,ZmFrZQ==']) {
    assert.equal((await update(`/api/products/${a._id}`, { imageUrl })).status, 400);
  }
});
