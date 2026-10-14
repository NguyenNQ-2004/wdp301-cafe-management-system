const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();
process.env.JWT_SECRET = 'uc27-isolated-test-secret';

const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const WorkSchedule = require('../models/WorkSchedule');

test('UC27 reconciles only cashier cash payments and saves one printable snapshot', async (t) => {
  const dbName = `aura_cafe_uc27_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', {
    dbName, serverSelectionTimeoutMS: 5000
  });
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/authRoutes'));
  app.use('/api/payments', require('../routes/paymentRoutes'));
  app.use('/api/shift-handovers', require('../routes/shiftHandoverRoutes'));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_uc27_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop a database outside the UC27 test namespace');
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (method, path, body, token) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, data: await response.json() };
  };
  const hash = await bcrypt.hash('test-password', 4);
  const admin = await User.create({ fullName: 'Admin', phone: '0999000061', passwordHash: hash, role: 'ADMIN' });
  const cashierA = await User.create({ fullName: 'Cashier A', phone: '0999000062', passwordHash: hash, role: 'STAFF', position: 'CASHIER' });
  const cashierB = await User.create({ fullName: 'Cashier B', phone: '0999000063', passwordHash: hash, role: 'STAFF', position: 'CASHIER' });
  const barista = await User.create({ fullName: 'Barista', phone: '0999000064', passwordHash: hash, role: 'STAFF', position: 'BARISTA' });
  const customer = await User.create({ fullName: 'Customer', phone: '0999000065', passwordHash: hash, role: 'CUSTOMER' });
  const tokenFor = async (user) => (await request('POST', '/api/auth/login', { phone: user.phone, password: 'test-password' })).data.token;
  const adminToken = await tokenFor(admin);
  const aToken = await tokenFor(cashierA);
  const bToken = await tokenFor(cashierB);
  const baristaToken = await tokenFor(barista);
  const customerToken = await tokenFor(customer);

  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const start = new Date(Date.now() - 3600000);
  const makeOrder = async (code, amount, orderType = 'DINE_IN') => Order.create({
    orderCode: code, orderType, totalAmount: amount, finalAmount: amount, status: 'COMPLETED', cashier: cashierA._id
  });
  const makePending = async (code, amount) => Payment.create({ order: (await makeOrder(code, amount))._id, paymentMethod: 'CASH', amount, status: 'PENDING' });
  const cashA = await makePending('UC27-A', 50000);
  const cashB = await makePending('UC27-B', 30000);
  const bankA = await makePending('UC27-BANK', 20000);
  const paidA = await request('POST', `/api/payments/${cashA._id}/counter-confirm`, { paymentMethod: 'CASH' }, aToken);
  assert.equal(paidA.status, 200);
  assert.equal(String((await Payment.findById(cashA._id)).receivedBy), String(cashierA._id));
  assert.equal((await request('POST', `/api/payments/${cashB._id}/counter-confirm`, { paymentMethod: 'CASH' }, bToken)).status, 200);
  assert.equal((await request('POST', `/api/payments/${bankA._id}/counter-confirm`, { paymentMethod: 'BANK_TRANSFER', transactionCode: 'BANK-UC27' }, aToken)).status, 200);
  await Payment.create({ order: (await makeOrder('UC27-OLD', 7000))._id, paymentMethod: 'CASH', amount: 7000, status: 'SUCCESS', paidAt: new Date() });
  await Payment.create({ order: (await makeOrder('UC27-ONLINE', 90000, 'ONLINE'))._id, paymentMethod: 'CASH', amount: 90000, status: 'SUCCESS', paidAt: new Date(), receivedBy: cashierA._id });

  const end = new Date();
  const shiftA = await WorkSchedule.create({ user: cashierA._id, workDate: new Date(today), shiftName: 'MORNING', status: 'COMPLETED', checkInTime: start, checkOutTime: end, startingCash: 100000 });
  const shiftB = await WorkSchedule.create({ user: cashierB._id, workDate: new Date(today), shiftName: 'MORNING', status: 'COMPLETED', checkInTime: start, checkOutTime: end });
  const unfinished = await WorkSchedule.create({ user: cashierA._id, workDate: new Date(today), shiftName: 'AFTERNOON', status: 'PRESENT', checkInTime: start });
  const listPath = `/api/shift-handovers?from=${today}&to=${today}`;
  assert.equal((await request('GET', listPath)).status, 401);
  assert.equal((await request('GET', listPath, null, customerToken)).status, 403);
  assert.equal((await request('GET', listPath, null, baristaToken)).status, 403);
  assert.equal((await request('GET', listPath, null, aToken)).data.length, 2);
  assert.equal((await request('GET', listPath, null, adminToken)).data.length, 3);
  assert.equal((await request('GET', `/api/shift-handovers/${shiftA._id}`, null, bToken)).status, 403);
  assert.equal((await request('POST', `/api/shift-handovers/${shiftA._id}/confirm`, { actualCash: 149000 }, adminToken)).status, 403);
  assert.equal((await request('POST', `/api/shift-handovers/${unfinished._id}/confirm`, { actualCash: 0 }, aToken)).status, 409);
  const preview = await request('GET', `/api/shift-handovers/${shiftA._id}`, null, aToken);
  assert.equal(preview.status, 200);
  assert.equal(preview.data.ready, true);
  assert.equal(preview.data.openingCash, 100000);
  assert.equal(preview.data.cashRevenue, 50000);
  assert.equal(preview.data.paymentCount, 1);
  assert.equal(preview.data.unattributedCash, 7000);
  assert.equal(preview.data.expectedCash, 150000);
  assert.equal((await request('POST', `/api/shift-handovers/${shiftA._id}/confirm`, { actualCash: -1 }, aToken)).status, 400);
  assert.equal((await request('POST', `/api/shift-handovers/${shiftA._id}/confirm`, { actualCash: 149000, openingCash: 0 }, aToken)).status, 400);
  assert.equal((await request('POST', `/api/shift-handovers/${shiftA._id}/confirm`, { actualCash: 149000 }, aToken)).status, 400);
  const closed = await request('POST', `/api/shift-handovers/${shiftA._id}/confirm`, { actualCash: 149000, note: 'Thiếu 1.000đ' }, aToken);
  assert.equal(closed.status, 200);
  assert.equal(closed.data.difference, -1000);
  assert.equal(closed.data.handedOver, true);
  assert.ok(closed.data.handoverAt);
  assert.equal((await request('POST', `/api/shift-handovers/${shiftA._id}/confirm`, { actualCash: 150000 }, aToken)).status, 409);
  await Payment.create({ order: (await makeOrder('UC27-LATE', 10000))._id, paymentMethod: 'CASH', amount: 10000, status: 'SUCCESS', paidAt: new Date(start.getTime() + 1000), receivedBy: cashierA._id });
  const saved = await request('GET', `/api/shift-handovers/${shiftA._id}`, null, adminToken);
  assert.equal(saved.data.cashRevenue, 50000);
  assert.equal(saved.data.difference, -1000);
  assert.equal((await request('POST', `/api/shift-handovers/${shiftB._id}/confirm`, { actualCash: 80000 }, bToken)).status, 400);
  const second = await request('POST', `/api/shift-handovers/${shiftB._id}/confirm`, { openingCash: 50000, actualCash: 80000 }, bToken);
  assert.equal(second.status, 200);
  assert.equal(second.data.difference, 0);
});
