const mongoose = require('mongoose');

const productIngredientSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  quantityRequired: { type: Number, required: true, min: 0.001 }
}, { timestamps: true });

productIngredientSchema.index({ product: 1, ingredient: 1 }, { unique: true });

module.exports = mongoose.model('ProductIngredient', productIngredientSchema);
