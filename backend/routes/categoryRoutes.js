const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const catalogImage = require('../utils/catalogImage');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { invalid, objectBody, objectId, text, sendError } = require('../utils/adminValidation');
const router = express.Router();
async function parse(body, creating, id) {
  // [DM03] . Kiểm tra tên danh mục trùng không phân biệt hoa thường, trạng thái, mô tả và ảnh; khi sửa thì bỏ qua chính danh mục đó.
  // [DM03] .. Dữ liệu sai thì trả lỗi; hợp lệ thì trả các trường cho Category.create() hoặc findByIdAndUpdate().
  objectBody(body);
  const fields = {};
  if (creating || body.name !== undefined) {
    fields.name = text(body.name, 'Tên danh mục', 100);
    const escaped = fields.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (await Category.exists({ name: new RegExp(`^${escaped}$`, 'i'), ...(id ? { _id: { $ne: id } } : {}) })) throw invalid('Tên danh mục đã tồn tại.', 409);
  }
  if (body.status !== undefined) {
    if (!['ACTIVE', 'INACTIVE'].includes(body.status)) throw invalid('Trạng thái danh mục không hợp lệ.');
    fields.status = body.status;
  }
  for (const key of ['icon', 'description']) if (body[key] !== undefined) {
    if (body[key] !== null && typeof body[key] !== 'string') throw invalid('Thông tin danh mục không hợp lệ.');
    fields[key] = body[key]?.trim() || null;
  }
  if (body.image_url !== undefined || body.imageUrl !== undefined) {
    const image = body.image_url !== undefined ? body.image_url : body.imageUrl;
    if (image !== null && typeof image !== 'string') throw invalid('Ảnh danh mục không hợp lệ.');
    fields.imageUrl = fields.image_url = catalogImage(image) || null;
  }
  return fields;
}
router.get('/', async (_req, res) => {
  // [DM00] . Đọc danh mục theo ngày tạo để các màn hình quản trị và menu dùng chung dữ liệu.
  try { res.json(await Category.find().sort({ createdAt: 1 })); } catch (error) { sendError(res, error); }
});
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(objectId(req.params.id));
    if (!category) throw invalid('Không tìm thấy danh mục.', 404);
    res.json(category);
  } catch (error) { sendError(res, error); }
});
router.post('/', protect, adminOnly, async (req, res) => {
  // [DM03] . Admin tạo danh mục từ dữ liệu đã qua parse(), lưu bằng model Category.
  // [DM03] ... Trả danh mục mới để tải lại bảng và đóng form. [DM04]
  try { res.status(201).json(await Category.create(await parse(req.body, true))); } catch (error) { sendError(res, error); }
});
router.put('/:id', protect, adminOnly, async (req, res) => {
  // [DM09] . Admin có thể cập nhật riêng status hoặc sửa thông tin; parse() chỉ nhận các trường được gửi lên.
  // [DM03] . Kiểm tra ID và dữ liệu sửa trước khi cập nhật danh mục, không tìm thấy thì báo lỗi.
  // [DM03] ... Trả danh mục sau khi sửa để giao diện tải lại. [DM04]
  // [DM09] ... Nếu đổi trạng thái, giao diện đồng bộ bảng và form đang mở. [DM10]
  try {
    const id = objectId(req.params.id);
    const category = await Category.findByIdAndUpdate(id, { $set: await parse(req.body, false, id) }, { returnDocument: 'after', runValidators: true });
    if (!category) throw invalid('Không tìm thấy danh mục.', 404);
    res.json(category);
  } catch (error) { sendError(res, error); }
});
router.delete('/:id', protect, adminOnly, async (req, res) => {
  // [DM06] . Kiểm tra Product còn tham chiếu danh mục không; còn sản phẩm thì chặn xóa, nếu không thì xóa Category.
  // [DM06] ... Trả kết quả xóa để giao diện tải lại danh sách. [DM07]
  try {
    const id = objectId(req.params.id);
    if (await Product.exists({ category: id })) throw invalid('Không thể xóa danh mục đang có sản phẩm.', 409);
    if (!await Category.findByIdAndDelete(id)) throw invalid('Không tìm thấy danh mục.', 404);
    res.json({ message: 'Đã xóa danh mục.' });
  } catch (error) { sendError(res, error); }
});
module.exports = router;
