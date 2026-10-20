const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// 1. GET ALL - Lấy toàn bộ danh mục
router.get('/', async (req, res) => {
  try { res.json(await Category.find({}).sort({ createdAt: 1 })); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. GET ONE - Lấy 1 danh mục theo ID
router.get('/:id', async (req, res) => {
  try { res.json(await Category.findById(req.params.id)); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. POST - Tạo mới danh mục
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, icon, description, imageUrl, image_url, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Tên danh mục là bắt buộc.' });
    }
    const cleanName = name.trim();
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Tên danh mục đã tồn tại (categories.name là UNIQUE).' });
    }
    const finalImg = image_url?.trim() || imageUrl?.trim() || null;
    const created = await Category.create({
      name: cleanName,
      icon: icon || null,
      description: description?.trim() || null,
      imageUrl: finalImg,
      image_url: finalImg,
      status: status || 'ACTIVE'
    });
    res.status(201).json(created);
  } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. PUT - Cập nhật danh mục
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, icon, description, imageUrl, image_url, status } = req.body;
    if (name) {
      const cleanName = name.trim();
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ message: 'Tên danh mục đã tồn tại (categories.name là UNIQUE).' });
      }
    }
    const finalImg = image_url !== undefined ? (image_url?.trim() || null) : (imageUrl !== undefined ? (imageUrl?.trim() || null) : undefined);
    const updateData = { ...req.body };
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (finalImg !== undefined) {
      updateData.imageUrl = finalImg;
      updateData.image_url = finalImg;
    }
    const updated = await Category.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
    res.json(updated); 
  } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. DELETE - Xóa danh mục
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try { 
    // Kiểm tra ràng buộc khóa ngoại fk_product_category
    const count = await Product.countDocuments({ category: req.params.id });
    if (count > 0) {
      return res.status(400).json({ 
        message: 'Không thể xóa: danh mục đang có sản phẩm (ràng buộc fk_product_category).' 
      });
    }
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa danh mục thành công!' }); 
  } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;

