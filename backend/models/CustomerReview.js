const mongoose = require('mongoose');
const customerReviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  issueType: { type: String, enum: ['RATING', 'COMPLAINT'], required: true },
  rating: { type: Number, min: 1, max: 5 },
  content: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'RESOLVED', 'REJECTED'], default: 'PENDING' },
  adminResponse: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('CustomerReview', customerReviewSchema);