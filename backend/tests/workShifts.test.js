const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();
process.env.JWT_SECRET = 'uc24-isolated-test-secret';

const User = require('../models/User');
const ShopSetting = require('../models/ShopSetting');

test('UC24 configures three non-overlapping shifts in shop settings', async (t) => {
  const dbName = `aura_cafe_uc24_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', {
    dbName, serverSelectionTimeoutMS: 5000
  });

  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/authRoutes'));
  app.use('/api/work-shifts', require('../routes/workShiftRoutes'));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_uc24_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop a database outside the UC24 test namespace');
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

  const passwordHash = await bcrypt.hash('test-password', 4);
  const admin = await User.create({ fullName: 'UC24 Admin', phone: '0999000031', email: 'test-0999000031@example.com', passwordHash, role: 'ADMIN' });
  const staff = await User.create({ fullName: 'UC24 Staff', phone: '0999000032', email: 'test-0999000032@example.com', passwordHash, role: 'STAFF', position: 'CASHIER' });
  const customer = await User.create({ fullName: 'UC24 Customer', phone: '0999000033', email: 'test-0999000033@example.com', passwordHash, role: 'CUSTOMER' });
  const tokenFor = async (user) => (await request('POST', '/api/auth/login', { email: user.email, password: 'test-password' })).data.token;
  const adminToken = await tokenFor(admin);
  const staffToken = await tokenFor(staff);
  const customerToken = await tokenFor(customer);

  assert.equal((await request('GET', '/api/work-shifts')).status, 401);
  assert.equal((await request('GET', '/api/work-shifts', null, customerToken)).status, 403);
  const defaults = await request('GET', '/api/work-shifts', null, staffToken);
  assert.equal(defaults.status, 200);
  assert.deepEqual(defaults.data.shifts.map((shift) => `${shift.startTime}-${shift.endTime}`), ['07:00-12:00', '12:00-17:00', '17:00-22:00']);
  assert.equal(await ShopSetting.countDocuments(), 0);

  const shifts = [
    { code: 'MORNING', startTime: '06:30', endTime: '11:30' },
    { code: 'AFTERNOON', startTime: '11:30', endTime: '17:30' },
    { code: 'EVENING', startTime: '17:30', endTime: '22:30' }
  ];
  assert.equal((await request('PUT', '/api/work-shifts', { shifts }, staffToken)).status, 403);
  assert.equal((await request('PUT', '/api/work-shifts', { shifts: shifts.slice(0, 2) }, adminToken)).status, 400);
  assert.equal((await request('PUT', '/api/work-shifts', { shifts: [shifts[0], shifts[0], shifts[2]] }, adminToken)).status, 400);
  assert.equal((await request('PUT', '/api/work-shifts', { shifts: [{ ...shifts[0], endTime: '11:99' }, shifts[1], shifts[2]] }, adminToken)).status, 400);
  assert.equal((await request('PUT', '/api/work-shifts', { shifts: [shifts[0], { ...shifts[1], startTime: '11:00' }, shifts[2]] }, adminToken)).status, 400);
  assert.equal(await ShopSetting.countDocuments(), 0);

  const saved = await request('PUT', '/api/work-shifts', { shifts }, adminToken);
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.data.shifts.map((shift) => shift.code), ['MORNING', 'AFTERNOON', 'EVENING']);
  assert.equal((await ShopSetting.findOne({ settingKey: 'shift_morning' })).settingValue, '06:30-11:30');
  assert.equal((await ShopSetting.findOne({ settingKey: 'shift_afternoon' })).settingValue, '11:30-17:30');
  assert.equal((await ShopSetting.findOne({ settingKey: 'shift_evening' })).settingValue, '17:30-22:30');
  assert.equal((await request('GET', '/api/work-shifts', null, staffToken)).data.shifts[2].endTime, '22:30');
  const changed = await request('PUT', '/api/work-shifts', { shifts: [{ ...shifts[0], startTime: '07:00' }, shifts[1], shifts[2]] }, adminToken);
  assert.equal(changed.status, 200);
  assert.equal((await ShopSetting.findOne({ settingKey: 'shift_morning' })).settingValue, '07:00-11:30');
  assert.equal(await ShopSetting.countDocuments(), 3);
  await t.test('weekly custom shifts validate overlaps, copy and protect assigned or past frames', async () => {
    const { currentWeek } = require('../utils/weeklyShifts');
    const weekStart = currentWeek().toISOString().slice(0, 10);
    const body = { weekStart, shiftName: 'Ca mở cửa', startTime: '06:00', endTime: '10:00' };
    assert.equal((await request('POST', '/api/work-shifts', body, staffToken)).status, 403);
    const created = await request('POST', '/api/work-shifts', body, adminToken);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.equal((await request('POST', '/api/work-shifts', body, adminToken)).status, 409);
    assert.equal((await request('POST', '/api/work-shifts', { ...body, shiftName: 'Trùng giờ', startTime: '09:00' }, adminToken)).status, 409);
    assert.equal((await request('POST', '/api/work-shifts', { ...body, endTime: '05:00' }, adminToken)).status, 400);
    assert.equal((await request('GET', `/api/work-shifts?weekStart=${weekStart}`, null, staffToken)).data.shifts.length, 1);
    const path = `/api/work-shifts/${created.data._id}`;
    assert.equal((await request('PUT', path, { ...body, shiftName: 'Ca sáng linh hoạt' }, adminToken)).status, 200);
    const WorkSchedule = require('../models/WorkSchedule');
    const assigned = await WorkSchedule.create({ user: staff._id, workDate: new Date(weekStart), shiftName: 'Ca sáng linh hoạt' });
    assert.equal((await request('PUT', path, body, adminToken)).status, 409);
    assert.equal((await request('DELETE', path, null, adminToken)).status, 409);
    const next = currentWeek(); next.setUTCDate(next.getUTCDate() + 7);
    const target = { weekStart: next.toISOString().slice(0, 10) };
    const copied = await request('POST', '/api/work-shifts/copy', target, adminToken);
    assert.equal(copied.status, 201);
    assert.equal(copied.data.shifts[0].name, 'Ca sáng linh hoạt');
    assert.equal((await request('POST', '/api/work-shifts/copy', target, adminToken)).status, 409);
    await assigned.deleteOne();
    assert.equal((await request('DELETE', path, null, adminToken)).status, 200);
    const past = currentWeek(); past.setUTCDate(past.getUTCDate() - 7);
    const historic = await require('../models/WorkShift').create({ ...body, weekStart: past });
    assert.equal((await request('DELETE', `/api/work-shifts/${historic._id}`, null, adminToken)).status, 409);
    assert.equal((await request('POST', '/api/work-shifts', { ...body, weekStart: past.toISOString().slice(0, 10) }, adminToken)).status, 409);
  });
});
