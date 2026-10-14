const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();
process.env.JWT_SECRET = 'uc23-isolated-test-secret';

const User = require('../models/User');

test('UC23 allows admin to manage staff without exposing credentials or affecting customers', async (t) => {
  const dbName = `aura_cafe_uc23_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', {
    dbName, serverSelectionTimeoutMS: 5000
  });

  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/authRoutes'));
  app.use('/api/employees', require('../routes/employeeRoutes'));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_uc23_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop a database outside the UC23 test namespace');
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

  const passwordHash = await bcrypt.hash('admin-password', 4);
  const admin = await User.create({ fullName: 'UC23 Admin', phone: '0999000021', passwordHash, role: 'ADMIN' });
  const customer = await User.create({ fullName: 'UC23 Customer', phone: '0999000022', passwordHash, role: 'CUSTOMER' });
  const adminToken = (await request('POST', '/api/auth/login', { phone: admin.phone, password: 'admin-password' })).data.token;
  const customerToken = (await request('POST', '/api/auth/login', { phone: customer.phone, password: 'admin-password' })).data.token;
  assert.equal((await request('GET', '/api/employees')).status, 401);
  assert.equal((await request('GET', '/api/employees', null, customerToken)).status, 403);
  assert.equal((await request('POST', '/api/employees', { fullName: 'Blocked' }, customerToken)).status, 403);

  const employeeData = { fullName: '  Thu ngân A  ', phone: '0999000023', password: 'employee-password', position: 'CASHIER', baseSalary: 6500000, hireDate: '2026-10-01' };
  assert.equal((await request('POST', '/api/employees', { ...employeeData, password: undefined }, adminToken)).status, 400);
  assert.equal((await request('POST', '/api/employees', { ...employeeData, role: 'ADMIN' }, adminToken)).status, 400);
  assert.equal((await request('POST', '/api/employees', { ...employeeData, baseSalary: -1 }, adminToken)).status, 400);
  const created = await request('POST', '/api/employees', employeeData, adminToken);
  assert.equal(created.status, 201);
  assert.equal(created.data.role, 'STAFF');
  assert.equal(created.data.fullName, 'Thu ngân A');
  assert.equal(created.data.position, 'CASHIER');
  assert.equal(created.data.baseSalary, 6500000);
  assert.equal(created.data.passwordHash, undefined);
  assert.equal((await request('POST', '/api/employees', employeeData, adminToken)).status, 409);
  const staffToken = (await request('POST', '/api/auth/login', { phone: employeeData.phone, password: employeeData.password })).data.token;
  assert.equal((await request('GET', '/api/employees', null, staffToken)).status, 403);

  const list = await request('GET', '/api/employees', null, adminToken);
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].passwordHash, undefined);
  assert.equal((await request('PUT', `/api/employees/${customer._id}`, { position: 'CASHIER' }, adminToken)).status, 404);
  assert.equal((await request('PUT', `/api/employees/${created.data._id}`, { role: 'ADMIN' }, adminToken)).status, 400);
  const updated = await request('PUT', `/api/employees/${created.data._id}`, { position: 'BARISTA', baseSalary: 7000000, status: 'INACTIVE', hireDate: null }, adminToken);
  assert.equal(updated.status, 200);
  assert.equal(updated.data.position, 'BARISTA');
  assert.equal(updated.data.baseSalary, 7000000);
  assert.equal(updated.data.status, 'INACTIVE');
  assert.equal(updated.data.hireDate, null);
  assert.equal((await request('POST', '/api/auth/login', { phone: employeeData.phone, password: employeeData.password })).status, 403);
  assert.equal((await request('GET', '/api/employees', null, staffToken)).status, 403);
  assert.equal((await request('PUT', `/api/employees/${created.data._id}`, { status: 'ACTIVE', password: 'new-employee-password' }, adminToken)).status, 200);
  assert.equal((await request('POST', '/api/auth/login', { phone: employeeData.phone, password: 'new-employee-password' })).status, 200);
  assert.equal((await User.findById(customer._id)).role, 'CUSTOMER');
});
