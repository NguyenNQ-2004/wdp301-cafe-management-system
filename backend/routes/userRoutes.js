const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

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
