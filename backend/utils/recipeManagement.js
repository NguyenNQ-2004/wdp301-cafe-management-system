const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const ProductIngredient = require('../models/ProductIngredient');
const { invalid, objectId } = require('./adminValidation');

const pending = new Map();
async function changeRecipe(productId, change) {
  const key = String(objectId(productId));
  if (pending.has(key)) throw invalid('Công thức đang được cập nhật. Vui lòng thử lại.', 409);
  pending.set(key, true);
  try {
    const product = await Product.findById(key);
    if (!product) throw invalid('Không tìm thấy sản phẩm.', 404);
    const previous = await ProductIngredient.find({ product: key }).lean();
    const lines = change(previous.map(line => ({ ingredient: String(line.ingredient), quantityRequired: line.quantityRequired })));
    if (!Array.isArray(lines)) throw invalid('Công thức không hợp lệ.');
    for (const line of lines) {
      if (!line || typeof line !== 'object' || Array.isArray(line)) throw invalid('Dòng công thức không hợp lệ.');
      objectId(line.ingredient);
      if (typeof line.quantityRequired !== 'number' || !Number.isFinite(line.quantityRequired) || line.quantityRequired < 0.001) throw invalid('Định lượng phải lớn hơn hoặc bằng 0.001.');
    }
    if (new Set(lines.map(line => String(line.ingredient))).size !== lines.length) throw invalid('Mỗi nguyên liệu chỉ được xuất hiện một lần.', 409);
    if (await Ingredient.countDocuments({ _id: { $in: lines.map(line => line.ingredient) } }) !== lines.length) throw invalid('Có nguyên liệu không còn tồn tại.', 404);
    try {
      // Upsert retained lines before deleting removed lines; clients send one complete recipe.
      if (lines.length) await ProductIngredient.bulkWrite(lines.map(line => ({ updateOne: {
        filter: { product: key, ingredient: line.ingredient }, update: { $set: { quantityRequired: line.quantityRequired } }, upsert: true
      } })));
      await ProductIngredient.deleteMany({ product: key, ingredient: { $nin: lines.map(line => line.ingredient) } });
      const updated = await Product.findByIdAndUpdate(key, { $set: { recipe: lines } }, { returnDocument: 'after', runValidators: true });
      if (!updated) throw invalid('Không tìm thấy sản phẩm.', 404);
    } catch (error) {
      if (require('mongoose').transactionAsyncLocalStorage?.getStore()?.session) throw error;
      await ProductIngredient.deleteMany({ product: key });
      if (previous.length) await ProductIngredient.insertMany(previous);
      throw error;
    }
    return lines;
  } finally { pending.delete(key); }
}
module.exports = { changeRecipe };
