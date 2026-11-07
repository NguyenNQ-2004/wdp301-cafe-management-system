const express = require('express');
const { randomBytes } = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { protect } = require('../middlewares/authMiddleware');
const { demoPaymentsEnabled } = require('../utils/paymentMode');
const { awardOrderPoints } = require('../utils/orderLoyalty');
const { lockOrder } = require('../utils/orderMutation');
const gateway = require('../utils/paymentGateway');
const { clearCheckoutCart } = require('../utils/checkoutCart');

const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router(), ['POST /order/:orderId/gateway']);
const canManageCounter = (user) => user.role === 'ADMIN' || (user.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user.position));
router.get('/config', (_req, res) => res.json({ demoEnabled: demoPaymentsEnabled(), gatewayEnabled: gateway.enabled() }));
// The gateway authenticates callbacks with HMAC, independently of browser JWTs.
router.post('/callback', async (req, res) => {
  let unlock;
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || !gateway.verify(body)) return res.status(401).json({ accepted: false, message: 'Chữ ký callback không hợp lệ.' });
    const amount = Number(body.amount);
    if (!Number.isSafeInteger(amount) || amount < 0 || !['SUCCESS', 'FAILED'].includes(String(body.status).toUpperCase())) return res.status(400).json({ accepted: false, message: 'Dữ liệu callback không hợp lệ.' });
    const order = await Order.findOne({ orderCode: body.orderCode, orderType: 'ONLINE', paymentMethod: 'BANK_TRANSFER' });
    if (!order) return res.status(404).json({ accepted: false, message: 'Không tìm thấy giao dịch.' });
    unlock = lockOrder(order._id);
    // Reload after acquiring the same lock used by order cancellation.
    const current = await Order.findById(order._id);
    if (!current || current.status === 'CANCELLED' || current.finalAmount !== amount) return res.status(409).json({ accepted: false, message: 'Đơn đã hủy hoặc số tiền không khớp.' });
    const payment = await Payment.findOne({ order: order._id, paymentMethod: 'BANK_TRANSFER', transactionCode: body.transactionCode, amount });
    if (!payment) return res.status(409).json({ accepted: false, message: 'Mã giao dịch không khớp.' });
    if (payment.status === 'SUCCESS') {
      if (String(body.status).toUpperCase() !== 'SUCCESS') return res.status(409).json({ accepted: false, message: 'Giao dịch đã thanh toán.' });
    } else {
      if (payment.status !== 'PENDING') return res.status(409).json({ accepted: false, message: 'Giao dịch không còn chờ xử lý.' });
      const status = String(body.status).toUpperCase();
      await Payment.updateOne({ _id: payment._id, status: 'PENDING' }, { $set: { status, ...(status === 'SUCCESS' ? { paidAt: new Date() } : {}), paymentNote: 'Xác nhận qua callback có chữ ký của cổng thanh toán' } });
    }
    if (String(body.status).toUpperCase() === 'SUCCESS') {
      await Order.updateOne({ _id: order._id, status: 'PENDING' }, { $set: { status: 'CONFIRMED' } });
      await awardOrderPoints(order._id);
      await clearCheckoutCart(order);
    }
    return res.json({ accepted: true, successful: String(body.status).toUpperCase() === 'SUCCESS' });
  } catch (failure) {
    if (failure.hasErrorLabel?.('TransientTransactionError')) throw failure;
    return res.status(failure.status || 500).json({ accepted: false, message: 'Không thể xử lý callback thanh toán.' });
  }
  finally { unlock?.(); }
});
router.use(protect);

