const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const InventoryTransaction = require('../models/InventoryTransaction');
const { invalid } = require('./adminValidation');
const { lockIngredients, normalizedLots, quantity, money } = require('./stockLots');

// Admin corrections affect remaining stock. Historical order allocations stay frozen.
async function editIngredient(id, fields, options, userId) {
  const release = lockIngredients([id]);
  let ledger;
  let committed = false;
  try {
    const previous = await Ingredient.findById(id).lean();
    if (!previous) throw invalid('Không tìm thấy nguyên liệu.', 404);
    if (options.expectedCurrentStock !== undefined && options.expectedCurrentStock !== previous.currentStock) throw invalid('Tồn kho đã thay đổi. Tải lại dữ liệu trước khi sửa.', 409);
    if (options.expectedUnit !== undefined && options.expectedUnit !== previous.unit) throw invalid('Đơn vị đã thay đổi. Tải lại dữ liệu trước khi sửa.', 409);
    const target = quantity(fields.currentStock ?? previous.currentStock);
    const total = options.stockTotalCost;
    if (total !== undefined && (!Number.isSafeInteger(total) || total < 0 || target <= 0)) throw invalid('Tổng giá trị tồn phải là số nguyên không âm và số lượng tồn phải lớn hơn 0.');
    const lots = normalizedLots(previous);
    const valueOf = rows => rows.some(row => row.remainingQuantity > 0 && row.unitCost == null) ? null : money(rows.reduce((sum, row) => sum + row.remainingQuantity * (row.unitCost ?? 0), 0));
    const valueBefore = valueOf(lots);
    const delta = quantity(target - previous.currentStock);
    if (delta < 0) {
      let remaining = -delta;
      for (const lot of lots) {
        const used = Math.min(remaining, lot.remainingQuantity);
        lot.remainingQuantity = quantity(lot.remainingQuantity - used);
        remaining = quantity(remaining - used);
        if (remaining <= 1e-8) break;
      }
    } else if (delta > 0) {
      lots.push({ _id: new mongoose.Types.ObjectId(), sourceType: 'ADJUSTMENT', receivedAt: new Date(), quantity: delta, remainingQuantity: delta, unitCost: null });
    }
    if (total !== undefined) {
      // Preserve original lot prices and exhausted history; move corrected stock into its own lot.
      lots.forEach(lot => { lot.remainingQuantity = 0; });
      lots.push({ _id: new mongoose.Types.ObjectId(), sourceType: 'ADJUSTMENT', receivedAt: new Date(), quantity: target, remainingQuantity: target, unitCost: total / target });
    }
    const unit = fields.unit ?? previous.unit;
    const valueAfter = valueOf(lots);
    const corrected = delta !== 0 || unit !== previous.unit || total !== undefined;
    if (corrected) ledger = await InventoryTransaction.create({
      ingredient: id, transactionType: 'ADJUSTMENT', quantity: Math.abs(delta), stockDelta: delta,
      referenceType: 'ADJUSTMENT', createdBy: userId, note: 'Sửa nguyên liệu: điều chỉnh số tồn, đơn vị hoặc giá trị tồn.',
      stockBefore: previous.currentStock, stockAfter: target, unitBefore: previous.unit, unitAfter: unit,
      valueBefore, valueAfter, costTotal: valueBefore === null || valueAfter === null ? null : money(valueAfter - valueBefore)
    });
    const updated = await Ingredient.findOneAndUpdate({
      _id: id, currentStock: previous.currentStock, unit: previous.unit,
      lotsVersion: previous.lotsVersion === undefined ? { $exists: false } : previous.lotsVersion
    }, { $set: { ...fields, currentStock: target, stockLots: lots,
      ...(total !== undefined ? { stockValuation: { quantity: target, totalCost: total, updatedAt: new Date(), updatedBy: userId } } : {}) },
      $inc: { lotsVersion: 1 } }, { returnDocument: 'after', runValidators: true });
    if (!updated) throw invalid('Nguyên liệu vừa thay đổi. Vui lòng tải lại trước khi lưu.', 409);
    committed = true;
    return updated;
  } finally {
    try { if (ledger && !committed) await InventoryTransaction.deleteOne({ _id: ledger._id }); }
    finally { release(); }
  }
}
module.exports = { editIngredient };
