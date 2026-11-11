const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productNameAtTime: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  customization: { type: mongoose.Schema.Types.Mixed },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true, min: 0 },
  isPrepared: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('OrderItem', orderItemSchema);
