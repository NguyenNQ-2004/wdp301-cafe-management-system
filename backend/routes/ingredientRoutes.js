const express = require('express');
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const ProductIngredient = require('../models/ProductIngredient');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { invalid, objectBody, objectId, text, nonnegative, sendError } = require('../utils/adminValidation');
const { lockIngredients, priceUnvaluedStock } = require('../utils/stockLots');
const { editIngredient } = require('../utils/editIngredient');
const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());
router.use(protect);

async function parse(body, creating) {
  objectBody(body);
  const fields = {};
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') throw invalid('Trạng thái nguyên liệu không hợp lệ.');
    fields.isActive = body.isActive;
  }
  for (const key of ['name', 'unit']) {
    if (creating || body[key] !== undefined) fields[key] = text(body[key], key === 'name' ? 'Tên nguyên liệu' : 'Đơn vị', key === 'name' ? 150 : 30);
  }
  for (const key of ['currentStock', 'minStockLevel']) {
    if (body[key] !== undefined) fields[key] = nonnegative(body[key], key === 'currentStock' ? 'Tồn kho' : 'Mức tối thiểu');
  }
  if (creating && body.openingTotalCost !== undefined) {
    if (!Number.isSafeInteger(body.openingTotalCost) || body.openingTotalCost < 0 || !(fields.currentStock > 0)) throw invalid('Cần nhập số lượng tồn đầu và tổng tiền hợp lệ.');
    fields.stockLots = [{ sourceType: 'OPENING', receivedAt: new Date(0), quantity: fields.currentStock, remainingQuantity: fields.currentStock, unitCost: body.openingTotalCost / fields.currentStock }];
  }
  if (body.supplier !== undefined) {
    fields.supplier = body.supplier || null;
    if (fields.supplier && !await Supplier.exists({ _id: objectId(fields.supplier) })) throw invalid('Nhà cung cấp không tồn tại.');
  }
  return fields;
}
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.supplierId) filter.supplier = objectId(req.query.supplierId);
    if (req.query.lowStock === 'true') filter.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
    res.json(await Ingredient.find(filter).populate('supplier', 'name phone').sort({ name: 1 }));
  } catch (error) { sendError(res, error); }
});
router.get('/:id', async (req, res) => {
  try {
    const item = await Ingredient.findById(objectId(req.params.id)).populate('supplier', 'name phone');
    if (!item) throw invalid('Không tìm thấy nguyên liệu.', 404);
    res.json(item);
  } catch (error) { sendError(res, error); }
});
router.post('/', adminOnly, async (req, res) => {
  try { res.status(201).json(await Ingredient.create(await parse(req.body, true))); }
  catch (error) { sendError(res, error); }
});
router.put('/:id/unpriced-stock-cost', adminOnly, async (req, res) => {
  let release;
  try {
    const id = objectId(req.params.id);
    objectBody(req.body);
    release = lockIngredients([id]);
    await priceUnvaluedStock(id, req.body.totalCost, req.user._id);
    res.json(await Ingredient.findById(id).populate('supplier', 'name phone'));
  } catch (error) { sendError(res, error); }
  finally { release?.(); }
});
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const fields = await parse(req.body, false);
    const id = objectId(req.params.id);
    const item = await editIngredient(id, fields, { stockTotalCost: req.body.stockTotalCost,
      expectedCurrentStock: req.body.expectedCurrentStock, expectedUnit: req.body.expectedUnit }, req.user._id);
    res.json(item);
  } catch (error) { sendError(res, error); }
});
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    const referenced = [await PurchaseOrder.exists({ 'items.ingredient': id }), await PurchaseOrderItem.exists({ ingredient: id }), await InventoryTransaction.exists({ ingredient: id })];
    if (referenced.some(Boolean)) throw invalid('Không thể xóa nguyên liệu đã có phiếu nhập hoặc lịch sử xuất nhập kho.', 409);
    if (!await Ingredient.exists({ _id: id })) throw invalid('Không tìm thấy nguyên liệu.', 404);
    await Product.updateMany({ 'recipe.ingredient': id }, { $pull: { recipe: { ingredient: id } } });
    await ProductIngredient.deleteMany({ ingredient: id });
    await Ingredient.findByIdAndDelete(id);
    res.json({ message: 'Đã xóa nguyên liệu và định mức liên quan.' });
  } catch (error) { sendError(res, error); }
});
module.exports = router;
