const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const { invalid } = require('./adminValidation');
const EPSILON = 1e-8;
// K-XN: quantity — Làm tròn số lượng để hạn chế sai số khi cộng trừ tồn.
const quantity = value => Math.round(value * 1e9) / 1e9;
// K-XN: money — Làm tròn giá trị tiền đến hai chữ số thập phân.
const money = value => Math.round(value * 100) / 100;
const locks = new Set();

// K-XN: lockIngredients — Khóa cập nhật đồng thời theo ID nguyên liệu trong tiến trình.
function lockIngredients(ids) {
  const keys = [...new Set(ids.map(String))];
  if (keys.some(key => locks.has(key))) throw invalid('Nguyên liệu đang được cập nhật. Vui lòng thử lại.', 409);
  keys.forEach(key => locks.add(key));
  return () => keys.forEach(key => locks.delete(key));
}

// K-XN: normalizedLots — Bổ sung lô tồn đầu nếu cần và sắp xếp theo thứ tự FIFO.
function normalizedLots(ingredient) {
  const lots = (ingredient.stockLots || []).map(lot => ({ ...lot }));
  const tracked = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
  const difference = quantity(ingredient.currentStock - tracked);
  if (difference > EPSILON) lots.unshift({ _id: new mongoose.Types.ObjectId(), sourceType: 'OPENING', receivedAt: new Date(0), quantity: difference, remainingQuantity: difference, unitCost: null });
  if (difference < -EPSILON) throw invalid('Số lượng lô không khớp tồn kho. Vui lòng kiểm tra lại.', 409);
  // K-XN: Sắp lô theo thời điểm nhận tăng dần để xuất FIFO. Khi trùng thời điểm, dùng ID lô để giữ thứ tự ổn định.
  return lots.sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt) || String(a._id).localeCompare(String(b._id)));
}

// K-XN: versionFilter — Tạo điều kiện cập nhật theo số tồn và phiên bản lô đã đọc.
const versionFilter = ingredient => ({
  _id: ingredient._id, currentStock: ingredient.currentStock,
  lotsVersion: ingredient.lotsVersion === undefined ? { $exists: false } : ingredient.lotsVersion
});

// K-XN: mutateLots — Áp dụng thay đổi lô và thử lại nếu phiên bản tồn vừa thay đổi.
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

// K-XN: moveStock — Tạo lô khi tăng tồn hoặc phân bổ xuất theo FIFO khi giảm tồn.
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

// K-XN: undoStockMove — Hoàn tác biến động kho theo các lô đã phân bổ.
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

// K-XN: priceUnvaluedStock — Chia tổng tiền cho lượng chưa có giá để định giá tồn cũ.
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
module.exports = { lockIngredients, normalizedLots, mutateLots, moveStock, undoStockMove, priceUnvaluedStock, quantity, money };
