const express = require('express');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const Ingredient = require('../models/Ingredient');
const PurchaseOrder = require('../models/PurchaseOrder');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
const STATUSES = ['ACTIVE', 'INACTIVE'];
const PHONE_PATTERN = /^[0-9+().\s-]{8,20}$/;

router.use(protect, adminOnly);

const normalizePayload = (body) => ({
  name: typeof body.name === 'string' ? body.name.trim() : '',
  phone: typeof body.phone === 'string' ? body.phone.trim() : '',
  address: typeof body.address === 'string' ? body.address.trim() : '',
  status: body.status || 'ACTIVE'
});

const validatePayload = (payload) => {
  if (!payload.name) return 'Tên nhà cung cấp là bắt buộc.';
  if (payload.name.length > 120) return 'Tên nhà cung cấp không được vượt quá 120 ký tự.';
  if (payload.phone && !PHONE_PATTERN.test(payload.phone)) return 'Số điện thoại không hợp lệ.';
  if (payload.address.length > 300) return 'Địa chỉ không được vượt quá 300 ký tự.';
  if (!STATUSES.includes(payload.status)) return 'Trạng thái nhà cung cấp không hợp lệ.';
  return null;
};

const duplicateFilter = (payload, excludedId) => {
  const conditions = [{ name: { $regex: `^${payload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }];
  if (payload.phone) conditions.push({ phone: payload.phone });
  const filter = { $or: conditions };
  if (excludedId) filter._id = { $ne: excludedId };
  return filter;
};

router.get('/overview', async (req, res) => {
  try {
    const [suppliers, ingredientGroups, orderGroups] = await Promise.all([
      Supplier.find().sort({ createdAt: 1, name: 1 }).lean(),
      Ingredient.aggregate([
        { $group: { _id: '$supplier', ingredients: { $push: '$name' } } },
        { $sort: { _id: 1 } }
      ]),
      PurchaseOrder.aggregate([{ $group: { _id: '$supplier', count: { $sum: 1 } } }])
    ]);
    const ingredientsBySupplier = new Map(ingredientGroups.map((group) => [String(group._id), group.ingredients]));
    const ordersBySupplier = new Map(orderGroups.map((group) => [String(group._id), group.count]));
    const rows = suppliers.map((supplier) => ({
      ...supplier,
      ingredients: ingredientsBySupplier.get(String(supplier._id)) || [],
      purchaseOrderCount: ordersBySupplier.get(String(supplier._id)) || 0
    }));
    const activeCount = rows.filter((supplier) => supplier.status === 'ACTIVE').length;
    res.json({
      summary: {
        supplierCount: rows.length,
        activeCount,
        inactiveCount: rows.length - activeCount,
        purchaseOrderCount: rows.reduce((sum, supplier) => sum + supplier.purchaseOrderCount, 0)
      },
      suppliers: rows
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!STATUSES.includes(req.query.status)) return res.status(400).json({ message: 'Trạng thái nhà cung cấp không hợp lệ.' });
      filter.status = req.query.status;
    }
    res.json(await Supplier.find(filter).sort({ name: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã nhà cung cấp không hợp lệ.' });
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp.' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const validationError = validatePayload(payload);
    if (validationError) return res.status(400).json({ message: validationError });
    if (await Supplier.exists(duplicateFilter(payload))) return res.status(409).json({ message: 'Tên hoặc số điện thoại nhà cung cấp đã tồn tại.' });
    res.status(201).json(await Supplier.create(payload));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã nhà cung cấp không hợp lệ.' });
    const payload = normalizePayload(req.body);
    const validationError = validatePayload(payload);
    if (validationError) return res.status(400).json({ message: validationError });
    if (await Supplier.exists(duplicateFilter(payload, req.params.id))) return res.status(409).json({ message: 'Tên hoặc số điện thoại nhà cung cấp đã tồn tại.' });
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, payload, { returnDocument: 'after', runValidators: true });
    if (!supplier) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp.' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã nhà cung cấp không hợp lệ.' });
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp.' });
    const [ingredientCount, purchaseOrderCount] = await Promise.all([
      Ingredient.countDocuments({ supplier: supplier._id }),
      PurchaseOrder.countDocuments({ supplier: supplier._id })
    ]);
    if (ingredientCount > 0 || purchaseOrderCount > 0) {
      return res.status(409).json({ message: 'Không thể xóa nhà cung cấp đang có nguyên liệu hoặc phiếu nhập. Hãy chuyển sang trạng thái ngừng hợp tác.' });
    }
    await supplier.deleteOne();
    res.json({ message: 'Đã xóa nhà cung cấp thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
