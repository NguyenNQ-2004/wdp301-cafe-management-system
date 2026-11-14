const express = require('express');
const ProductIngredient = require('../models/ProductIngredient');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { invalid, objectBody, objectId, sendError } = require('../utils/adminValidation');
const { changeRecipe } = require('../utils/recipeManagement');
const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());
router.use(protect);
router.get('/', async (req, res) => {
  try {
    const filter = req.query.productId ? { product: objectId(req.query.productId) } : {};
    res.json(await ProductIngredient.find(filter).populate('product', 'name basePrice imageUrl').populate('ingredient', 'name unit currentStock'));
  } catch (error) { sendError(res, error); }
});
router.put('/product/:productId', adminOnly, async (req, res) => {
  try {
    objectBody(req.body);
    const recipe = await changeRecipe(req.params.productId, () => req.body.items);
    res.json({ message: 'Đã lưu công thức.', recipe });
  } catch (error) { sendError(res, error); }
});
router.post('/', adminOnly, async (req, res) => {
  try {
    objectBody(req.body);
    const { product, ingredient, quantityRequired } = req.body;
    await changeRecipe(product, lines => [...lines, { ingredient, quantityRequired }]);
    res.status(201).json(await ProductIngredient.findOne({ product, ingredient }));
  } catch (error) { sendError(res, error); }
});
router.put('/:id', adminOnly, async (req, res) => {
  try {
    objectBody(req.body);
    const bom = await ProductIngredient.findById(objectId(req.params.id));
    if (!bom) throw invalid('Không tìm thấy định mức.', 404);
    if (req.body.product !== undefined && String(req.body.product) !== String(bom.product)) throw invalid('Không thể chuyển định mức sang sản phẩm khác.');
    const ingredient = req.body.ingredient ?? String(bom.ingredient);
    const quantityRequired = req.body.quantityRequired ?? bom.quantityRequired;
    await changeRecipe(bom.product, lines => lines.map(line => line.ingredient === String(bom.ingredient) ? { ingredient, quantityRequired } : line));
    res.json(await ProductIngredient.findOne({ product: bom.product, ingredient }));
  } catch (error) { sendError(res, error); }
});
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const bom = await ProductIngredient.findById(objectId(req.params.id));
    if (!bom) throw invalid('Không tìm thấy định mức.', 404);
    await changeRecipe(bom.product, lines => lines.filter(line => line.ingredient !== String(bom.ingredient)));
    res.json({ message: 'Đã xóa định mức.' });
  } catch (error) { sendError(res, error); }
});
module.exports = router;
