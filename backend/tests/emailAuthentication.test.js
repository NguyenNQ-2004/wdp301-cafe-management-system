const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'email-auth-isolated-test-secret';
const app = require('../server');
const User = require('../models/User');

test('email registration and login keep phone as contact information', async t => {
  const dbName = `aura_cafe_email_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  let server;
  t.after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (!/^aura_cafe_email_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) throw new Error('Refusing to drop non-test database');
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  await User.init();
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const request = async (method, path, body, token) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  };
  const input = { fullName: ' Email Customer ', email: '  Coffee.User@GMAIL.com ', phone: '090 123 4567', password: 'account-password' };
  let account, token;
  await t.test('registration normalizes email and stores contact phone without escalating roles', async () => {
    const result = await request('POST', '/api/auth/register', { ...input, role: 'ADMIN', position: 'MANAGER' });
    assert.equal(result.status, 201); account = result.data;
    assert.equal(account.email, 'coffee.user@gmail.com'); assert.equal(account.phone, '0901234567');
    assert.equal(account.fullName, 'Email Customer'); assert.equal(account.role, 'CUSTOMER');
    assert.equal(account.passwordHash, undefined); assert.equal(account.emailKey, undefined);
  });
  await t.test('email login is case insensitive and retains the contact information', async () => {
    const result = await request('POST', '/api/auth/login', { email: input.email, password: input.password });
    assert.equal(result.status, 200); token = result.data.token;
    assert.equal(result.data._id, account._id); assert.equal(result.data.phone, '0901234567');
    assert.equal(result.data.passwordHash, undefined); assert.equal(result.data.emailKey, undefined);
    assert.equal((await request('GET', '/api/auth/me', null, token)).data.email, 'coffee.user@gmail.com');
  });
  await t.test('phone login and malformed credentials are rejected', async () => {
    for (const body of [{ phone: '0901234567', password: input.password }, {}, { email: input.email }, { email: { $ne: null }, password: input.password }, { email: 'bad', password: input.password }]) {
      assert.equal((await request('POST', '/api/auth/login', body)).status, 400);
    }
    assert.equal((await request('POST', '/api/auth/login', { email: input.email, password: 'wrong-password' })).status, 401);
  });
  await t.test('duplicate email and invalid registrations do not create accounts', async () => {
    assert.equal((await request('POST', '/api/auth/register', { ...input, phone: '0901234568', email: 'COFFEE.USER@gmail.com' })).status, 409);
    for (const patch of [{ email: undefined }, { email: 'invalid' }, { phone: 'abc' }, { fullName: ' ' }, { password: 'short' }]) {
      assert.equal((await request('POST', '/api/auth/register', { ...input, ...patch })).status, 400);
    }
    assert.equal(await User.countDocuments(), 1);
  });
  await t.test('profile email cannot be removed and the new email becomes the login', async () => {
    assert.equal((await request('PUT', '/api/auth/profile', { email: null }, token)).status, 400);
    const updated = await request('PUT', '/api/auth/profile', { email: ' New.Identity@gmail.com ' }, token);
    assert.equal(updated.status, 200); assert.equal(updated.data.email, 'new.identity@gmail.com');
    assert.equal((await request('POST', '/api/auth/login', { email: input.email, password: input.password })).status, 401);
    assert.equal((await request('POST', '/api/auth/login', { email: updated.data.email, password: input.password })).status, 200);
  });
  await t.test('normalized identity index prevents concurrent duplicate registrations', async () => {
    const results = await Promise.all([1, 2].map(n => request('POST', '/api/auth/register', { ...input, email: 'parallel@gmail.com', phone: `090123457${n}` })));
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  });
  await t.test('duplicate legacy emails are rejected without changing the existing records', async () => {
    const passwordHash = await bcrypt.hash('legacy-password', 4);
    await User.collection.insertMany([
      { fullName: 'Legacy One', phone: '0901234581', email: 'legacy@gmail.com', passwordHash, role: 'CUSTOMER', status: 'ACTIVE' },
      { fullName: 'Legacy Two', phone: '0901234582', email: ' LEGACY@gmail.com ', passwordHash, role: 'CUSTOMER', status: 'ACTIVE' }
    ]);
    assert.equal((await request('POST', '/api/auth/login', { email: 'legacy@gmail.com', password: 'legacy-password' })).status, 409);
    assert.equal((await request('POST', '/api/auth/register', { ...input, email: 'legacy@gmail.com', phone: '0901234583' })).status, 409);
    assert.equal(await User.countDocuments({ phone: { $in: ['0901234581', '0901234582'] } }), 2);
  });
  await t.test('profile cannot take another account email and locked users cannot log in', async () => {
    assert.equal((await request('PUT', '/api/auth/profile', { email: 'parallel@gmail.com' }, token)).status, 409);
    await User.updateOne({ _id: account._id }, { status: 'LOCKED' });
    assert.equal((await request('POST', '/api/auth/login', { email: 'new.identity@gmail.com', password: input.password })).status, 403);
  });
});
