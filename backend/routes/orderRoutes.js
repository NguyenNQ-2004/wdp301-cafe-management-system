const express = require('express');
const { randomBytes } = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const User = require('../models/User');
const RewardItem = require('../models/RewardItem');
const ShopSetting = require('../models/ShopSetting');
const DeliveryArea = require('../models/DeliveryArea');
const WorkSchedule = require('../models/WorkSchedule');
const { protect } = require('../middlewares/authMiddleware');
const { normalizeCartItems } = require('../utils/cartItems');
const { demoPaymentsEnabled } = require('../utils/paymentMode');
const paymentGateway = require('../utils/paymentGateway');
const { awardOrderPoints, refundRedemption } = require('../utils/orderLoyalty');
const { deductOrderStock, checkCheckoutStock } = require('../utils/orderInventory');
const { checkoutIdentity } = require('../utils/checkoutIdentity');
const { clearCheckoutCart } = require('../utils/checkoutCart');
const { withOrderMutation } = require('../utils/orderMutation');
const { adminOrCashier, authorizePosition } = require('../middlewares/authMiddleware');

const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());
router.use(protect);
router.use(async (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || req.user.role !== 'STAFF') return next();
  try {
    const now = new Date();
    const active = await WorkSchedule.exists({
      user: req.user._id, status: 'PRESENT',
      checkInTime: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), $lte: now },
      checkOutTime: { $exists: false }, handoverAt: { $exists: false }
    });
    if (!active) return res.status(409).json({ message: 'Nhân viên cần check-in ca đang làm trước khi thao tác đơn hàng.' });
    next();
  } catch (error) { next(error); }
});
const orderError = (message, status = 400) => Object.assign(new Error(message), { status });
const { lockOrder } = require('../utils/orderMutation');
const hasShipperOnShift = async (shipperId) => {
  const now = new Date();
  const shipperFilter = { role: 'STAFF', position: 'SHIPPER', status: 'ACTIVE' };
  if (shipperId) shipperFilter._id = shipperId;
  const shipperIds = await User.distinct('_id', shipperFilter);
  if (!shipperIds.length) return false;
  return !!await WorkSchedule.exists({
    user: { $in: shipperIds }, status: 'PRESENT',
    checkInTime: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), $lte: now },
    checkOutTime: { $exists: false }, handoverAt: { $exists: false }
  });
};
const validPhone = (value) => typeof value === 'string'
  && value.trim().length <= 30
  && /^\+?[0-9 .()-]+$/.test(value.trim())
  && (value.match(/\d/g) || []).length >= 9
  && (value.match(/\d/g) || []).length <= 15;

