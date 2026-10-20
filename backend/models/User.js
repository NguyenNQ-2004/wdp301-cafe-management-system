const mongoose = require('mongoose');
const { normalizeEmail, validEmail, emailFilter } = require('../utils/accountEmail');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: {
      type: String,
      set: value => value == null ? undefined : normalizeEmail(value) || undefined,
      validate: { validator: value => !value || validEmail(value), message: 'Địa chỉ email không hợp lệ.' }
    },
    // Separate key lets old records without email remain intact during migration.
    emailKey: { type: String, select: false },
    passwordHash: { type: String, required: true },
    birthday: { type: Date },
    address: { type: String },
    role: {
      type: String,
      enum: ['ADMIN', 'STAFF', 'CUSTOMER'],
      default: 'CUSTOMER'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
      default: 'ACTIVE'
    },
    // Thuộc tính riêng của Staff / Admin
    position: {
      type: String,
      enum: ['MANAGER', 'BARISTA', 'CASHIER', 'SHIPPER']
    },
    baseSalary: { type: Number, default: 0 },
    // Thuộc tính riêng của Customer (Membership)
    tierName: {
      type: String,
      enum: ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'],
      default: 'BRONZE'
    },
    totalPoints: { type: Number, default: 0 },
  },
  {
    timestamps: true, // Tự động tạo trường createdAt và updatedAt
  }
);

userSchema.index({ emailKey: 1 }, { unique: true, partialFilterExpression: { emailKey: { $type: 'string' } } });
userSchema.pre('validate', async function () {
  if (!this.isModified('email')) return;
  const email = normalizeEmail(this.email);
  if (!email) {
    if (!this.isNew) throw Object.assign(new Error('Không thể xóa email đăng nhập. Hãy nhập email hợp lệ.'), { status: 400 });
    this.emailKey = undefined;
    return;
  }
  if (!validEmail(email)) return; // The email field validator returns the error.
  const duplicate = await this.constructor.findOne({ ...emailFilter(email), _id: { $ne: this._id } }).select('_id').lean();
  if (duplicate) throw Object.assign(new Error('Email này đã được sử dụng cho tài khoản khác.'), { status: 409 });
  this.emailKey = email;
});

module.exports = mongoose.model('User', userSchema);
