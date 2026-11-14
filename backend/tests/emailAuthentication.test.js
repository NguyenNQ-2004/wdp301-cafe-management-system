const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'email-auth-isolated-test-secret';
const app = require('../server');
const User = require('../models/User');

test('email registration supports email and phone login for the same account', async t => {
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
  const input = { fullName: ' Email Customer ', email: '  Coffee.User@GMAIL.com ', phone: '090 123 4567', password: 'account1234' };
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
  await t.test('phone login and legacy phone payload identify the same account', async () => {
    for (const body of [{ identifier: input.phone }, { phone: '0901234567' }]) {
      const result = await request('POST', '/api/auth/login', { ...body, password: input.password });
      assert.equal(result.status, 200);
      assert.equal(result.data._id, account._id);
      assert.equal(result.data.role, 'CUSTOMER');
      assert.ok(result.data.token);
      assert.equal(result.data.passwordHash, undefined);
      assert.equal((await request('GET', '/api/auth/me', null, result.data.token)).data._id, account._id);
    }
    assert.equal((await request('POST', '/api/auth/login', { identifier: input.phone, password: 'wrong-password' })).status, 401);
    assert.equal((await request('POST', '/api/auth/login', { phone: '0909999999', password: input.password })).status, 401);
  });
  await t.test('usernames and malformed login inputs are rejected', async () => {
    assert.equal((await request('POST', '/api/auth/login', { identifier: 'coffee.user', password: input.password })).status, 400);
    assert.equal((await request('POST', '/api/auth/login', { identifier: 'unknown', password: input.password })).status, 400);
    for (const body of [{}, { email: input.email }, { email: { $ne: null }, password: input.password }, { phone: { $ne: null }, password: input.password }, { identifier: ['0901234567'], password: input.password }, { email: 'bad@', password: input.password }]) {
      assert.equal((await request('POST', '/api/auth/login', body)).status, 400);
    }
    assert.equal((await request('POST', '/api/auth/login', { email: input.email, password: 'wrong-password' })).status, 401);
  });
  await t.test('duplicate email and invalid registrations do not create accounts', async () => {
    assert.equal((await request('POST', '/api/auth/register', { ...input, phone: '0901234568', email: 'COFFEE.USER@gmail.com' })).status, 409);
    for (const patch of [{ email: undefined }, { email: 'invalid' }, { phone: 'abc' }, { fullName: ' ' }, { fullName: '13123' }, { fullName: 'Nguyễn123' }, { fullName: '@@@' }, { password: 'short' }]) {
      assert.equal((await request('POST', '/api/auth/register', { ...input, ...patch })).status, 400);
    }
    assert.equal(await User.countDocuments(), 1);
  });
  await t.test('registration returns all invalid or duplicate fields together', async () => {
    const invalid = await request('POST', '/api/auth/register', { fullName: '13123', email: 'bad', phone: 'too-long-phone-123456789', password: '123', confirmPassword: 'different' });
    assert.equal(invalid.status, 400);
    assert.deepEqual(Object.keys(invalid.data.errors).sort(), ['fullName', 'email', 'phone', 'password', 'confirmPassword'].sort());
    const duplicate = await request('POST', '/api/auth/register', { ...input, password: '123', confirmPassword: 'different' });
    assert.equal(duplicate.status, 400);
    assert.ok(duplicate.data.errors.email); assert.ok(duplicate.data.errors.phone);
    assert.ok(duplicate.data.errors.password); assert.ok(duplicate.data.errors.confirmPassword);
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
  await t.test('profile saves all editable fields and the new phone works after reloading', async () => {
    const profile = { fullName: ' Updated Customer ', phone: '090 123 4590', email: ' NEW.IDENTITY@gmail.com ', birthday: '2004-05-20', address: ' 123 Updated Street ' };
    const result = await request('PUT', '/api/auth/profile', profile, token);
    assert.equal(result.status, 200);
    const saved = await request('GET', '/api/auth/me', null, token);
    assert.equal(saved.status, 200);
    assert.equal(saved.data.fullName, 'Updated Customer');
    assert.equal(saved.data.phone, '0901234590');
    assert.equal(saved.data.email, 'new.identity@gmail.com');
    assert.equal(saved.data.birthday.slice(0, 10), '2004-05-20');
    assert.equal(saved.data.address, '123 Updated Street');
    const stored = await User.findById(account._id);
    assert.equal(stored.phone, saved.data.phone);
    assert.equal(stored.address, saved.data.address);
    assert.equal((await request('POST', '/api/auth/login', { phone: account.phone, password: input.password })).status, 401);
    const login = await request('POST', '/api/auth/login', { phone: saved.data.phone, password: input.password });
    assert.equal(login.status, 200); assert.equal(login.data._id, account._id);
    account.phone = saved.data.phone;
    const cleared = await request('PUT', '/api/auth/profile', { birthday: null, address: null }, token);
    assert.equal(cleared.status, 200);
    assert.equal((await request('GET', '/api/auth/me', null, token)).data.birthday, null);
  });
  await t.test('invalid or already used profile details return an error without saving partial changes', async () => {
    const another = await User.findOne({ emailKey: 'parallel@gmail.com' });
    const duplicate = await request('PUT', '/api/auth/profile', { fullName: 'Must not save', phone: another.phone }, token);
    assert.equal(duplicate.status, 409);
    assert.match(duplicate.data.message, /Số điện thoại/);
    for (const patch of [{ phone: 'bad-phone' }, { phone: { $ne: null } }, { fullName: ' ' }, { fullName: 'x'.repeat(101) }, { birthday: '2004-02-30' }, { birthday: {} }, { address: 'x'.repeat(501) }]) {
      assert.equal((await request('PUT', '/api/auth/profile', patch, token)).status, 400);
    }
    const current = (await request('GET', '/api/auth/me', null, token)).data;
    assert.equal(current.fullName, 'Updated Customer');
    assert.equal(current.phone, account.phone);
  });
  await t.test('password changes validate length, current password and confirmation before saving', async () => {
    for (const patch of [{ newPassword: 'short' }, { oldPassword: { $ne: null } }, { confirmPassword: 'different' }]) assert.equal((await request('PUT', '/api/auth/change-password', { oldPassword: input.password, newPassword: 'Newpass1', ...patch }, token)).status, 400);
    assert.equal((await request('PUT', '/api/auth/change-password', { oldPassword: 'wrong', newPassword: 'Newpass1' }, token)).status, 401);
    assert.equal((await request('PUT', '/api/auth/change-password', { oldPassword: input.password, newPassword: 'Newpass1', confirmPassword: 'Newpass1' }, token)).status, 200);
    assert.equal((await request('POST', '/api/auth/login', { phone: account.phone, password: input.password })).status, 401);
    assert.equal((await request('POST', '/api/auth/login', { phone: account.phone, password: 'Newpass1' })).status, 200);
    assert.equal((await request('POST', '/api/auth/login', { identifier: 'new.identity', password: 'Newpass1' })).status, 400);
    assert.equal((await request('GET', '/api/auth/me', undefined, token)).status, 401);
    token = (await request('POST', '/api/auth/login', { email: 'new.identity@gmail.com', password: 'Newpass1' })).data.token;
    assert.equal((await request('PUT', '/api/auth/change-password', { oldPassword: 'Newpass1', newPassword: input.password }, token)).status, 200);
    token = (await request('POST', '/api/auth/login', { email: 'new.identity@gmail.com', password: input.password })).data.token;
  });
  await t.test('duplicate legacy emails are rejected without changing the existing records', async () => {
    const passwordHash = await bcrypt.hash('legacy-password', 4);
    await User.collection.insertMany([
      { fullName: 'Legacy One', phone: '0901234581', email: 'legacy@gmail.com', passwordHash, role: 'CUSTOMER', status: 'ACTIVE' },
      { fullName: 'Legacy Two', phone: '0901234582', email: ' LEGACY@gmail.com ', passwordHash, role: 'CUSTOMER', status: 'ACTIVE' }
    ]);
    assert.equal((await request('POST', '/api/auth/login', { email: 'legacy@gmail.com', password: 'legacy-password' })).status, 409);
    const phoneLogin = await request('POST', '/api/auth/login', { identifier: '0901234582', password: 'legacy-password' });
    assert.equal(phoneLogin.status, 200);
    assert.equal(phoneLogin.data.fullName, 'Legacy Two');
    assert.equal((await request('POST', '/api/auth/register', { ...input, email: 'legacy@gmail.com', phone: '0901234583' })).status, 409);
    assert.equal(await User.countDocuments({ phone: { $in: ['0901234581', '0901234582'] } }), 2);
  });
  await t.test('profile cannot take another account email and locked users cannot log in', async () => {
    assert.equal((await request('PUT', '/api/auth/profile', { email: 'parallel@gmail.com' }, token)).status, 409);
    await User.updateOne({ _id: account._id }, { status: 'LOCKED' });
    assert.equal((await request('POST', '/api/auth/login', { email: 'new.identity@gmail.com', password: input.password })).status, 403);
    assert.equal((await request('POST', '/api/auth/login', { phone: account.phone, password: input.password })).status, 403);
  });
  await t.test('legacy staff and admin accounts without email can log in by their stored phone', async () => {
    const passwordHash = await bcrypt.hash('legacy-password', 4);
    for (const [role, phone] of [['ADMIN', '0901234591'], ['STAFF', '+84901234592']]) {
      const user = await User.create({ fullName: 'Legacy '+role, phone, passwordHash, role, position: 'MANAGER' });
      const result = await request('POST', '/api/auth/login', { identifier: phone, password: 'legacy-password' });
      assert.equal(result.status, 200);
      assert.equal(result.data._id, String(user._id));
      assert.equal(result.data.role, role);
      assert.equal((await request('GET', '/api/auth/me', null, result.data.token)).data.role, role);
    }
  });
});
