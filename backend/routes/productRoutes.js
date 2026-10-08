const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// 1. GET ALL
router.get('/', async (req, res) => {
  try { res.json(await Product.find({}).populate('category', 'name')); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. GET ONE
router.get('/:id', async (req, res) => {
  try { res.json(await Product.findById(req.params.id).populate('category', 'name')); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. POST - Create
router.post('/', async (req, res) => {
  try { res.status(201).json(await Product.create(req.body)); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. PUT - Update
router.put('/:id', async (req, res) => {
  try { res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. DELETE
router.delete('/:id', async (req, res) => {
  try { 
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa sản phẩm thành công!' }); 
  } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
