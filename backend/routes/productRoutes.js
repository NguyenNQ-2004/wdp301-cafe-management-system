const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Cart = require('../models/Cart');
const Category = require('../models/Category');
const catalogImage = require('../utils/catalogImage');
const ProductIngredient = require('../models/ProductIngredient');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { invalid, objectBody, objectId, text, nonnegative, sendError } = require('../utils/adminValidation');
const { atomicRouter } = require('../utils/atomicRoute');
const { normalizeProductName, productNameKey } = require('../utils/productName');
const router = atomicRouter(express.Router());
async function parse(body, creating, id) {
  // [SP04] . Chuẩn hóa tên và chặn trùng; kiểm tra danh mục tồn tại, giá bán, trạng thái, ảnh, size và topping.
  // [SP04] . Giá bán và phụ thu phải là số nguyên không âm; công thức không sửa ở API này mà qua màn hình BOM.
  objectBody(body);
  const fields = {};
  if (creating || body.name !== undefined) {
    fields.name = normalizeProductName(text(body.name, 'Tên sản phẩm'));
    fields.nameKey = productNameKey(fields.name);
    const candidates = await Product.find(id ? { _id: { $ne: id } } : {}).select('name').lean();
    if (candidates.some(product => productNameKey(product.name) === fields.nameKey)) throw invalid('Tên sản phẩm đã tồn tại. Vui lòng chọn tên khác.', 409);
  }
  if (creating || body.category !== undefined) {
    fields.category = objectId(body.category);
    if (!await Category.exists({ _id: fields.category })) throw invalid('Danh mục không tồn tại.', 404);
  }
  if (creating || body.basePrice !== undefined) {
    fields.basePrice = nonnegative(body.basePrice, 'Giá bán');
    if (!Number.isSafeInteger(fields.basePrice)) throw invalid('Giá bán phải là số nguyên.');
  }
  if (body.isAvailable !== undefined) {
    if (typeof body.isAvailable !== 'boolean') throw invalid('Trạng thái bán không hợp lệ.');
    fields.isAvailable = body.isAvailable;
  }
  for (const key of ['badge', 'subtitle', 'description', 'imageUrl']) if (body[key] !== undefined) {
    if (body[key] !== null && typeof body[key] !== 'string') throw invalid('Thông tin sản phẩm không hợp lệ.');
    fields[key] = body[key]?.trim() || '';
  }
  if (body.imageUrl !== undefined) fields.imageUrl = catalogImage(body.imageUrl);
  if (body.recipe !== undefined) throw invalid('Vui lòng sửa công thức tại màn hình Công thức (BOM).');
  if (body.variantsConfig !== undefined) {
    const config = objectBody(body.variantsConfig);
    const sizes = objectBody(config.sizes);
    if (!Object.keys(sizes).length || Object.keys(sizes).some(key => !key.trim())) throw invalid('Cần ít nhất một size hợp lệ.');
    for (const price of Object.values(sizes)) {
      nonnegative(price, 'Giá size');
      if (!Number.isSafeInteger(price)) throw invalid('Giá size phải là số nguyên.');
    }
    if (config.toppings !== undefined && !Array.isArray(config.toppings)) throw invalid('Topping không hợp lệ.');
    const toppings = (config.toppings || []).map(topping => ({ name: text(topping.name, 'Tên topping'), price: nonnegative(topping.price, 'Giá topping') }));
    if (toppings.some(topping => !Number.isSafeInteger(topping.price))) throw invalid('Giá topping phải là số nguyên.');
    fields.variantsConfig = { sizes, toppings };
  }
  return fields;
}
router.get('/', async (_req, res) => {
  // [SP00] . Đọc sản phẩm và danh mục liên quan để quản trị và menu dùng cùng dữ liệu từ MongoDB.
  try {
    const [products, sales] = await Promise.all([
      Product.find().populate('category', 'name status').sort({ _id: 1 }).lean(),
      Order.aggregate([
        { $match: { status: { $in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED'] } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } }
      ])
    ]);
    const sold = new Map(sales.map(row => [String(row._id), row.totalSold]));
    res.json(products.map(product => ({ ...product, totalSold: sold.get(String(product._id)) || 0 })));
  } catch (error) { sendError(res, error); }
});
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(objectId(req.params.id)).populate('category', 'name status');
    if (!product) throw invalid('Không tìm thấy sản phẩm.', 404);
    res.json(product);
  } catch (error) { sendError(res, error); }
});
router.post('/', protect, adminOnly, async (req, res) => {
  // [SP04] . Admin tạo sản phẩm bằng Product.create() từ dữ liệu đã kiểm tra; lỗi tên trùng được trả HTTP 409.
  // [SP04] ... Trả kết quả để bộ dữ liệu giao diện tải lại sản phẩm. [SP05]
  try { res.status(201).json(await Product.create(await parse(req.body, true))); } catch (error) { productError(res, error); }
});
router.put('/:id', protect, adminOnly, async (req, res) => {
  // [SP04] . Cập nhật sản phẩm theo ID, chỉ thay các trường được gửi; dùng chung cho sửa sản phẩm và bật/tắt bán.
  // [SP04] ... Trả sản phẩm sau cập nhật để tải lại bảng. [SP05]
  try {
    const id = objectId(req.params.id);
    const product = await Product.findByIdAndUpdate(id, { $set: await parse(req.body, false, id) }, { returnDocument: 'after', runValidators: true });
    if (!product) throw invalid('Không tìm thấy sản phẩm.', 404);
    res.json(product);
  } catch (error) { productError(res, error); }
});
router.delete('/:id', protect, adminOnly, async (req, res) => {
  // [SP08] . Chặn xóa sản phẩm đã có trong Order hoặc OrderItem để giữ lịch sử đơn hàng.
  // [SP08] . Nếu được xóa, xóa Product, công thức ProductIngredient và dòng giỏ hàng còn tham chiếu sản phẩm trong transaction.
  // [SP08] ... Trả kết quả để đóng xác nhận và tải lại bảng sản phẩm. [SP09]
  try {
    const id = objectId(req.params.id);
    if (await Order.exists({ 'items.product': id }) || await OrderItem.exists({ product: id })) throw invalid('Sản phẩm đã có trong đơn hàng nên không thể xóa. Vui lòng chọn Tạm ngưng bán.', 409);
    if (!await Product.findByIdAndDelete(id)) throw invalid('Không tìm thấy sản phẩm.', 404);
    await ProductIngredient.deleteMany({ product: id });
    await Cart.updateMany({ 'items.product': id }, { $pull: { items: { product: id } } });
    res.json({ message: 'Đã xóa sản phẩm.' });
  } catch (error) { sendError(res, error); }
});
module.exports = router;
function productError(res, error) {
  if (error.code === 11000 && error.keyPattern?.nameKey) return res.status(409).json({ message: 'Tên sản phẩm đã tồn tại. Vui lòng chọn tên khác.' });
  return sendError(res, error);
}
