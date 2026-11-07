const mongoose = require('mongoose');

const deliveryAreaSchema = new mongoose.Schema({
  district: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  deliveryFee: {
    type: Number,
    required: true,
    min: 0,
    max: 1000000,
    default: 18000
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

deliveryAreaSchema.index({ isActive: 1 });

module.exports = mongoose.model('DeliveryArea', deliveryAreaSchema);
