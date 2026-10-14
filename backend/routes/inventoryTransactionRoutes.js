const express = require('express');
const InventoryTransaction = require('../models/InventoryTransaction');
const Ingredient = require('../models/Ingredient');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// 1. GET ALL TRANSACTIONS
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.ingredientId) filter.ingredient = req.query.ingredientId;
    if (req.query.transactionType) filter.transactionType = req.query.transactionType;

    const txs = await InventoryTransaction.find(filter)
      .populate('ingredient', 'name unit currentStock')
      .sort({ createdAt: -1 });

    res.json(txs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. CREATE TRANSACTION (ADJUSTMENT, SPOILAGE, IN_PURCHASE, OUT_ORDER)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { ingredient, transactionType, quantity, referenceType = 'ADJUSTMENT', referenceId } = req.body;
    const qty = Number(quantity);
    if (!ingredient || !transactionType || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Thông tin biến động kho không hợp lệ.' });
    }

    const item = await Ingredient.findById(ingredient);
    if (!item) return res.status(404).json({ message: 'Không tìm thấy nguyên liệu.' });

    // Tính toán thay đổi tồn kho
    let stockDelta = 0;
    if (transactionType === 'IN_PURCHASE') {
      stockDelta = qty;
    } else if (['OUT_ORDER', 'SPOILAGE'].includes(transactionType)) {
      stockDelta = -qty;
    } else if (transactionType === 'ADJUSTMENT') {
      // Có thể là bù thêm hoặc trừ hao
      stockDelta = Number(req.body.isAddition ? qty : -qty);
    }

    item.currentStock = Math.max(0, item.currentStock + stockDelta);
    await item.save();

    const tx = await InventoryTransaction.create({
      ingredient,
      transactionType,
      quantity: qty,
      referenceType,
      referenceId
    });

    res.status(201).json({ message: 'Ghi nhận biến động kho thành công!', transaction: tx, updatedStock: item.currentStock });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
