const express = require('express');
const Supplier = require('../models/Supplier');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// 1. GET ALL
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    res.json(await Supplier.find(filter).sort({ name: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. GET ONE
router.get('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp.' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. CREATE
router.post('/', adminOnly, async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. UPDATE
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 5. DELETE
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa nhà cung cấp thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
