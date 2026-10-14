const express = require('express');
const Ingredient = require('../models/Ingredient');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// 1. GET ALL
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.supplierId) filter.supplier = req.query.supplierId;
    
    // Tìm các nguyên liệu sắp hết (dưới mức cảnh báo minStockLevel)
    if (req.query.lowStock === 'true') {
      const ingredients = await Ingredient.find({
        $expr: { $lte: ['$currentStock', '$minStockLevel'] }
      }).populate('supplier', 'name phone');
      return res.json(ingredients);
    }

    const ingredients = await Ingredient.find(filter)
      .populate('supplier', 'name phone')
      .sort({ name: 1 });

    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. GET ONE
router.get('/:id', async (req, res) => {
  try {
    const item = await Ingredient.findById(req.params.id).populate('supplier', 'name phone');
    if (!item) return res.status(404).json({ message: 'Không tìm thấy nguyên liệu.' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. CREATE
router.post('/', adminOnly, async (req, res) => {
  try {
    const item = await Ingredient.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. UPDATE
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const item = await Ingredient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 5. DELETE
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Ingredient.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa nguyên liệu thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
