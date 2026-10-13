const express = require('express');
const { randomBytes } = require('crypto');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { protect } = require('../middlewares/authMiddleware');
const { normalizeCartItems } = require('../utils/cartItems');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'ADMIN' ? {} : { customer: req.user._id };
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('items.product', 'imageUrl name');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { items: rawItems, orderType, recipientName, recipientPhone, deliveryAddress, orderNote } = req.body;
    const items = await normalizeCartItems(rawItems);
    if (!items.length) throw new Error('Vui lòng chọn ít nhất một món.');
    if (!['ONLINE', 'TAKEAWAY'].includes(orderType)) throw new Error('Phương thức nhận hàng không hợp lệ.');
    if (typeof recipientName !== 'string' || !recipientName.trim() || recipientName.length > 100) {
      throw new Error('Vui lòng nhập tên người nhận.');
    }
    if (typeof recipientPhone !== 'string' || !/^[0-9+ .()-]{9,20}$/.test(recipientPhone.trim())) {
      throw new Error('Số điện thoại không hợp lệ.');
    }
    if (orderType === 'ONLINE' && (typeof deliveryAddress !== 'string' || !deliveryAddress.trim() || deliveryAddress.length > 300)) {
      throw new Error('Vui lòng nhập địa chỉ giao hàng.');
    }
    if (orderNote != null && (typeof orderNote !== 'string' || orderNote.length > 500)) {
      throw new Error('Ghi chú không hợp lệ.');
    }

    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFee = orderType === 'ONLINE' && totalAmount < 150000 ? 18000 : 0;
    const finalAmount = totalAmount + deliveryFee;
    if (!Number.isInteger(req.body.expectedTotal) || req.body.expectedTotal !== finalAmount) {
      return res.status(409).json({ message: 'Giá món hoặc phí giao hàng đã thay đổi. Vui lòng kiểm tra lại giỏ hàng trước khi đặt.', finalAmount });
    }
    const orderCode = `AUR-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const order = await Order.create({
      orderCode,
      customer: req.user._id,
      orderType,
      status: 'PENDING',
      items: items.map(({ product, quantity, size, unitPrice }) => ({
        product: product._id,
        productNameAtTime: product.name,
        unitPrice,
        customization: { size },
        quantity,
        subtotal: unitPrice * quantity
      })),
      totalAmount,
      deliveryFee,
      finalAmount,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      deliveryAddress: orderType === 'ONLINE' ? deliveryAddress.trim() : undefined,
      orderNote: orderNote?.trim() || undefined,
      paymentMethod: orderType === 'ONLINE' ? 'COD' : 'PAY_AT_COUNTER'
    });

    try {
      const cart = await Cart.findOne({ customer: req.user._id });
      if (cart) {
        const ordered = new Set(items.map(({ product, size }) => `${product._id}:${size}`));
        cart.items = cart.items.filter((item) => !ordered.has(`${item.product}:${item.size}`));
        await cart.save();
      }
    } catch (cartError) {
      console.error('Order created, but cart cleanup failed:', cartError);
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
