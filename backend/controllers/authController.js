const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getJwtSecret = require('../config/jwtSecret');
const { normalizeEmail, validEmail, emailFilter, validLogin, loginFilter } = require('../utils/EmailUtil');
const { validFullName } = require('../utils/personName');
const { passwordError } = require('../utils/passwordPolicy');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (chỉ tạo CUSTOMER) | Private/Admin (tạo STAFF và ADMIN)
const register = async (req, res) => {
  // [DK06] . Kiểm tra dữ liệu đăng ký và email, số điện thoại trùng.
  // [DK06] .. Dữ liệu sai hoặc trùng thì trả lỗi từng trường, không tạo tài khoản.
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ message: 'Dữ liệu đăng ký không hợp lệ.' });
    const { fullName, phone, email, password, role, position } = req.body;
    const loginEmail = normalizeEmail(email);
    const contactPhone = typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';
    const errors = {};
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 100) errors.fullName = 'Họ tên phải có từ 1 đến 100 ký tự.';
    else if (!validFullName(fullName)) errors.fullName = 'Họ tên không hợp lệ. Chỉ dùng chữ cái, khoảng trắng, dấu gạch nối hoặc dấu nháy.';
    if (!validEmail(loginEmail)) errors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    if (!/^\+?[0-9]{9,15}$/.test(contactPhone)) errors.phone = 'Số điện thoại phải có từ 9 đến 15 chữ số.';
    const passwordValidationError = passwordError(password);
    if (passwordValidationError) errors.password = passwordValidationError;
    if (req.body.confirmPassword !== undefined && req.body.confirmPassword !== password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    const invalidInput = Object.keys(errors).length > 0;
    await User.init(); // Ensure the unique identity index is ready before accepting registrations.
    const [emailExists, phoneExists] = await Promise.all([
      errors.email ? false : User.exists(emailFilter(loginEmail)),
      errors.phone ? false : User.exists({ phone: contactPhone })
    ]);
    if (emailExists) errors.email = 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.';
    if (phoneExists) errors.phone = 'Số điện thoại này đã được đăng ký.';
    if (Object.keys(errors).length) return res.status(!invalidInput && emailExists ? 409 : 400).json({ message: 'Vui lòng kiểm tra các thông tin được đánh dấu.', errors });

    // [DK06] ... Xác định quyền tạo tài khoản nếu dữ liệu hợp lệ. [DK07]
    // [DK07] . Mặc định tạo CUSTOMER; chỉ Admin hợp lệ mới được chọn vai trò và vị trí khác.
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
        const requestingUser = await User.findById(decoded.id).select('role status passwordChangedAt');
        if (requestingUser && requestingUser.role === 'ADMIN' && requestingUser.status === 'ACTIVE' && (decoded.passwordVersion || 0) === (requestingUser.passwordChangedAt?.getTime() || 0)) {
          // Chỉ ADMIN mới được gán role và position tùy chọn
          assignedRole = ['ADMIN', 'STAFF', 'CUSTOMER'].includes(role) ? role : 'CUSTOMER';
          assignedPosition = ['MANAGER', 'BARISTA', 'CASHIER', 'SHIPPER'].includes(position) ? position : undefined;
        }
      } catch (_) {
        // Token không hợp lệ -> vẫn tạo CUSTOMER
      }
    }

    // [DK07] ... Chuẩn bị lưu tài khoản. [DK08]
    // [DK08] . Băm mật khẩu bằng bcrypt, không lưu mật khẩu gốc.
    // Hash mật khẩu
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Tạo user
    // [DK08] ... Kiểm tra model trước khi lưu tài khoản. [DK09]
    const user = await User.create({
      fullName: fullName.trim(),
      phone: contactPhone,
      email: loginEmail,
      passwordHash,
      role: assignedRole,
      position: assignedPosition,
    });

    // [DK10] .. Tài khoản đã được lưu; trả thông tin cùng JWT với HTTP 201.
    // [DK10] ... Hiển thị kết quả đăng ký. [DK11]
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

        totalPoints: user.totalPoints,
        token: generateToken(user),
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
  } catch (error) {
    if (error.code === 11000) {
      const field = error.keyPattern?.phone ? 'phone' : 'email';
      const message = field === 'phone' ? 'Số điện thoại này đã được đăng ký.' : 'Email này đã được đăng ký.';
      return res.status(409).json({ message, errors: { [field]: message } });
    }
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  // [LG05] . Kiểm tra định dạng email hoặc số điện thoại và mật khẩu nhận được.
  // [LG05] .. Dữ liệu không hợp lệ thì trả HTTP 400.
  try {
    const { password } = req.body;
    const identifier = req.body.identifier ?? req.body.email ?? req.body.phone;
    if (!validLogin(identifier) || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email hoặc số điện thoại hợp lệ và mật khẩu.' });
    }

    // [LG05] ... Chọn điều kiện tìm tài khoản. [LG06]
    const matches = await User.find(loginFilter(identifier)).limit(2);
    // [LG07] . Nhận kết quả tìm tài khoản, chặn trùng, so mật khẩu và kiểm tra trạng thái hoạt động.
    if (matches.length > 1) return res.status(409).json({ message: 'Email đang gắn với nhiều tài khoản cũ. Vui lòng liên hệ quản trị viên để cập nhật email riêng.' });
    const user = matches[0];

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
      }
      // [LG07] ... Tạo token nếu xác thực thành công. [LG08]
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

        totalPoints: user.totalPoints,
        token: generateToken(user),
      });
    } else {
      // [LG07] .. Không có tài khoản hoặc mật khẩu sai thì trả HTTP 401.
      res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
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
  // [HS06] . Nhận mật khẩu cũ, mới và xác nhận; kiểm tra quy tắc mật khẩu mới rồi so mật khẩu cũ bằng bcrypt.
  // [HS06] .. Nếu đúng, băm mật khẩu mới và đổi passwordChangedAt để token cũ không còn hợp lệ; sai thì trả lỗi.
  // [HS06] ... Trả kết quả để giao diện kết thúc phiên và yêu cầu đăng nhập lại. [HS07]
  try {
    const { oldPassword, newPassword } = req.body;
    const newPasswordError = passwordError(newPassword);
    if (typeof oldPassword !== 'string' || !oldPassword || newPasswordError) return res.status(400).json({ message: newPasswordError || 'Mật khẩu cũ không hợp lệ.' });
    if (req.body.confirmPassword !== undefined && newPassword !== req.body.confirmPassword) return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp.' });
    
    // We assume the user ID is in req.user from an auth middleware
    const user = await User.findById(req.user._id);

    if (user && (await bcrypt.compare(oldPassword, user.passwordHash))) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.passwordChangedAt = new Date(Math.max(Date.now(), (user.passwordChangedAt?.getTime() || 0) + 1));
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
const generateToken = (user) => {
  // [LG08] . Tạo JWT hạn 30 ngày, chứa ID và phiên bản mật khẩu; cũng dùng khi đăng ký ở DK10.
  // [LG08] .. Trả token để gửi cùng thông tin tài khoản.
  // [LG08] ... Nhận phản hồi đăng nhập ở giao diện. [LG09]
  return jwt.sign({ id: user._id, passwordVersion: user.passwordChangedAt?.getTime() || 0 }, getJwtSecret(), {
    expiresIn: '30d',
  });
};

module.exports = {
  register,
  login,
  logout,
  changePassword,
};
