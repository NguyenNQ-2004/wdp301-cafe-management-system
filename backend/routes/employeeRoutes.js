const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect, adminOnly);

const positions = ['MANAGER', 'BARISTA', 'CASHIER', 'SHIPPER'];
const statuses = ['ACTIVE', 'INACTIVE', 'LOCKED'];
const allowedFields = ['fullName', 'phone', 'position', 'baseSalary', 'hireDate', 'status', 'password'];
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const publicEmployee = (employee) => {
  const result = employee.toObject();
  delete result.passwordHash;
  return result;
};

function parseEmployee(body, creating) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Dữ liệu nhân viên không hợp lệ.');
  if (Object.keys(body).some((key) => !allowedFields.includes(key))) throw badRequest('Thông tin nhân viên không hợp lệ.');
  const data = {};
  for (const field of ['fullName', 'phone', 'position']) {
    if (creating && body[field] === undefined) throw badRequest(`Thiếu thông tin ${field}.`);
  }
  if (body.fullName !== undefined) {
    if (typeof body.fullName !== 'string' || !body.fullName.trim() || body.fullName.trim().length > 100) throw badRequest('Tên nhân viên phải có từ 1 đến 100 ký tự.');
    data.fullName = body.fullName.trim();
  }
  if (body.phone !== undefined) {
    if (typeof body.phone !== 'string' || !/^[0-9]{9,15}$/.test(body.phone.trim())) throw badRequest('Số điện thoại phải có từ 9 đến 15 chữ số.');
    data.phone = body.phone.trim();
  }
  if (body.position !== undefined) {
    if (!positions.includes(body.position)) throw badRequest('Vị trí nhân viên không hợp lệ.');
    data.position = body.position;
  }
  if (body.baseSalary !== undefined) {
    if (typeof body.baseSalary !== 'number' || !Number.isSafeInteger(body.baseSalary) || body.baseSalary < 0) throw badRequest('Lương cơ bản phải là số nguyên không âm.');
    data.baseSalary = body.baseSalary;
  }
  if (body.hireDate !== undefined) {
    if (body.hireDate === null || body.hireDate === '') data.hireDate = null;
    else {
      if (typeof body.hireDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.hireDate)) throw badRequest('Ngày vào làm không hợp lệ.');
      const date = new Date(`${body.hireDate}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== body.hireDate) throw badRequest('Ngày vào làm không hợp lệ.');
      data.hireDate = date;
    }
  }
  if (body.status !== undefined) {
    if (!statuses.includes(body.status)) throw badRequest('Trạng thái nhân viên không hợp lệ.');
    data.status = body.status;
  }
  if (creating && body.password === undefined) throw badRequest('Cần nhập mật khẩu cho tài khoản nhân viên.');
  if (body.password !== undefined) {
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 72) throw badRequest('Mật khẩu phải có từ 8 đến 72 ký tự.');
    data.password = body.password;
  }
  return data;
}

const handleError = (error, res) => {
  if (error.code === 11000) return res.status(409).json({ message: 'Số điện thoại này đã được sử dụng.' });
  return res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
};

router.get('/', async (_req, res) => {
  try {
    const employees = await User.find({ role: 'STAFF' }).select('-passwordHash').sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) { handleError(error, res); }
});

router.post('/', async (req, res) => {
  try {
    const { password, ...fields } = parseEmployee(req.body, true);
    const employee = await User.create({ ...fields, role: 'STAFF', passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json(publicEmployee(employee));
  } catch (error) { handleError(error, res); }
});

router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Mã nhân viên không hợp lệ.');
    const changes = parseEmployee(req.body, false);
    const employee = await User.findOne({ _id: req.params.id, role: 'STAFF' });
    if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    const { password, ...fields } = changes;
    Object.assign(employee, fields);
    if (password) employee.passwordHash = await bcrypt.hash(password, 10);
    await employee.save();
    res.json(publicEmployee(employee));
  } catch (error) { handleError(error, res); }
});

module.exports = router;
