const express = require('express');
const { objectBody, objectId, text, invalid, sendError } = require('../utils/adminValidation');
const CustomerReview = require('../models/CustomerReview');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);
router.use((req, res, next) => {
  if (!['ADMIN', 'CUSTOMER'].includes(req.user.role)) return res.status(403).json({ message: 'Chỉ khách hàng và Admin được truy cập phản hồi.' });
  next();
});

// ==========================================
// SCREEN 30: FEEDBACK & COMPLAINTS APIS
// Actors: Customer, Admin
// ==========================================

// 1. THỐNG KÊ NHANH ĐÁNH GIÁ & KHIẾU NẠI (ADMIN)
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const [totalReviews, pendingCount, inProgressCount, resolvedCount, rejectedCount, complaintsCount, ratingAgg] =
      await Promise.all([
        CustomerReview.countDocuments(),
        CustomerReview.countDocuments({ status: 'PENDING' }),
        CustomerReview.countDocuments({ status: 'IN_PROGRESS' }),
        CustomerReview.countDocuments({ status: 'RESOLVED' }),
        CustomerReview.countDocuments({ status: 'REJECTED' }),
        CustomerReview.countDocuments({ issueType: 'COMPLAINT' }),
        CustomerReview.aggregate([
          { $match: { issueType: 'RATING', rating: { $gte: 1, $lte: 5 } } },
          { $group: { _id: null, avgRating: { $avg: '$rating' }, totalRatings: { $sum: 1 } } }
        ])
      ]);

    const avgRating = ratingAgg[0]?.avgRating ? Number(ratingAgg[0].avgRating.toFixed(1)) : 5.0;
    const ratingsCount = ratingAgg[0]?.totalRatings || 0;

    res.json({
      totalReviews,
      pendingCount,
      inProgressCount,
      resolvedCount,
      rejectedCount,
      complaintsCount,
      ratingsCount,
      avgRating
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. KHÁCH HÀNG: LẤY DANH SÁCH ĐƠN HÀNG CỦA MÌNH ĐỂ CHỌN KHI GỬI ĐÁNH GIÁ / KHIẾU NẠI
router.get('/my-orders', async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') return res.status(403).json({ message: 'Chỉ khách hàng được gửi phản hồi.' });
    const reviewed = await CustomerReview.distinct('order', { customer: req.user._id });
    const orders = await Order.find({ customer: req.user._id, status: { $ne: 'CANCELLED' }, _id: { $nin: reviewed.filter(Boolean) } })
      .select('orderCode finalAmount status orderType items createdAt')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. GET DANH SÁCH ĐÁNH GIÁ & KHIẾU NẠI (Customer xem của mình, Admin xem tất cả)
router.get('/', async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'CUSTOMER') {
      filter.customer = req.user._id;
    }

    if (req.query.issueType && req.query.issueType !== 'ALL') {
      filter.issueType = req.query.issueType;
    }

    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }

    if (req.query.rating && req.query.rating !== 'ALL') {
      filter.rating = Number(req.query.rating);
    }

    // Tìm kiếm theo từ khóa nội dung, mã đơn hoặc tên/sđt khách
    const search = req.query.search?.trim();
    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const matchingOrders = await Order.find({
        orderCode: { $regex: search, $options: 'i' }
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);
      const orderIds = matchingOrders.map((o) => o._id);

      filter.$or = [
        { content: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
        { customer: { $in: userIds } },
        { order: { $in: orderIds } }
      ];
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      CustomerReview.find(filter)
        .populate('customer', 'fullName phone email')
        .populate('order', 'orderCode finalAmount createdAt items')
        .populate('respondedBy', 'fullName position')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CustomerReview.countDocuments(filter)
    ]);

    res.json({
      reviews,
      total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. KHÁCH HÀNG: GỬI ĐÁNH GIÁ SAO HOẶC KHIẾU NẠI SỰ CỐ
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') throw invalid('Chỉ khách hàng được gửi phản hồi.', 403);
    objectBody(req.body);
    const { orderId, issueType, rating, topic, content, attachments = [] } = req.body;
    if (!['RATING','COMPLAINT'].includes(issueType)) throw invalid('Loại phản hồi không hợp lệ.');
    text(content, 'Nội dung phản hồi', 2000);
    if (topic !== undefined && typeof topic !== 'string') throw invalid('Chủ đề không hợp lệ.');
    if (!Array.isArray(attachments) || attachments.some(item => typeof item !== 'string')) throw invalid('Ảnh đính kèm không hợp lệ.');

    if (issueType === 'RATING' && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Số sao đánh giá phải từ 1 đến 5 sao.' });
    }

    let order = null;
    {
      order = await Order.findOne({ _id: objectId(orderId), customer: req.user._id, status: { $ne: 'CANCELLED' } });
      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng tương ứng.' });
      }
    }
    if (await CustomerReview.exists({ customer: req.user._id, order: order._id })) throw invalid('Đơn hàng đã được gửi phản hồi.', 409);
    await CustomerReview.init();

    const formattedContent =
      issueType === 'COMPLAINT' && topic ? `[${topic}] ${content.trim()}` : content.trim();

    const review = await CustomerReview.create({
      customer: req.user._id,
      submissionKey: `${req.user._id}:${order._id}`,
      order: order?._id || undefined,
      issueType,
      rating: issueType === 'RATING' ? Number(rating) : undefined,
      topic: topic || undefined,
      content: formattedContent,
      attachments: Array.isArray(attachments) ? attachments : [],
      status: 'PENDING'
    });

    const populatedReview = await CustomerReview.findById(review._id)
      .populate('customer', 'fullName phone')
      .populate('order', 'orderCode finalAmount createdAt');

    res.status(201).json({
      message:
        issueType === 'RATING'
          ? 'Cảm ơn bạn đã gửi đánh giá cho Aura Café!'
          : 'Chúng tôi đã tiếp nhận khiếu nại của bạn và sẽ phản hồi trong thời gian sớm nhất.',
      review: populatedReview
    });
  } catch (error) { sendError(res, error); }
});

