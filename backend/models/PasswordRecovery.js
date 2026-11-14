const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challenge: { type: String, required: true },
  otpHash: { type: String, required: true, select: false },
  resetTokenHash: { type: String, select: false },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
});
module.exports = mongoose.model('PasswordRecovery', schema);
