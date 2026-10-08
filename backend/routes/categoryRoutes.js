const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// 1. GET ALL - Lấy toàn bộ danh mục
router.get('/', async (req, res) => {
  try { res.json(await Category.find({})); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. GET ONE - Lấy 1 danh mục theo ID
router.get('/:id', async (req, res) => {
  try { res.json(await Category.findById(req.params.id)); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. POST - Tạo mới danh mục
router.post('/', async (req, res) => {
  try { res.status(201).json(await Category.create(req.body)); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. PUT - Cập nhật danh mục
router.put('/:id', async (req, res) => {
  try { 
    // { new: true } để Mongoose trả về data mới nhất sau khi update
    res.json(await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })); 
  } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. DELETE - Xóa danh mục
router.delete('/:id', async (req, res) => {
  try { 
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa danh mục thành công!' }); 
  } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
