const express = require('express');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const User = require('../models/User');
const Order = require('../models/Order');
const ShopSetting = require('../models/ShopSetting');
const { protect, adminOnly, adminOrStaff } = require('../middlewares/authMiddleware');
const { invalid, objectBody, objectId, sendError } = require('../utils/adminValidation');
const { validateSettings } = require('../utils/shopSettings');

const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());
router.use(protect);

// ==========================================
// SCREEN 29: PHONE LOYALTY MANAGEMENT APIS
// Actors: Admin, Staff
// ==========================================

// 1. GET PHONE LOYALTY RULES
router.get('/rules', async (req, res) => {
  try {
    const [earnSetting, stepSetting, valueSetting] = await Promise.all([
      ShopSetting.findOne({ settingKey: 'points_earn_unit' }),
      ShopSetting.findOne({ settingKey: 'points_step' }),
      ShopSetting.findOne({ settingKey: 'points_step_value' })
    ]);

    res.json({
      points_earn_unit: earnSetting ? Number(earnSetting.settingValue) : 1000,
      points_step: stepSetting ? Number(stepSetting.settingValue) : 10,
      points_step_value: valueSetting ? Number(valueSetting.settingValue) : 2000
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. ADMIN UPDATE LOYALTY RULES
router.put('/rules', adminOnly, async (req, res) => {
  try {
    objectBody(req.body);
    const { points_earn_unit, points_step, points_step_value } = req.body;
    if (Object.keys(req.body).some(key => !['points_earn_unit', 'points_step', 'points_step_value'].includes(key))) throw invalid('Chỉ cấu hình tỷ lệ tích và đổi điểm theo số điện thoại.');
    const numericSettings = Object.fromEntries(Object.entries({ points_earn_unit, points_step, points_step_value }).filter(([, value]) => value !== undefined));
    if (Object.keys(numericSettings).length) validateSettings(numericSettings);
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

    res.json({ message: 'Đã lưu cấu hình quy tắc tích điểm theo số điện thoại thành công!' });
  } catch (error) {
    sendError(res, error);
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
    const cashValue = Math.floor(Math.max(0, user.totalPoints || 0) / step) * stepVal;

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
      user = await User.findOne({ _id: objectId(customerId), role: 'CUSTOMER' });
    } else if (phone) {
      const cleanPhone = phone.trim().replace(/\s/g, '');
      user = await User.findOne({ phone: cleanPhone, role: 'CUSTOMER' });
    }

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    }

    const change = pointsChange;
    if (!Number.isSafeInteger(change) || change === 0) {
      return res.status(400).json({ message: 'Số điểm thay đổi phải khác 0.' });
    }

    if (user.totalPoints + change < 0) {
      return res.status(400).json({
        message: `Khách hàng hiện có ${user.totalPoints} điểm, không đủ để trừ ${Math.abs(change)} điểm.`
      });
    }

    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) throw invalid('Lý do điều chỉnh không hợp lệ.');
    if (orderId && !await Order.exists({ _id: objectId(orderId), customer: user._id })) throw invalid('Đơn hàng không thuộc khách hàng này.');
    user = await User.findOneAndUpdate({ _id: user._id, role: 'CUSTOMER', ...(change < 0 ? { totalPoints: { $gte: -change } } : {}) }, { $inc: { totalPoints: change } }, { returnDocument: 'after' });
    if (!user) throw invalid('Số điểm không đủ để thực hiện điều chỉnh.');
    let tx;
    try { tx = await LoyaltyTransaction.create({
      customer: user._id,
      order: orderId || undefined,
      pointsChange: change,
      balanceAfter: user.totalPoints,
      transactionType: 'ADJUST',
      reason: reason || (change > 0 ? 'Cộng điểm tích lũy' : 'Đổi điểm giảm giá'),
      performedBy: req.user._id
    }); } catch (error) {
      if (require('mongoose').transactionAsyncLocalStorage?.getStore()?.session) throw error;
      await User.updateOne({ _id: user._id }, { $inc: { totalPoints: -change } });
      throw error;
    }
    res.status(201).json({
      message: `Đã ${change > 0 ? 'cộng' : 'trừ'} ${Math.abs(change)} điểm cho khách hàng ${user.fullName}.`,
      transaction: tx,
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        totalPoints: user.totalPoints
      }
    });
  } catch (error) {
    sendError(res, error);
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
        .populate('customer', 'fullName phone totalPoints')
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
