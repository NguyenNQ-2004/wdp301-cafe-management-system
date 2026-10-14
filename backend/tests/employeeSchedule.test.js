const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();
process.env.JWT_SECRET = 'uc25-isolated-test-secret';

const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');

test('UC25 assigns weekly shifts and keeps staff schedules private', async (t) => {
  const dbName = `aura_cafe_uc25_test_${randomBytes(4).toString('hex')}`;
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
    if (!/^aura_cafe_uc25_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop a database outside the UC25 test namespace');
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
  const admin = await User.create({ fullName: 'Admin', phone: '0999000041', passwordHash, role: 'ADMIN' });
  const staffA = await User.create({ fullName: 'Staff A', phone: '0999000042', passwordHash, role: 'STAFF', position: 'CASHIER' });
  const staffB = await User.create({ fullName: 'Staff B', phone: '0999000043', passwordHash, role: 'STAFF', position: 'BARISTA' });
  const inactive = await User.create({ fullName: 'Inactive', phone: '0999000044', passwordHash, role: 'STAFF', position: 'CASHIER', status: 'INACTIVE' });
  const customer = await User.create({ fullName: 'Customer', phone: '0999000045', passwordHash, role: 'CUSTOMER' });
  const tokenFor = async (user) => (await request('POST', '/api/auth/login', { phone: user.phone, password: 'test-password' })).data.token;
  const adminToken = await tokenFor(admin);
  const staffToken = await tokenFor(staffA);
  const otherToken = await tokenFor(staffB);
  const customerToken = await tokenFor(customer);
  const week = '?weekStart=2026-10-12';
  const payload = { userId: String(staffA._id), workDate: '2026-10-12', shiftName: 'MORNING', note: 'Quầy sáng' };

  assert.equal((await request('GET', `/api/work-schedules${week}`)).status, 401);
  assert.equal((await request('GET', `/api/work-schedules${week}`, null, customerToken)).status, 403);
  assert.equal((await request('POST', '/api/work-schedules', payload, staffToken)).status, 403);
  assert.equal((await request('POST', '/api/work-schedules', { ...payload, userId: String(customer._id) }, adminToken)).status, 400);
  assert.equal((await request('POST', '/api/work-schedules', { ...payload, userId: String(inactive._id) }, adminToken)).status, 400);
  assert.equal((await request('POST', '/api/work-schedules', { ...payload, workDate: '2026-02-30' }, adminToken)).status, 400);
  assert.equal((await request('POST', '/api/work-schedules', { ...payload, status: 'COMPLETED' }, adminToken)).status, 400);
  const created = await request('POST', '/api/work-schedules', payload, adminToken);
  assert.equal(created.status, 201);
  assert.equal(created.data.user.fullName, 'Staff A');
  assert.equal((await request('POST', '/api/work-schedules', payload, adminToken)).status, 409);

  const second = await request('POST', '/api/work-schedules', { userId: String(staffB._id), workDate: '2026-10-13', shiftName: 'EVENING' }, adminToken);
  assert.equal(second.status, 201);
  assert.equal((await request('GET', '/api/work-schedules?weekStart=2026-10-13', null, adminToken)).status, 400);
  assert.equal((await request('GET', `/api/work-schedules${week}`, null, adminToken)).data.length, 2);
  assert.deepEqual((await request('GET', `/api/work-schedules${week}&userId=${staffB._id}`, null, adminToken)).data.map((item) => item._id), [second.data._id]);
  assert.deepEqual((await request('GET', `/api/work-schedules${week}&userId=${staffB._id}`, null, staffToken)).data.map((item) => item._id), [created.data._id]);
  assert.deepEqual((await request('GET', `/api/work-schedules${week}`, null, otherToken)).data.map((item) => item._id), [second.data._id]);
  assert.equal((await request('PUT', `/api/work-schedules/${created.data._id}`, { note: 'Đổi quầy' }, staffToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${created.data._id}`, { status: 'ABSENT' }, adminToken)).status, 400);
  const updated = await request('PUT', `/api/work-schedules/${created.data._id}`, { note: 'Đổi quầy', workDate: '2026-10-14' }, adminToken);
  assert.equal(updated.status, 200);
  assert.equal(updated.data.note, 'Đổi quầy');
  assert.equal((await request('GET', '/api/work-schedules?weekStart=2026-10-19', null, staffToken)).data.length, 0);
  assert.equal((await request('PUT', `/api/work-schedules/${second.data._id}/shift-action`, { action: 'CHECK_IN' }, staffToken)).status, 403);
  await WorkSchedule.updateOne({ _id: created.data._id }, { $set: { status: 'PRESENT', checkInTime: new Date() } });
  assert.equal((await request('DELETE', `/api/work-schedules/${created.data._id}`, null, adminToken)).status, 409);
  assert.equal((await request('PUT', `/api/work-schedules/${created.data._id}`, { note: 'Sửa' }, adminToken)).status, 409);
  assert.equal((await request('DELETE', `/api/work-schedules/${second.data._id}`, null, staffToken)).status, 403);
  assert.equal((await request('DELETE', `/api/work-schedules/${second.data._id}`, null, adminToken)).status, 200);
  assert.equal(await WorkSchedule.countDocuments(), 1);
});
