const express = require('express');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const User = require('../models/User');
const Order = require('../models/Order');
const ShopSetting = require('../models/ShopSetting');
const MembershipTier = require('../models/MembershipTier');
const { protect, adminOnly, adminOrStaff } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

/**
 * Đảm bảo 4 hạng thành viên chuẩn luôn sẵn sàng
 */
async function ensureDefaultTiers() {
  const count = await MembershipTier.countDocuments();
  if (count === 0) {
    await MembershipTier.insertMany([
      {
        tierCode: 'BRONZE',
        tierName: 'Đồng',
        minPoints: 0,
        minSpent: 0,
        discountPercent: 0,
        pointMultiplier: 1.0,
        description: 'Hạng khởi đầu mặc định khi đăng ký hội viên.',
        color: '#b45309'
      },
      {
        tierCode: 'SILVER',
        tierName: 'Bạc',
        minPoints: 50,
        minSpent: 500000,
        discountPercent: 5,
        pointMultiplier: 1.1,
        description: 'Ngưỡng 50 điểm hoặc 500k chi tiêu. Giảm giá 5% và nhân 1.1 điểm.',
        color: '#64748b'
      },
      {
        tierCode: 'GOLD',
        tierName: 'Vàng',
        minPoints: 150,
        minSpent: 1500000,
        discountPercent: 10,
        pointMultiplier: 1.25,
        description: 'Ngưỡng 150 điểm hoặc 1.5tr chi tiêu. Giảm giá 10% và nhân 1.25 điểm.',
        color: '#eab308'
      },
      {
        tierCode: 'DIAMOND',
        tierName: 'Kim Cương',
        minPoints: 300,
        minSpent: 3000000,
        discountPercent: 15,
        pointMultiplier: 1.5,
        description: 'Ngưỡng 300 điểm hoặc 3tr chi tiêu. Giảm giá 15% và nhân 1.5 điểm.',
        color: '#06b6d4'
      }
    ]);
  }
}

/**
 * Helper: Tính toán và cập nhật hạng thành viên tự động dựa trên điểm tích lũy & chi tiêu
 */
async function evaluateAndUpdateTier(user) {
  await ensureDefaultTiers();
  const tiers = await MembershipTier.find({}).sort({ minPoints: -1 });

  // Tính tổng chi tiêu thực tế từ các đơn COMPLETED
  const completedOrders = await Order.find({ customer: user._id, status: 'COMPLETED' });
  const totalSpent = completedOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  let newTier = 'BRONZE';
  for (const tier of tiers) {
    if (user.totalPoints >= tier.minPoints || totalSpent >= tier.minSpent) {
      newTier = tier.tierCode;
      break;
    }
  }

  const changed = user.tierName !== newTier;
  user.tierName = newTier;
  return { newTier, changed, totalSpent };
}

// ==========================================
// SCREEN 29: PHONE LOYALTY MANAGEMENT APIS
// Actors: Admin, Staff
// ==========================================

