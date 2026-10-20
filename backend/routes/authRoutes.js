const express = require('express');
const router = express.Router();
const { register, login, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { normalizeEmail, validEmail } = require('../utils/accountEmail');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, (req, res) => {
  const { _id, fullName, phone, email, birthday, address, role, position, status, baseSalary, hireDate, tierName, totalPoints } = req.user;
  res.json({ _id, fullName, phone, email, birthday, address, role, position, status, baseSalary, hireDate, tierName, totalPoints });
});
router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, email, birthday, address } = req.body;
    const user = await require('../models/User').findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (fullName) user.fullName = fullName;
    if (email !== undefined) {
      if (!validEmail(normalizeEmail(email))) return res.status(400).json({ message: 'Không thể xóa email đăng nhập. Vui lòng nhập email hợp lệ.' });
      user.email = normalizeEmail(email);
    }
    if (birthday !== undefined) user.birthday = birthday;
    if (address !== undefined) user.address = address;
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
      tierName: user.tierName,
      totalPoints: user.totalPoints
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email này đã được sử dụng cho tài khoản khác.' });
    res.status(err.status || (err.name === 'ValidationError' ? 400 : 500)).json({ message: err.message });
  }
});
router.put('/change-password', protect, changePassword);

module.exports = router;
