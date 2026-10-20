const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();
process.env.JWT_SECRET = 'uc26-isolated-test-secret';

const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const ShopSetting = require('../models/ShopSetting');

test('UC26 records own attendance once and lets admin review and mark absence', async (t) => {
  const dbName = `aura_cafe_uc26_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', {
    dbName, serverSelectionTimeoutMS: 5000
  });
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/authRoutes'));
  app.use('/api/work-schedules', require('../routes/workScheduleRoutes'));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_uc26_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop a database outside the UC26 test namespace');
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
  const admin = await User.create({ fullName: 'Admin', phone: '0999000051', email: 'test-0999000051@example.com', passwordHash: hash, role: 'ADMIN' });
  const staffA = await User.create({ fullName: 'Staff A', phone: '0999000052', email: 'test-0999000052@example.com', passwordHash: hash, role: 'STAFF', position: 'CASHIER' });
  const staffB = await User.create({ fullName: 'Staff B', phone: '0999000053', email: 'test-0999000053@example.com', passwordHash: hash, role: 'STAFF', position: 'BARISTA' });
  const shipper = await User.create({ fullName: 'Shipper', phone: '0999000055', email: 'test-0999000055@example.com', passwordHash: hash, role: 'STAFF', position: 'SHIPPER' });
  const customer = await User.create({ fullName: 'Customer', phone: '0999000054', email: 'test-0999000054@example.com', passwordHash: hash, role: 'CUSTOMER' });
  const tokenFor = async (user) => (await request('POST', '/api/auth/login', { email: user.email, password: 'test-password' })).data.token;
  const adminToken = await tokenFor(admin);
  const aToken = await tokenFor(staffA);
  const bToken = await tokenFor(staffB);
  const shipperToken = await tokenFor(shipper);
  const customerToken = await tokenFor(customer);
  const vnNow = new Date(Date.now() + 7 * 3600000);
  const today = vnNow.toISOString().slice(0, 10);
  const yesterdayDate = new Date(vnNow);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const tomorrowDate = new Date(vnNow);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  const localMinutes = vnNow.getUTCHours() * 60 + vnNow.getUTCMinutes();
  await ShopSetting.create({ settingKey: 'shift_morning', settingValue: localMinutes < 720 ? '23:00-23:59' : '00:00-01:00' });
  const own = await WorkSchedule.create({ user: staffA._id, workDate: new Date(today), shiftName: 'MORNING' });
  const other = await WorkSchedule.create({ user: staffB._id, workDate: new Date(today), shiftName: 'MORNING' });
  const missed = await WorkSchedule.create({ user: staffA._id, workDate: new Date(yesterday), shiftName: 'MORNING' });
  const future = await WorkSchedule.create({ user: staffA._id, workDate: new Date(tomorrow), shiftName: 'MORNING' });
  const query = `?from=${yesterday}&to=${tomorrow}`;

  assert.equal((await request('GET', `/api/work-schedules/attendance${query}`)).status, 401);
  assert.equal((await request('GET', `/api/work-schedules/attendance${query}`, null, customerToken)).status, 403);
  assert.equal((await request('GET', '/api/work-schedules/attendance?from=2026-01-01&to=2026-02-10', null, adminToken)).status, 400);
  assert.equal((await request('GET', `/api/work-schedules/attendance${query}&userId=${staffB._id}`, null, adminToken)).data.length, 1);
  assert.equal((await request('GET', `/api/work-schedules/attendance${query}`, null, adminToken)).data.length, 4);
  assert.equal((await request('GET', `/api/work-schedules/attendance${query}&userId=${staffB._id}`, null, aToken)).data.length, 3);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_OUT' }, aToken)).status, 409);
  const shipperSchedule = await WorkSchedule.create({ user: shipper._id, workDate: new Date(today), shiftName: 'MORNING', status: 'PRESENT', checkInTime: new Date() });
  assert.equal((await request('PUT', `/api/work-schedules/${shipperSchedule._id}/shift-action`, { action: 'REMIT_COD', cash: 100 }, aToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${shipperSchedule._id}/shift-action`, { action: 'REMIT_COD', cash: 100.5 }, shipperToken)).status, 400);
  const remitted = await request('PUT', `/api/work-schedules/${shipperSchedule._id}/shift-action`, { action: 'REMIT_COD', cash: 100000, note: 'Đã nộp quỹ' }, shipperToken);
  assert.equal(remitted.status, 200);
  assert.equal(remitted.data.expectedCash, 0);
  assert.equal(remitted.data.schedule.endingCashActual, 100000);
  assert.equal((await request('PUT', `/api/work-schedules/${shipperSchedule._id}/shift-action`, { action: 'REMIT_COD', cash: 100000 }, shipperToken)).status, 409);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, bToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, adminToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${future._id}/shift-action`, { action: 'CHECK_IN' }, aToken)).status, 409);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN', status: 'COMPLETED' }, aToken)).status, 400);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, aToken)).status, 409);
  await ShopSetting.updateOne({ settingKey: 'shift_morning' }, { $set: { settingValue: '00:00-23:59' } });
  const checkedIn = await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, aToken);
  assert.equal(checkedIn.status, 200);
  assert.ok(checkedIn.data.schedule.checkInTime);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, aToken)).status, 409);
  const checkedOut = await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_OUT' }, aToken);
  assert.equal(checkedOut.status, 200);
  assert.ok(checkedOut.data.schedule.checkOutTime);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_OUT' }, aToken)).status, 409);
  assert.equal((await request('PATCH', `/api/work-schedules/${missed._id}/absence`, null, aToken)).status, 403);
  assert.equal((await request('PATCH', `/api/work-schedules/${future._id}/absence`, null, adminToken)).status, 409);
  assert.equal((await request('PATCH', `/api/work-schedules/${own._id}/absence`, null, adminToken)).status, 409);
  const absent = await request('PATCH', `/api/work-schedules/${missed._id}/absence`, null, adminToken);
  assert.equal(absent.status, 200);
  assert.equal(absent.data.status, 'ABSENT');
  assert.equal((await request('PATCH', `/api/work-schedules/${missed._id}/absence`, null, adminToken)).status, 409);
  assert.equal((await WorkSchedule.findById(other._id)).status, 'SCHEDULED');
});
