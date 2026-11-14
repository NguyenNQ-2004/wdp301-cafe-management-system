const mongoose = require('mongoose');
const { productNameKey } = require('../utils/productName');
const productSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  nameKey: { type: String, select: false },
  basePrice: { type: Number, required: true, min: 0 },
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
// Old products without a key remain valid; API validation also checks their names.
productSchema.index({ nameKey: 1 }, { unique: true, partialFilterExpression: { nameKey: { $type: 'string' } } });
productSchema.pre('validate', function () {
  if (this.isModified('name') && typeof this.name === 'string') this.nameKey = productNameKey(this.name);
});
for (const option of ['toJSON', 'toObject']) productSchema.set(option, { transform: (_doc, result) => { delete result.nameKey; return result; } });
module.exports = mongoose.model('Product', productSchema);
