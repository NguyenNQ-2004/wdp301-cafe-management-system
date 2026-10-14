const express = require('express');
const router = express.Router();
const { register, login, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

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
    if (email !== undefined) user.email = email;
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
    res.status(500).json({ message: err.message });
  }
});
router.put('/change-password', protect, changePassword);

module.exports = router;
