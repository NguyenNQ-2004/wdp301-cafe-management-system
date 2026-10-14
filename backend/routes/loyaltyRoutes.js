const express = require('express');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const User = require('../models/User');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// 1. GET LOYALTY TRANSACTIONS (Khách xem của mình, Admin xem tất cả)
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'ADMIN' ? {} : { customer: req.user._id };
    if (req.query.customerId && req.user.role === 'ADMIN') {
      filter.customer = req.query.customerId;
    }

    const transactions = await LoyaltyTransaction.find(filter)
      .populate('customer', 'fullName phone tierName totalPoints')
      .populate('order', 'orderCode finalAmount createdAt')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. TÍCH ĐIỂM / ĐỔI ĐIỂM THỦ CÔNG (ADMIN HOẶC THU NGÂN TẠI QUẦY)
router.post('/adjust', adminOnly, async (req, res) => {
  try {
    const { customerId, pointsChange, reason } = req.body;
    const user = await User.findById(customerId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });

    const change = Number(pointsChange);
    if (isNaN(change) || change === 0) {
      return res.status(400).json({ message: 'Số điểm thay đổi không hợp lệ.' });
    }

    if (user.totalPoints + change < 0) {
      return res.status(400).json({ message: 'Khách hàng không đủ điểm để trừ.' });
    }

    const tx = await LoyaltyTransaction.create({
      customer: user._id,
      pointsChange: change,
      transactionType: change > 0 ? 'EARN' : 'REDEEM'
    });

    user.totalPoints += change;
    // Cập nhật hạng thành viên tự động
    if (user.totalPoints >= 300) user.tierName = 'DIAMOND';
    else if (user.totalPoints >= 150) user.tierName = 'GOLD';
    else if (user.totalPoints >= 50) user.tierName = 'SILVER';
    else user.tierName = 'BRONZE';

    await user.save();

    res.status(201).json({ message: 'Điều chỉnh điểm thành công!', transaction: tx, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
