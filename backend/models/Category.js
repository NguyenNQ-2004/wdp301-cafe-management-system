const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: { type: String },
  description: { type: String },
  imageUrl: { type: String },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });
module.exports = mongoose.model('Category', categorySchema);