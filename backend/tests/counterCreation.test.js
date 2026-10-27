const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ quiet: true });
process.env.JWT_SECRET = 'counter-creation-test';
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');

test('Counter creation preserves independent customized lines and persisted customers', async t => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName: `cafe_counter_creation_test_${randomBytes(6).toString('hex')}`, serverSelectionTimeoutMS: 5000 });
  const app = express(); app.use(express.json()); app.use('/api/orders', require('../routes/orderRoutes')); app.use('/api/users', require('../routes/userRoutes'));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^cafe_counter_creation_test_[a-f0-9]{12}$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const cashier = await User.create({ fullName: 'Cashier', phone: '0999555001', passwordHash: 'unused', role: 'STAFF', position: 'CASHIER' });
  const barista = await User.create({ fullName: 'Barista', phone: '0999555002', passwordHash: 'unused', role: 'STAFF', position: 'BARISTA' });
  const token = jwt.sign({ id: cashier._id }, process.env.JWT_SECRET), baristaToken = jwt.sign({ id: barista._id }, process.env.JWT_SECRET);
  const request = async (path, body, auth = token) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const category = await Category.create({ name: 'Coffee' });
  const product = await Product.create({ category: category._id, name: 'Coffee', basePrice: 30000, variantsConfig: { sizes: { M: 0, L: 10000 }, toppings: [{ name: 'Pearl', price: 5000 }] }, isAvailable: true });
  const customer = await request('/api/users/customers', { fullName: 'New counter customer', phone: '0999555003' });
  assert.equal(customer.status, 201); assert.ok(customer.data.customer._id);
  const payload = { orderType: 'DINE_IN', tableNumber: 'T01', customerId: customer.data.customer._id, expectedTotal: 95000,
    items: [{ productId: String(product._id), size: 'M', quantity: 1, unitPrice: 1, customization: { size: 'M', sugar: '0%', ice: 'Ít đá', topping: ['Pearl'], note: ' first cup ' } },
      { productId: String(product._id), size: 'M', quantity: 2, customization: { size: 'M', sugar: '100%', ice: 'Không đá' } }] };
  await t.test('Reject unauthorized creation, missing table, wrong customer and stale catalog total', async () => {
    assert.equal((await request('/api/orders', payload, baristaToken)).status, 403);
    for (const patch of [{ tableNumber: ' ' }, { customerId: String(cashier._id) }, { items: [{ ...payload.items[0], quantity: 100 }] }, { items: [{ ...payload.items[0], customization: { topping: ['Unknown'] } }] }]) {
      assert.equal((await request('/api/orders', { ...payload, ...patch })).status, 400);
    }
    assert.equal((await request('/api/orders', { ...payload, expectedTotal: 1 })).status, 409);
    assert.equal(await Order.countDocuments(), 0);
  });
  await t.test('Server price and every item option survive order/payment persistence', async () => {
    const created = await request('/api/orders', payload); assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.equal(created.data.finalAmount, 95000); assert.equal(created.data.items.length, 2);
    assert.equal(created.data.items[0].customization.sugar, '0%'); assert.equal(created.data.items[1].customization.sugar, '100%');
    assert.deepEqual(created.data.items[0].customization.topping, ['Pearl']); assert.equal(created.data.items[0].customization.note, 'first cup');
    assert.equal(created.data.items[0].unitPrice, 35000); assert.equal(created.data.customer, customer.data.customer._id);
    const lines = await OrderItem.find({ order: created.data._id }); assert.equal(lines.length, 2);
    assert.equal(lines.reduce((sum, line) => sum + line.subtotal, 0), 95000);
    assert.equal((await Payment.findOne({ order: created.data._id })).amount, 95000);
  });
});
