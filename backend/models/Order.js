const mongoose = require('mongoose');
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productNameAtTime: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  customization: { type: Object },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  isPrepared: { type: Boolean, default: false },
  costTotal: { type: Number, default: null },
  costPerItem: { type: Number, default: null },
  costAllocations: [{ ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }, ingredientName: String, unit: String,
    lotId: { type: mongoose.Schema.Types.ObjectId }, quantity: Number, unitCost: { type: Number, default: null } }]
}, { _id: false });

const orderSchema = new mongoose.Schema({
  mutationLock: { type: String, select: false },
  orderCode: { type: String, required: true, unique: true },
  checkoutFlow: { type: Boolean, default: false },
  checkoutSessionId: String,
  idempotencyKey: String,
  requestHash: String,
  cartClearedAt: Date,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardItem' },
  pointsRedeemed: { type: Number, default: 0 },
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
  paymentMethod: { type: String, enum: ['COD', 'PAY_AT_COUNTER', 'CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 'DEMO_ONLINE'], default: 'CASH' },
  demoProvider: { type: String, enum: ['MOMO', 'VNPAY', 'BANK_TRANSFER'] },
  recipientName: { type: String },
  recipientPhone: { type: String },
  deliveryAddress: { type: String },
  district: { type: String },
  ward: { type: String },
  addressDetail: { type: String },
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Delivery is embedded so assignment, stages and order status commit together.
  delivery: {
    status: { type: String, enum: ['ASSIGNED', 'ACCEPTED', 'DELIVERING', 'DELIVERED', 'RETURNED', 'CANCELLED'] },
    assignedAt: Date,
    acceptedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    history: [{ action: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date }]
  },
  tableNumber: { type: String },
  orderNote: { type: String },
  cancelReason: { type: String },
  inventoryDeductedAt: { type: Date },
  inventoryProcessing: { type: Boolean, default: false },
  costTotal: { type: Number, default: null },
  costCapturedAt: { type: Date },
  costStatus: { type: String, enum: ['PENDING', 'COMPLETE', 'MISSING_PRICE', 'LEGACY'], default: 'PENDING' }
}, { timestamps: true, optimisticConcurrency: true });
orderSchema.index({ customer: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
module.exports = mongoose.model('Order', orderSchema);