// 1. GET ALL ORDERS (Phân quyền theo Role)
router.get('/', async (req, res) => {
  try {
    const isStaffOrAdmin = ['ADMIN', 'STAFF'].includes(req.user.role);
    const filter = isStaffOrAdmin ? {} : { customer: req.user._id };
    if (req.user.role === 'STAFF' && req.user.position === 'SHIPPER') {
      filter.orderType = 'ONLINE';
      filter.$or = [{ shipper: req.user._id }, { status: 'READY', shipper: null }];
    }
    if (req.user.role === 'STAFF' && req.user.position === 'BARISTA') {
      const paid = await Payment.distinct('order', { status: 'SUCCESS' });
      filter.$or = [{ _id: { $in: paid } }, { orderType: 'ONLINE', paymentMethod: 'COD' }];
    }
    
    // Hỗ trợ query params: status, orderType
    if (req.query.status) {
      const statuses = typeof req.query.status === 'string' ? req.query.status.split(',') : [];
      if (!statuses.length || statuses.some(value => !['PENDING','CONFIRMED','PREPARING','READY','DELIVERING','COMPLETED','CANCELLED'].includes(value))) throw orderError('Bộ lọc trạng thái không hợp lệ.');
      filter.status = { $in: statuses };
    }
    if (req.query.orderType) {
      if (filter.orderType && req.query.orderType !== filter.orderType) return res.json([]);
      filter.orderType = req.query.orderType;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('customer', 'fullName phone totalPoints')
      .populate('cashier', 'fullName phone')
      .populate('shipper', 'fullName phone')
      .populate('items.product', 'imageUrl name basePrice');

    const payments = await Payment.find({ order: { $in: orders.map(order => order._id) } }).select('order amount status');
    const byOrder = new Map(payments.map(payment => [String(payment.order), payment]));
    res.json(orders.map(order => {
      const payment = byOrder.get(String(order._id));
      return { ...order.toObject(), paymentStatus: payment?.status, kitchenEligible: (payment?.status === 'SUCCESS' && payment.amount === order.finalAmount) || (order.orderType === 'ONLINE' && order.paymentMethod === 'COD') };
    }));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// 2. GET SINGLE ORDER BY ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'fullName phone totalPoints')
      .populate('cashier', 'fullName phone')
      .populate('shipper', 'fullName phone')
      .populate('items.product', 'imageUrl name basePrice');
    
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    
    // Khách chỉ được xem đơn của mình
    if (req.user.role === 'CUSTOMER' && String(order.customer?._id || order.customer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Không có quyền xem đơn hàng này.' });
    }
    if (req.user.role === 'STAFF' && req.user.position === 'SHIPPER' && String(order.shipper?._id || order.shipper || '') !== String(req.user._id)) return res.status(403).json({ message: 'Chỉ được xem đơn giao hàng được phân công.' });
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. CREATE ORDER (Khách đặt online / mang về, hoặc Thu ngân POS tạo tại quầy)
router.post('/', async (req, res) => {
  let unlockCheckout;
  let pointsReserved = 0;
  let pointsOwnerId;
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw orderError('Dữ liệu đặt hàng không hợp lệ.');
    const {
      items: rawItems,
      orderType,
      recipientName,
      recipientPhone,
      deliveryAddress,
      orderNote,
      tableNumber,
      paymentMethod,
      demoProvider,
      rewardId
    } = req.body;

    const isStaffOrAdmin = ['ADMIN', 'STAFF'].includes(req.user.role);
    const checkoutFlow = req.body.checkoutFlow === true;
    let identity = {};
    let unfinished;
    if (checkoutFlow && (req.user.role !== 'CUSTOMER' || orderType !== 'ONLINE')) throw orderError('Đặt hàng trên web chỉ hỗ trợ khách hàng và giao tận nơi.', 400);
    if (checkoutFlow) {
      identity = checkoutIdentity(req);
      unlockCheckout = lockOrder(`checkout:${req.user._id}:${identity.checkoutSessionId}`);
      const existing = await Order.findOne({ customer: req.user._id, idempotencyKey: identity.idempotencyKey });
      if (existing) {
        if (existing.requestHash !== identity.requestHash) throw orderError('Khóa yêu cầu đã được dùng cho nội dung khác.', 409);
        return res.status(201).json(existing);
      }
      unfinished = await Order.findOne({ customer: req.user._id, checkoutFlow: true, checkoutSessionId: identity.checkoutSessionId, status: 'PENDING', paymentMethod: 'BANK_TRANSFER' });
      if (!/^0\d{9,10}$/.test(String(recipientPhone || '').replace(/[\s.]/g, ''))) throw orderError('Số điện thoại cần 10–11 chữ số, bắt đầu bằng số 0.');
      for (const [key, minimum, maximum] of [['district', 2, 100], ['ward', 2, 100], ['addressDetail', 5, 150]]) {
        if (typeof req.body[key] !== 'string' || req.body[key].trim().length < minimum || req.body[key].trim().length > maximum) throw orderError('Vui lòng nhập đầy đủ Quận/Huyện, Phường/Xã và địa chỉ chi tiết.');
      }
    }

    // Chuẩn hóa danh sách món
    let items;
    try { items = await normalizeCartItems(rawItems); }
    catch (error) { throw orderError(error.message); }
    if (!items.length) throw orderError('Vui lòng chọn ít nhất một món.');
    if (checkoutFlow) await checkCheckoutStock(items);
    if (!['DINE_IN', 'TAKEAWAY', 'ONLINE'].includes(orderType)) {
      throw orderError('Loại đơn hàng không hợp lệ (DINE_IN, TAKEAWAY, ONLINE).');
    }
    if (orderType === 'ONLINE' && req.user.role !== 'CUSTOMER') throw orderError('Chỉ khách hàng được tạo đơn online.', 403);
    if (req.user.role === 'STAFF' && !['CASHIER', 'MANAGER'].includes(req.user.position)) throw orderError('Chỉ thu ngân hoặc quản lý được tạo đơn tại quầy.', 403);

    if (req.user.role === 'CUSTOMER' && orderType === 'DINE_IN') throw orderError('Phương thức nhận hàng không hợp lệ.');
    const needsContact = req.user.role === 'CUSTOMER' || orderType === 'ONLINE';
    const finalRecipientName = typeof recipientName === 'string' ? recipientName.trim() : '';
    const finalRecipientPhone = typeof recipientPhone === 'string' ? recipientPhone.trim() : '';
    const finalDeliveryAddress = checkoutFlow ? `${req.body.addressDetail.trim()}, ${req.body.ward.trim()}, ${req.body.district.trim()}, Hà Nội` : typeof deliveryAddress === 'string' ? deliveryAddress.trim() : '';
    if (needsContact && (!finalRecipientName || finalRecipientName.length > 100)) throw orderError('Tên người nhận phải từ 1 đến 100 ký tự.');
    if (needsContact && !validPhone(finalRecipientPhone)) throw orderError('Số điện thoại nhận hàng không hợp lệ.');
    if (orderType === 'ONLINE' && (finalDeliveryAddress.length < 5 || finalDeliveryAddress.length > 300)) throw orderError('Địa chỉ giao hàng phải từ 5 đến 300 ký tự.');
    if (orderNote != null && (typeof orderNote !== 'string' || orderNote.length > 500)) throw orderError('Ghi chú không hợp lệ.');
    if (tableNumber != null && (typeof tableNumber !== 'string' || tableNumber.length > 20)) throw orderError('Số bàn không hợp lệ.');
    const finalPaymentMethod = isStaffOrAdmin
      ? (paymentMethod || (orderType === 'ONLINE' ? 'COD' : 'CASH'))
      : (checkoutFlow ? 'BANK_TRANSFER' : orderType === 'ONLINE' ? (['DEMO_ONLINE', 'BANK_TRANSFER'].includes(paymentMethod) ? paymentMethod : 'COD') : 'PAY_AT_COUNTER');
    if (!['COD', 'PAY_AT_COUNTER', 'CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 'DEMO_ONLINE'].includes(finalPaymentMethod)) throw orderError('Phương thức thanh toán không hợp lệ.');
    if (isStaffOrAdmin && ['VNPAY', 'MOMO'].includes(finalPaymentMethod)) throw orderError('MoMo/VNPay tại quầy chưa kết nối cổng đối soát, vui lòng chọn tiền mặt hoặc chuyển khoản.', 503);
    if (isStaffOrAdmin && finalPaymentMethod === 'BANK_TRANSFER' && !paymentGateway.enabled()) throw orderError('Chuyển khoản tại quầy chưa cấu hình cổng đối soát.', 503);
    if (finalPaymentMethod === 'DEMO_ONLINE' && (orderType !== 'ONLINE' || req.user.role !== 'CUSTOMER' || !demoPaymentsEnabled())) throw orderError('Thanh toán mô phỏng hiện không khả dụng.', 403);
    if (!checkoutFlow && orderType === 'ONLINE' && finalPaymentMethod === 'BANK_TRANSFER' && !paymentGateway.enabled()) throw orderError('Thanh toán chuyển khoản chưa được cấu hình.', 503);
    if (demoProvider != null && (finalPaymentMethod !== 'DEMO_ONLINE' || !['MOMO', 'VNPAY', 'BANK_TRANSFER'].includes(demoProvider))) throw orderError('Kênh thanh toán mô phỏng không hợp lệ.');

    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    pointsOwnerId = req.user.role === 'CUSTOMER' ? req.user._id : req.body.customerId;
    if (pointsOwnerId && (!mongoose.isValidObjectId(pointsOwnerId) || !await User.exists({ _id: pointsOwnerId, role: 'CUSTOMER', status: 'ACTIVE' }))) throw orderError('Khách hàng không hợp lệ.');
    let reward = null;
    let requestedPoints = 0;
    let discountAmount = 0;
    if (rewardId != null) {
      if (req.user.role !== 'CUSTOMER') throw orderError('Chỉ tài khoản khách hàng được sử dụng điểm tích lũy.', 403);
      if (!mongoose.isValidObjectId(rewardId)) throw orderError('Ưu đãi điểm không hợp lệ.');
      reward = await RewardItem.findOne({ _id: rewardId, status: 'ACTIVE' });
      if (!reward || reward.stock === 0) throw orderError('Ưu đãi điểm không còn khả dụng.', 409);
      if (!Number.isInteger(reward.pointsCost) || reward.pointsCost <= 0 || !Number.isInteger(reward.discountValue) || reward.discountValue <= 0 || !Number.isInteger(reward.minOrderValue) || reward.minOrderValue < 0) throw orderError('Cấu hình ưu đãi điểm không hợp lệ.', 409);
      if (totalAmount < reward.minOrderValue) throw orderError('Đơn hàng chưa đạt mức tối thiểu để đổi ưu đãi điểm.', 409);
      discountAmount = Math.min(reward.discountValue, totalAmount);
    }
    if (req.body.pointsToRedeem != null && req.body.pointsToRedeem !== 0) {
      if (rewardId != null || !pointsOwnerId || !Number.isSafeInteger(req.body.pointsToRedeem) || req.body.pointsToRedeem < 0) throw orderError('Điểm đổi không hợp lệ.');
      const settings = await ShopSetting.find({ settingKey: { $in: ['points_step', 'points_step_value'] } });
      const rules = Object.fromEntries(settings.map(item => [item.settingKey, Number(item.settingValue)]));
      const step = rules.points_step ?? 10;
      const value = rules.points_step_value ?? 2000;
      if (!Number.isSafeInteger(step) || step < 1 || !Number.isSafeInteger(value) || value < 1) throw orderError('Quy tắc đổi điểm chưa khả dụng.', 409);
      const customer = await User.findById(pointsOwnerId).select('totalPoints');
      const availablePoints = customer.totalPoints + (unfinished?.pointsRedeemed || 0);
      const steps = Math.floor(req.body.pointsToRedeem / step);
      if (req.body.pointsToRedeem > availablePoints || steps * value > totalAmount) throw orderError('Điểm đổi không được vượt số dư hoặc tiền món.', 409);
      requestedPoints = steps * step;
      if (!requestedPoints) throw orderError('Không đủ điểm hoặc giá trị đơn để đổi điểm.', 409);
      discountAmount = steps * value;
    }
    const shippingSettings = Object.fromEntries((await ShopSetting.find({ settingKey: { $in: ['freeship_threshold', 'delivery_fee'] } }).lean()).map(setting => [setting.settingKey, Number(setting.settingValue)]));
    const threshold = shippingSettings.freeship_threshold ?? 150000;
    const configuredFee = shippingSettings.delivery_fee ?? 18000;
    if (![threshold, configuredFee].every(value => Number.isSafeInteger(value) && value >= 0)) throw orderError('Cấu hình phí giao hàng không hợp lệ.', 409);

    let areaFee = configuredFee;
    if (orderType === 'ONLINE' && (typeof req.body.district !== 'string' || req.body.district.trim().length < 2 || req.body.district.trim().length > 100)) throw orderError('Vui lòng chọn khu vực giao hàng được phục vụ.');
    if (orderType === 'ONLINE' && req.body.district && typeof req.body.district === 'string') {
      const trimmedDistrict = req.body.district.trim();
      const area = await DeliveryArea.findOne({
        district: { $regex: new RegExp(`^${trimmedDistrict.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (!area) throw orderError('Khu vực này chưa được phục vụ giao hàng.');
      if (area) {
        if (!area.isActive) throw orderError(`Khu vực "${trimmedDistrict}" hiện đang tạm ngưng nhận giao hàng.`, 400);
        areaFee = area.deliveryFee;
      }
    }
    const deliveryFee = orderType === 'ONLINE' && totalAmount < threshold ? areaFee : 0;
    const finalAmount = totalAmount + deliveryFee - discountAmount;
    if (req.user.role === 'CUSTOMER' && (!Number.isInteger(req.body.expectedTotal) || req.body.expectedTotal !== finalAmount)) return res.status(409).json({ message: 'Giá món, ưu đãi điểm hoặc phí giao hàng đã thay đổi. Vui lòng kiểm tra lại giỏ hàng trước khi đặt.', finalAmount });
    if (orderType === 'ONLINE' && !await hasShipperOnShift()) {
      throw orderError('Hiện không có shipper đã check-in trong ca để nhận đơn giao. Vui lòng thử lại sau.', 409);
    }
    // Validation is complete. Replacement and all subsequent effects share the
    // same database transaction as callbacks/cancellation, not just a JS lock.
    if (checkoutFlow) {
      // A common write serializes concurrent checkouts across API processes,
      // including the first order where there is no existing Order to lock.
      const claim = await User.updateOne({ _id: req.user._id, role: 'CUSTOMER', status: 'ACTIVE' }, { $inc: { checkoutRevision: 1 } });
      if (claim.matchedCount !== 1) throw orderError('Tài khoản không còn khả dụng.', 409);
    }
    if (unfinished) {
      if (await Payment.exists({ order: unfinished._id, status: 'SUCCESS' })) throw orderError('Đơn trước đã thanh toán, không thể thay thế.', 409);
      const replaced = await Order.findOneAndUpdate({ _id: unfinished._id, customer: req.user._id, checkoutSessionId: identity.checkoutSessionId, status: 'PENDING', paymentMethod: 'BANK_TRANSFER' }, { $set: { status: 'CANCELLED', cancelReason: 'Khách đặt lại đơn mới trong cùng phiên' } }, { returnDocument: 'after' });
      if (!replaced) throw orderError('Đơn trước vừa được cập nhật.', 409);
      await refundRedemption(replaced);
      await Payment.updateMany({ order: replaced._id, status: 'PENDING' }, { $set: { status: 'FAILED' } });
    }
    if (reward || requestedPoints) {
      const cost = reward ? reward.pointsCost : requestedPoints;
      const customer = await User.findOneAndUpdate({ _id: pointsOwnerId, role: 'CUSTOMER', status: 'ACTIVE', totalPoints: { $gte: cost } }, { $inc: { totalPoints: -cost } }, { returnDocument: 'after' });
      if (!customer) throw orderError('Bạn không còn đủ điểm để đổi ưu đãi này.', 409);
      pointsReserved = cost;
      if (reward && reward.stock !== -1) {
        const claimed = await RewardItem.findOneAndUpdate({ _id: reward._id, status: 'ACTIVE', stock: { $gt: 0 } }, { $inc: { stock: -1 } });
        if (!claimed) throw orderError('Ưu đãi điểm vừa hết số lượng.', 409);
      }
    }

    // Sinh mã đơn AURA
    const orderCode = `AURA-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    const orderData = {
      orderCode,
      checkoutFlow,
      ...identity,
      customer: req.user.role === 'CUSTOMER' ? req.user._id : (req.body.customerId || undefined),
      cashier: isStaffOrAdmin ? req.user._id : undefined,
      orderType,
      status: 'PENDING',
      items: items.map(({ product, quantity, customization, unitPrice }) => ({
        product: product._id,
        productNameAtTime: product.name,
        unitPrice,
        customization,
        quantity,
        subtotal: unitPrice * quantity,
        isPrepared: false
      })),
      totalAmount,
      reward: reward?._id,
      pointsRedeemed: pointsReserved,
      discountAmount,
      deliveryFee,
      district: orderType === 'ONLINE' && req.body.district ? req.body.district.trim() : undefined,
      ward: orderType === 'ONLINE' && req.body.ward ? req.body.ward.trim() : undefined,
      addressDetail: orderType === 'ONLINE' && req.body.addressDetail ? req.body.addressDetail.trim() : undefined,
      finalAmount,
      recipientName: finalRecipientName || undefined,
      recipientPhone: finalRecipientPhone || undefined,
      deliveryAddress: orderType === 'ONLINE' ? finalDeliveryAddress : undefined,
      tableNumber: orderType === 'DINE_IN' ? tableNumber?.trim() : undefined,
      orderNote: orderNote?.trim() || undefined,
      paymentMethod: finalPaymentMethod,
      ...(finalPaymentMethod === 'DEMO_ONLINE' && demoProvider ? { demoProvider } : {})
    };

    const order = await Order.create(orderData);

    // Đồng bộ vào bảng order_items (Table 6)
    for (const it of orderData.items) {
      await OrderItem.create({
        order: order._id,
        product: it.product,
        productNameAtTime: it.productNameAtTime,
        unitPrice: it.unitPrice,
        customization: it.customization,
        quantity: it.quantity,
        subtotal: it.subtotal,
        isPrepared: it.isPrepared
      });
    }

    // Tự động tạo payment ban đầu
    await Payment.create({
      order: order._id,
      paymentMethod: finalPaymentMethod === 'DEMO_ONLINE' ? 'DEMO_ONLINE' : ['CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER'].includes(finalPaymentMethod) ? finalPaymentMethod : 'CASH',
      ...(finalPaymentMethod === 'DEMO_ONLINE' && demoProvider ? { demoProvider } : {}),
      amount: finalAmount,
      status: 'PENDING',
      paymentNote: finalPaymentMethod === 'DEMO_ONLINE' ? 'Giao dịch mô phỏng, không thu tiền thật' : orderType === 'ONLINE' ? 'Đơn đặt online' : 'Thanh toán tại quầy',
      ...(finalPaymentMethod === 'BANK_TRANSFER' ? { transactionCode: `QR-${randomBytes(12).toString('hex').toUpperCase()}` } : {})
    });

    if (pointsReserved) await LoyaltyTransaction.create({ customer: pointsOwnerId, order: order._id, pointsChange: -pointsReserved, transactionType: 'REDEEM' });
    if (order.status === 'PREPARING') await deductOrderStock(order, req.user._id);

    // Dọn dẹp giỏ hàng nếu là customer
    if (req.user.role === 'CUSTOMER' && !checkoutFlow) {
      await clearCheckoutCart(order);
    }

    res.status(201).json(order);
  } catch (error) {
    if (error.hasErrorLabel?.('TransientTransactionError')) throw error;
    res.status(error.status || (error.code === 11000 || error.name === 'VersionError' ? 409 : error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
  } finally { unlockCheckout?.(); }
});

// 4. UPDATE ORDER STATUS (Dành cho Thu ngân, Pha chế, Shipper, Quản lý)
router.put('/:id/status', withOrderMutation(async (req, res) => {
  let unlock;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    unlock = lockOrder(req.params.id);
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Dữ liệu cập nhật đơn hàng không hợp lệ.' });
    }
    const { status, cancelReason, shipperId } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'];
    if (Object.keys(req.body || {}).some((key) => !['status', 'cancelReason', 'shipperId', 'orderNote', 'collectedAmount'].includes(key))) {
      return res.status(400).json({ message: 'Dữ liệu cập nhật đơn hàng không hợp lệ.' });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ.' });
    }
    if (cancelReason !== undefined && (typeof cancelReason !== 'string' || cancelReason.trim().length > 500)) {
      return res.status(400).json({ message: 'Lý do hủy phải có tối đa 500 ký tự.' });
    }
    if (req.body.orderNote !== undefined && (typeof req.body.orderNote !== 'string' || req.body.orderNote.trim().length > 500)) {
      return res.status(400).json({ message: 'Ghi chú đơn hàng phải có tối đa 500 ký tự.' });
    }
    if (shipperId !== undefined && shipperId !== null && !mongoose.isValidObjectId(shipperId)) {
      return res.status(400).json({ message: 'Mã nhân viên giao hàng không hợp lệ.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

    const isAdmin = req.user.role === 'ADMIN';
    const isStaff = req.user.role === 'STAFF';
    const position = req.user.position;
    const isShipper = isStaff && position === 'SHIPPER';
    if (!isAdmin && !isStaff && req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật đơn hàng.' });
    }

    if (req.user.role === 'CUSTOMER') {
      if (String(order.customer) !== String(req.user._id)) return res.status(403).json({ message: 'Bạn không có quyền cập nhật đơn hàng này.' });
      if (status !== 'CANCELLED' || order.status !== 'PENDING' || await Payment.exists({ order: order._id, status: 'SUCCESS' })) {
        return res.status(409).json({ message: 'Khách hàng chỉ có thể hủy đơn PENDING chưa thanh toán.' });
      }
      if (shipperId !== undefined) return res.status(403).json({ message: 'Khách hàng không được thay đổi nhân viên giao hàng.' });
    }
    if (req.body.orderNote !== undefined && !(isAdmin || (isStaff && position === 'MANAGER') || (isShipper && String(order.shipper || '') === String(req.user._id) && status === 'READY' && shipperId === null))) {
      return res.status(403).json({ message: 'Bạn không có quyền ghi chú sự cố cho đơn hàng này.' });
    }

    const allowedNext = {
      PENDING: ['CONFIRMED', 'PREPARING', 'CANCELLED'],
      CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['PREPARING', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
      DELIVERING: ['READY', 'COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: []
    };
    if (status !== order.status && !allowedNext[order.status]?.includes(status)) {
      return res.status(409).json({ message: `Không thể chuyển đơn từ ${order.status} sang ${status}.` });
    }
    if (status === 'DELIVERING' && order.orderType !== 'ONLINE') {
      return res.status(409).json({ message: 'Chỉ đơn giao hàng mới được chuyển sang trạng thái đang giao.' });
    }
    if (status === 'COMPLETED' && order.orderType === 'ONLINE' && order.status !== 'DELIVERING') {
      return res.status(409).json({ message: 'Đơn giao hàng phải ở trạng thái đang giao trước khi hoàn tất.' });
    }
    if (status === 'CANCELLED' && (!cancelReason || !cancelReason.trim())) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do hủy đơn.' });
    }
    if (status === 'CANCELLED' && await Payment.exists({ order: order._id, status: 'SUCCESS' })) {
      return res.status(409).json({ message: 'Đơn đã thanh toán. Quản lý cần xác nhận hoàn tiền rồi hủy đơn trong màn hình quản trị.' });
    }
    if (status !== 'CANCELLED' && cancelReason !== undefined) {
      return res.status(400).json({ message: 'Chỉ được gửi lý do khi hủy đơn.' });
    }

    if (isShipper) {
      const assigningSelf = shipperId != null && String(shipperId) === String(req.user._id);
      const unassigningSelf = shipperId === null && String(order.shipper || '') === String(req.user._id) && status === 'READY';
      const ownsOrder = String(order.shipper || '') === String(req.user._id);
      const canClaim = status === 'READY' && order.status === 'READY' && order.orderType === 'ONLINE' && !order.shipper && assigningSelf;
      const canDeliver = ownsOrder && order.orderType === 'ONLINE' && ['DELIVERING', 'COMPLETED', 'CANCELLED'].includes(status);
      const canReturn = ownsOrder && order.orderType === 'ONLINE' && status === 'READY' && unassigningSelf;
      if ((!canClaim && !canDeliver && !canReturn) || (shipperId !== undefined && !assigningSelf && !unassigningSelf)) {
        return res.status(403).json({ message: 'Shipper chỉ được nhận đơn sẵn sàng hoặc cập nhật đơn đang giao của mình.' });
      }
    } else if (isStaff && position === 'BARISTA' && !['PREPARING', 'READY', 'CANCELLED'].includes(status)) {
      return res.status(403).json({ message: 'Barista chỉ được cập nhật trạng thái chuẩn bị món.' });
    } else if (isStaff && position === 'CASHIER' && !['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(403).json({ message: 'Thu ngân chỉ được xác nhận, hoàn tất đơn tại quầy hoặc hủy đơn.' });
    } else if (isStaff && position === 'CASHIER' && status === 'COMPLETED' && order.orderType === 'ONLINE') {
      return res.status(403).json({ message: 'Thu ngân không được xác nhận hoàn tất đơn giao hàng.' });
    } else if (isStaff && !['MANAGER', 'CASHIER', 'BARISTA', 'SHIPPER'].includes(position)) {
      return res.status(403).json({ message: 'Chức vụ hiện tại không được cập nhật đơn hàng.' });
    }

    if (shipperId !== undefined) {
      if (shipperId === null) {
        const managerMayRelease = isAdmin || (isStaff && position === 'MANAGER');
        const shipperMayRelease = isShipper && status === 'READY' && String(order.shipper || '') === String(req.user._id);
        if (order.orderType !== 'ONLINE' || ['COMPLETED', 'CANCELLED'].includes(order.status) || (!managerMayRelease && !shipperMayRelease)) {
          return res.status(403).json({ message: 'Bạn không có quyền bỏ gán shipper khỏi đơn hàng này.' });
        }
        order.shipper = undefined;
      }
      else {
        const shipper = await User.findOne({ _id: shipperId, role: 'STAFF', position: 'SHIPPER', status: 'ACTIVE' }).select('_id');
        if (!shipper) return res.status(400).json({ message: 'Nhân viên giao hàng không tồn tại hoặc không hoạt động.' });
        if (order.orderType !== 'ONLINE' || !['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) return res.status(409).json({ message: 'Chỉ có thể gán shipper cho đơn giao hàng chưa kết thúc.' });
        if (!isAdmin && !(isStaff && ['MANAGER', 'SHIPPER'].includes(position))) return res.status(403).json({ message: 'Bạn không có quyền gán nhân viên giao hàng.' });
        if (isShipper && String(shipperId) !== String(req.user._id)) return res.status(403).json({ message: 'Shipper chỉ được nhận đơn cho chính mình.' });
        if (isShipper && order.shipper && String(order.shipper) !== String(shipperId)) return res.status(409).json({ message: 'Đơn hàng đã được gán cho shipper khác.' });
        order.shipper = shipper._id;
      }
    }

    if (order.orderType === 'ONLINE' && ['DELIVERING', 'COMPLETED'].includes(status)) {
      if (!order.shipper || !await hasShipperOnShift(order.shipper)) {
        return res.status(409).json({ message: 'Shipper được phân công phải đã check-in và còn trong ca trước khi giao hoặc hoàn tất đơn.' });
      }
    }

    const previousStatus = order.status;
    const previousCancelReason = order.cancelReason;
    if (isStaff && position === 'CASHIER' && status === 'CANCELLED' && (order.orderType === 'ONLINE' || !['PENDING', 'CONFIRMED', 'CANCELLED'].includes(order.status))) return res.status(409).json({ message: 'Thu ngân chỉ được hủy đơn tại quầy đang chờ hoặc đã xác nhận.' });
    if (status === 'COMPLETED' && order.status !== 'COMPLETED' && order.orderType === 'ONLINE' && order.paymentMethod === 'COD' && req.body.collectedAmount !== order.finalAmount) return res.status(409).json({ message: 'Số tiền COD thực thu phải bằng số tiền của đơn hàng.' });
    if (['PREPARING','READY','COMPLETED'].includes(status) && !(order.orderType === 'ONLINE' && order.paymentMethod === 'COD') && !await Payment.exists({ order: order._id, status: 'SUCCESS', amount: order.finalAmount })) {
      return res.status(409).json({ message: 'Đơn hàng phải thanh toán trước khi pha chế hoặc bàn giao.' });
    }
    if (status === 'READY' && order.status === 'PREPARING' && (!order.items.length || order.items.some(item => !item.isPrepared))) return res.status(409).json({ message: 'Cần đánh dấu tất cả món đã pha xong trước khi hoàn thành đơn.' });
    if (['PREPARING', 'READY'].includes(status)) await deductOrderStock(order, req.user._id);
    order.status = status;
    if (cancelReason !== undefined) order.cancelReason = cancelReason.trim();
    if (req.body.orderNote !== undefined) order.orderNote = req.body.orderNote.trim();

    await order.save();
    // COD được thu khi giao xong; đơn tại quầy và demo có bước xác nhận riêng.
    if (status === 'COMPLETED') {
      if (order.orderType === 'ONLINE' && order.paymentMethod === 'COD') {
        await Payment.findOneAndUpdate(
          { order: order._id, status: 'PENDING', paymentMethod: 'CASH' },
          { $set: { status: 'SUCCESS', paidAt: new Date(), receivedBy: req.user._id, paymentNote: 'Thu tiền COD khi giao hàng hoàn tất' } },
          { returnDocument: 'after' }
        );
      }
    }

    if (status === 'COMPLETED') await awardOrderPoints(order._id);
    if (status === 'CANCELLED') {
      try { await refundRedemption(order); }
      catch (error) {
        order.status = previousStatus;
        order.cancelReason = previousCancelReason;
        await order.save();
        throw error;
      }
      await Payment.updateMany({ order: order._id, status: 'PENDING' }, { $set: { status: 'FAILED' } });
    }
    res.json({ message: 'Cập nhật trạng thái thành công!', order });
  } catch (error) {
    res.status(error.status || (error.name === 'VersionError' ? 409 : error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
  } finally { unlock?.(); }
}));

// 5. BARISTA KDS: TOGGLE ITEM PREPARED (Tích từng món đã pha xong)
router.put('/:id/items/:itemIndex/prepared', authorizePosition('BARISTA', 'MANAGER'), withOrderMutation(async (req, res) => {
  let unlock;
  try {
    if (req.user.role !== 'ADMIN' && !(req.user.role === 'STAFF' && ['BARISTA', 'MANAGER'].includes(req.user.position))) return res.status(403).json({ message: 'Chỉ nhân viên pha chế hoặc quản lý được cập nhật chế biến.' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    unlock = lockOrder(req.params.id);
    const { itemIndex } = req.params;
    const { isPrepared } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    if (!['PREPARING', 'READY'].includes(order.status)) return res.status(409).json({ message: 'Đơn hàng không ở bước pha chế.' });
    if (isPrepared !== undefined && typeof isPrepared !== 'boolean') return res.status(400).json({ message: 'Trạng thái chế biến không hợp lệ.' });

    const idx = /^\d+$/.test(itemIndex) ? Number(itemIndex) : NaN;
    if (isNaN(idx) || idx < 0 || idx >= order.items.length) {
      return res.status(400).json({ message: 'Mã số món không hợp lệ.' });
    }

    await deductOrderStock(order, req.user._id);
    order.items[idx].isPrepared = isPrepared !== undefined ? isPrepared : !order.items[idx].isPrepared;
    
    // Nếu tất cả các món đã pha xong -> có thể chuyển sang READY
    const allPrepared = order.items.every(it => it.isPrepared);
    if (allPrepared && order.status === 'PREPARING' && req.body.autoReady !== false) {
      order.status = 'READY';
    }
    if (!allPrepared && order.status === 'READY') order.status = 'PREPARING';

    await order.save();

    // Đồng bộ sang bảng order_items
    const orderItems = await OrderItem.find({ order: order._id });
    if (orderItems[idx]) {
      orderItems[idx].isPrepared = order.items[idx].isPrepared;
      await orderItems[idx].save();
    }

    res.json({ message: 'Đã cập nhật trạng thái chế biến món!', order });
  } catch (error) {
    res.status(error.status || (error.name === 'VersionError' ? 409 : 500)).json({ message: error.message });
  } finally { unlock?.(); }
}));
// Edit counter orders before payment or the first item is marked prepared.
router.put('/:id/counter', adminOrCashier, withOrderMutation(async (req, res) => {
  try {
    const body = req.body;
    if (!body || Array.isArray(body) || typeof body !== 'object'
      || Object.keys(body).some(key => !['items', 'tableNumber', 'orderNote', 'expectedUpdatedAt'].includes(key))) {
      throw orderError('Dữ liệu cập nhật đơn không hợp lệ.');
    }
    const order = await Order.findById(req.params.id);
    if (!['DINE_IN', 'TAKEAWAY'].includes(order.orderType)) throw orderError('Chỉ được sửa đơn tại quầy.', 409);
    if (order.inventoryDeductedAt || order.inventoryProcessing) throw orderError('Đơn đã xuất nguyên liệu, không thể thay đổi món.', 409);
    if (!['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status) || order.items.some(item => item.isPrepared)) {
      throw orderError('Không thể sửa đơn đã có món được pha hoặc đã kết thúc.', 409);
    }
    if (typeof body.expectedUpdatedAt !== 'string' || body.expectedUpdatedAt !== order.updatedAt.toISOString()) {
      throw orderError('Đơn đã thay đổi. Vui lòng tải lại trước khi sửa.', 409);
    }
    const payments = await Payment.find({ order: order._id });
    if (payments.length !== 1 || payments[0].status !== 'PENDING' || payments[0].amount !== order.finalAmount) {
      throw orderError('Chỉ được sửa đơn có một khoản thanh toán đang chờ thu và khớp số tiền.', 409);
    }
    if (order.pointsRedeemed || order.reward || order.voucher) throw orderError('Đơn có ưu đãi cần được xử lý riêng trước khi sửa.', 409);
    if (typeof body.tableNumber !== 'string' || body.tableNumber.trim().length > 20
      || (order.orderType === 'DINE_IN' && !body.tableNumber.trim())) throw orderError('Số bàn phải có từ 1 đến 20 ký tự cho đơn tại quán.');
    if (typeof body.orderNote !== 'string' || body.orderNote.trim().length > 500) throw orderError('Ghi chú phải có tối đa 500 ký tự.');
    let normalized;
    try { normalized = await normalizeCartItems(body.items); }
    catch (error) { throw orderError(error.message); }
    if (!normalized.length) throw orderError('Đơn phải có ít nhất một món.');
    if (order.items.some(item => item.customization?.topping?.length)) throw orderError('Chưa hỗ trợ sửa đơn có topping.', 409);
    const items = normalized.map(({ product, quantity, size, unitPrice }) => {
      const candidates = order.items.filter(item => String(item.product) === String(product._id));
      const previous = candidates.find(item => (item.customization?.size || 'M') === size) || (candidates.length === 1 ? candidates[0] : undefined);
      return { product: product._id, productNameAtTime: product.name, quantity, unitPrice,
        subtotal: quantity * unitPrice, customization: { ...(previous?.customization || {}), size }, isPrepared: false };
    });
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    if (totalAmount < order.discountAmount) throw orderError('Tổng tiền món không được nhỏ hơn số tiền giảm giá.');
    await checkCheckoutStock(normalized);
    const payment = payments[0];
    Object.assign(order, { items, totalAmount, finalAmount: totalAmount + order.deliveryFee - order.discountAmount,
      tableNumber: order.orderType === 'DINE_IN' ? body.tableNumber.trim() : undefined, orderNote: body.orderNote.trim() });
    await order.save();
    await OrderItem.deleteMany({ order: order._id });
    await OrderItem.insertMany(items.map(item => ({ ...item, order: order._id })));
    const result = await Payment.updateOne({ _id: payment._id, status: 'PENDING', amount: payment.amount }, { $set: { amount: order.finalAmount } });
    if (result.matchedCount !== 1) throw orderError('Khoản thanh toán đã thay đổi.', 409);
    res.json({ message: 'Đã cập nhật đơn tại quầy.', order });
  } catch (error) {
    if (error.hasErrorLabel?.('TransientTransactionError')) throw error;
    res.status(error.status || 500).json({ message: error.message });
  }
}));

module.exports = router;
