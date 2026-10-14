const mongoose = require('mongoose');

const customerReviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    issueType: {
      type: String,
      enum: ['RATING', 'COMPLAINT'],
      required: true
    },
    rating: { type: Number, min: 1, max: 5 },
    topic: { type: String },
    content: { type: String, required: true },
    attachments: [{ type: String }],
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
      default: 'PENDING'
    },
    adminResponse: { type: String },
    respondedAt: { type: Date },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomerReview', customerReviewSchema);