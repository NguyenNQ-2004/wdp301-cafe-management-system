const express = require('express');
const Cart = require('../models/Cart');
const { protect } = require('../middlewares/authMiddleware');
const { normalizeCartItems } = require('../utils/cartItems');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const cart = await Cart.findOne({ customer: req.user._id })
      .populate({ path: 'items.product', populate: { path: 'category', select: 'name' } });
    res.json({ items: cart?.items || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const normalized = await normalizeCartItems(req.body.items);
    const items = normalized.map(({ product, quantity, size, checked }) => ({
      product: product._id, quantity, size, checked
    }));
    await Cart.findOneAndUpdate(
      { customer: req.user._id },
      { $set: { items } },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ message: 'Đã lưu giỏ hàng.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
