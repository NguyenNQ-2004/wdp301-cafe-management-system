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

test('UC26 reserves attendance recording for admins while preserving staff COD remittances', async (t) => {
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
  assert.equal((await request('GET', `/api/work-schedules/attendance${query}&userId=${staffB._id}`, null, aToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_OUT' }, aToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, aToken)).status, 403);
  const shipperSchedule = await WorkSchedule.create({ user: shipper._id, workDate: new Date(today), shiftName: 'MORNING', status: 'PRESENT', checkInTime: new Date() });
  assert.equal((await request('PUT', `/api/work-schedules/${shipperSchedule._id}/shift-action`, { action: 'REMIT_COD', cash: 100 }, aToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${shipperSchedule._id}/shift-action`, { action: 'REMIT_COD', cash: 100.5 }, shipperToken)).status, 400);
  const remitted = await request('PUT', `/api/work-schedules/${shipperSchedule._id}/shift-action`, { action: 'REMIT_COD', cash: 100000, note: 'Đã nộp quỹ' }, shipperToken);
  assert.equal(remitted.status, 200);
  assert.equal(remitted.data.expectedCash, 0);
  assert.equal(remitted.data.schedule.endingCashActual, 100000);
  assert.equal(remitted.data.schedule.status, 'PRESENT');
  assert.equal(remitted.data.schedule.checkOutTime, undefined);
  assert.equal((await request('PUT', `/api/work-schedules/${shipperSchedule._id}/shift-action`, { action: 'REMIT_COD', cash: 100000 }, shipperToken)).status, 409);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, bToken)).status, 403);
  const adminCheckedIn = await request('PUT', `/api/work-schedules/${other._id}/shift-action`, { action: 'CHECK_IN' }, adminToken);
  assert.equal(adminCheckedIn.status, 200);
  const adminCheckedOut = await request('PUT', `/api/work-schedules/${other._id}/shift-action`, { action: 'CHECK_OUT' }, adminToken);
  assert.equal(adminCheckedOut.status, 200);
  assert.ok(adminCheckedIn.data.schedule.checkInTime);
  assert.ok(adminCheckedOut.data.schedule.checkOutTime);
  assert.equal((await request('PUT', `/api/work-schedules/${future._id}/shift-action`, { action: 'CHECK_IN' }, aToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN', status: 'COMPLETED' }, aToken)).status, 400);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, aToken)).status, 403);
  await ShopSetting.updateOne({ settingKey: 'shift_morning' }, { $set: { settingValue: '00:00-23:59' } });
  const checkedIn = await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, adminToken);
  assert.equal(checkedIn.status, 200);
  assert.ok(checkedIn.data.schedule.checkInTime);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, aToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_IN' }, adminToken)).status, 409);
  const checkedOut = await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_OUT' }, adminToken);
  assert.equal(checkedOut.status, 200);
  assert.ok(checkedOut.data.schedule.checkOutTime);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_OUT' }, aToken)).status, 403);
  assert.equal((await request('PUT', `/api/work-schedules/${own._id}/shift-action`, { action: 'CHECK_OUT' }, adminToken)).status, 409);
  assert.equal((await request('PATCH', `/api/work-schedules/${missed._id}/absence`, null, aToken)).status, 403);
  assert.equal((await request('PATCH', `/api/work-schedules/${future._id}/absence`, null, adminToken)).status, 409);
  assert.equal((await request('PATCH', `/api/work-schedules/${own._id}/absence`, null, adminToken)).status, 409);
  const absent = await request('PATCH', `/api/work-schedules/${missed._id}/absence`, null, adminToken);
  assert.equal(absent.status, 200);
  assert.equal(absent.data.status, 'ABSENT');
  const restored = await request('PUT', `/api/work-schedules/${missed._id}/shift-action`, { action: 'CHECK_IN' }, adminToken);
  assert.equal(restored.status, 200);
  assert.equal(restored.data.schedule.status, 'PRESENT');
  assert.equal((await request('PATCH', `/api/work-schedules/${missed._id}/absence`, null, adminToken)).status, 409);
  assert.equal((await WorkSchedule.findById(other._id)).status, 'COMPLETED');

  const WorkShift = require('../models/WorkShift');
  const { mondayOf } = require('../utils/weeklyShifts');
  const weekStart = mondayOf(today);
  const customShift = await WorkShift.create({ weekStart, shiftName: 'a', startTime: '06:30', endTime: '11:30' });
  await WorkSchedule.create({ user: staffB._id, workDate: new Date(today), shiftName: 'a', shift: customShift._id });
  const customAttendance = await request('GET', `/api/work-schedules/attendance${query}&userId=${staffB._id}`, null, adminToken);
  assert.equal(customAttendance.status, 200);
  const customRecord = customAttendance.data.find((item) => item.shiftName === 'a');
  assert.ok(customRecord);
  assert.deepEqual(customRecord.shiftInfo, { code: 'a', name: 'a', startTime: '06:30', endTime: '11:30' });

  const overnightWeek = mondayOf(yesterday);
  await WorkShift.create({ weekStart: overnightWeek, shiftName: 'Ca đêm', startTime: '23:00', endTime: '00:00' });
  const overnightSchedule = await WorkSchedule.create({ user: staffA._id, workDate: new Date(yesterday), shiftName: 'Ca đêm' });
  const overnightCheckIn = await request('PUT', `/api/work-schedules/${overnightSchedule._id}/shift-action`, { action: 'CHECK_IN' }, adminToken);
  assert.equal(overnightCheckIn.status, 200);
  const overnightCheckOut = await request('PUT', `/api/work-schedules/${overnightSchedule._id}/shift-action`, { action: 'CHECK_OUT' }, adminToken);
  assert.equal(overnightCheckOut.status, 200);
  assert.equal(new Date(overnightCheckOut.data.schedule.checkOutTime).getTime() - new Date(overnightCheckIn.data.schedule.checkInTime).getTime(), 60 * 60 * 1000);

  await WorkSchedule.updateOne({ _id: own._id }, { $set: { handoverAt: new Date(), endingCashActual: 228000 } });
  const incomingCashier = await User.create({ fullName: 'Incoming Cashier', phone: '0999000056', email: 'test-0999000056@example.com', passwordHash: hash, role: 'STAFF', position: 'CASHIER' });
  const transferShift = await WorkShift.create({ weekStart: mondayOf(today), shiftName: 'TRANSFER', startTime: '00:00', endTime: '23:59' });
  const incoming = await WorkSchedule.create({ user: incomingCashier._id, workDate: new Date(today), shiftName: 'TRANSFER', shift: transferShift._id });
  await WorkSchedule.updateOne({ _id: own._id }, { $set: { status: 'PRESENT' }, $unset: { checkOutTime: 1 } });
  const pendingTransfer = await request('GET', `/api/work-schedules/${incoming._id}/cash-transfer`, null, adminToken);
  assert.equal(pendingTransfer.data.ready, false);
  assert.equal((await request('PUT', `/api/work-schedules/${incoming._id}/shift-action`, { action: 'CHECK_IN', cash: 228000 }, adminToken)).status, 409);
  await WorkSchedule.updateOne({ _id: own._id }, { $set: { status: 'COMPLETED', checkOutTime: new Date() } });
  const transfer = await request('GET', `/api/work-schedules/${incoming._id}/cash-transfer`, null, adminToken);
  assert.equal(transfer.status, 200);
  assert.equal(transfer.data.ready, true);
  assert.equal(transfer.data.assignedToMe, false);
  assert.equal(transfer.data.expectedCash, 228000);
  const incomingToken = await tokenFor(incomingCashier);
  assert.equal((await request('POST', `/api/work-schedules/${incoming._id}/accept-cash-transfer`, { countedCash: 228000 }, incomingToken)).status, 409);
  const receivers = await request('GET', `/api/work-schedules/${own._id}/cash-receivers`, null, aToken);
  assert.equal(receivers.status, 200);
  assert.ok(receivers.data.candidates.some(row => row._id === String(incoming._id)));
  assert.equal((await request('POST', `/api/work-schedules/${own._id}/assign-cash-receiver`, { receiverScheduleId: String(incoming._id) }, aToken)).status, 200);
  assert.equal((await request('PUT', `/api/work-schedules/${incoming._id}/shift-action`, { action: 'CHECK_IN', cash: 218000 }, adminToken)).status, 409);
  assert.equal((await WorkSchedule.findById(incoming._id)).status, 'SCHEDULED');
  assert.equal((await request('POST', `/api/work-schedules/${incoming._id}/cash-discrepancy`, { countedCash: 218000, note: 'Thiếu tiền' }, aToken)).status, 403);
  const report = await request('POST', `/api/work-schedules/${incoming._id}/cash-discrepancy`, { countedCash: 218000, note: 'Thiếu 10.000đ khi nhận két' }, incomingToken);
  assert.equal(report.status, 200);
  assert.equal(report.data.discrepancy.countedCash, 218000);
  assert.equal((await request('PUT', `/api/work-schedules/${incoming._id}/shift-action`, { action: 'CHECK_IN', cash: 228000 }, adminToken)).status, 409);
  const beforeAcceptance = await request('GET', '/api/work-schedules/cash-transfer-events', null, adminToken);
  assert.ok(beforeAcceptance.data.some(row => row._id === String(incoming._id) && row.cashTransferDiscrepancy?.countedCash === 218000));
  const giverReport = await request('GET', '/api/work-schedules/cash-transfer-events', null, aToken);
  assert.ok(giverReport.data.some(row => row._id === String(incoming._id) && row.cashTransferDiscrepancy?.countedCash === 218000));
  const accepted = await request('POST', `/api/work-schedules/${incoming._id}/accept-cash-transfer`, { countedCash: 228000 }, incomingToken);
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal((await WorkSchedule.findById(incoming._id)).cashTransferFrom.toString(), own._id.toString());
  assert.ok((await WorkSchedule.findById(incoming._id)).cashTransferDiscrepancy.resolvedAt);
  assert.equal((await request('POST', `/api/work-schedules/${incoming._id}/accept-cash-transfer`, { countedCash: 228000 }, incomingToken)).status, 409);
  const giverEvents = await request('GET', '/api/work-schedules/cash-transfer-events', null, aToken);
  assert.equal(giverEvents.status, 200);
  assert.ok(giverEvents.data.some(row => row._id === String(incoming._id) && row.startingCash === 228000));
  assert.equal((await request('GET', '/api/work-schedules/cash-transfer-events', null, bToken)).status, 403);
});
