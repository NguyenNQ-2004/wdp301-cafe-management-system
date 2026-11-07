const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ProductIngredient = require('../models/ProductIngredient');
const Ingredient = require('../models/Ingredient');
const InventoryTransaction = require('../models/InventoryTransaction');
const { invalid } = require('./adminValidation');
const { lockIngredients, moveStock, undoStockMove, quantity, money } = require('./stockLots');

async function deductOrderStock(order, userId) {
  const claimed = await Order.findOneAndUpdate({ _id: order._id, inventoryDeductedAt: null, inventoryProcessing: { $ne: true } }, { $set: { inventoryProcessing: true } });
  if (!claimed) {
    const existing = await Order.findById(order._id);
    if (existing?.inventoryDeductedAt) {
      order.inventoryDeductedAt = existing.inventoryDeductedAt;
      order.inventoryProcessing = false;
      order.markModified('inventoryProcessing');
      return;
    }
    throw invalid('Đơn hàng đang được xử lý kho. Vui lòng thử lại.', 409);
  }
  const movements = [];
  const transactionIds = [];
  let release;
  try {
    if (await InventoryTransaction.exists({ referenceType: 'ORDER', referenceId: { $in: [order._id, String(order._id)] }, transactionType: 'OUT_ORDER' })) {
      order.inventoryDeductedAt = new Date();
      order.inventoryProcessing = false;
      order.markModified('inventoryProcessing');
      order.costStatus = 'LEGACY';
      await order.save();
      return;
    }
    const productIds = order.items.map(item => item.product);
    const links = await ProductIngredient.find({ product: { $in: productIds } }).lean();
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const required = new Map();
    const recipes = order.items.map(item => {
      const rows = links.filter(link => String(link.product) === String(item.product));
      const recipe = rows.length ? rows : products.find(product => String(product._id) === String(item.product))?.recipe || [];
      for (const line of recipe) {
        const id = String(line.ingredient);
        const amount = quantity(line.quantityRequired * item.quantity);
        if (!Number.isFinite(amount) || amount < 0.001) throw invalid('Công thức có định lượng không hợp lệ.', 409);
        required.set(id, quantity((required.get(id) || 0) + amount));
      }
      return recipe;
    });
    release = lockIngredients([...required.keys()]);
    for (const [ingredient, amount] of required) movements.push(await moveStock(ingredient, -amount));
    const queues = new Map(movements.map(movement => [movement.ingredient, movement.allocations.map(part => ({ ...part, remaining: part.quantity }))]));
    for (let index = 0; index < order.items.length; index++) {
      const item = order.items[index];
      const allocations = [];
      for (const line of recipes[index]) {
        const id = String(line.ingredient);
        const movement = movements.find(row => row.ingredient === id);
        let needed = quantity(line.quantityRequired * item.quantity);
        for (const part of queues.get(id) || []) {
          const used = quantity(Math.min(needed, part.remaining));
          if (used <= 0) continue;
          allocations.push({ ingredient: id, ingredientName: movement.ingredientName, unit: movement.unit, lotId: part.lotId, quantity: used, unitCost: part.unitCost });
          part.remaining = quantity(part.remaining - used);
          needed = quantity(needed - used);
          if (needed <= 0) break;
        }
      }
      item.costAllocations = allocations;
      const priced = recipes[index].length > 0 && allocations.every(part => part.unitCost !== null);
      item.costTotal = priced ? money(allocations.reduce((sum, part) => sum + part.quantity * part.unitCost, 0)) : null;
      item.costPerItem = item.costTotal === null ? null : money(item.costTotal / item.quantity);
    }
    const transactions = movements.map(movement => {
      const _id = new mongoose.Types.ObjectId(); transactionIds.push(_id);
      return { _id, ingredient: movement.ingredient, quantity: -movement.delta, transactionType: 'OUT_ORDER', stockDelta: movement.delta,
        referenceType: 'ORDER', referenceId: order._id, createdBy: userId, costTotal: movement.cost, lotAllocations: movement.allocations };
    });
    if (transactions.length) await InventoryTransaction.insertMany(transactions);
    order.costTotal = order.items.every(item => item.costTotal !== null) ? money(order.items.reduce((sum, item) => sum + item.costTotal, 0)) : null;
    order.costCapturedAt = new Date();
    order.costStatus = order.costTotal === null ? 'MISSING_PRICE' : 'COMPLETE';
    order.inventoryDeductedAt = new Date();
    order.inventoryProcessing = false;
    order.markModified('inventoryProcessing');
    await order.save();
  } catch (error) {
    if (mongoose.transactionAsyncLocalStorage?.getStore()?.session) throw error;
    if (transactionIds.length) await InventoryTransaction.deleteMany({ _id: { $in: transactionIds } });
    for (const movement of movements.reverse()) await undoStockMove(movement);
    await Order.updateOne({ _id: order._id }, { $set: { inventoryProcessing: false } });
    throw error;
  } finally { release?.(); }
}
async function checkCheckoutStock(items) {
  const ids = items.map(item => item.product._id);
  const links = await ProductIngredient.find({ product: { $in: ids } }).lean();
  const required = new Map();
  for (const item of items) {
    const rows = links.filter(line => String(line.product) === String(item.product._id));
    for (const line of rows.length ? rows : item.product.recipe || []) {
      const id = String(line.ingredient);
      const amount = quantity(line.quantityRequired * item.quantity);
      if (!Number.isFinite(amount) || amount <= 0) throw invalid('Công thức nguyên liệu không hợp lệ.', 409);
      required.set(id, quantity((required.get(id) || 0) + amount));
    }
  }
  const ingredients = await Ingredient.find({ _id: { $in: [...required.keys()] } }).lean();
  for (const [id, amount] of required) {
    const ingredient = ingredients.find(item => String(item._id) === id);
    if (!ingredient || ingredient.isActive === false || ingredient.currentStock < amount) throw invalid('Một món không đủ nguyên liệu để đặt. Vui lòng chọn món khác hoặc giảm số lượng.', 409);
  }
}
module.exports = { deductOrderStock, checkCheckoutStock };
