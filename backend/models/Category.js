const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: { type: String },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
});
module.exports = mongoose.model('Category', categorySchema);