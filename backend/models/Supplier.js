const mongoose = require('mongoose');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 20 },
  address: { type: String, trim: true, maxlength: 300 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });
module.exports = mongoose.model('Supplier', supplierSchema);
