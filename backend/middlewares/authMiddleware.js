const jwt = require('jsonwebtoken');
const User = require('../models/User');
const getJwtSecret = require('../config/jwtSecret');

/**
 * Middleware xác thực JWT token
 * Gán req.user từ token hợp lệ
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Lấy token từ header
      token = req.headers.authorization.split(' ')[1];

      // Xác thực token
      const decoded = jwt.verify(token, getJwtSecret());

      // Gán user vào request (bỏ passwordHash)
      req.user = await User.findById(decoded.id).select('-passwordHash');

      if (!req.user) {
        return res.status(401).json({ message: 'Tài khoản không tồn tại.' });
      }

      if (req.user.status !== 'ACTIVE') {
        return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa hoặc khóa.' });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Không có token xác thực' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Chỉ quản trị viên được phép thực hiện thao tác này.' });
  return next();
};

/**
 * Middleware phân quyền theo role
 * Sử dụng SAU protect middleware
 * Ví dụ: router.get('/admin', protect, authorize('ADMIN'), handler)
 * @param {...string} roles - Danh sách các role được phép truy cập
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Bạn không có quyền truy cập. Yêu cầu role: ${roles.join(' hoặc ')}. Role hiện tại: ${req.user.role}`,
      });
    }

    return next();
  };
};

/**
 * Middleware phân quyền theo position (chức vụ nhân viên)
 * Sử dụng SAU protect middleware
 * Ví dụ: router.get('/cashier', protect, authorizePosition('CASHIER', 'MANAGER'), handler)
 * @param {...string} positions - Danh sách các position được phép
 */
const authorizePosition = (...positions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    // ADMIN luôn có quyền truy cập mọi position
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (!req.user.position || !positions.includes(req.user.position)) {
      return res.status(403).json({
        message: `Bạn không có chức vụ phù hợp. Yêu cầu: ${positions.join(' hoặc ')}. Chức vụ hiện tại: ${req.user.position || 'Không có'}`,
      });
    }

    return next();
  };
};

module.exports = { protect, adminOnly, authorize, authorizePosition };
