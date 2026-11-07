const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');

async function latestPurchasePrices() {
  const orders = await PurchaseOrder.find({ status: 'RECEIVED' }).sort({ createdAt: -1, _id: -1 }).select('items').lean();
  const prices = new Map();
  for (const order of orders) for (const item of order.items || []) {
    const key = String(item.ingredient);
    if (!prices.has(key)) prices.set(key, item.unitPrice);
  }
  // Imports from the old schema may contain standalone purchase lines.
  const legacy = await PurchaseOrderItem.find({ purchaseOrder: null }).sort({ createdAt: -1, _id: -1 }).lean();
  for (const item of legacy) {
    const key = String(item.ingredient);
    if (!prices.has(key)) prices.set(key, item.unitPrice);
  }
  return prices;
}
module.exports = { latestPurchasePrices };
