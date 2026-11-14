const mongoose = require('mongoose');
const { invalid, objectBody } = require('./adminValidation');

function normalizePurchaseItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw invalid('Cần ít nhất một nguyên liệu nhập.');
  const normalized = items.map(item => {
    objectBody(item);
    const amount = Number(item.quantity);
    if (!mongoose.isValidObjectId(item.ingredient) || !Number.isFinite(amount) || amount < 0.001) throw invalid('Nguyên liệu hoặc số lượng nhập không hợp lệ.');
    if (item.totalCost === null || item.totalCost === '' || (item.totalCost === undefined && (item.unitPrice === null || item.unitPrice === ''))) throw invalid('Vui lòng nhập tổng tiền nguyên liệu.');
    const total = item.totalCost !== undefined ? Number(item.totalCost) : amount * Number(item.unitPrice);
    if (!Number.isFinite(total) || total < 0 || total > Number.MAX_SAFE_INTEGER || (item.totalCost !== undefined && !Number.isSafeInteger(total))) throw invalid('Tổng tiền nguyên liệu phải là số nguyên không âm.');
    const unitPrice = total / amount;
    if (!Number.isFinite(unitPrice)) throw invalid('Đơn giá không hợp lệ.');
    if (item.totalCost !== undefined && item.unitPrice !== undefined && Math.abs(Number(item.unitPrice) - unitPrice) > 1e-8) throw invalid('Tổng tiền không khớp đơn giá và số lượng.');
    return { ingredient: item.ingredient, quantity: amount, unitPrice, totalCost: total };
  });
  if (new Set(normalized.map(item => String(item.ingredient).toLowerCase())).size !== normalized.length) throw invalid('Mỗi nguyên liệu chỉ xuất hiện một lần trong phiếu.');
  return normalized;
}
module.exports = { normalizePurchaseItems };