router.post('/order/:orderId/cod', async (req, res) => {
  let unlock;
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'Mã đơn không hợp lệ.' });
    unlock = lockOrder(req.params.orderId);
    const order = await Order.findOne({ _id: req.params.orderId, customer: req.user._id, orderType: 'ONLINE' });
    if (!order || req.user.role !== 'CUSTOMER') return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    const payment = await Payment.findOne({ order: order._id, status: 'PENDING', amount: order.finalAmount });
    if (payment && order.paymentMethod === 'COD' && order.status !== 'CANCELLED') {
      await clearCheckoutCart(order);
      return res.json({ order, message: 'Đơn đã xác nhận thanh toán khi nhận hàng.' });
    }
    if (!payment || order.status !== 'PENDING' || !['BANK_TRANSFER', 'DEMO_ONLINE'].includes(order.paymentMethod)) return res.status(409).json({ message: 'Chỉ được chuyển COD khi giao dịch online còn chờ thanh toán.' });
    const updated = await Order.findOneAndUpdate({ _id: order._id, status: 'PENDING', paymentMethod: order.paymentMethod }, { $set: { paymentMethod: 'COD', status: 'CONFIRMED' } }, { returnDocument: 'after' });
    if (!updated) return res.status(409).json({ message: 'Đơn hàng đã được cập nhật.' });
    try {
      const result = await Payment.updateOne({ _id: payment._id, status: 'PENDING' }, { $set: { paymentMethod: 'CASH', transactionCode: `COD-${order.orderCode}`, paymentNote: 'Khách chuyển sang thanh toán khi nhận hàng' }, $unset: { demoProvider: 1 } });
      if (result.modifiedCount !== 1) throw new Error('Giao dịch đã được cập nhật.');
    } catch (failure) {
      await Order.updateOne({ _id: order._id, paymentMethod: 'COD', status: 'CONFIRMED' }, { $set: { paymentMethod: order.paymentMethod, status: order.status } });
      throw failure;
    }
    await clearCheckoutCart(updated);
    return res.json({ order: updated, message: 'Đã chuyển sang thanh toán khi nhận hàng.' });
  } catch (failure) { return res.status(failure.status || 500).json({ message: 'Không thể chuyển sang COD. Vui lòng tải lại đơn hàng.' }); }
  finally { unlock?.(); }
});

router.post('/order/:orderId/gateway', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'Mã đơn không hợp lệ.' });
    const order = await Order.findById(req.params.orderId);
    if (!order || req.user.role !== 'CUSTOMER' || String(order.customer) !== String(req.user._id)) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    const payment = await Payment.findOne({ order: order._id, paymentMethod: 'BANK_TRANSFER', status: 'PENDING' });
    if (!payment || order.paymentMethod !== 'BANK_TRANSFER' || order.status !== 'PENDING') return res.status(409).json({ message: 'Giao dịch không còn chờ thanh toán.' });
    await gateway.register(order, payment);
    res.json(gateway.info(order));
  } catch (failure) { res.status(failure.status || 502).json({ message: failure.status ? failure.message : 'Không kết nối được cổng thanh toán. Vui lòng thử lại.' }); }
});

