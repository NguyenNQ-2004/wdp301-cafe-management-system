const mongoose = require('mongoose');
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productNameAtTime: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  customization: { type: Object },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  orderType: { type: String, enum: ['DINE_IN', 'TAKEAWAY', 'ONLINE'], required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  items: [orderItemSchema], // Nhúng bảng order_items vào đây
  totalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  recipientName: { type: String },
  recipientPhone: { type: String },
  deliveryAddress: { type: String },
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tableNumber: { type: String },
  orderNote: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('Order', orderSchema);