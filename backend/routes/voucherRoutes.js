const express = require('express');
const Voucher = require('../models/Voucher');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();

// GET all active vouchers (public/customer) or all vouchers (admin)
router.get('/', async (req, res) => {
  try {
    const vouchers = await Voucher.find({ status: 'ACTIVE' }).sort({ createdAt: -1 });
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single voucher by code (tra cứu mã giảm giá)
router.get('/code/:code', async (req, res) => {
  try {
    const voucher = await Voucher.findOne({
      code: req.params.code.trim().toUpperCase(),
      status: 'ACTIVE'
    });
    if (!voucher) {
      return res.status(404).json({ message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' });
    }
    res.json(voucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADMIN CRUD vouchers
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderValue, maxDiscount, usageLimit } = req.body;
    if (!code || !discountType || discountValue == null) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ mã, loại giảm giá và giá trị giảm.' });
    }
    const created = await Voucher.create({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      usageLimit: usageLimit ? Number(usageLimit) : undefined
    });
    res.status(201).json(created);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Mã voucher này đã tồn tại.' });
    }
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Voucher.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa voucher thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
