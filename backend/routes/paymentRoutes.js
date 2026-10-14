const express = require('express');
const Payment = require('../models/Payment');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// 1. GET ALL PAYMENTS
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

    const payments = await Payment.find(filter)
      .populate({
        path: 'order',
        select: 'orderCode finalAmount status recipientName customer',
        populate: { path: 'customer', select: 'fullName phone' }
      })
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. CREATE PAYMENT
router.post('/', async (req, res) => {
  try {
    const payment = await Payment.create(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 3. UPDATE PAYMENT STATUS
router.put('/:id/status', async (req, res) => {
  try {
    const { status, transactionCode, paymentNote } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Không tìm thấy giao dịch thanh toán.' });

    payment.status = status;
    if (status === 'SUCCESS' && !payment.paidAt) payment.paidAt = new Date();
    if (transactionCode) payment.transactionCode = transactionCode;
    if (paymentNote) payment.paymentNote = paymentNote;

    await payment.save();
    res.json({ message: 'Cập nhật thanh toán thành công!', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