// 1. GET LOYALTY RULES & TIERS CONFIG
router.get('/rules', async (req, res) => {
  try {
    await ensureDefaultTiers();
    const [earnSetting, stepSetting, valueSetting, tiers] = await Promise.all([
      ShopSetting.findOne({ settingKey: 'points_earn_unit' }),
      ShopSetting.findOne({ settingKey: 'points_step' }),
      ShopSetting.findOne({ settingKey: 'points_step_value' }),
      MembershipTier.find({}).sort({ minPoints: 1 })
    ]);

    res.json({
      points_earn_unit: earnSetting ? Number(earnSetting.settingValue) : 1000,
      points_step: stepSetting ? Number(stepSetting.settingValue) : 10,
      points_step_value: valueSetting ? Number(valueSetting.settingValue) : 2000,
      tiers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. ADMIN UPDATE LOYALTY RULES
router.put('/rules', adminOnly, async (req, res) => {
  try {
    const { points_earn_unit, points_step, points_step_value, tiers } = req.body;

    if (points_earn_unit !== undefined) {
      await ShopSetting.findOneAndUpdate(
        { settingKey: 'points_earn_unit' },
        { settingValue: String(Math.max(1, Number(points_earn_unit))) },
        { upsert: true }
      );
    }
    if (points_step !== undefined) {
      await ShopSetting.findOneAndUpdate(
        { settingKey: 'points_step' },
        { settingValue: String(Math.max(1, Number(points_step))) },
        { upsert: true }
      );
    }
    if (points_step_value !== undefined) {
      await ShopSetting.findOneAndUpdate(
        { settingKey: 'points_step_value' },
        { settingValue: String(Math.max(0, Number(points_step_value))) },
        { upsert: true }
      );
    }

    if (Array.isArray(tiers)) {
      for (const t of tiers) {
        if (t.tierCode) {
          await MembershipTier.findOneAndUpdate(
            { tierCode: t.tierCode },
            {
              minPoints: Number(t.minPoints) || 0,
              minSpent: Number(t.minSpent) || 0,
              discountPercent: Number(t.discountPercent) || 0,
              pointMultiplier: Number(t.pointMultiplier) || 1.0,
              description: t.description || ''
            },
            { upsert: true }
          );
        }
      }
    }

    res.json({ message: 'Đã lưu cấu hình quy tắc tích điểm và hạng thẻ thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. STATS TỔNG HỢP VỀ ĐIỂM THƯỞNG
router.get('/stats', adminOrStaff, async (req, res) => {
  try {
    const [stepSetting, valueSetting] = await Promise.all([
      ShopSetting.findOne({ settingKey: 'points_step' }),
      ShopSetting.findOne({ settingKey: 'points_step_value' })
    ]);
    const points_step = stepSetting ? Number(stepSetting.settingValue) : 10;
    const points_step_value = valueSetting ? Number(valueSetting.settingValue) : 2000;

    const [customersWithPoints, pointsAgg, totalTxCount] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER', totalPoints: { $gt: 0 } }),
      User.aggregate([
        { $match: { role: 'CUSTOMER' } },
        { $group: { _id: null, totalPoints: { $sum: '$totalPoints' } } }
      ]),
      LoyaltyTransaction.countDocuments()
    ]);

    const totalPoints = pointsAgg[0]?.totalPoints || 0;
    const totalPointsValue = Math.floor(totalPoints / (points_step || 1)) * points_step_value;

    res.json({
      customersWithPoints,
      totalPoints,
      totalPointsValue,
      totalTransactions: totalTxCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. TRA CỨU HỘI VIÊN QUA SỐ ĐIỆN THOẠI (Admin, Staff / Thu ngân tại quầy)
router.get('/lookup', adminOrStaff, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Vui lòng cung cấp số điện thoại tra cứu.' });
    }

    const cleanPhone = phone.trim().replace(/\s/g, '');
    const user = await User.findOne({
      phone: cleanPhone,
      role: 'CUSTOMER'
    }).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: `Không tìm thấy khách hàng với SĐT "${cleanPhone}".` });
    }

    // Lấy quy tắc đổi điểm hiện hành
    const [stepSetting, valueSetting] = await Promise.all([
      ShopSetting.findOne({ settingKey: 'points_step' }),
      ShopSetting.findOne({ settingKey: 'points_step_value' })
    ]);
    const step = stepSetting ? Number(stepSetting.settingValue) : 10;
    const stepVal = valueSetting ? Number(valueSetting.settingValue) : 2000;
    const cashValue = Math.floor((user.totalPoints || 0) / step) * stepVal;

    // Lấy thông tin đơn hàng và tổng chi tiêu
    const orders = await Order.find({ customer: user._id }).sort({ createdAt: -1 });
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
    const totalSpent = completedOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
    const lastOrder = orders[0] || null;

    // Lấy 10 giao dịch điểm gần nhất của khách này
    const recentTransactions = await LoyaltyTransaction.find({ customer: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('order', 'orderCode finalAmount createdAt');

    res.json({
      user,
      totalSpent,
      completedOrdersCount: completedOrders.length,
      cashValue,
      lastOrder,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. ĐIỀU CHỈNH ĐIỂM (CỘNG / TRỪ ĐIỂM) & TỰ ĐỘNG CẬP NHẬT HẠNG THÀNH VIÊN
router.post('/adjust', adminOrStaff, async (req, res) => {
  try {
    const { customerId, phone, pointsChange, reason, orderId } = req.body;

    let user = null;
    if (customerId) {
      user = await User.findById(customerId);
    } else if (phone) {
      const cleanPhone = phone.trim().replace(/\s/g, '');
      user = await User.findOne({ phone: cleanPhone, role: 'CUSTOMER' });
    }

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    }

    const change = Number(pointsChange);
    if (isNaN(change) || change === 0) {
      return res.status(400).json({ message: 'Số điểm thay đổi phải khác 0.' });
    }

    if (user.totalPoints + change < 0) {
      return res.status(400).json({
        message: `Khách hàng hiện có ${user.totalPoints} điểm, không đủ để trừ ${Math.abs(change)} điểm.`
      });
    }

    user.totalPoints += change;

    // Logic tự động nâng hạng thẻ (Real Business Logic)
    const { newTier, changed: tierChanged } = await evaluateAndUpdateTier(user);
    await user.save();

    const tx = await LoyaltyTransaction.create({
      customer: user._id,
      order: orderId || undefined,
      pointsChange: change,
      balanceAfter: user.totalPoints,
      transactionType: change > 0 ? 'EARN' : 'REDEEM',
      reason: reason || (change > 0 ? 'Cộng điểm tích lũy' : 'Đổi điểm giảm giá'),
      performedBy: req.user._id
    });

    res.status(201).json({
      message: `Đã ${change > 0 ? 'cộng' : 'trừ'} ${Math.abs(change)} điểm cho khách hàng ${user.fullName}.${
        tierChanged ? ` Khách hàng đã được cập nhật hạng thẻ mới: ${newTier}!` : ''
      }`,
      transaction: tx,
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        tierName: user.tierName,
        totalPoints: user.totalPoints
      },
      tierPromoted: tierChanged
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 6. GET NHẬT KÝ TÍCH & ĐỔI ĐIỂM TOÀN HỆ THỐNG
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'CUSTOMER') {
      filter.customer = req.user._id;
    } else if (req.query.customerId) {
      filter.customer = req.query.customerId;
    }

    if (req.query.type && req.query.type !== 'ALL') {
      filter.transactionType = req.query.type;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      LoyaltyTransaction.find(filter)
        .populate('customer', 'fullName phone tierName totalPoints')
        .populate('order', 'orderCode finalAmount createdAt')
        .populate('performedBy', 'fullName position')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LoyaltyTransaction.countDocuments(filter)
    ]);

    res.json({
      transactions,
      total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
