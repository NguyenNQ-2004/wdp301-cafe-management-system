const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const { protect, adminOnly, adminOrCashier } = require('../middlewares/authMiddleware');
const { invalid, objectBody, objectId, text } = require('../utils/adminValidation');
const { validEmail, normalizeEmail } = require('../utils/accountEmail');
const PurchaseOrder = require('../models/PurchaseOrder');
const WorkSchedule = require('../models/WorkSchedule');
const { passwordError } = require('../utils/passwordPolicy');

function validateCustomer(body, creating) {
  objectBody(body);
  const passwordValidationError = creating ? passwordError(body.password) : null;
  if (passwordValidationError) throw invalid(passwordValidationError);
  if (creating && (typeof body.password !== 'string' || body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 72)) throw invalid('Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte.');
  if (creating || body.fullName !== undefined) text(body.fullName, 'Họ tên', 100);
  if (creating || body.phone !== undefined) {
    if (typeof body.phone !== 'string' || !/^[0-9]{9,15}$/.test(body.phone.trim())) throw invalid('Số điện thoại phải có từ 9 đến 15 chữ số.');
  }
  if (body.email && (typeof body.email !== 'string' || !validEmail(normalizeEmail(body.email)))) throw invalid('Email không hợp lệ.');
  if (body.address !== undefined && (typeof body.address !== 'string' || body.address.length > 500)) throw invalid('Địa chỉ không hợp lệ.');
  if (body.initialPoints !== undefined && (!Number.isSafeInteger(body.initialPoints) || body.initialPoints < 0)) throw invalid('Điểm khởi tạo phải là số nguyên không âm.');
  if (body.status !== undefined && !['ACTIVE', 'INACTIVE', 'LOCKED'].includes(body.status)) throw invalid('Trạng thái tài khoản không hợp lệ.');
  if (body.tierName !== undefined) throw invalid('Hệ thống chỉ quản lý điểm theo số điện thoại, không sử dụng hạng thẻ.');
  if (body.birthday) {
    const parsed = new Date(body.birthday);
    if (typeof body.birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.birthday) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== body.birthday) throw invalid('Ngày sinh không hợp lệ.');
  }
}

const router = express.Router();
router.use(protect);

// ==========================================
// SCREEN 28: CUSTOMER MANAGEMENT APIS (CRM)
// Actors: Admin, Cashier
// ==========================================

// 1. GET ALL CUSTOMERS with aggregated orders & spending
router.get('/customers', adminOrCashier, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const filter = { role: 'CUSTOMER' };

    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (search && search.trim()) {
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageLimit = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 50));
    const skip = (pageNumber - 1) * pageLimit;
    const [customers, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
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
      page: pageNumber,
      limit: pageLimit,
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
    validateCustomer(req.body, true);
    const { fullName, phone, email, password, birthday, address, initialPoints = 0 } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ message: 'Họ tên và Số điện thoại là bắt buộc.' });
    }

    const existing = await User.findOne({ phone: phone.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Số điện thoại này đã tồn tại trong hệ thống.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const points = Math.max(0, Number(initialPoints) || 0);

    const customer = await User.create({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      birthday: birthday ? new Date(birthday) : undefined,
      address: address ? address.trim() : undefined,
      passwordHash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      totalPoints: points
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
    validateCustomer(req.body, false);
    const { fullName, email, birthday, address, status } = req.body;
    const customer = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' });
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    }

    if (fullName) customer.fullName = fullName.trim();
    if (email !== undefined) customer.email = email ? email.trim() : '';
    if (birthday !== undefined) customer.birthday = birthday ? new Date(birthday) : null;
    if (address !== undefined) customer.address = address ? address.trim() : '';
    if (status && ['ACTIVE', 'INACTIVE', 'LOCKED'].includes(status)) customer.status = status;

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
    const { fullName, phone, email, password, role, position, baseSalary, hireDate, birthday, address } = req.body;

    if (typeof fullName !== 'string' || !fullName.trim() || typeof phone !== 'string' || !phone.trim()) return res.status(400).json({ message: 'Họ tên và số điện thoại là bắt buộc.' });
    const passwordValidationError = passwordError(password);
    if (passwordValidationError) return res.status(400).json({ message: passwordValidationError });
    
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
    if (user.role === 'ADMIN' && user.status === 'ACTIVE' && ((role && role !== 'ADMIN') || (status && status !== 'ACTIVE')) && await User.countDocuments({ role: 'ADMIN', status: 'ACTIVE' }) <= 1) return res.status(409).json({ message: 'Không thể vô hiệu hóa quản trị viên đang hoạt động cuối cùng.' });
    if (totalPoints !== undefined && totalPoints !== user.totalPoints) return res.status(400).json({ message: 'Hãy điều chỉnh điểm qua chức năng Tích điểm theo số điện thoại để lưu lịch sử.' });

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
    const id = objectId(req.params.id);
    if (String(id) === String(req.user._id)) return res.status(409).json({ message: 'Không thể tự xóa tài khoản đang sử dụng.' });
    const references = await Promise.all([Order.exists({ $or: [{ customer: id }, { cashier: id }, { shipper: id }] }), PurchaseOrder.exists({ creator: id }), WorkSchedule.exists({ user: id }), LoyaltyTransaction.exists({ customer: id })]);
    if (references.some(Boolean)) return res.status(409).json({ message: 'Tài khoản đã có lịch sử giao dịch hoặc phân ca. Hãy chuyển sang trạng thái ngừng hoạt động.' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    if (user.role === 'ADMIN' && user.status === 'ACTIVE' && await User.countDocuments({ role: 'ADMIN', status: 'ACTIVE' }) <= 1) return res.status(409).json({ message: 'Không thể xóa quản trị viên đang hoạt động cuối cùng.' });
    await User.findByIdAndDelete(id);
    res.json({ message: 'Đã xóa người dùng thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
