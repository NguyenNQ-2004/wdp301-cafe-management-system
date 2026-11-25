const mongoose = require('mongoose');
const { invalid, objectBody, numberInput, fieldError } = require('./adminValidation');

// K-PN: Chuẩn hóa số lượng và tổng tiền từng dòng trước khi lưu phiếu.
// Đơn giá bằng tổng tiền chia cho số lượng và có thể là số lẻ.
// K-PN: normalizePurchaseItems — Kiểm tra và chuẩn hóa các dòng nguyên liệu trước khi lưu phiếu.
function normalizePurchaseItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw invalid('Cần ít nhất một nguyên liệu nhập.');
  const normalized = items.map((item, index) => {
    objectBody(item);
    const row = `dòng ${index + 1}`;
    if (!mongoose.isValidObjectId(item.ingredient)) throw fieldError(`items.${index}.ingredient`, `Vui lòng chọn nguyên liệu hợp lệ ở ${row}.`);
    const amount = numberInput(item.quantity, `Số lượng nhập ${row}`, `items.${index}.quantity`);
    if (amount < 0.001) throw fieldError(`items.${index}.quantity`, `Số lượng nhập ${row} phải lớn hơn hoặc bằng 0.001.`);
    const total = item.totalCost !== undefined ? numberInput(item.totalCost, `Tổng tiền ${row}`, `items.${index}.totalCost`) : amount * numberInput(item.unitPrice, `Đơn giá ${row}`, `items.${index}.unitPrice`);
    if (!Number.isFinite(total) || total < 0 || total > Number.MAX_SAFE_INTEGER || (item.totalCost !== undefined && !Number.isSafeInteger(total))) throw fieldError(`items.${index}.totalCost`, `Tổng tiền ${row} phải là số nguyên không âm và nằm trong giới hạn số hợp lệ.`);
    const unitPrice = total / amount;
    if (!Number.isFinite(unitPrice)) throw invalid('Đơn giá không hợp lệ.');
    if (item.totalCost !== undefined && item.unitPrice !== undefined && Math.abs(numberInput(item.unitPrice, `Đơn giá ${row}`, `items.${index}.unitPrice`) - unitPrice) > 1e-8) throw fieldError(`items.${index}.totalCost`, `Tổng tiền ${row} không khớp đơn giá và số lượng.`);
    return { ingredient: item.ingredient, quantity: amount, unitPrice, totalCost: total };
  });
  if (new Set(normalized.map(item => String(item.ingredient).toLowerCase())).size !== normalized.length) throw invalid('Mỗi nguyên liệu chỉ xuất hiện một lần trong phiếu.');
  if (normalized.reduce((sum, item) => sum + item.totalCost, 0) > Number.MAX_SAFE_INTEGER) throw fieldError('items', 'Tổng tiền phiếu nhập vượt quá giới hạn số hợp lệ. Vui lòng giảm số lượng hoặc tổng tiền các dòng.');
  return normalized;
}
module.exports = { normalizePurchaseItems };
