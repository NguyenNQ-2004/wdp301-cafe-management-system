const express = require('express');
const { randomBytes } = require('crypto');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { protect } = require('../middlewares/authMiddleware');
const { normalizeCartItems } = require('../utils/cartItems');

const router = express.Router();
router.use(protect);

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
      discountAmount = 0
    } = req.body;

    const isStaffOrAdmin = ['ADMIN', 'STAFF'].includes(req.user.role);

    // Chuẩn hóa danh sách món
    const items = await normalizeCartItems(rawItems);
    if (!items.length) throw new Error('Vui lòng chọn ít nhất một món.');
    if (!['DINE_IN', 'TAKEAWAY', 'ONLINE'].includes(orderType)) {
      throw new Error('Loại đơn hàng không hợp lệ (DINE_IN, TAKEAWAY, ONLINE).');
    }

    let finalRecipientName = recipientName;
    let finalRecipientPhone = recipientPhone;
    let finalDeliveryAddress = deliveryAddress;

    if (orderType === 'ONLINE') {
      if (!finalRecipientName?.trim()) throw new Error('Vui lòng nhập tên người nhận.');
      if (!finalRecipientPhone?.trim() || !/^[0-9+ .()-]{9,20}$/.test(finalRecipientPhone.trim())) {
        throw new Error('Số điện thoại nhận hàng không hợp lệ.');
      }
      if (!finalDeliveryAddress?.trim()) throw new Error('Vui lòng nhập địa chỉ giao hàng.');
    } else if (orderType === 'DINE_IN') {
      if (!tableNumber?.trim() && !isStaffOrAdmin) {
        // Cho phép để trống nếu là khách tự quét mã tại bàn sau
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFee = orderType === 'ONLINE' && totalAmount < 150000 ? 18000 : 0;
    const finalAmount = Math.max(0, totalAmount + deliveryFee - Number(discountAmount));

    // Sinh mã đơn AURA
    const randomHex = randomBytes(2).toString('hex').toUpperCase();
    const orderCode = `AURA-${Date.now().toString().slice(-4)}${randomHex}`;

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
      discountAmount: Number(discountAmount) || 0,
      deliveryFee,
      finalAmount,
      recipientName: finalRecipientName?.trim(),
      recipientPhone: finalRecipientPhone?.trim(),
      deliveryAddress: orderType === 'ONLINE' ? finalDeliveryAddress?.trim() : undefined,
      tableNumber: orderType === 'DINE_IN' ? tableNumber?.trim() : undefined,
      orderNote: orderNote?.trim() || undefined,
      paymentMethod: paymentMethod || (orderType === 'ONLINE' ? 'COD' : 'CASH')
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
    const initialPaymentStatus = (orderType === 'DINE_IN' && isStaffOrAdmin) ? 'SUCCESS' : 'PENDING';
    await Payment.create({
      order: order._id,
      paymentMethod: ['CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER'].includes(paymentMethod) ? paymentMethod : 'CASH',
      amount: finalAmount,
      status: initialPaymentStatus,
      paidAt: initialPaymentStatus === 'SUCCESS' ? new Date() : undefined,
      paymentNote: orderType === 'ONLINE' ? 'Đơn đặt online' : 'Thanh toán tại quầy'
    });

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
    res.status(400).json({ message: error.message });
  }
});

// 4. UPDATE ORDER STATUS (Dành cho Thu ngân, Pha chế, Shipper, Quản lý)
router.put('/:id/status', async (req, res) => {
  try {
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

    // Khi đơn COMPLETED: cập nhật thanh toán và cộng điểm tích lũy
    if (status === 'COMPLETED') {
      await Payment.findOneAndUpdate(
        { order: order._id },
        { status: 'SUCCESS', paidAt: new Date() },
        { new: true }
      );

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
