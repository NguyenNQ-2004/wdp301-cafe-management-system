const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const { invalid } = require('./adminValidation');
const EPSILON = 1e-8;
const quantity = value => Math.round(value * 1e9) / 1e9;
const money = value => Math.round(value * 100) / 100;
const locks = new Set();

function lockIngredients(ids) {
  const keys = [...new Set(ids.map(String))];
  if (keys.some(key => locks.has(key))) throw invalid('Nguyên liệu đang được cập nhật. Vui lòng thử lại.', 409);
  keys.forEach(key => locks.add(key));
  return () => keys.forEach(key => locks.delete(key));
}

function normalizedLots(ingredient) {
  const lots = (ingredient.stockLots || []).map(lot => ({ ...lot }));
  const tracked = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
  const difference = quantity(ingredient.currentStock - tracked);
  if (difference > EPSILON) lots.unshift({ _id: new mongoose.Types.ObjectId(), sourceType: 'OPENING', receivedAt: new Date(0), quantity: difference, remainingQuantity: difference, unitCost: null });
  if (difference < -EPSILON) throw invalid('Số lượng lô không khớp tồn kho. Vui lòng kiểm tra lại.', 409);
  return lots.sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt) || String(a._id).localeCompare(String(b._id)));
}

const versionFilter = ingredient => ({
  _id: ingredient._id, currentStock: ingredient.currentStock,
  lotsVersion: ingredient.lotsVersion === undefined ? { $exists: false } : ingredient.lotsVersion
});

async function mutateLots(id, mutate) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ingredient = await Ingredient.findById(id).lean();
    if (!ingredient) throw invalid('Không tìm thấy nguyên liệu.', 404);
    const lots = normalizedLots(ingredient);
    const result = mutate(ingredient, lots);
    const updated = await Ingredient.findOneAndUpdate(versionFilter(ingredient), {
      $set: { currentStock: result.currentStock, stockLots: lots, ...(result.stockValuation ? { stockValuation: result.stockValuation } : {}) },
      $inc: { lotsVersion: 1 }
    }, { returnDocument: 'after', runValidators: true });
    if (updated) return { ...result, ingredient: String(id), ingredientName: ingredient.name, unit: ingredient.unit };
  }
  throw invalid('Tồn kho vừa thay đổi. Vui lòng thử lại.', 409);
}

async function moveStock(id, delta, options = {}) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.001) throw invalid('Số lượng kho không hợp lệ.');
  return mutateLots(id, (ingredient, lots) => {
    const currentStock = quantity(ingredient.currentStock + delta);
    if (currentStock < -EPSILON) throw invalid('Số lượng xuất vượt quá tồn kho hiện tại.', 409);
    const allocations = [];
    if (delta > 0) {
      const unitCost = options.unitCost ?? null;
      if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) throw invalid('Đơn giá lô không hợp lệ.');
      const lot = { _id: new mongoose.Types.ObjectId(), sourceType: options.sourceType || 'ADJUSTMENT', sourceId: options.sourceId ? String(options.sourceId) : undefined,
        receivedAt: options.receivedAt || new Date(), quantity: delta, remainingQuantity: delta, unitCost };
      lots.push(lot);
      allocations.push({ lotId: String(lot._id), quantity: delta, unitCost });
    } else {
      let remaining = -delta;
      for (const lot of lots) {
        const used = quantity(Math.min(remaining, lot.remainingQuantity));
        if (used <= EPSILON) continue;
        lot.remainingQuantity = quantity(lot.remainingQuantity - used);
        allocations.push({ lotId: String(lot._id), quantity: used, unitCost: lot.unitCost ?? null });
        remaining = quantity(remaining - used);
        if (remaining <= EPSILON) break;
      }
      if (remaining > EPSILON) throw invalid('Không đủ số lượng trong các lô nguyên liệu.', 409);
    }
    const cost = allocations.some(line => line.unitCost === null) ? null : money(allocations.reduce((sum, line) => sum + line.quantity * line.unitCost, 0));
    return { delta, currentStock: Math.max(0, currentStock), allocations, cost };
  });
}

async function undoStockMove(movement) {
  return mutateLots(movement.ingredient, (ingredient, lots) => {
    for (const allocation of movement.allocations) {
      const lot = lots.find(row => String(row._id) === allocation.lotId);
      if (!lot) throw invalid('Không tìm thấy lô để phục hồi tồn kho.', 409);
      if (movement.delta > 0) {
        if (Math.abs(lot.remainingQuantity - allocation.quantity) > EPSILON) throw invalid('Lô vừa nhập đã được sử dụng, không thể phục hồi tự động.', 409);
        lots.splice(lots.indexOf(lot), 1);
      } else {
        lot.remainingQuantity = quantity(lot.remainingQuantity + allocation.quantity);
      }
    }
    return { currentStock: quantity(ingredient.currentStock - movement.delta) };
  });
}

async function priceUnvaluedStock(id, totalCost, userId) {
  if (!Number.isSafeInteger(totalCost) || totalCost < 0) throw invalid('Tổng tiền phải là số nguyên không âm.');
  return mutateLots(id, (ingredient, lots) => {
    const unpriced = lots.filter(lot => lot.unitCost == null && lot.remainingQuantity > EPSILON);
    const amount = quantity(unpriced.reduce((sum, lot) => sum + lot.remainingQuantity, 0));
    if (amount <= EPSILON) throw invalid('Nguyên liệu không còn lượng tồn chưa có giá.', 409);
    unpriced.forEach(lot => { lot.unitCost = totalCost / amount; });
    return { currentStock: ingredient.currentStock, stockValuation: { quantity: amount, totalCost, updatedAt: new Date(), updatedBy: userId } };
  });
}
module.exports = { lockIngredients, normalizedLots, moveStock, undoStockMove, priceUnvaluedStock, quantity, money };
