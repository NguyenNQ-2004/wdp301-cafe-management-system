const express = require('express');
const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');
const InventoryTransaction = require('../models/InventoryTransaction');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
const STATUSES = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'];
const ALLOWED_TRANSITIONS = { DRAFT: ['ORDERED', 'CANCELLED'], ORDERED: ['RECEIVED', 'CANCELLED'], RECEIVED: [], CANCELLED: [] };

router.use(protect, adminOnly);

const populateOrder = (query) => query
  .populate('supplier', 'name phone address status')
  .populate('creator', 'fullName phone role')
  .populate('items.ingredient', 'name unit currentStock minStockLevel supplier');

// Complete payload used by the Purchase Order management screen.
router.get('/management-overview', async (req, res) => {
  try {
    const [orders, suppliers, ingredients, purchaseItems] = await Promise.all([
      populateOrder(PurchaseOrder.find().sort({ createdAt: -1 })).lean(),
      Supplier.find({ status: 'ACTIVE' }).sort({ name: 1 }).lean(),
      Ingredient.find().populate('supplier', 'name status').sort({ name: 1 }).lean(),
      PurchaseOrderItem.find().select('ingredient unitPrice createdAt').sort({ createdAt: -1, _id: -1 }).lean()
    ]);
    const latestPrices = new Map();
    for (const item of purchaseItems) {
      const key = String(item.ingredient);
      if (!latestPrices.has(key)) latestPrices.set(key, item.unitPrice);
    }
    const ingredientRows = ingredients.map((ingredient) => ({
      ...ingredient,
      latestUnitPrice: latestPrices.get(String(ingredient._id)) ?? 0
    }));
    const summary = Object.fromEntries(STATUSES.map((status) => [status, orders.filter((order) => order.status === status).length]));
    res.json({ summary, orders, suppliers, ingredients: ingredientRows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Aggregated data used by the Restock Request screen.
router.get('/restock-overview', async (req, res) => {
  try {
    const [ingredients, orders, purchaseItems] = await Promise.all([
      Ingredient.find().populate('supplier', 'name phone status').sort({ name: 1 }).lean(),
      populateOrder(PurchaseOrder.find({ status: { $in: ['DRAFT', 'ORDERED'] } }).sort({ createdAt: -1 })).lean(),
      PurchaseOrderItem.find().select('ingredient unitPrice createdAt').sort({ createdAt: -1, _id: -1 }).lean()
    ]);

    const latestPrices = new Map();
    for (const item of purchaseItems) {
      const key = String(item.ingredient);
      if (!latestPrices.has(key)) latestPrices.set(key, item.unitPrice);
    }
    const ingredientRows = ingredients.map((ingredient) => ({
      ...ingredient,
      latestUnitPrice: latestPrices.get(String(ingredient._id)) ?? 0,
      needsRestock: ingredient.currentStock <= ingredient.minStockLevel
    }));
    const drafts = orders.filter((order) => order.status === 'DRAFT');
    res.json({
      summary: {
        lowStockCount: ingredientRows.filter((item) => item.needsRestock).length,
        draftCount: drafts.length,
        orderedCount: orders.filter((order) => order.status === 'ORDERED').length,
        pendingValue: drafts.reduce((sum, order) => sum + order.totalCost, 0)
      },
      ingredients: ingredientRows,
      drafts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!STATUSES.includes(req.query.status)) return res.status(400).json({ message: 'Trạng thái phiếu nhập không hợp lệ.' });
      filter.status = req.query.status;
    }
    if (req.query.supplierId) {
      if (!mongoose.isValidObjectId(req.query.supplierId)) return res.status(400).json({ message: 'Mã nhà cung cấp không hợp lệ.' });
      filter.supplier = req.query.supplierId;
    }
    const orders = await populateOrder(PurchaseOrder.find(filter).sort({ createdAt: -1 }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { supplier, items, note } = req.body;
    if (!mongoose.isValidObjectId(supplier) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn nhà cung cấp và ít nhất một nguyên liệu nhập.' });
    }
    if (typeof note === 'string' && note.length > 500) return res.status(400).json({ message: 'Ghi chú không được vượt quá 500 ký tự.' });

    const normalizedItems = items.map((item) => ({ ingredient: item.ingredient, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }));
    const invalidItem = normalizedItems.some((item) => !mongoose.isValidObjectId(item.ingredient) || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0);
    if (invalidItem) return res.status(400).json({ message: 'Nguyên liệu, số lượng hoặc đơn giá không hợp lệ.' });
    if (new Set(normalizedItems.map((item) => String(item.ingredient))).size !== normalizedItems.length) return res.status(400).json({ message: 'Một nguyên liệu không được xuất hiện nhiều lần trong cùng phiếu.' });

    const [supplierRecord, ingredientRecords] = await Promise.all([
      Supplier.findOne({ _id: supplier, status: 'ACTIVE' }),
      Ingredient.find({ _id: { $in: normalizedItems.map((item) => item.ingredient) } })
    ]);
    if (!supplierRecord) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp đang hoạt động.' });
    if (ingredientRecords.length !== normalizedItems.length) return res.status(404).json({ message: 'Có nguyên liệu không tồn tại.' });
    if (ingredientRecords.some((ingredient) => String(ingredient.supplier) !== String(supplier))) return res.status(400).json({ message: 'Nguyên liệu không thuộc nhà cung cấp đã chọn.' });

    const totalCost = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    let order;
    try {
      order = await PurchaseOrder.create({ supplier, creator: req.user._id, totalCost, status: 'DRAFT', note: typeof note === 'string' ? note.trim() : '', items: normalizedItems });
      await PurchaseOrderItem.insertMany(normalizedItems.map((item) => ({ purchaseOrder: order._id, ...item })));
    } catch (error) {
      if (order) {
        await PurchaseOrderItem.deleteMany({ purchaseOrder: order._id });
        await PurchaseOrder.deleteOne({ _id: order._id });
      }
      throw error;
    }
    const populated = await populateOrder(PurchaseOrder.findById(order._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã phiếu nhập không hợp lệ.' });
    const { status, note } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Trạng thái phiếu nhập không hợp lệ.' });
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập kho.' });
    if (!ALLOWED_TRANSITIONS[order.status].includes(status)) return res.status(409).json({ message: `Không thể chuyển phiếu từ ${order.status} sang ${status}.` });

    if (status === 'RECEIVED') {
      const ingredientIds = order.items.map((item) => item.ingredient);
      if (await Ingredient.countDocuments({ _id: { $in: ingredientIds } }) !== ingredientIds.length) {
        return res.status(409).json({ message: 'Phiếu nhập có nguyên liệu không còn tồn tại.' });
      }
      const statusUpdate = { status: 'RECEIVED' };
      if (typeof note === 'string') statusUpdate.note = note.trim();
      const lockedOrder = await PurchaseOrder.findOneAndUpdate(
        { _id: order._id, status: 'ORDERED' },
        { $set: statusUpdate },
        { returnDocument: 'after', runValidators: true }
      );
      if (!lockedOrder) return res.status(409).json({ message: 'Phiếu nhập đã được xử lý bởi một yêu cầu khác.' });

      const stockOperations = order.items.map((item) => ({ updateOne: { filter: { _id: item.ingredient }, update: { $inc: { currentStock: item.quantity } } } }));
      let stockUpdated = false;
      try {
        await Ingredient.bulkWrite(stockOperations);
        stockUpdated = true;
        await InventoryTransaction.insertMany(order.items.map((item) => ({
          ingredient: item.ingredient, transactionType: 'IN_PURCHASE', quantity: item.quantity,
          stockDelta: item.quantity, referenceType: 'PURCHASE_ORDER', referenceId: order._id, createdBy: req.user._id
        })));
      } catch (error) {
        if (stockUpdated) await Ingredient.bulkWrite(order.items.map((item) => ({ updateOne: { filter: { _id: item.ingredient }, update: { $inc: { currentStock: -item.quantity } } } })));
        await PurchaseOrder.updateOne({ _id: order._id, status: 'RECEIVED' }, { $set: { status: 'ORDERED' } });
        throw error;
      }
      const populated = await populateOrder(PurchaseOrder.findById(order._id));
      return res.json({ message: 'Cập nhật trạng thái phiếu nhập thành công!', purchaseOrder: populated });
    }

    order.status = status;
    if (typeof note === 'string') order.note = note.trim();
    await order.save();
    const populated = await populateOrder(PurchaseOrder.findById(order._id));
    res.json({ message: 'Cập nhật trạng thái phiếu nhập thành công!', purchaseOrder: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