// 5. ADMIN: PHẢN HỒI KHIẾU NẠI & CẬP NHẬT TRẠNG THÁI XỬ LÝ
router.put('/:id/respond', adminOnly, async (req, res) => {
  try {
    objectBody(req.body);
    const { adminResponse, status } = req.body;
    text(adminResponse, 'Nội dung phản hồi', 2000);
    if (status !== undefined && !['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].includes(status)) throw invalid('Trạng thái xử lý không hợp lệ.');
    const review = await CustomerReview.findById(objectId(req.params.id));
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu phản hồi của khách.' });
    }

    const updated = await CustomerReview.findOneAndUpdate(
      { _id: review._id, status: { $in: ['PENDING', 'IN_PROGRESS'] } },
      { $set: { adminResponse: adminResponse.trim(), respondedAt: new Date(), respondedBy: req.user._id, status: status || 'IN_PROGRESS' } },
      { returnDocument: 'after', runValidators: true }
    )
      .populate('customer', 'fullName phone')
      .populate('order', 'orderCode finalAmount')
      .populate('respondedBy', 'fullName position');
    if (!updated) throw invalid('Phiếu đã đóng; không thể sửa hoặc mở lại.', 409);

    res.json({
      message: `Đã phản hồi phiếu #${String(review._id).slice(-6).toUpperCase()} thành công!`,
      review: updated
    });
  } catch (error) {
    sendError(res, error);
  }
});

// 6. ADMIN: XÓA PHIẾU PHẢN HỒI
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const review = await CustomerReview.findById(objectId(req.params.id));
    if (!review) throw invalid('Không tìm thấy phản hồi.',404);
    if (['RESOLVED','REJECTED'].includes(review.status)) throw invalid('Phiếu đã đóng được giữ lại để tra cứu.',409);
    const removed = await CustomerReview.findOneAndDelete({ _id: review._id, status: { $in: ['PENDING','IN_PROGRESS'] } });
    if (!removed) throw invalid('Phiếu vừa đóng; không thể xóa.',409);
    res.json({ message: 'Đã xóa phiếu đánh giá/khiếu nại thành công.' });
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
