const mongoose = require('mongoose');
const poItemSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true }
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalCost: { type: Number, default: 0 },
  status: { type: String, enum: ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'], default: 'DRAFT' },
  items: [poItemSchema] // Nhúng bảng purchase_order_items
}, { timestamps: true });
module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);