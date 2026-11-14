const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = require('../server');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const ShiftHandover = require('../models/ShiftHandover');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const jwtSecret = require('../config/jwtSecret')();

test('Shift handover review lifecycle: submit -> reject with note -> cashier resubmit -> admin confirm', async (t) => {
  const dbName = `aura_handover_review_test_${randomBytes(5).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });

  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^aura_handover_review_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const request = async (method, path, body, token) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };

  const cashier1 = await User.create({ fullName: 'Thu Ngân 1', phone: '0911111111', role: 'STAFF', position: 'CASHIER', passwordHash: 'pwd' });
  const cashier2 = await User.create({ fullName: 'Thu Ngân 2', phone: '0922222222', role: 'STAFF', position: 'CASHIER', passwordHash: 'pwd' });
  const admin = await User.create({ fullName: 'Admin Quản Lý', phone: '0933333333', role: 'ADMIN', passwordHash: 'pwd' });

  const c1Token = jwt.sign({ id: cashier1._id }, jwtSecret);
  const c2Token = jwt.sign({ id: cashier2._id }, jwtSecret);
  const adminToken = jwt.sign({ id: admin._id }, jwtSecret);

  const today = '2026-11-05';
  const start = new Date(`${today}T08:00:00.000Z`);
  const end = new Date(`${today}T12:00:00.000Z`);

  const schedule = await WorkSchedule.create({
    user: cashier1._id,
    workDate: new Date(today),
    shiftName: 'MORNING',
    status: 'COMPLETED',
    checkInTime: start,
    checkOutTime: end,
    startingCash: 500000
  });

  // Create an order paid in cash during this shift
  const order = await Order.create({
    orderCode: 'AURA-TEST-01',
    customer: cashier1._id,
    cashier: cashier1._id,
    orderType: 'TAKEAWAY',
    status: 'COMPLETED',
    totalAmount: 150000,
    finalAmount: 150000,
    paymentMethod: 'CASH',
    items: []
  });

  await Payment.create({
    order: order._id,
    amount: 150000,
    paymentMethod: 'CASH',
    status: 'SUCCESS',
    paidAt: new Date(start.getTime() + 3600000),
    receivedBy: cashier1._id
  });

  // Step 1: Cashier submits handover with discrepancy (expected: 500k + 150k = 650k, actual: 630k, note: "Thối nhầm 20k")
  const confirmRes = await request('POST', `/api/shift-handovers/${schedule._id}/confirm`, {
    actualCash: 630000,
    note: 'Lệch 20.000đ do thối nhầm tiền cho khách'
  }, c1Token);

  assert.equal(confirmRes.status, 200);
  assert.equal(confirmRes.data.difference, -20000);
  assert.equal(confirmRes.data.status, 'SUBMITTED');

  const handoverDoc = await ShiftHandover.findOne({ schedule: schedule._id });
  assert.ok(handoverDoc);
  assert.equal(handoverDoc.status, 'SUBMITTED');
  assert.equal(handoverDoc.difference, -20000);

  // Step 2: Non-admin tries to review -> 403
  const cashierReviewRes = await request('POST', `/api/shift-handovers/${schedule._id}/review`, {
    action: 'CONFIRM'
  }, c1Token);
  assert.equal(cashierReviewRes.status, 403);

  // Step 3: Admin rejects without note -> 400
  const rejectNoNoteRes = await request('POST', `/api/shift-handovers/${schedule._id}/review`, {
    action: 'REJECT'
  }, adminToken);
  assert.equal(rejectNoNoteRes.status, 400);

  // Step 4: Admin rejects with reason -> 200
  const rejectRes = await request('POST', `/api/shift-handovers/${schedule._id}/review`, {
    action: 'REJECT',
    reviewerNote: 'Cần kiểm tra lại camera quầy thu ngân và đếm lại tiền lẻ'
  }, adminToken);
  assert.equal(rejectRes.status, 200);
  assert.equal(rejectRes.data.status, 'REJECTED');
  assert.equal(rejectRes.data.reviewerNote, 'Cần kiểm tra lại camera quầy thu ngân và đếm lại tiền lẻ');
  assert.equal(String(rejectRes.data.reviewedBy._id || rejectRes.data.reviewedBy), String(admin._id));

  // Step 5: Cashier 2 (not owner) tries to resubmit -> 403
  const c2Resubmit = await request('POST', `/api/shift-handovers/${schedule._id}/resubmit`, {
    note: 'Em giải trình thay'
  }, c2Token);
  assert.equal(c2Resubmit.status, 403);

  // Step 6: Cashier 1 resubmits without note -> 400
  const c1NoNote = await request('POST', `/api/shift-handovers/${schedule._id}/resubmit`, {
    actualCash: 650000
  }, c1Token);
  assert.equal(c1NoNote.status, 400);

  // Step 7: Cashier 1 resubmits with note and corrected count -> 200
  const c1Resubmit = await request('POST', `/api/shift-handovers/${schedule._id}/resubmit`, {
    actualCash: 650000,
    note: 'Đã tìm thấy 20.000đ rơi dưới ngăn kéo két tiền, tiền két đã đủ 650.000đ'
  }, c1Token);
  assert.equal(c1Resubmit.status, 200);
  assert.equal(c1Resubmit.data.status, 'SUBMITTED');
  assert.equal(c1Resubmit.data.actualCash, 650000);
  assert.equal(c1Resubmit.data.difference, 0);
  assert.ok(c1Resubmit.data.resubmittedAt);

  // Step 8: Admin confirms -> 200
  const finalConfirmRes = await request('POST', `/api/shift-handovers/${schedule._id}/review`, {
    action: 'CONFIRM',
    reviewerNote: 'Đã đối chiếu camera và xác nhận khớp két.'
  }, adminToken);
  assert.equal(finalConfirmRes.status, 200);
  assert.equal(finalConfirmRes.data.status, 'CONFIRMED');

  // Step 9: Reviewing already confirmed handover -> 409
  const reReviewRes = await request('POST', `/api/shift-handovers/${schedule._id}/review`, {
    action: 'CONFIRM'
  }, adminToken);
  assert.equal(reReviewRes.status, 409);

  // Step 10: GET detail shows complete review state
  const detailRes = await request('GET', `/api/shift-handovers/${schedule._id}`, null, c1Token);
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.data.status, 'CONFIRMED');
  assert.equal(detailRes.data.actualCash, 650000);
  assert.equal(detailRes.data.difference, 0);
  assert.equal(detailRes.data.reviewerNote, 'Đã đối chiếu camera và xác nhận khớp két.');
});