// 1. GET ALL PAYMENTS
router.get('/', async (req, res) => {
  try {
    const isShipper = req.user.role === 'STAFF' && req.user.position === 'SHIPPER';
    if (!canManageCounter(req.user) && !isShipper) return res.status(403).json({ message: 'Không có quyền xem giao dịch thanh toán.' });
    const filter = {};
    if (req.user.role === 'STAFF') {
      filter.order = { $in: await Order.distinct('_id', isShipper ? { orderType: 'ONLINE', shipper: req.user._id } : { orderType: { $in: ['DINE_IN', 'TAKEAWAY'] } }) };
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
    res.json({ order: { _id: order._id, orderCode: order.orderCode, finalAmount: order.finalAmount, totalAmount: order.totalAmount, discountAmount: order.discountAmount, deliveryFee: order.deliveryFee, pointsRedeemed: order.pointsRedeemed, recipientName: order.recipientName, recipientPhone: order.recipientPhone, deliveryAddress: order.deliveryAddress, createdAt: order.createdAt, items: order.items.map(item => ({ product: item.product, productNameAtTime: item.productNameAtTime, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal, customization: item.customization })), orderType: order.orderType, status: order.status, paymentMethod: order.paymentMethod }, payment, demoEnabled: demoPaymentsEnabled(), gateway: gateway.enabled() && order.orderType === 'ONLINE' && order.paymentMethod === 'BANK_TRANSFER' ? gateway.info(order) : null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/demo-confirm', async (req, res) => {
  let unlock;
  try {
    if (!demoPaymentsEnabled()) return res.status(403).json({ message: 'Thanh toán mô phỏng hiện không khả dụng.' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã giao dịch không hợp lệ.' });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Không tìm thấy giao dịch.' });
    unlock = lockOrder(payment.order);
    const order = await Order.findById(payment.order);
    if (!order || String(order.customer) !== String(req.user._id) || req.user.role !== 'CUSTOMER') return res.status(403).json({ message: 'Không có quyền thanh toán đơn hàng này.' });
    if (payment.paymentMethod !== 'DEMO_ONLINE' || order.paymentMethod !== 'DEMO_ONLINE') return res.status(400).json({ message: 'Đơn hàng không dùng thanh toán mô phỏng.' });
    if (order.status === 'CANCELLED') return res.status(409).json({ message: 'Đơn hàng đã hủy.' });
    if (payment.amount !== order.finalAmount) return res.status(409).json({ message: 'Số tiền thanh toán không khớp đơn hàng.' });
    if (payment.status === 'SUCCESS') { await awardOrderPoints(order._id); await clearCheckoutCart(order); return res.json({ payment }); }
    if (payment.status !== 'PENDING') return res.status(409).json({ message: 'Giao dịch không còn chờ thanh toán.' });
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'PENDING' },
      { $set: { status: 'SUCCESS', paidAt: new Date(), transactionCode: `DEMO-${randomBytes(6).toString('hex').toUpperCase()}`, paymentNote: 'Đã xác nhận trên cổng thanh toán mô phỏng; không thu tiền thật' } },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(409).json({ message: 'Giao dịch đã được xử lý. Vui lòng tải lại trạng thái.' });
    await Order.updateOne({ _id: order._id, status: 'PENDING' }, { $set: { status: 'CONFIRMED' } });
    await awardOrderPoints(order._id);
    await clearCheckoutCart(order);
    res.json({ payment: updated });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
  finally { unlock?.(); }
});

// UC13: nhân viên thu ngân xác nhận đã nhận tiền tại quầy.
router.post('/:id/counter-confirm', async (req, res) => {
  let unlock;
  try {
    if (!canManageCounter(req.user)) return res.status(403).json({ message: 'Chỉ thu ngân hoặc quản lý được xác nhận thanh toán tại quầy.' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã giao dịch không hợp lệ.' });
    const method = req.body.paymentMethod;
    const reference = typeof req.body.transactionCode === 'string' ? req.body.transactionCode.trim() : '';
    if (!['CASH', 'BANK_TRANSFER', 'MOMO', 'VNPAY'].includes(method)) return res.status(400).json({ message: 'Phương thức thanh toán tại quầy không hợp lệ.' });
    if (method !== 'CASH' && (!reference || reference.length > 100)) return res.status(400).json({ message: 'Nhập mã giao dịch đã đối chiếu (tối đa 100 ký tự).' });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Không tìm thấy giao dịch.' });
    unlock = lockOrder(payment.order);
    const order = await Order.findById(payment.order);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    if (!['TAKEAWAY', 'DINE_IN'].includes(order.orderType)) return res.status(400).json({ message: 'Đây không phải đơn thanh toán tại quầy.' });
    if (order.status === 'CANCELLED') return res.status(409).json({ message: 'Đơn hàng đã hủy.' });
    if (payment.amount !== order.finalAmount) return res.status(409).json({ message: 'Số tiền thanh toán không khớp đơn hàng.' });
    if (payment.status === 'SUCCESS') {
      if (payment.paymentMethod !== method || (method !== 'CASH' && payment.transactionCode !== reference)) return res.status(409).json({ message: 'Giao dịch đã được thanh toán bằng hình thức khác.' });
      await awardOrderPoints(order._id);
      return res.json({ payment });
    }
    if (payment.status !== 'PENDING') return res.status(409).json({ message: 'Giao dịch không còn chờ thanh toán.' });
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'PENDING' },
      { $set: { paymentMethod: method, status: 'SUCCESS', paidAt: new Date(), receivedBy: req.user._id, paymentNote: `Thu ngân ${req.user.fullName} xác nhận đã nhận tiền tại quầy và tự đối soát giao dịch`, ...(method !== 'CASH' ? { transactionCode: reference } : {}) }, ...(method === 'CASH' ? { $unset: { transactionCode: 1 } } : {}) },
      { returnDocument: 'after', runValidators: true }
    );
    if (!updated) return res.status(409).json({ message: 'Giao dịch đã được xử lý. Vui lòng tải lại trạng thái.' });
    await Order.updateOne({ _id: order._id }, { $set: { paymentMethod: method } });
    await Order.updateOne({ _id: order._id, status: 'PENDING' }, { $set: { status: 'CONFIRMED' } });
    await awardOrderPoints(order._id);
    res.json({ payment: updated });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
  finally { unlock?.(); }
});

module.exports = router;
