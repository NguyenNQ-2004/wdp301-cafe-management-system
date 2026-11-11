// Assign an existing account's login email without changing its password or role.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { normalizeEmail, validEmail } = require('../utils/accountEmail');

async function main() {
  const args = process.argv.slice(2);
  const phone = args[args.indexOf('--phone') + 1];
  const email = normalizeEmail(args[args.indexOf('--email') + 1]);
  if (!args.includes('--phone') || !args.includes('--email') || !/^\+?\d{9,15}$/.test(phone || '') || !validEmail(email)) {
    throw new Error('Usage: node scripts/setAccountEmail.js --phone 0901234567 --email your-address@gmail.com');
  }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { serverSelectionTimeoutMS: 5000 });
  await User.init();
  const user = await User.findOne({ phone });
  if (!user) throw new Error('Account not found for the supplied contact phone.');
  const { emailFilter } = require('../utils/accountEmail');
  if (await User.exists({ ...emailFilter(email), _id: { $ne: user._id } })) throw new Error('Email is already assigned to another account.');
  user.email = email;
  await user.save();
  console.log('Login email updated. Password, role and contact phone were preserved.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
