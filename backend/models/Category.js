const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: { type: String },
  description: { type: String },
  imageUrl: { type: String },
  image_url: { type: String },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });

categorySchema.pre('save', function(next) {
  if (this.image_url && !this.imageUrl) this.imageUrl = this.image_url;
  if (this.imageUrl && !this.image_url) this.image_url = this.imageUrl;
  next();
});

module.exports = mongoose.model('Category', categorySchema);