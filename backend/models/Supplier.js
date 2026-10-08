const mongoose = require('mongoose');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
});
module.exports = mongoose.model('Supplier', supplierSchema);