const mongoose = require('mongoose');
const stockLotSchema = new mongoose.Schema({
  sourceType: { type: String, enum: ['OPENING', 'PURCHASE', 'ADJUSTMENT'], required: true },
  sourceId: { type: String },
  receivedAt: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  remainingQuantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, default: null, min: 0 }
});
const ingredientSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  unit: { type: String, required: true },
  currentStock: { type: Number, default: 0, min: 0 },
  minStockLevel: { type: Number, default: 0, min: 0 },
  stockLots: { type: [stockLotSchema], default: undefined },
  lotsVersion: { type: Number, default: 0 },
  stockValuation: { quantity: Number, totalCost: Number, updatedAt: Date, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }
});
module.exports = mongoose.model('Ingredient', ingredientSchema);
