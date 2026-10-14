const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  quantity: { type: Number, required: true, min: 0.001 },
  unitPrice: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrderItem', purchaseOrderItemSchema);
