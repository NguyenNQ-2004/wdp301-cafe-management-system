const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
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
    baseSalary: { type: Number, default: 0, min: 0 },
    hireDate: { type: Date },
    // Thuộc tính riêng của Customer (Membership)
    tierName: { 
      type: String, 
      enum: ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'], 
      default: 'BRONZE' 
    },
    totalPoints: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
