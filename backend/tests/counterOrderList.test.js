const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ quiet: true });
process.env.JWT_SECRET = 'counter-list-test';
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');

test('Counter list authorization, details, filtering and refreshed orders', async t => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName: `cafe_counter_list_test_${randomBytes(6).toString('hex')}`, serverSelectionTimeoutMS: 5000 });
  const app = express(); app.use(express.json()); app.use('/api/orders', require('../routes/orderRoutes'));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^cafe_counter_list_test_[a-f0-9]{12}$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const users = await User.create([
    { fullName: 'Barista', phone: '0999888001', passwordHash: 'unused', role: 'STAFF', position: 'BARISTA' },
    { fullName: 'Cashier', phone: '0999888002', passwordHash: 'unused', role: 'STAFF', position: 'CASHIER' },
    { fullName: 'Customer', phone: '0999888003', passwordHash: 'unused', role: 'CUSTOMER' },
    { fullName: 'Shipper', phone: '0999888004', passwordHash: 'unused', role: 'STAFF', position: 'SHIPPER' },
  ]);
  const tokens = users.map(user => jwt.sign({ id: user._id }, process.env.JWT_SECRET));
  const get = async (token, query = '') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/orders/counter${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { status: response.status, data: await response.json() };
  };
  const category = await Category.create({ name: 'Test Coffee' });
  const product = await Product.create({ category: category._id, name: 'Coffee', basePrice: 30000, isAvailable: true });
  for (const type of ['DINE_IN', 'TAKEAWAY', 'ONLINE']) await Order.create({ orderCode: `TEST-${type}`, orderType: type, status: 'PREPARING', cashier: users[1]._id, customer: users[2]._id,
    totalAmount: 30000, finalAmount: 30000, tableNumber: type === 'DINE_IN' ? 'T01' : undefined,
    items: [{ product: product._id, productNameAtTime: 'Coffee', quantity: 1, unitPrice: 30000, subtotal: 30000, customization: { size: 'M', sugar: '0%' } }] });
  assert.equal((await get()).status, 401);
  assert.equal((await get(tokens[2])).status, 403); assert.equal((await get(tokens[3])).status, 403);
  const first = await get(tokens[0]); assert.equal(first.status, 200); assert.equal(first.data.length, 2);
  assert.ok(first.data.every(order => order.orderType !== 'ONLINE'));
  assert.equal(first.data[0].cashier.fullName, 'Cashier'); assert.equal(first.data[0].items[0].customization.sugar, '0%');
  assert.equal((await get(tokens[1], '?status=PREPARING')).data.length, 2);
  assert.equal((await get(tokens[0], '?status=READY')).data.length, 0);
  assert.equal((await get(tokens[0], '?status=DELIVERING')).status, 400);
  await Order.create({ orderCode: 'NEW-COUNTER', orderType: 'TAKEAWAY', status: 'PENDING', totalAmount: 0, finalAmount: 0 });
  const refreshed = await get(tokens[0]); assert.equal(refreshed.data.length, 3); assert.equal(refreshed.data[0].orderCode, 'NEW-COUNTER');
});
