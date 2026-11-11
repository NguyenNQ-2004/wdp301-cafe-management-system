const mongoose = require('mongoose');
const inventoryTransactionSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  transactionType: { type: String, enum: ['IN_PURCHASE', 'OUT_ORDER', 'ADJUSTMENT', 'SPOILAGE'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  stockBefore: Number,
  stockAfter: Number,
  unitBefore: String,
  unitAfter: String,
  valueBefore: { type: Number, default: null },
  valueAfter: { type: Number, default: null },
  stockDelta: { type: Number, required: true },
  referenceType: { type: String, enum: ['ORDER', 'PURCHASE_ORDER', 'ADJUSTMENT'], default: 'ADJUSTMENT' },
  referenceId: { type: mongoose.Schema.Types.Mixed },
  note: { type: String, trim: true, maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  costTotal: { type: Number, default: null },
  lotAllocations: [{ lotId: { type: mongoose.Schema.Types.ObjectId }, quantity: Number, unitCost: { type: Number, default: null } }],
}, { timestamps: true });
module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
