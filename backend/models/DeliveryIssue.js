const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  issueType: { type: String, enum: ['UNREACHABLE', 'BAD_ADDRESS', 'REFUSED', 'DAMAGED', 'DELAY', 'OTHER'], required: true },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  outcome: { type: String, enum: ['REPORT', 'RETURN', 'CANCEL'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryIssue', schema);
