const express = require('express');
const ProductIngredient = require('../models/ProductIngredient');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// 1. GET ALL OR BY PRODUCT ID
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.productId) filter.product = req.query.productId;

    const boms = await ProductIngredient.find(filter)
      .populate('product', 'name basePrice imageUrl')
      .populate('ingredient', 'name unit currentStock');

    res.json(boms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. CREATE BOM LINK
router.post('/', adminOnly, async (req, res) => {
  try {
    const { product, ingredient, quantityRequired } = req.body;
    const bom = await ProductIngredient.create({ product, ingredient, quantityRequired });

    // Sync with product embedded recipe
    await Product.findByIdAndUpdate(product, {
      $push: { recipe: { ingredient, quantityRequired } }
    });

    res.status(201).json(bom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 3. UPDATE BOM LINK
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const bom = await ProductIngredient.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(bom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. DELETE BOM LINK
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const bom = await ProductIngredient.findById(req.params.id);
    if (bom) {
      await Product.findByIdAndUpdate(bom.product, {
        $pull: { recipe: { ingredient: bom.ingredient } }
      });
      await ProductIngredient.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'Đã xóa định lượng thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
