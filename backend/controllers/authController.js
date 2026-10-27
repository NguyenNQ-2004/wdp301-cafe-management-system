const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getJwtSecret = require('../config/jwtSecret');
const { normalizeEmail, validEmail, emailFilter } = require('../utils/accountEmail');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (chỉ tạo CUSTOMER) | Private/Admin (tạo STAFF và ADMIN)
const register = async (req, res) => {
  try {
    const { fullName, phone, email, password, role, position } = req.body;
    const loginEmail = normalizeEmail(email);
    const contactPhone = typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 100) return res.status(400).json({ message: 'Họ tên phải có từ 1 đến 100 ký tự.' });
    if (!validEmail(loginEmail)) return res.status(400).json({ message: 'Vui lòng nhập địa chỉ Gmail/email hợp lệ để đăng nhập.' });
    if (!/^\+?[0-9]{9,15}$/.test(contactPhone)) return res.status(400).json({ message: 'Số điện thoại liên hệ phải có từ 9 đến 15 chữ số.' });
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte.' });
    await User.init(); // Ensure the unique identity index is ready before accepting registrations.
    if (await User.exists(emailFilter(loginEmail))) return res.status(409).json({ message: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.' });

    // Kiểm tra user đã tồn tại
    const userExists = await User.findOne({ phone: contactPhone });
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
      fullName: fullName.trim(),
      phone: contactPhone,
      email: loginEmail,
      passwordHash,
      role: assignedRole,
      position: assignedPosition,
    });

    if (user) {
      res.status(201).json({
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
        totalPoints: user.totalPoints,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: error.keyPattern?.phone ? 'Số điện thoại liên hệ này đã được đăng ký.' : 'Email này đã được đăng ký.' });
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const loginEmail = normalizeEmail(email);
    if (!validEmail(loginEmail) || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập Gmail/email hợp lệ và mật khẩu.' });
    }

    const matches = await User.find(emailFilter(loginEmail)).limit(2);
    if (matches.length > 1) return res.status(409).json({ message: 'Email đang gắn với nhiều tài khoản cũ. Vui lòng liên hệ quản trị viên để cập nhật email riêng.' });
    const user = matches[0];

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa hoặc khóa.' });
      }
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
        totalPoints: user.totalPoints,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Gmail/email hoặc mật khẩu không đúng.' });
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
