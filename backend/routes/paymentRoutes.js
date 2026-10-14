const express = require('express');
const { randomBytes } = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { protect } = require('../middlewares/authMiddleware');
const { demoPaymentsEnabled } = require('../utils/paymentMode');

const router = express.Router();
const canManageCounter = (user) => user.role === 'ADMIN' || (user.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user.position));
router.get('/config', (_req, res) => res.json({ demoEnabled: demoPaymentsEnabled() }));
router.use(protect);

// 1. GET ALL PAYMENTS
router.get('/', async (req, res) => {
  try {
    if (!canManageCounter(req.user)) return res.status(403).json({ message: 'Không có quyền xem giao dịch thanh toán.' });
    const filter = {};
    if (req.user.role === 'STAFF') {
      filter.order = { $in: await Order.distinct('_id', { orderType: { $in: ['DINE_IN', 'TAKEAWAY'] } }) };
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

    const payments = await Payment.find(filter)
      .populate({
        path: 'order',
        select: 'orderCode orderType paymentMethod finalAmount status recipientName customer tableNumber',
        populate: { path: 'customer', select: 'fullName phone' }
      })
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/order/:orderId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    if (req.user.role === 'CUSTOMER' ? String(order.customer) !== String(req.user._id) : !canManageCounter(req.user)) return res.status(403).json({ message: 'Không có quyền xem thanh toán này.' });
    const payment = await Payment.findOne({ order: order._id });
    if (!payment) return res.status(404).json({ message: 'Chưa có giao dịch thanh toán cho đơn hàng.' });
    res.json({ order: { _id: order._id, orderCode: order.orderCode, finalAmount: order.finalAmount, orderType: order.orderType, status: order.status, paymentMethod: order.paymentMethod }, payment, demoEnabled: demoPaymentsEnabled() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/demo-confirm', async (req, res) => {
  try {
    if (!demoPaymentsEnabled()) return res.status(403).json({ message: 'Thanh toán mô phỏng hiện không khả dụng.' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã giao dịch không hợp lệ.' });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Không tìm thấy giao dịch.' });
    const order = await Order.findById(payment.order);
    if (!order || String(order.customer) !== String(req.user._id) || req.user.role !== 'CUSTOMER') return res.status(403).json({ message: 'Không có quyền thanh toán đơn hàng này.' });
    if (payment.paymentMethod !== 'DEMO_ONLINE' || order.paymentMethod !== 'DEMO_ONLINE') return res.status(400).json({ message: 'Đơn hàng không dùng thanh toán mô phỏng.' });
    if (order.status === 'CANCELLED') return res.status(409).json({ message: 'Đơn hàng đã hủy.' });
    if (payment.amount !== order.finalAmount) return res.status(409).json({ message: 'Số tiền thanh toán không khớp đơn hàng.' });
    if (payment.status === 'SUCCESS') return res.json({ payment });
    if (payment.status !== 'PENDING') return res.status(409).json({ message: 'Giao dịch không còn chờ thanh toán.' });
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'PENDING' },
      { $set: { status: 'SUCCESS', paidAt: new Date(), transactionCode: `DEMO-${randomBytes(6).toString('hex').toUpperCase()}`, paymentNote: 'Đã xác nhận trên cổng thanh toán mô phỏng; không thu tiền thật' } },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(409).json({ message: 'Giao dịch đã được xử lý. Vui lòng tải lại trạng thái.' });
    res.json({ payment: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UC13: nhân viên thu ngân xác nhận đã nhận tiền tại quầy.
router.post('/:id/counter-confirm', async (req, res) => {
  try {
    if (!canManageCounter(req.user)) return res.status(403).json({ message: 'Chỉ thu ngân hoặc quản lý được xác nhận thanh toán tại quầy.' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã giao dịch không hợp lệ.' });
    const method = req.body.paymentMethod;
    const reference = typeof req.body.transactionCode === 'string' ? req.body.transactionCode.trim() : '';
    if (!['CASH', 'BANK_TRANSFER'].includes(method)) return res.status(400).json({ message: 'Chọn tiền mặt hoặc chuyển khoản.' });
    if (method === 'BANK_TRANSFER' && (!reference || reference.length > 100)) return res.status(400).json({ message: 'Nhập mã giao dịch chuyển khoản (tối đa 100 ký tự).' });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Không tìm thấy giao dịch.' });
    const order = await Order.findById(payment.order);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    if (!['TAKEAWAY', 'DINE_IN'].includes(order.orderType)) return res.status(400).json({ message: 'Đây không phải đơn thanh toán tại quầy.' });
    if (order.status === 'CANCELLED') return res.status(409).json({ message: 'Đơn hàng đã hủy.' });
    if (payment.amount !== order.finalAmount) return res.status(409).json({ message: 'Số tiền thanh toán không khớp đơn hàng.' });
    if (payment.status === 'SUCCESS') {
      if (payment.paymentMethod !== method || (method === 'BANK_TRANSFER' && payment.transactionCode !== reference)) return res.status(409).json({ message: 'Giao dịch đã được thanh toán bằng hình thức khác.' });
      return res.json({ payment });
    }
    if (payment.status !== 'PENDING') return res.status(409).json({ message: 'Giao dịch không còn chờ thanh toán.' });
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'PENDING' },
      { $set: { paymentMethod: method, status: 'SUCCESS', paidAt: new Date(), paymentNote: `Thu ngân ${req.user.fullName} xác nhận đã nhận tiền tại quầy`, ...(method === 'BANK_TRANSFER' ? { transactionCode: reference } : {}) }, ...(method === 'CASH' ? { $unset: { transactionCode: 1 } } : {}) },
      { returnDocument: 'after', runValidators: true }
    );
    if (!updated) return res.status(409).json({ message: 'Giao dịch đã được xử lý. Vui lòng tải lại trạng thái.' });
    await Order.updateOne({ _id: order._id }, { $set: { paymentMethod: method } });
    res.json({ payment: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
