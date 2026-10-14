const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const { protect, adminOnly, adminOrCashier } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// ==========================================
// SCREEN 28: CUSTOMER MANAGEMENT APIS (CRM)
// Actors: Admin, Cashier
// ==========================================

// 1. GET ALL CUSTOMERS with aggregated orders & spending
router.get('/customers', adminOrCashier, async (req, res) => {
  try {
    const { search, tier, status, page = 1, limit = 50 } = req.query;
    const filter = { role: 'CUSTOMER' };

    if (tier && tier !== 'ALL') {
      filter.tierName = tier;
    }
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter)
    ]);

    // Aggregate orders for these customers to compute totalSpent & orderCount accurately
    const customerIds = customers.map(c => c._id);
    const orderAggregations = await Order.aggregate([
      { $match: { customer: { $in: customerIds } } },
      {
        $group: {
          _id: '$customer',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
          },
          totalSpent: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, '$finalAmount', 0] }
          },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ]);

    const orderMap = new Map();
    orderAggregations.forEach(item => {
      orderMap.set(String(item._id), item);
    });

    const enrichedCustomers = customers.map(c => {
      const stats = orderMap.get(String(c._id)) || { totalOrders: 0, completedOrders: 0, totalSpent: 0, lastOrderDate: null };
      return {
        ...c.toObject(),
        totalOrders: stats.totalOrders,
        completedOrders: stats.completedOrders,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate
      };
    });

    // Overview statistics for CRM dashboard
    const [totalCustomersCount, activeCustomersCount, pointsStats, revenueStats] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER' }),
      User.countDocuments({ role: 'CUSTOMER', status: 'ACTIVE' }),
      User.aggregate([
        { $match: { role: 'CUSTOMER' } },
        { $group: { _id: null, totalPoints: { $sum: '$totalPoints' } } }
      ]),
      Order.aggregate([
        { $match: { customer: { $exists: true, $ne: null }, status: 'COMPLETED' } },
        { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' } } }
      ])
    ]);

    res.json({
      customers: enrichedCustomers,
      total,
      page: Number(page),
      limit: Number(limit),
      stats: {
        totalCustomers: totalCustomersCount,
        activeCustomers: activeCustomersCount,
        totalPoints: pointsStats[0]?.totalPoints || 0,
        totalMemberRevenue: revenueStats[0]?.totalRevenue || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. GET SINGLE CUSTOMER DETAILS & ORDER HISTORY
router.get('/customers/:id', adminOrCashier, async (req, res) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' }).select('-passwordHash');
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    }

    // Lấy toàn bộ đơn hàng của khách
    const orders = await Order.find({ customer: customer._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name imageUrl basePrice');

    // Lấy lịch sử biến động điểm
    const loyaltyHistory = await LoyaltyTransaction.find({ customer: customer._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('order', 'orderCode finalAmount');

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'COMPLETED');
    const totalSpent = completedOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);

    res.json({
      customer,
      totalOrders,
      completedOrdersCount: completedOrders.length,
      totalSpent,
      orders,
      loyaltyHistory
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. CREATE NEW CUSTOMER
router.post('/customers', adminOrCashier, async (req, res) => {
  try {
    const { fullName, phone, email, birthday, address, initialPoints = 0 } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ message: 'Họ tên và Số điện thoại là bắt buộc.' });
    }

    const existing = await User.findOne({ phone: phone.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Số điện thoại này đã tồn tại trong hệ thống.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    const points = Math.max(0, Number(initialPoints) || 0);

    // Tính hạng thành viên dựa trên điểm khởi tạo
    let tierName = 'BRONZE';
    if (points >= 300) tierName = 'DIAMOND';
    else if (points >= 150) tierName = 'GOLD';
    else if (points >= 50) tierName = 'SILVER';

    const customer = await User.create({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      birthday: birthday ? new Date(birthday) : undefined,
      address: address ? address.trim() : undefined,
      passwordHash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      totalPoints: points,
      tierName
    });

    if (points > 0) {
      await LoyaltyTransaction.create({
        customer: customer._id,
        pointsChange: points,
        balanceAfter: points,
        transactionType: 'EARN',
        reason: 'Điểm thưởng tạo mới thành viên',
        performedBy: req.user._id
      });
    }

    const customerObj = customer.toObject();
    delete customerObj.passwordHash;
    res.status(201).json({
      message: `Đã thêm khách hàng "${customer.fullName}" thành công!`,
      customer: customerObj
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. UPDATE CUSTOMER
router.put('/customers/:id', adminOrCashier, async (req, res) => {
  try {
    const { fullName, email, birthday, address, status, tierName } = req.body;
    const customer = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' });
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    }

    if (fullName) customer.fullName = fullName.trim();
    if (email !== undefined) customer.email = email ? email.trim() : '';
    if (birthday !== undefined) customer.birthday = birthday ? new Date(birthday) : null;
    if (address !== undefined) customer.address = address ? address.trim() : '';
    if (status && ['ACTIVE', 'INACTIVE', 'LOCKED'].includes(status)) customer.status = status;
    if (tierName && ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'].includes(tierName)) customer.tierName = tierName;

    await customer.save();
    const customerObj = customer.toObject();
    delete customerObj.passwordHash;
    res.json({ message: 'Cập nhật thông tin khách hàng thành công!', customer: customerObj });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 5. TOGGLE LOCK / UNLOCK CUSTOMER STATUS
router.patch('/customers/:id/toggle-lock', adminOrCashier, async (req, res) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' });
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    }

    customer.status = customer.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    await customer.save();

    res.json({
      message: `Tài khoản ${customer.fullName} đã được ${customer.status === 'LOCKED' ? 'khóa' : 'mở khóa'}.`,
      status: customer.status
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ==========================================
// GENERAL USER APIS (Nhân sự & Tài khoản)
// ==========================================

// 1. GET ALL USERS (Admin / Manager xem danh sách nhân sự, khách hàng)
router.get('/', adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.position) filter.position = req.query.position;

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. GET USER BY ID
router.get('/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. ADMIN CREATE USER (Staff, Barista, Cashier, Shipper, Customer)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { fullName, phone, email, password = '123456', role, position, baseSalary, hireDate, birthday, address } = req.body;
    
    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng.' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      phone,
      email,
      passwordHash,
      role: role || 'CUSTOMER',
      position: position || undefined,
      baseSalary: Number(baseSalary) || 0,
      hireDate: hireDate ? new Date(hireDate) : undefined,
      birthday: birthday ? new Date(birthday) : undefined,
      address,
      status: 'ACTIVE'
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.status(201).json(userObj);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. ADMIN UPDATE USER
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { fullName, email, role, position, status, baseSalary, hireDate, birthday, address, totalPoints } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    if (fullName) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (role) user.role = role;
    if (position !== undefined) user.position = position;
    if (status) user.status = status;
    if (baseSalary !== undefined) user.baseSalary = Number(baseSalary);
    if (hireDate !== undefined) user.hireDate = hireDate ? new Date(hireDate) : null;
    if (birthday !== undefined) user.birthday = birthday ? new Date(birthday) : null;
    if (address !== undefined) user.address = address;
    if (totalPoints !== undefined) user.totalPoints = Number(totalPoints);

    await user.save();
    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.json(userObj);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 5. ADMIN DELETE USER
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa người dùng thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
