const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'server-routing-isolated-test-secret';
const app = require('../server');
const User = require('../models/User');
const Order = require('../models/Order');

test('actual server mounts existing API routers and protects customer orders', async (t) => {
  const dbName = `aura_cafe_routing_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  let server;
  t.after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (!/^aura_cafe_routing_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) throw new Error('Refusing to drop non-test database');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (path, token) => {
    const response = await fetch(base + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { status: response.status, data: await response.json() };
  };
  const admin = await User.create({ fullName: 'Routing Admin', phone: '0999988001', passwordHash: 'unused-test-hash', role: 'ADMIN' });
  const customer = await User.create({ fullName: 'Routing Customer', phone: '0999988002', passwordHash: 'unused-test-hash', role: 'CUSTOMER' });
  const other = await User.create({ fullName: 'Other Customer', phone: '0999988003', passwordHash: 'unused-test-hash', role: 'CUSTOMER' });
  const tokenFor = user => jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const adminToken = tokenFor(admin), customerToken = tokenFor(customer);
  await Order.create([
    { orderCode: 'ROUTING-OWN', customer: customer._id, orderType: 'TAKEAWAY', totalAmount: 0, finalAmount: 0 },
    { orderCode: 'ROUTING-OTHER', customer: other._id, orderType: 'TAKEAWAY', totalAmount: 0, finalAmount: 0 }
  ]);
  for (const path of ['/api/orders', '/api/cart', '/api/payments', '/api/rewards', '/api/loyalty-transactions', '/api/customer-reviews', '/api/ingredients', '/api/suppliers', '/api/product-ingredients', '/api/inventory-transactions', '/api/purchase-orders', '/api/reports']) {
    assert.equal((await get(path)).status, 401, `Protected router ${path}`);
  }
  for (const path of ['/api/categories', '/api/products', '/api/shop-settings', '/api/payments/config']) {
    assert.equal((await get(path)).status, 200, `Public router ${path}`);
  }
  for (const path of ['/api/users', '/api/employees', '/api/orders', '/api/payments', '/api/ingredients', '/api/suppliers', '/api/product-ingredients', '/api/inventory-transactions', '/api/purchase-orders', '/api/purchase-orders/restock-overview', '/api/work-shifts', '/api/work-schedules?weekStart=2026-10-19', '/api/loyalty-transactions/rules', '/api/customer-reviews', '/api/reports?startDate=2026-10-01&endDate=2026-10-31']) {
    assert.equal((await get(path, adminToken)).status, 200, `Mounted admin router ${path}`);
  }
  const orders = await get('/api/orders', customerToken);
  assert.equal(orders.status, 200);
  assert.deepEqual(orders.data.map(order => order.orderCode), ['ROUTING-OWN']);
  assert.equal((await get('/api/orders', adminToken)).data.length, 2);
  assert.equal((await get('/api/cart', customerToken)).status, 200);
  assert.equal((await get('/api/rewards', customerToken)).status, 200);
  assert.equal((await get('/api/loyalty-transactions', customerToken)).status, 200);
  assert.equal((await get('/api/payments', customerToken)).status, 403);
  assert.equal((await get('/api/suppliers', customerToken)).status, 403);
});
