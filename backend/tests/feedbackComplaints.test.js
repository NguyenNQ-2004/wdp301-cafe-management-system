const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();
process.env.JWT_SECRET = 'feedback-complaints-isolated-test-secret';

const User = require('../models/User');
const Order = require('../models/Order');
const CustomerReview = require('../models/CustomerReview');

test('Screen 30: Feedback & complaints submission, filtering, and admin response flow', async (t) => {
  const dbName = `aura_cafe_feedback_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', {
    dbName,
    serverSelectionTimeoutMS: 5000
  });

  const app = express();
  app.use(express.json());
  app.use('/api/customer-reviews', require('../routes/reviewRoutes'));

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_feedback_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop database outside the feedback test namespace');
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    return { status: response.status, data: await response.json() };
  };

  const passwordHash = await bcrypt.hash('feedback-pass', 4);
  const admin = await User.create({
    fullName: 'Feedback Admin',
    phone: '0966000001',
    passwordHash,
    role: 'ADMIN'
  });
  const customerA = await User.create({
    fullName: 'Khách Hàng A',
    phone: '0966000002',
    passwordHash,
    role: 'CUSTOMER'
  });
  const customerB = await User.create({
    fullName: 'Khách Hàng B',
    phone: '0966000003',
    passwordHash,
    role: 'CUSTOMER'
  });

  const sampleOrder = await Order.create({
    orderCode: 'ORD-FB-101',
    customer: customerA._id,
    totalAmount: 85000,
    finalAmount: 85000,
    status: 'COMPLETED',
    orderType: 'TAKEAWAY'
  });

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const customerAToken = jwt.sign({ id: customerA._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const customerBToken = jwt.sign({ id: customerB._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 1. Auth check
  assert.equal((await request('/api/customer-reviews')).status, 401);

  // 2. Customer A fetches their past orders to attach to feedback
  const myOrdersRes = await request('/api/customer-reviews/my-orders', { token: customerAToken });
  assert.equal(myOrdersRes.status, 200);
  assert.equal(myOrdersRes.data.length, 1);
  assert.equal(myOrdersRes.data[0].orderCode, 'ORD-FB-101');

  // 3. Validation when submitting feedback
  const emptyContent = await request('/api/customer-reviews', {
    method: 'POST',
    token: customerAToken,
    body: { issueType: 'RATING', rating: 5, content: '' }
  });
  assert.equal(emptyContent.status, 400);

  const invalidRating = await request('/api/customer-reviews', {
    method: 'POST',
    token: customerAToken,
    body: { issueType: 'RATING', rating: 6, content: 'Tuyệt đỉnh' }
  });
  assert.equal(invalidRating.status, 400);

  // 4. Customer A submits a 5-star Rating
  const ratingRes = await request('/api/customer-reviews', {
    method: 'POST',
    token: customerAToken,
    body: {
      orderId: sampleOrder._id,
      issueType: 'RATING',
      rating: 5,
      content: 'Cà phê muối rất thơm béo và phục vụ nhanh chóng!',
      attachments: ['https://example.com/photo1.jpg']
    }
  });
  assert.equal(ratingRes.status, 201);
  assert.equal(ratingRes.data.review.rating, 5);
  assert.equal(ratingRes.data.review.issueType, 'RATING');
  assert.equal(ratingRes.data.review.status, 'PENDING');

  // 5. Customer A submits a Complaint
  const complaintRes = await request('/api/customer-reviews', {
    method: 'POST',
    token: customerAToken,
    body: {
      orderId: sampleOrder._id,
      issueType: 'COMPLAINT',
      topic: 'Chất lượng đồ uống',
      content: 'Đá bị tan quá nhiều khiến cà phê bị nhạt.'
    }
  });
  assert.equal(complaintRes.status, 201);
  assert.equal(complaintRes.data.review.issueType, 'COMPLAINT');
  const complaintId = complaintRes.data.review._id;

  // 6. Data Isolation: Customer B should NOT see Customer A's reviews
  const customerBList = await request('/api/customer-reviews', { token: customerBToken });
  assert.equal(customerBList.status, 200);
  assert.equal(customerBList.data.reviews.length, 0);

  // Customer A sees their 2 reviews
  const customerAList = await request('/api/customer-reviews', { token: customerAToken });
  assert.equal(customerAList.status, 200);
  assert.equal(customerAList.data.reviews.length, 2);

  // 7. Admin sees all reviews and can filter
  const adminList = await request('/api/customer-reviews?issueType=COMPLAINT', { token: adminToken });
  assert.equal(adminList.status, 200);
  assert.equal(adminList.data.reviews.length, 1);
  assert.equal(adminList.data.reviews[0]._id, complaintId);

  // 8. Admin review stats overview (Screen 30)
  assert.equal((await request('/api/customer-reviews/stats', { token: customerAToken })).status, 403);
  const statsRes = await request('/api/customer-reviews/stats', { token: adminToken });
  assert.equal(statsRes.status, 200);
  assert.equal(statsRes.data.totalReviews, 2);
  assert.equal(statsRes.data.complaintsCount, 1);
  assert.equal(statsRes.data.ratingsCount, 1);
  assert.equal(statsRes.data.avgRating, 5);

  // 9. Admin responds to complaint and changes status to RESOLVED
  assert.equal(
    (
      await request(`/api/customer-reviews/${complaintId}/respond`, {
        method: 'PUT',
        token: customerAToken,
        body: { adminResponse: 'Unauthorized attempt' }
      })
    ).status,
    403
  );

  const respondRes = await request(`/api/customer-reviews/${complaintId}/respond`, {
    method: 'PUT',
    token: adminToken,
    body: {
      adminResponse: 'Aura xin chân thành cảm ơn góp ý và đã gửi tặng bạn 1 voucher bù!',
      status: 'RESOLVED'
    }
  });
  assert.equal(respondRes.status, 200);
  assert.equal(respondRes.data.review.status, 'RESOLVED');
  assert.ok(respondRes.data.review.adminResponse.includes('voucher bù'));
  assert.ok(respondRes.data.review.respondedAt);

  // 10. Admin deletes a review
  assert.equal(
    (await request(`/api/customer-reviews/${complaintId}`, { method: 'DELETE', token: customerAToken })).status,
    403
  );
  const deleteRes = await request(`/api/customer-reviews/${complaintId}`, { method: 'DELETE', token: adminToken });
  assert.equal(deleteRes.status, 200);
  assert.equal(await CustomerReview.exists({ _id: complaintId }), null);
});
