const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'isolated-lot-cost-test';
const app = require('../server');
const Ingredient = require('../models/Ingredient');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const InventoryTransaction = require('../models/InventoryTransaction');
const { moveStock, undoStockMove, priceUnvaluedStock } = require('../utils/stockLots');
const { deductOrderStock } = require('../utils/orderInventory');

test('purchase totals, FIFO lots and frozen order costs', async t => {
  const dbName = `aura_lot_cost_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName });
  let server;
  t.after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    assert.match(mongoose.connection.db.databaseName, /^aura_lot_cost_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const admin = await User.create({ fullName: 'Cost Admin', phone: '0999998111', role: 'ADMIN', passwordHash: 'unused' });
  const supplier = await Supplier.create({ name: 'Cost supplier' });
  const ingredient = await Ingredient.create({ name: 'Beans', unit: 'gram', supplier: supplier._id, currentStock: 0 });
  const token = jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET);
  const request = async (path, method, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const purchase = (quantity, totalCost, status = 'RECEIVED') => request('/api/purchase-orders', 'POST', { supplier: String(supplier._id), status, items: [{ ingredient: String(ingredient._id), quantity, totalCost }] });
  await t.test('quantity and total derive fractional unit cost; drafts do not change stock', async () => {
    assert.equal((await purchase(1000, 300000, 'DRAFT')).status, 201);
    assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 0);
    const received = await purchase(3000, 100000);
    assert.equal(received.status, 201, JSON.stringify(received.data));
    assert.equal(received.data.items[0].unitPrice, 100000 / 3000);
    assert.equal(received.data.totalCost, 100000);
    assert.equal((await purchase(2000, 100000)).status, 201);
    const stored = await Ingredient.findById(ingredient._id);
    assert.equal(stored.currentStock, 5000); assert.equal(stored.stockLots.length, 2);
    assert.equal((await purchase(1, -1)).status, 400);
  });
  const category = await Category.create({ name: 'Coffee' });
  const product = await Product.create({ name: 'Coffee', category: category._id, basePrice: 200000, recipe: [{ ingredient: ingredient._id, quantityRequired: 2000 }] });
  const makeOrder = (code, items = [{ product: product._id, productNameAtTime: 'Coffee', unitPrice: 200000, subtotal: 400000, quantity: 2 }]) => Order.create({ orderCode: code, orderType: 'TAKEAWAY', items, totalAmount: 400000, finalAmount: 400000 });
  let order;
  await t.test('one order consumes old then new lot and stores its exact allocation once', async () => {
    order = await makeOrder('FIFO-1');
    await deductOrderStock(order, admin._id);
    assert.equal(order.costTotal, 150000);
    assert.equal(order.items[0].costPerItem, 75000);
    assert.deepEqual(order.items[0].costAllocations.map(row => row.quantity), [3000, 1000]);
    assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 1000);
    await deductOrderStock(order, admin._id);
    assert.equal(await InventoryTransaction.countDocuments({ referenceType: 'ORDER', referenceId: order._id }), 1);
  });
  await t.test('new receipts and recipe edits never reprice an already captured order', async () => {
    assert.equal((await purchase(1000, 500000)).status, 201);
    await Product.updateOne({ _id: product._id }, { $set: { 'recipe.0.quantityRequired': 100 } });
    await deductOrderStock(await Order.findById(order._id), admin._id);
    assert.equal((await Order.findById(order._id)).costTotal, 150000);
  });
  await t.test('failed ledger insertion restores lot quantities and allows retry', async () => {
    const candidate = await makeOrder('ROLLBACK');
    const before = await Ingredient.findById(ingredient._id).lean();
    const original = InventoryTransaction.insertMany;
    InventoryTransaction.insertMany = async () => { throw new Error('simulated ledger failure'); };
    try { await assert.rejects(deductOrderStock(candidate, admin._id), /simulated ledger failure/); }
    finally { InventoryTransaction.insertMany = original; }
    const after = await Ingredient.findById(ingredient._id).lean();
    assert.equal(after.currentStock, before.currentStock);
    assert.deepEqual(after.stockLots.map(lot => lot.remainingQuantity), before.stockLots.map(lot => lot.remainingQuantity));
    assert.equal((await Order.findById(candidate._id)).inventoryProcessing, false);
    await deductOrderStock(await Order.findById(candidate._id), admin._id);
    assert.equal((await Order.findById(candidate._id)).costTotal, 10000);
  });
  await t.test('admin can enter one total for old stock through the recipe editor API', async () => {
    const old = await Ingredient.create({ name: 'Coffee without purchase history', unit: 'gram', currentStock: 10000 });
    const path = `/api/ingredients/${old._id}/unpriced-stock-cost`;
    assert.equal((await request(path, 'PUT', { totalCost: -1 })).status, 400);
    const priced = await request(path, 'PUT', { totalCost: 2000000 });
    assert.equal(priced.status, 200, JSON.stringify(priced.data));
    assert.equal(priced.data.currentStock, 10000);
    assert.equal(priced.data.stockLots[0].remainingQuantity, 10000);
    assert.equal(priced.data.stockLots[0].unitCost, 200);
    assert.equal((await request(path, 'PUT', { totalCost: 1 })).status, 409);
    assert.equal((await moveStock(old._id, -1000)).cost, 200000);
  });
  await t.test('old stock needs one total valuation; adjustments preserve FIFO and accept free stock', async () => {
    const old = await Ingredient.create({ name: 'Old tea', unit: 'gram', currentStock: 8000 });
    const first = await moveStock(old._id, -1000);
    assert.equal(first.cost, null);
    await priceUnvaluedStock(old._id, 140000, admin._id);
    const second = await moveStock(old._id, -2000);
    assert.equal(second.cost, 40000);
    assert.equal(first.cost, null);
    await undoStockMove(second);
    assert.equal((await Ingredient.findById(old._id)).currentStock, 7000);
    await assert.rejects(priceUnvaluedStock(old._id, 140000, admin._id), /./);
    const free = await Ingredient.create({ name: 'Free', unit: 'piece', currentStock: 0 });
    await moveStock(free._id, 1, { unitCost: 0 });
    assert.equal((await moveStock(free._id, -1)).cost, 0);
  });
});
