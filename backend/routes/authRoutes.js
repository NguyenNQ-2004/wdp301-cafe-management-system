const express = require('express');
const router = express.Router();
const { register, login, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.put('/change-password', protect, changePassword);

module.exports = router;
