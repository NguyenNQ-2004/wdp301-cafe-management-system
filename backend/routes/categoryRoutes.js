const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const catalogImage = require('../utils/catalogImage');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { invalid, objectBody, objectId, text, sendError } = require('../utils/adminValidation');
const router = express.Router();
async function parse(body, creating, id) {
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
  try { res.status(201).json(await Category.create(await parse(req.body, true))); } catch (error) { sendError(res, error); }
});
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    const category = await Category.findByIdAndUpdate(id, { $set: await parse(req.body, false, id) }, { returnDocument: 'after', runValidators: true });
    if (!category) throw invalid('Không tìm thấy danh mục.', 404);
    res.json(category);
  } catch (error) { sendError(res, error); }
});
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (await Product.exists({ category: id })) throw invalid('Không thể xóa danh mục đang có sản phẩm.', 409);
    if (!await Category.findByIdAndDelete(id)) throw invalid('Không tìm thấy danh mục.', 404);
    res.json({ message: 'Đã xóa danh mục.' });
  } catch (error) { sendError(res, error); }
});
module.exports = router;
