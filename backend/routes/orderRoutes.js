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
const { demoPaymentsEnabled } = require('../utils/paymentMode');

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
    let items;
    try { items = await normalizeCartItems(rawItems); }
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
      items: items.map(({ product, quantity, size, unitPrice }) => ({
        product: product._id,
        productNameAtTime: product.name,
        unitPrice,
        customization: { size },
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
router.put('/:id/status', async (req, res) => {
  try {
    if (!['ADMIN', 'STAFF'].includes(req.user.role)) return res.status(403).json({ message: 'Chỉ nhân viên được cập nhật trạng thái đơn hàng.' });
    const { status, cancelReason, shipperId } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

    order.status = status;
    if (cancelReason !== undefined) order.cancelReason = cancelReason;
    if (shipperId) order.shipper = shipperId;

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
    res.status(500).json({ message: error.message });
  }
});

// 5. BARISTA KDS: TOGGLE ITEM PREPARED (Tích từng món đã pha xong)
router.put('/:id/items/:itemIndex/prepared', async (req, res) => {
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
});

module.exports = router;
