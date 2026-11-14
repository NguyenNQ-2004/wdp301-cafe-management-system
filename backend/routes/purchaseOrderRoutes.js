const express = require('express');
const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');
const { receivePurchase } = require('../utils/receivePurchase');
const { normalizePurchaseItems } = require('../utils/purchaseInput');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { latestPurchasePrices } = require('../utils/purchasePrices');

const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());
const STATUSES = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'];
const ALLOWED_TRANSITIONS = { DRAFT: ['ORDERED', 'CANCELLED'], ORDERED: ['RECEIVED', 'CANCELLED'], RECEIVED: [], CANCELLED: [] };

router.use(protect, adminOnly);

// K-PN: populateOrder — Gắn thông tin nhà cung cấp, người tạo và nguyên liệu vào dữ liệu phiếu.
const populateOrder = (query) => query
  .populate('supplier', 'name phone address status')
  .populate('creator', 'fullName phone role')
  .populate('items.ingredient', 'name unit currentStock minStockLevel supplier');

// K-PN: Trả dữ liệu tổng quan cho màn Phiếu nhập hàng, gồm danh sách phiếu và dữ liệu dùng để tạo phiếu.
// K-PN: GET /management-overview — Tải dữ liệu cho màn quản lý phiếu nhập.
router.get('/management-overview', async (req, res) => {
  try {
    const [orders, suppliers, ingredients, latestPrices] = await Promise.all([
      populateOrder(PurchaseOrder.find().sort({ createdAt: -1 })).lean(),
      Supplier.find({ status: 'ACTIVE' }).sort({ name: 1 }).lean(),
      Ingredient.find().populate('supplier', 'name status').sort({ name: 1 }).lean(),
      latestPurchasePrices()
    ]);
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

// K-PN: Tổng hợp dữ liệu tồn, giá nhập và các phiếu đang mở cho luồng bổ sung hàng.
// K-PN: GET /restock-overview — Tổng hợp dữ liệu phục vụ luồng bổ sung hàng.
router.get('/restock-overview', async (req, res) => {
  try {
    const [ingredients, orders, latestPrices] = await Promise.all([
      Ingredient.find().populate('supplier', 'name phone status').sort({ name: 1 }).lean(),
      populateOrder(PurchaseOrder.find({ status: { $in: ['DRAFT', 'ORDERED'] } }).sort({ createdAt: -1 })).lean(),
      latestPurchasePrices()
    ]);

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

// K-PN: GET / — Liệt kê phiếu nhập theo bộ lọc.
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

// K-PN: Kiểm tra trạng thái khởi tạo, chuẩn hóa số lượng và tổng tiền từng dòng, rồi tính đơn giá.
// Xác thực nhà cung cấp còn hoạt động và nguyên liệu tồn tại; một nguyên liệu có thể mua từ nhiều nhà cung cấp.
// K-PN: POST / — Tạo phiếu nhập sau khi kiểm tra nhà cung cấp và chi tiết phiếu.
router.post('/', async (req, res) => {
  try {
    const { supplier, items, note, status = 'DRAFT' } = req.body;
    if (!['DRAFT', 'ORDERED', 'RECEIVED'].includes(status)) return res.status(400).json({ message: 'Trạng thái phiếu mới không hợp lệ.' });
    if (!mongoose.isValidObjectId(supplier) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn nhà cung cấp và ít nhất một nguyên liệu nhập.' });
    }
    if (typeof note === 'string' && note.length > 500) return res.status(400).json({ message: 'Ghi chú không được vượt quá 500 ký tự.' });

    const normalizedItems = normalizePurchaseItems(items);

    const supplierRecord = await Supplier.findOne({ _id: supplier, status: 'ACTIVE' });
    const ingredientRecords = await Ingredient.find({ _id: { $in: normalizedItems.map((item) => item.ingredient) } });
    if (!supplierRecord) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp đang hoạt động.' });
    if (ingredientRecords.length !== normalizedItems.length) return res.status(404).json({ message: 'Có nguyên liệu không tồn tại.' });

    const totalCost = normalizedItems.reduce((sum, item) => sum + item.totalCost, 0);
    let order;
    try {
      order = await PurchaseOrder.create({ supplier, creator: req.user._id, totalCost, status: status === 'RECEIVED' ? 'ORDERED' : status, note: typeof note === 'string' ? note.trim() : '', items: normalizedItems });
      await PurchaseOrderItem.insertMany(normalizedItems.map((item) => ({ purchaseOrder: order._id, ...item })));
      if (status === 'RECEIVED') await receivePurchase(order, req.user._id, note);
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
    res.status(error.status || 500).json({ message: error.message });
  }
});

// K-PN: Chỉ chuyển trạng thái theo các bước được phép. Khi nhận hàng, gọi luồng chung để tạo lô và giao dịch IN_PURCHASE.
// Với các bước còn lại, chỉ cập nhật nếu trạng thái trong database vẫn khớp với trạng thái vừa đọc.
// K-PN: PUT /:id/status — Kiểm tra và cập nhật trạng thái phiếu nhập.
router.put('/:id/status', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã phiếu nhập không hợp lệ.' });
    const { status, note } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Trạng thái phiếu nhập không hợp lệ.' });
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập kho.' });
    if (!ALLOWED_TRANSITIONS[order.status].includes(status)) return res.status(409).json({ message: `Không thể chuyển phiếu từ ${order.status} sang ${status}.` });

    if (status === 'RECEIVED') {
      await receivePurchase(order, req.user._id, note);
      const populated = await populateOrder(PurchaseOrder.findById(order._id));
      return res.json({ message: 'Cập nhật trạng thái phiếu nhập thành công!', purchaseOrder: populated });
    }

    const changes = { status, ...(typeof note === 'string' ? { note: note.trim() } : {}) };
    const changed = await PurchaseOrder.findOneAndUpdate({ _id: order._id, status: order.status }, { $set: changes }, { returnDocument: 'after', runValidators: true });
    if (!changed) return res.status(409).json({ message: 'Phiếu nhập đã được xử lý bởi một yêu cầu khác.' });
    const populated = await populateOrder(PurchaseOrder.findById(order._id));
    res.json({ message: 'Cập nhật trạng thái phiếu nhập thành công!', purchaseOrder: populated });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

module.exports = router;
