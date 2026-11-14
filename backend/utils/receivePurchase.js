const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Ingredient = require('../models/Ingredient');
const InventoryTransaction = require('../models/InventoryTransaction');
const { invalid } = require('./adminValidation');
const { lockIngredients, moveStock, undoStockMove } = require('./stockLots');

// K-PN: receivePurchase — Xác nhận nhận hàng, tạo lô và ghi giao dịch nhập kho.
async function receivePurchase(order, userId, note) {
  const release = lockIngredients(order.items.map(item => item.ingredient));
  const movements = [];
  const transactionIds = [];
  let claimed = false;
  try {
    const ids = order.items.map(item => item.ingredient);
    if (await Ingredient.countDocuments({ _id: { $in: ids } }) !== ids.length) throw invalid('Phiếu nhập có nguyên liệu không còn tồn tại.', 409);
    // K-PN: Chỉ nhận phiếu còn ở trạng thái ORDERED để tránh cộng tồn hai lần khi có yêu cầu đồng thời.
    const locked = await PurchaseOrder.findOneAndUpdate({ _id: order._id, status: 'ORDERED' }, { $set: { status: 'RECEIVED', ...(typeof note === 'string' ? { note: note.trim() } : {}) } });
    if (!locked) throw invalid('Phiếu nhập đã được xử lý bởi yêu cầu khác.', 409);
    claimed = true;
    // K-SG: Mỗi dòng tạo một lô riêng, giữ đơn giá của phiếu và mã nguồn để đối chiếu khi sửa giá.
    for (const item of order.items) movements.push(await moveStock(item.ingredient, item.quantity, { unitCost: item.unitPrice, sourceType: 'PURCHASE', sourceId: order._id }));
    await InventoryTransaction.insertMany(movements.map(movement => {
      const _id = new mongoose.Types.ObjectId(); transactionIds.push(_id);
      return { _id, ingredient: movement.ingredient, transactionType: 'IN_PURCHASE', quantity: movement.delta, stockDelta: movement.delta,
        referenceType: 'PURCHASE_ORDER', referenceId: order._id, createdBy: userId, costTotal: movement.cost, lotAllocations: movement.allocations };
    }));
  } catch (error) {
    // K-PN: Trong transaction, để MongoDB rollback. Ngoài transaction, tự hoàn tác các bước đã ghi.
    if (mongoose.transactionAsyncLocalStorage?.getStore()?.session) throw error;
    if (transactionIds.length) await InventoryTransaction.deleteMany({ _id: { $in: transactionIds } });
    for (const movement of movements.reverse()) await undoStockMove(movement);
    if (claimed) await PurchaseOrder.updateOne({ _id: order._id, status: 'RECEIVED' }, { $set: { status: 'ORDERED' } });
    throw error;
  } finally { release(); }
}
module.exports = { receivePurchase };
