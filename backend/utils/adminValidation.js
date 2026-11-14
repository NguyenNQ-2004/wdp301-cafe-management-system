const mongoose = require('mongoose');

const invalid = (message, status = 400) => Object.assign(new Error(message), { status });
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
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw invalid(`${label} phải là số không âm.`);
  return value;
};
const sendError = (res, error) => {
  if (mongoose.transactionAsyncLocalStorage?.getStore()?.session && error.hasErrorLabel?.('TransientTransactionError')) throw error;
  return res.status(error.status || (error.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(error.name) ? 400 : 500)).json({ message: error.code === 11000 ? 'Dữ liệu đã tồn tại.' : error.message });
};
module.exports = { invalid, objectBody, objectId, text, nonnegative, sendError };
