const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'DRAFT', required: true },
  reason: { type: String, maxlength: 500, default: '' }, note: { type: String, maxlength: 500, default: '' },
  reviewNote: { type: String, maxlength: 500 }, reviewedAt: Date,
  history: [{ action: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date, note: String }],
  items: [{ ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true }, quantity: { type: Number, required: true, min: 0.000001 }, itemNote: { type: String, maxlength: 500 } }]
}, { timestamps: true });
module.exports = mongoose.model('RestockRequest', schema);
