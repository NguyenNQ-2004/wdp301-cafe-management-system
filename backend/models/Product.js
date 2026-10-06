const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  basePrice: { type: Number, required: true },
  badge: { type: String },
  subtitle: { type: String },
  variantsConfig: { type: Object }, // JSON cho sizes, toppings
  description: { type: String },
  imageUrl: { type: String },
  isAvailable: { type: Boolean, default: true },
  recipe: [{ // Nhúng bảng product_ingredients vào đây
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
    quantityRequired: { type: Number, required: true }
  }]
}, { timestamps: true });
module.exports = mongoose.model('Product', productSchema);