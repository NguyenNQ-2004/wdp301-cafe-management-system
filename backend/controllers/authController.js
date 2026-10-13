const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getJwtSecret = require('../config/jwtSecret');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (chỉ tạo CUSTOMER) | Private/Admin (tạo STAFF và ADMIN)
const register = async (req, res) => {
  try {
    const { fullName, phone, email, password, role, position } = req.body;

    // Kiểm tra user đã tồn tại
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ message: 'Số điện thoại này đã được đăng ký' });
    }

    // Phân quyền role:
    // - Không có token -> chỉ được đăng ký CUSTOMER
    // - ADMIN đăng nhập -> có thể tạo bất kỳ role nào
    let assignedRole = 'CUSTOMER';
    let assignedPosition = undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, getJwtSecret());
        const requestingUser = await User.findById(decoded.id).select('role');
        if (requestingUser && requestingUser.role === 'ADMIN') {
          // Chỉ ADMIN mới được gán role và position tùy chọn
          assignedRole = ['ADMIN', 'STAFF', 'CUSTOMER'].includes(role) ? role : 'CUSTOMER';
          assignedPosition = ['MANAGER', 'BARISTA', 'CASHIER', 'SHIPPER'].includes(position) ? position : undefined;
        }
      } catch (_) {
        // Token không hợp lệ -> vẫn tạo CUSTOMER
      }
    }

    // Hash mật khẩu
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Tạo user
    const user = await User.create({
      fullName,
      phone,
      email,
      passwordHash,
      role: assignedRole,
      position: assignedPosition,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        position: user.position,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find user by phone
    const user = await User.findOne({ phone });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa hoặc khóa.' });
      }
      res.json({
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        position: user.position,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid phone or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user / clear cookie or token
// @route   POST /api/auth/logout
// @access  Public
const logout = (req, res) => {
  // In a stateless JWT approach, the client clears the token.
  // We can just return a success message.
  res.json({ message: 'Logged out successfully' });
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // We assume the user ID is in req.user from an auth middleware
    const user = await User.findById(req.user._id);

    if (user && (await bcrypt.compare(oldPassword, user.passwordHash))) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();
      res.json({ message: 'Password changed successfully' });
    } else {
      res.status(401).json({ message: 'Invalid old password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: '30d',
  });
};

module.exports = {
  register,
  login,
  logout,
  changePassword,
};
