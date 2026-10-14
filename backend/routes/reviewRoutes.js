const express = require('express');
const CustomerReview = require('../models/CustomerReview');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// 1. GET ALL REVIEWS (Khách xem của mình hoặc công khai; Admin xem tất cả)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'CUSTOMER') {
      filter.customer = req.user._id;
    }
    if (req.query.issueType) filter.issueType = req.query.issueType;
    if (req.query.status) filter.status = req.query.status;

    const reviews = await CustomerReview.find(filter)
      .populate('customer', 'fullName phone')
      .populate('order', 'orderCode finalAmount createdAt')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. TẠO ĐÁNH GIÁ HOẶC KHIẾU NẠI (Khách hàng)
router.post('/', async (req, res) => {
  try {
    const { orderId, issueType, rating, content } = req.body;
    if (!orderId || !issueType || !content?.trim()) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin phản hồi.' });
    }

    if (issueType === 'RATING' && (!rating || rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Số sao đánh giá phải từ 1 đến 5.' });
    }

    const review = await CustomerReview.create({
      customer: req.user._id,
      order: orderId,
      issueType,
      rating: issueType === 'RATING' ? rating : undefined,
      content: content.trim(),
      status: 'PENDING'
    });

    res.status(201).json({ message: 'Gửi phản hồi thành công!', review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. ADMIN: PHẢN HỒI KHIẾU NẠI / ĐÁNH GIÁ
router.put('/:id/respond', adminOnly, async (req, res) => {
  try {
    const { adminResponse, status } = req.body;
    const review = await CustomerReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Không tìm thấy phản hồi của khách.' });

    if (adminResponse !== undefined) review.adminResponse = adminResponse;
    if (status) review.status = status;

    await review.save();
    res.json({ message: 'Đã gửi phản hồi tới khách hàng!', review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
