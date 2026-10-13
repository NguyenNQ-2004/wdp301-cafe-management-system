const express = require('express');
const router = express.Router();
const { register, login, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, (req, res) => {
  const { _id, fullName, phone, role, position } = req.user;
  res.json({ _id, fullName, phone, role, position });
});
router.put('/change-password', protect, changePassword);

module.exports = router;
