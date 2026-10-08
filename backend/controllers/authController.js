const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { fullName, phone, email, password, role, position } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      fullName,
      phone,
      email,
      passwordHash,
      role: role || 'CUSTOMER',
      position: position || undefined,
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
      res.status(400).json({ message: 'Invalid user data' });
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
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

module.exports = {
  register,
  login,
  logout,
  changePassword,
};
