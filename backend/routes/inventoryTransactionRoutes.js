const express = require('express');
const mongoose = require('mongoose');
const InventoryTransaction = require('../models/InventoryTransaction');
const Ingredient = require('../models/Ingredient');
const { latestPurchasePrices } = require('../utils/purchasePrices');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { lockIngredients, moveStock, undoStockMove } = require('../utils/stockLots');
const { invalid } = require('../utils/adminValidation');

const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());
const TRANSACTION_TYPES = ['IN_PURCHASE', 'OUT_ORDER', 'ADJUSTMENT', 'SPOILAGE'];

router.use(protect);

const inferredDelta = (transaction) => {
  if (typeof transaction.stockDelta === 'number') return transaction.stockDelta;
  return ['OUT_ORDER', 'SPOILAGE'].includes(transaction.transactionType)
    ? -transaction.quantity
    : transaction.quantity;
};

const transactionJson = (transaction) => {
  const value = transaction.toObject ? transaction.toObject() : transaction;
  return { ...value, stockDelta: inferredDelta(value) };
};

// Dashboard payload for the Inventory Management screen.
router.get('/overview', adminOnly, async (req, res) => {
  try {
    const ingredients = await Ingredient.find()
      .populate('supplier', 'name phone')
      .sort({ name: 1 })
      .lean();
    const latestPrice = await latestPurchasePrices();

    let estimatedValue = 0;
    let lowStockCount = 0;
    const stock = ingredients.map((ingredient) => {
      const latestUnitPrice = latestPrice.get(String(ingredient._id)) ?? null;
      const itemValue = ingredient.stockLots
        ? ingredient.stockLots.some(lot => lot.remainingQuantity > 0 && lot.unitCost == null) ? null : ingredient.stockLots.reduce((sum, lot) => sum + lot.remainingQuantity * (lot.unitCost ?? 0), 0)
        : latestUnitPrice === null ? null : ingredient.currentStock * latestUnitPrice;
      const isLowStock = ingredient.currentStock <= ingredient.minStockLevel;
      if (itemValue !== null) estimatedValue += itemValue;
      if (isLowStock) lowStockCount += 1;
      return { ...ingredient, latestUnitPrice, estimatedValue: itemValue, status: isLowStock ? 'LOW_STOCK' : 'SAFE' };
    });

    const transactionCount = await InventoryTransaction.countDocuments();
    res.json({
      summary: { estimatedValue, ingredientCount: stock.length, lowStockCount, transactionCount },
      ingredients: stock
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Inventory history with optional filters and bounded pagination.
router.get('/', adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.ingredientId) {
      if (!mongoose.isValidObjectId(req.query.ingredientId)) return res.status(400).json({ message: 'Mã nguyên liệu không hợp lệ.' });
      filter.ingredient = req.query.ingredientId;
    }
    if (req.query.transactionType) {
      if (!TRANSACTION_TYPES.includes(req.query.transactionType)) return res.status(400).json({ message: 'Loại giao dịch kho không hợp lệ.' });
      filter.transactionType = req.query.transactionType;
    }
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
    const skip = Math.max(Number.parseInt(req.query.skip, 10) || 0, 0);
    const txs = await InventoryTransaction.find(filter)
      .populate('ingredient', 'name unit currentStock')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json(txs.map(transactionJson));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Record a movement and update stock in one guarded database operation.
router.post('/', adminOnly, async (req, res) => {
  let release;
  try {
    const { ingredient, transactionType, referenceId, note } = req.body;
    if (!['ADJUSTMENT', 'SPOILAGE'].includes(transactionType)) return res.status(400).json({ message: 'Nhập hàng và xuất pha chế phải được tạo qua luồng phiếu nhập hoặc đơn hàng.' });
    const quantity = Number(req.body.quantity);
    if (!mongoose.isValidObjectId(ingredient) || !TRANSACTION_TYPES.includes(transactionType) || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Thông tin biến động kho không hợp lệ.' });
    }
    if (transactionType === 'ADJUSTMENT' && typeof req.body.isAddition !== 'boolean') {
      return res.status(400).json({ message: 'Phiếu điều chỉnh phải xác định tăng hoặc giảm kho.' });
    }

    const stockDelta = transactionType === 'IN_PURCHASE' || (transactionType === 'ADJUSTMENT' && req.body.isAddition)
      ? quantity
      : -quantity;
    const referenceType = transactionType === 'IN_PURCHASE'
      ? 'PURCHASE_ORDER'
      : transactionType === 'OUT_ORDER' ? 'ORDER' : 'ADJUSTMENT';
    const totalCost = req.body.totalCost;
    if (totalCost !== undefined && (!Number.isSafeInteger(totalCost) || totalCost < 0 || stockDelta < 0)) throw invalid('Tổng tiền chỉ áp dụng cho lượng nhập và phải là số nguyên không âm.');
    release = lockIngredients([ingredient]);
    const movement = await moveStock(ingredient, stockDelta, { unitCost: totalCost === undefined ? null : totalCost / quantity, sourceType: transactionType === 'IN_PURCHASE' ? 'PURCHASE' : 'ADJUSTMENT', sourceId: referenceId });

    let transaction;
    try {
      transaction = await InventoryTransaction.create({
        ingredient, transactionType, quantity, stockDelta, referenceType,
        referenceId, note, createdBy: req.user._id, costTotal: movement.cost, lotAllocations: movement.allocations
      });
    } catch (error) {
      await undoStockMove(movement);
      throw error;
    }
    await transaction.populate([{ path: 'ingredient', select: 'name unit currentStock' }, { path: 'createdBy', select: 'fullName' }]);
    return res.status(201).json({ message: 'Ghi nhận biến động kho thành công!', transaction: transactionJson(transaction), updatedStock: movement.currentStock });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  } finally { release?.(); }
});

module.exports = router;
