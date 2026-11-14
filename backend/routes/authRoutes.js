const express = require('express');
const router = express.Router();
const { register, login, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { normalizeEmail, validEmail } = require('../utils/accountEmail');
const { validFullName } = require('../utils/personName');
router.use(require('./passwordRecoveryRoutes'));

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, (req, res) => {
  const { _id, fullName, phone, email, birthday, address, role, position, status, baseSalary, hireDate, totalPoints } = req.user;
  res.json({ _id, fullName, phone, email, birthday, address, role, position, status, baseSalary, hireDate, totalPoints });
});
router.put('/profile', protect, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ message: 'Thông tin hồ sơ không hợp lệ.' });
    const { fullName, phone, email, birthday, address } = req.body;
    if (fullName !== undefined && (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 100)) return res.status(400).json({ message: 'Họ tên phải có từ 1 đến 100 ký tự.' });
    if (fullName !== undefined && !validFullName(fullName)) return res.status(400).json({ message: 'Họ tên không hợp lệ. Chỉ dùng chữ cái, khoảng trắng, dấu gạch nối hoặc dấu nháy.' });
    if (phone !== undefined && (typeof phone !== 'string' || !/^\+?[0-9]{9,15}$/.test(phone.replace(/\s+/g, '')))) return res.status(400).json({ message: 'Số điện thoại phải có từ 9 đến 15 chữ số.' });
    if (address !== undefined && address !== null && (typeof address !== 'string' || address.trim().length > 500)) return res.status(400).json({ message: 'Địa chỉ phải có tối đa 500 ký tự.' });
    if (birthday !== undefined && birthday !== null) {
      const parsed = typeof birthday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(birthday) ? new Date(birthday) : null;
      if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthday) return res.status(400).json({ message: 'Ngày sinh không hợp lệ.' });
    }
    const user = await require('../models/User').findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (fullName !== undefined) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.replace(/\s+/g, '');
    if (email !== undefined) {
      if (!validEmail(normalizeEmail(email))) return res.status(400).json({ message: 'Không thể xóa email đăng nhập. Vui lòng nhập email hợp lệ.' });
      user.email = normalizeEmail(email);
    }
    if (birthday !== undefined) user.birthday = birthday;
    if (address !== undefined) user.address = address === null ? null : address.trim();
    await user.save();
    res.json({
      _id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      birthday: user.birthday,
      address: user.address,
      role: user.role,
      position: user.position,
      status: user.status,
      baseSalary: user.baseSalary,
      hireDate: user.hireDate,

      totalPoints: user.totalPoints
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: err.keyPattern?.phone ? 'Số điện thoại này đã được sử dụng cho tài khoản khác.' : 'Email này đã được sử dụng cho tài khoản khác.' });
    res.status(err.status || (err.name === 'ValidationError' ? 400 : 500)).json({ message: err.message });
  }
});
router.put('/change-password', protect, changePassword);

module.exports = router;
