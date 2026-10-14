const express = require('express');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');
const Ingredient = require('../models/Ingredient');
const InventoryTransaction = require('../models/InventoryTransaction');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// 1. GET ALL PURCHASE ORDERS
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.supplierId) filter.supplier = req.query.supplierId;

    const pos = await PurchaseOrder.find(filter)
      .populate('supplier', 'name phone address')
      .populate('creator', 'fullName phone role')
      .populate('items.ingredient', 'name unit currentStock')
      .sort({ createdAt: -1 });

    res.json(pos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. CREATE PURCHASE ORDER
router.post('/', adminOnly, async (req, res) => {
  try {
    const { supplier, items, note } = req.body;
    if (!supplier || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn nhà cung cấp và ít nhất một nguyên liệu nhập.' });
    }

    const totalCost = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unitPrice)), 0);

    const po = await PurchaseOrder.create({
      supplier,
      creator: req.user._id,
      totalCost,
      status: 'DRAFT',
      note,
      items: items.map(it => ({
        ingredient: it.ingredient,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice)
      }))
    });

    // Tạo items rời trong bảng purchase_order_items
    for (const it of po.items) {
      await PurchaseOrderItem.create({
        purchaseOrder: po._id,
        ingredient: it.ingredient,
        quantity: it.quantity,
        unitPrice: it.unitPrice
      });
    }

    res.status(201).json(po);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 3. UPDATE STATUS (DRAFT -> ORDERED -> RECEIVED -> CANCELLED)
router.put('/:id/status', adminOnly, async (req, res) => {
  try {
    const { status, note } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập kho.' });

    const previousStatus = po.status;
    po.status = status;
    if (note) po.note = note;

    // Khi chuyển sang RECEIVED: tự động tăng tồn kho và ghi nhật ký IN_PURCHASE
    if (status === 'RECEIVED' && previousStatus !== 'RECEIVED') {
      for (const item of po.items) {
        await Ingredient.findByIdAndUpdate(item.ingredient, {
          $inc: { currentStock: item.quantity }
        });
        await InventoryTransaction.create({
          ingredient: item.ingredient,
          transactionType: 'IN_PURCHASE',
          quantity: item.quantity,
          referenceType: 'PURCHASE_ORDER',
          referenceId: po._id
        });
      }
    }

    await po.save();
    res.json({ message: 'Cập nhật trạng thái phiếu nhập thành công!', po });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
