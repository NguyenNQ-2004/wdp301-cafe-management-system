const mongoose = require('mongoose');
const ingredientSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  currentStock: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 0 }
});
module.exports = mongoose.model('Ingredient', ingredientSchema);