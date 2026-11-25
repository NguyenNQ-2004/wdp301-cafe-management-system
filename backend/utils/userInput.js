const { objectBody, fieldError, calendarDate } = require('./adminValidation');
const { normalizeEmail, validEmail } = require('./accountEmail');
const { validFullName } = require('./personName');
const { passwordError } = require('./passwordPolicy');

function parseUserInput(body, creating) {
  objectBody(body);
  const fields = {};
  if (creating || body.fullName !== undefined) {
    if (!validFullName(body.fullName)) throw fieldError('fullName', 'Họ tên phải có từ 1 đến 100 ký tự, chỉ gồm chữ cái, khoảng trắng, dấu gạch nối hoặc dấu nháy.');
    fields.fullName = body.fullName.trim();
  }
  if (creating || body.phone !== undefined) {
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\s+/g, '') : '';
    if (!/^\+?[0-9]{9,15}$/.test(phone)) throw fieldError('phone', 'Số điện thoại phải có từ 9 đến 15 chữ số, chỉ được thêm dấu + ở đầu.');
    fields.phone = phone;
  }
  if (body.email !== undefined) {
    const email = normalizeEmail(body.email);
    if (!validEmail(email)) throw fieldError('email', 'Vui lòng nhập địa chỉ email hợp lệ.');
    fields.email = email;
  }
  for (const [field, values, label] of [
    ['role', ['ADMIN', 'STAFF', 'CUSTOMER'], 'Vai trò tài khoản'],
    ['position', ['MANAGER', 'BARISTA', 'CASHIER', 'SHIPPER'], 'Vị trí nhân viên'],
    ['status', ['ACTIVE', 'INACTIVE', 'LOCKED'], 'Trạng thái tài khoản']
  ]) {
    if (body[field] !== undefined) {
      if (!values.includes(body[field])) throw fieldError(field, `${label} không hợp lệ. Vui lòng chọn một giá trị trong danh sách.`);
      fields[field] = body[field];
    }
  }
  if (body.baseSalary !== undefined) {
    if (!Number.isSafeInteger(body.baseSalary) || body.baseSalary < 0) throw fieldError('baseSalary', 'Lương cơ bản phải là số nguyên không âm và nằm trong giới hạn số hợp lệ.');
    fields.baseSalary = body.baseSalary;
  }
  for (const [field, label] of [['hireDate', 'Ngày vào làm'], ['birthday', 'Ngày sinh']]) {
    if (body[field] !== undefined) fields[field] = calendarDate(body[field], label, field);
  }
  if (body.address !== undefined) {
    if (body.address !== null && (typeof body.address !== 'string' || body.address.trim().length > 500)) throw fieldError('address', 'Địa chỉ phải là văn bản có tối đa 500 ký tự.');
    fields.address = body.address === null ? null : body.address.trim();
  }
  if (creating) {
    const message = passwordError(body.password);
    if (message) throw fieldError('password', message);
    fields.password = body.password;
  }
  return fields;
}

module.exports = { parseUserInput };
