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
const { lockIngredients, mutateLots, money, priceUnvaluedStock } = require('../utils/stockLots');
const { editIngredient } = require('../utils/editIngredient');
const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());
router.use(protect);

// K-NL: parse — Chuẩn hóa trường nguyên liệu, kiểm tra tồn đầu và nhà cung cấp.
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
  // K-NL: Nếu khai báo tổng tiền tồn đầu, tạo lô OPENING và tính đơn giá bằng tổng tiền chia cho số lượng tồn đầu.
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
// K-NL: GET / — Liệt kê nguyên liệu theo bộ lọc.
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.supplierId) filter.supplier = objectId(req.query.supplierId);
    if (req.query.lowStock === 'true') filter.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
    res.json(await Ingredient.find(filter).populate('supplier', 'name phone').sort({ name: 1 }));
  } catch (error) { sendError(res, error); }
});
// K-NL: GET /:id — Đọc chi tiết nguyên liệu theo ID.
router.get('/:id', async (req, res) => {
  try {
    const item = await Ingredient.findById(objectId(req.params.id)).populate('supplier', 'name phone');
    if (!item) throw invalid('Không tìm thấy nguyên liệu.', 404);
    res.json(item);
  } catch (error) { sendError(res, error); }
});
// K-NL: POST / — Thêm nguyên liệu và lưu tồn đầu nếu có.
router.post('/', adminOnly, async (req, res) => {
  try { res.status(201).json(await Ingredient.create(await parse(req.body, true))); }
  catch (error) { sendError(res, error); }
});
// K-SG: Sửa tổng tiền và đơn giá của đúng dòng nguyên liệu, đồng bộ chi tiết và tổng tiền cả phiếu.
// Với phiếu đã nhận, định giá lại lượng còn trong các lô thuộc phiếu và ghi giao dịch điều chỉnh có số lượng bằng 0.
// K-SG: PUT /:id/purchase-price/:orderId — Sửa giá nhập của một dòng trên phiếu.
router.put('/:id/purchase-price/:orderId', adminOnly, async (req, res) => {
  let release;
  try {
    const id = objectId(req.params.id);
    const orderId = objectId(req.params.orderId);
    objectBody(req.body);
    const { totalCost, expectedUnitPrice } = req.body;
    if (!Number.isSafeInteger(totalCost) || totalCost < 0) throw invalid('Tổng tiền phải là số nguyên không âm.');
    release = lockIngredients([id]);
    const order = await PurchaseOrder.findOne({ _id: orderId, status: { $in: ['ORDERED', 'RECEIVED'] } });
    const item = order?.items.find(row => String(row.ingredient) === id);
    if (!item || !(item.quantity > 0)) throw invalid('Không tìm thấy dòng nguyên liệu trên phiếu.', 404);
    const previousPrice = item.unitPrice;
    if (previousPrice !== expectedUnitPrice) throw invalid('Đơn giá vừa thay đổi. Vui lòng tải lại dữ liệu.', 409);
    if (item.totalCost === totalCost) return res.json({ message: 'Giá nhập đã được lưu.' });
    const unitPrice = totalCost / item.quantity;
    item.set({ unitPrice, totalCost });
    order.totalCost = order.items.reduce((sum, row) => sum + (row.totalCost ?? row.unitPrice * row.quantity), 0);
    await order.save();
    await PurchaseOrderItem.updateMany({ purchaseOrder: orderId, ingredient: id }, { $set: { unitPrice, totalCost } });
    if (order.status === 'RECEIVED') {
      const movement = await mutateLots(id, (ingredient, lots) => {
        let valueBefore = 0;
        let valueAfter = 0;
        for (const lot of lots) {
          if (lot.sourceType !== 'PURCHASE' || String(lot.sourceId) !== orderId || lot.remainingQuantity <= 0) continue;
          valueBefore += lot.remainingQuantity * (lot.unitCost ?? 0);
          valueAfter += lot.remainingQuantity * unitPrice;
          lot.unitCost = unitPrice;
        }
        return { currentStock: ingredient.currentStock, valueBefore: money(valueBefore), valueAfter: money(valueAfter) };
      });
      await InventoryTransaction.create({
        ingredient: id, transactionType: 'ADJUSTMENT', quantity: 0, stockDelta: 0,
        referenceType: 'PURCHASE_ORDER', referenceId: orderId, createdBy: req.user._id,
        stockBefore: movement.currentStock, stockAfter: movement.currentStock,
        valueBefore: movement.valueBefore, valueAfter: movement.valueAfter,
        costTotal: money(movement.valueAfter - movement.valueBefore),
        note: `Sửa đơn giá phiếu nhập từ ${previousPrice} thành ${unitPrice}.`
      });
    }
    res.json({ message: 'Đã cập nhật giá nhập.' });
  } catch (error) { sendError(res, error); }
  finally { release?.(); }
});
// K-NL: Phân bổ tổng tiền cho phần tồn chưa có đơn giá. Các lô đã được định giá giữ đơn giá đã lưu.
// K-NL: PUT /:id/unpriced-stock-cost — Định giá phần tồn chưa có đơn giá.
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
// K-NL: PUT /:id — Cập nhật thông tin nguyên liệu và áp dụng điều chỉnh hợp lệ.
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const fields = await parse(req.body, false);
    const id = objectId(req.params.id);
    const item = await editIngredient(id, fields, { stockTotalCost: req.body.stockTotalCost,
      expectedCurrentStock: req.body.expectedCurrentStock, expectedUnit: req.body.expectedUnit }, req.user._id);
    res.json(item);
  } catch (error) { sendError(res, error); }
});
// K-NL: DELETE /:id — Xóa nguyên liệu sau khi kiểm tra lịch sử nhập và biến động kho.
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
