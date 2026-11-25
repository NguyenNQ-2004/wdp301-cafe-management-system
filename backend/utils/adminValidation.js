const mongoose = require('mongoose');

const invalid = (message, status = 400) => Object.assign(new Error(message), { status });
const fieldError = (field, message) => Object.assign(invalid(message), { errors: { [field]: message } });
const numberInput = (value, label, field = label) => {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) {
    throw fieldError(field, `${label} phải là số, không được để trống.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER) {
    throw fieldError(field, `${label} vượt quá giới hạn số hợp lệ.`);
  }
  return number;
};
const calendarDate = (value, label, field = label) => {
  if (value === null || value === '') return null;
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw fieldError(field, `${label} không hợp lệ. Vui lòng nhập ngày thực tế theo định dạng YYYY-MM-DD.`);
  }
  return date;
};
const objectBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid('Dữ liệu không hợp lệ.');
  return body;
};
const objectId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw invalid('Mã dữ liệu không hợp lệ.');
  return id;
};
const text = (value, label, max = 150) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw invalid(`${label} phải có từ 1 đến ${max} ký tự.`);
  return value.trim();
};
const nonnegative = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) throw invalid(`${label} phải là số không âm và nằm trong giới hạn số hợp lệ.`);
  return value;
};
const sendError = (res, error) => {
  if (mongoose.transactionAsyncLocalStorage?.getStore()?.session && error.hasErrorLabel?.('TransientTransactionError')) throw error;
  return res.status(error.status || (error.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(error.name) ? 400 : 500)).json({ message: error.code === 11000 ? 'Dữ liệu đã tồn tại.' : error.message, ...(error.errors && error.status === 400 ? { errors: error.errors } : {}) });
};
module.exports = { invalid, fieldError, numberInput, calendarDate, objectBody, objectId, text, nonnegative, sendError };
