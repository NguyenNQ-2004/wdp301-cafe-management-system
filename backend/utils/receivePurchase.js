const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Ingredient = require('../models/Ingredient');
const InventoryTransaction = require('../models/InventoryTransaction');
const { invalid } = require('./adminValidation');
const { lockIngredients, moveStock, undoStockMove } = require('./stockLots');

async function receivePurchase(order, userId, note) {
  const release = lockIngredients(order.items.map(item => item.ingredient));
  const movements = [];
  const transactionIds = [];
  let claimed = false;
  try {
    const ids = order.items.map(item => item.ingredient);
    if (await Ingredient.countDocuments({ _id: { $in: ids } }) !== ids.length) throw invalid('Phiếu nhập có nguyên liệu không còn tồn tại.', 409);
    const locked = await PurchaseOrder.findOneAndUpdate({ _id: order._id, status: 'ORDERED' }, { $set: { status: 'RECEIVED', ...(typeof note === 'string' ? { note: note.trim() } : {}) } });
    if (!locked) throw invalid('Phiếu nhập đã được xử lý bởi yêu cầu khác.', 409);
    claimed = true;
    for (const item of order.items) movements.push(await moveStock(item.ingredient, item.quantity, { unitCost: item.unitPrice, sourceType: 'PURCHASE', sourceId: order._id }));
    await InventoryTransaction.insertMany(movements.map(movement => {
      const _id = new mongoose.Types.ObjectId(); transactionIds.push(_id);
      return { _id, ingredient: movement.ingredient, transactionType: 'IN_PURCHASE', quantity: movement.delta, stockDelta: movement.delta,
        referenceType: 'PURCHASE_ORDER', referenceId: order._id, createdBy: userId, costTotal: movement.cost, lotAllocations: movement.allocations };
    }));
  } catch (error) {
    if (mongoose.transactionAsyncLocalStorage?.getStore()?.session) throw error;
    if (transactionIds.length) await InventoryTransaction.deleteMany({ _id: { $in: transactionIds } });
    for (const movement of movements.reverse()) await undoStockMove(movement);
    if (claimed) await PurchaseOrder.updateOne({ _id: order._id, status: 'RECEIVED' }, { $set: { status: 'ORDERED' } });
    throw error;
  } finally { release(); }
}
module.exports = { receivePurchase };
