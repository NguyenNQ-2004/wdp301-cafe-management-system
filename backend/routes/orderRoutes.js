const express = require('express');
const { randomBytes } = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const User = require('../models/User');
const Cart = require('../models/Cart');
const RewardItem = require('../models/RewardItem');
const { protect } = require('../middlewares/authMiddleware');
const { normalizeCartItems } = require('../utils/cartItems');
const { normalizeCounterItems } = require('../utils/counterItems');
const { demoPaymentsEnabled } = require('../utils/paymentMode');
const { withOrderMutation } = require('../utils/orderMutation');
const { cancelCounterOrder } = require('../utils/cancelCounterOrder');
const { adminOrCashier, authorizePosition, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);
const orderError = (message, status = 400) => Object.assign(new Error(message), { status });
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
    
    // Hỗ trợ query params: status, orderType
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.orderType) {
      filter.orderType = req.query.orderType;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('customer', 'fullName phone totalPoints tierName')
      .populate('cashier', 'fullName phone')
      .populate('shipper', 'fullName phone')
      .populate('items.product', 'imageUrl name basePrice');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/counter', authorize('ADMIN', 'STAFF'), authorizePosition('CASHIER', 'BARISTA', 'MANAGER'), async (req, res) => {
  try {
    const filter = { orderType: { $in: ['DINE_IN', 'TAKEAWAY'] } };
    if (req.query.status) {
      if (!['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].includes(req.query.status)) return res.status(400).json({ message: 'Trạng thái đơn tại quầy không hợp lệ.' });
      filter.status = req.query.status;
    }
    res.json(await Order.find(filter).sort({ createdAt: -1, _id: -1 })
      .populate('customer', 'fullName phone totalPoints tierName')
      .populate('cashier', 'fullName phone')
      .populate('items.product', 'imageUrl name basePrice'));
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 2. GET SINGLE ORDER BY ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'fullName phone totalPoints tierName')
      .populate('cashier', 'fullName phone')
      .populate('shipper', 'fullName phone')
      .populate('items.product', 'imageUrl name basePrice');
    
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    
    // Khách chỉ được xem đơn của mình
    if (req.user.role === 'CUSTOMER' && String(order.customer?._id || order.customer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Không có quyền xem đơn hàng này.' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. CREATE ORDER (Khách đặt online / mang về, hoặc Thu ngân POS tạo tại quầy)
router.post('/', async (req, res) => {
  let pointsReserved = 0;
  let reservedRewardId = null;
  let createdOrder = null;
  let committed = false;
  try {
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

    // Chuẩn hóa danh sách món
    const counterStaff = isStaffOrAdmin && ['DINE_IN', 'TAKEAWAY'].includes(orderType);
    if (counterStaff && req.user.role !== 'ADMIN' && !['CASHIER', 'MANAGER'].includes(req.user.position)) throw orderError('Chỉ thu ngân hoặc quản lý được tạo đơn tại quầy.', 403);
    let items;
    try { items = await (counterStaff ? normalizeCounterItems(rawItems) : normalizeCartItems(rawItems)); }
    catch (error) { throw orderError(error.message); }
    if (!items.length) throw orderError('Vui lòng chọn ít nhất một món.');
    if (!['DINE_IN', 'TAKEAWAY', 'ONLINE'].includes(orderType)) {
      throw orderError('Loại đơn hàng không hợp lệ (DINE_IN, TAKEAWAY, ONLINE).');
    }

    if (req.user.role === 'CUSTOMER' && orderType === 'DINE_IN') throw orderError('Phương thức nhận hàng không hợp lệ.');
    const needsContact = req.user.role === 'CUSTOMER' || orderType === 'ONLINE';
    const finalRecipientName = typeof recipientName === 'string' ? recipientName.trim() : '';
    const finalRecipientPhone = typeof recipientPhone === 'string' ? recipientPhone.trim() : '';
    const finalDeliveryAddress = typeof deliveryAddress === 'string' ? deliveryAddress.trim() : '';
    if (needsContact && (!finalRecipientName || finalRecipientName.length > 100)) throw orderError('Tên người nhận phải từ 1 đến 100 ký tự.');
    if (needsContact && !validPhone(finalRecipientPhone)) throw orderError('Số điện thoại nhận hàng không hợp lệ.');
    if (orderType === 'ONLINE' && (finalDeliveryAddress.length < 5 || finalDeliveryAddress.length > 300)) throw orderError('Địa chỉ giao hàng phải từ 5 đến 300 ký tự.');
    if (orderNote != null && (typeof orderNote !== 'string' || orderNote.length > 500)) throw orderError('Ghi chú không hợp lệ.');
    if (tableNumber != null && (typeof tableNumber !== 'string' || tableNumber.length > 20)) throw orderError('Số bàn không hợp lệ.');
    if (orderType === 'DINE_IN' && (typeof tableNumber !== 'string' || !tableNumber.trim())) throw orderError('Vui lòng nhập số bàn cho đơn tại quán.');
    if (counterStaff && req.body.customerId != null) {
      if (!mongoose.isValidObjectId(req.body.customerId) || !await User.exists({ _id: req.body.customerId, role: 'CUSTOMER', status: 'ACTIVE' })) throw orderError('Khách hàng không tồn tại hoặc không hoạt động.');
    }
    const finalPaymentMethod = isStaffOrAdmin
      ? (paymentMethod || (orderType === 'ONLINE' ? 'COD' : 'CASH'))
      : (orderType === 'ONLINE' ? (paymentMethod === 'DEMO_ONLINE' ? 'DEMO_ONLINE' : 'COD') : 'PAY_AT_COUNTER');
    if (!['COD', 'PAY_AT_COUNTER', 'CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 'DEMO_ONLINE'].includes(finalPaymentMethod)) throw orderError('Phương thức thanh toán không hợp lệ.');
    if (finalPaymentMethod === 'DEMO_ONLINE' && (orderType !== 'ONLINE' || req.user.role !== 'CUSTOMER' || !demoPaymentsEnabled())) throw orderError('Thanh toán mô phỏng hiện không khả dụng.', 403);
    if (demoProvider != null && (finalPaymentMethod !== 'DEMO_ONLINE' || !['MOMO', 'VNPAY', 'BANK_TRANSFER'].includes(demoProvider))) throw orderError('Kênh thanh toán mô phỏng không hợp lệ.');

    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    let reward = null;
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
    if (isStaffOrAdmin && req.body.discountAmount != null) {
      const staffDiscount = Number(req.body.discountAmount);
      if (!Number.isInteger(staffDiscount) || staffDiscount < 0 || staffDiscount > totalAmount) throw orderError('Số tiền giảm giá không hợp lệ.');
      discountAmount = staffDiscount;
    }
    const deliveryFee = orderType === 'ONLINE' && totalAmount < 150000 ? 18000 : 0;
    const finalAmount = totalAmount + deliveryFee - discountAmount;
    if (counterStaff && req.body.expectedTotal !== undefined && (!Number.isInteger(req.body.expectedTotal) || req.body.expectedTotal !== finalAmount)) throw orderError('Giá món đã thay đổi. Vui lòng kiểm tra lại đơn trước khi tạo.', 409);
    if (req.user.role === 'CUSTOMER' && (!Number.isInteger(req.body.expectedTotal) || req.body.expectedTotal !== finalAmount)) return res.status(409).json({ message: 'Giá món, ưu đãi điểm hoặc phí giao hàng đã thay đổi. Vui lòng kiểm tra lại giỏ hàng trước khi đặt.', finalAmount });
    if (reward) {
      const customer = await User.findOneAndUpdate({ _id: req.user._id, role: 'CUSTOMER', totalPoints: { $gte: reward.pointsCost } }, { $inc: { totalPoints: -reward.pointsCost } }, { returnDocument: 'after' });
      if (!customer) throw orderError('Bạn không còn đủ điểm để đổi ưu đãi này.', 409);
      pointsReserved = reward.pointsCost;
      if (reward.stock !== -1) {
        const claimed = await RewardItem.findOneAndUpdate({ _id: reward._id, status: 'ACTIVE', stock: { $gt: 0 } }, { $inc: { stock: -1 } });
        if (!claimed) throw orderError('Ưu đãi điểm vừa hết số lượng.', 409);
        reservedRewardId = reward._id;
      }
    }

    // Sinh mã đơn AURA
    const orderCode = `AURA-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    const orderData = {
      orderCode,
      customer: req.user.role === 'CUSTOMER' ? req.user._id : (req.body.customerId || undefined),
      cashier: isStaffOrAdmin ? req.user._id : undefined,
      orderType,
      status: orderType === 'DINE_IN' && isStaffOrAdmin ? 'PREPARING' : 'PENDING',
      items: items.map(({ product, quantity, size, unitPrice, customization }) => ({
        product: product._id,
        productNameAtTime: product.name,
        unitPrice,
        customization: customization || { size },
        quantity,
        subtotal: unitPrice * quantity,
        isPrepared: false
      })),
      totalAmount,
      reward: reward?._id,
      pointsRedeemed: pointsReserved,
      discountAmount,
      deliveryFee,
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
    createdOrder = order;

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
      paymentNote: finalPaymentMethod === 'DEMO_ONLINE' ? 'Giao dịch mô phỏng, không thu tiền thật' : orderType === 'ONLINE' ? 'Đơn đặt online' : 'Thanh toán tại quầy'
    });

    if (reward) await LoyaltyTransaction.create({ customer: req.user._id, order: order._id, pointsChange: -pointsReserved, transactionType: 'REDEEM' });
    committed = true;

    // Dọn dẹp giỏ hàng nếu là customer
    if (req.user.role === 'CUSTOMER') {
      try {
        const cart = await Cart.findOne({ customer: req.user._id });
        if (cart) {
          const ordered = new Set(items.map(({ product, size }) => `${product._id}:${size}`));
          cart.items = cart.items.filter((item) => !ordered.has(`${item.product}:${item.size}`));
          await cart.save();
        }
      } catch (cartError) {
        console.error('Lỗi dọn giỏ hàng:', cartError);
      }
    }

    res.status(201).json(order);
  } catch (error) {
    if (!committed && createdOrder) {
      try {
        await Promise.all([Order.deleteOne({ _id: createdOrder._id }), OrderItem.deleteMany({ order: createdOrder._id }), Payment.deleteMany({ order: createdOrder._id })]);
      } catch (deleteError) {
        console.error('Could not remove incomplete order:', deleteError);
        return res.status(500).json({ message: 'Không thể hoàn tất đơn hàng. Vui lòng liên hệ cửa hàng.', orderCode: createdOrder.orderCode });
      }
    }
    if (!committed) {
      const rollbacks = [];
      if (reservedRewardId) rollbacks.push(RewardItem.updateOne({ _id: reservedRewardId }, { $inc: { stock: 1 } }));
      if (pointsReserved) rollbacks.push(User.updateOne({ _id: req.user._id }, { $inc: { totalPoints: pointsReserved } }));
      const results = await Promise.allSettled(rollbacks);
      if (results.some((result) => result.status === 'rejected')) {
        console.error('Loyalty reservation rollback failed:', results);
        return res.status(500).json({ message: 'Không thể hoàn tất đơn hàng. Vui lòng liên hệ cửa hàng.' });
      }
    }
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
  }
});

// 4. UPDATE ORDER STATUS (Dành cho Thu ngân, Pha chế, Shipper, Quản lý)
router.put('/:id/status', withOrderMutation(async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Dữ liệu cập nhật đơn hàng không hợp lệ.' });
    }
    const { status, cancelReason, shipperId } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'];
    if (Object.keys(req.body || {}).some((key) => !['status', 'cancelReason', 'shipperId', 'orderNote'].includes(key))) {
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
      if (status !== 'CANCELLED' || !['PENDING', 'CONFIRMED'].includes(order.status)) {
        return res.status(409).json({ message: 'Khách hàng chỉ có thể hủy đơn trước khi quán bắt đầu pha chế.' });
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
        if (order.shipper && String(order.shipper) !== String(shipperId)) return res.status(409).json({ message: 'Đơn hàng đã được gán cho shipper khác.' });
        order.shipper = shipper._id;
      }
    }

    if (status === 'COMPLETED' && ['DINE_IN', 'TAKEAWAY'].includes(order.orderType)) {
      const payments = await Payment.find({ order: order._id });
      if (payments.length !== 1 || payments[0].status !== 'SUCCESS' || payments[0].amount !== order.finalAmount) {
        return res.status(409).json({ message: 'Cần xác nhận đã nhận đủ tiền trước khi trả đồ cho khách.' });
      }
    }
    if (status === 'CANCELLED' && ['DINE_IN', 'TAKEAWAY'].includes(order.orderType)) {
      await cancelCounterOrder(order, cancelReason, res);
      return res.json({ message: 'Đã hủy đơn tại quầy.', order });
    }
    order.status = status;
    if (cancelReason !== undefined) order.cancelReason = cancelReason.trim();
    if (req.body.orderNote !== undefined) order.orderNote = req.body.orderNote.trim();

    // COD được thu khi giao xong; đơn tại quầy và demo có bước xác nhận riêng.
    if (status === 'COMPLETED') {
      if (order.orderType === 'ONLINE' && order.paymentMethod === 'COD') {
        await Payment.findOneAndUpdate(
          { order: order._id, status: 'PENDING', paymentMethod: 'CASH' },
          { $set: { status: 'SUCCESS', paidAt: new Date(), paymentNote: 'Thu tiền COD khi giao hàng hoàn tất' } },
          { returnDocument: 'after' }
        );
      }

      // Nếu có khách hàng và chưa cộng điểm cho đơn này: cộng điểm (1.000đ = 1 điểm)
      if (order.customer) {
        const existingTx = await LoyaltyTransaction.findOne({ order: order._id, transactionType: 'EARN' });
        if (!existingTx) {
          const pointsEarned = Math.floor(order.finalAmount / 1000);
          if (pointsEarned > 0) {
            await LoyaltyTransaction.create({
              customer: order.customer,
              order: order._id,
              pointsChange: pointsEarned,
              transactionType: 'EARN'
            });
            await User.findByIdAndUpdate(order.customer, {
              $inc: { totalPoints: pointsEarned }
            });
          }
        }
      }
    }

    await order.save();
    res.json({ message: 'Cập nhật trạng thái thành công!', order });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
  }
}));

// 5. BARISTA KDS: TOGGLE ITEM PREPARED (Tích từng món đã pha xong)
router.put('/:id/items/:itemIndex/prepared', authorizePosition('BARISTA', 'MANAGER'), withOrderMutation(async (req, res) => {
  try {
    const { itemIndex } = req.params;
    const { isPrepared } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

    const idx = parseInt(itemIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= order.items.length) {
      return res.status(400).json({ message: 'Mã số món không hợp lệ.' });
    }

    order.items[idx].isPrepared = isPrepared !== undefined ? isPrepared : !order.items[idx].isPrepared;
    
    // Nếu tất cả các món đã pha xong -> có thể chuyển sang READY
    const allPrepared = order.items.every(it => it.isPrepared);
    if (allPrepared && order.status === 'PREPARING') {
      order.status = 'READY';
    }

    await order.save();

    // Đồng bộ sang bảng order_items
    const orderItems = await OrderItem.find({ order: order._id });
    if (orderItems[idx]) {
      orderItems[idx].isPrepared = order.items[idx].isPrepared;
      await orderItems[idx].save();
    }

    res.json({ message: 'Đã cập nhật trạng thái chế biến món!', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}));

// Edit counter orders before payment or the first item is marked prepared.
router.put('/:id/counter', adminOrCashier, withOrderMutation(async (req, res) => {
  let original;
  let originalItems;
  let payment;
  let changed = false;
  try {
    const body = req.body;
    if (!body || Array.isArray(body) || typeof body !== 'object'
      || Object.keys(body).some(key => !['items', 'tableNumber', 'orderNote', 'expectedUpdatedAt'].includes(key))) {
      throw orderError('Dữ liệu cập nhật đơn không hợp lệ.');
    }
    const order = await Order.findById(req.params.id);
    if (!['DINE_IN', 'TAKEAWAY'].includes(order.orderType)) throw orderError('Chỉ được sửa đơn tại quầy.', 409);
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
    original = order.toObject();
    originalItems = await OrderItem.find({ order: order._id }).lean();
    payment = payments[0];
    Object.assign(order, { items, totalAmount, finalAmount: totalAmount + order.deliveryFee - order.discountAmount,
      tableNumber: order.orderType === 'DINE_IN' ? body.tableNumber.trim() : undefined, orderNote: body.orderNote.trim() });
    changed = true;
    await order.save();
    await OrderItem.deleteMany({ order: order._id });
    await OrderItem.insertMany(items.map(item => ({ ...item, order: order._id })));
    const result = await Payment.updateOne({ _id: payment._id, status: 'PENDING', amount: payment.amount }, { $set: { amount: order.finalAmount } });
    if (result.matchedCount !== 1) throw orderError('Khoản thanh toán đã thay đổi.', 409);
    res.json({ message: 'Đã cập nhật đơn tại quầy.', order });
  } catch (error) {
    if (changed) {
      try {
        const { _id, __v, ...snapshot } = original;
        await Order.updateOne({ _id }, { $set: { ...snapshot, tableNumber: original.tableNumber || null, orderNote: original.orderNote || null } }, { timestamps: false });
        await OrderItem.deleteMany({ order: _id });
        if (originalItems.length) await OrderItem.insertMany(originalItems);
        await Payment.updateOne({ _id: payment._id }, { $set: { amount: payment.amount, updatedAt: payment.updatedAt } }, { timestamps: false });
      } catch (rollbackError) {
        res.locals.retainMutationLock = true;
        console.error('Counter order rollback failed:', String(original._id), rollbackError.message);
        return res.status(500).json({ message: 'Đơn đang tạm khóa để kiểm tra đồng bộ dữ liệu. Vui lòng liên hệ quản lý.' });
      }
    }
    res.status(error.status || 500).json({ message: error.message });
  }
}));

router.put('/:id/counter-cancel', adminOrCashier, withOrderMutation(async (req, res) => {
  try {
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some(key => key !== 'cancelReason')) throw orderError('Dữ liệu hủy đơn không hợp lệ.');
    const order = await Order.findById(req.params.id);
    await cancelCounterOrder(order, req.body.cancelReason, res);
    res.json({ message: 'Đã hủy đơn tại quầy.', order });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
}));

module.exports = router;
