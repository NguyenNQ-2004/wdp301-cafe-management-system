const jwt = require('jsonwebtoken');
const User = require('../models/User');
const getJwtSecret = require('../config/jwtSecret');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, getJwtSecret());

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-passwordHash');
      if (!req.user) return res.status(401).json({ message: 'Tài khoản không tồn tại.' });
      if (req.user.status !== 'ACTIVE') return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa hoặc khóa.' });
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Chỉ quản trị viên được phép thực hiện thao tác này.' });
  return next();
};

module.exports = { protect, adminOnly };
