const mongoose = require('mongoose');
const inventoryTransactionSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  transactionType: { type: String, enum: ['IN_PURCHASE', 'OUT_ORDER', 'ADJUSTMENT', 'SPOILAGE'], required: true },
  quantity: { type: Number, required: true }, 
  referenceType: { type: String, enum: ['ORDER', 'PURCHASE_ORDER', 'ADJUSTMENT'], default: 'ADJUSTMENT' },
  referenceId: { type: mongoose.Schema.Types.ObjectId }, 
}, { timestamps: true });
module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);