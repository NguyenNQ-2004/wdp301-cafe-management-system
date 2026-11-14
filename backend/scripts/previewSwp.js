// Isolated preview: only public catalog data is copied; no real users/orders.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
require('dotenv').config();
async function main() {
  const dbName = `aura_swp_preview_test_${randomBytes(5).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp', { dbName });
  const app = require('../server');
  const Category = require('../models/Category');
  const Product = require('../models/Product');
  const User = require('../models/User');
  const Setting = require('../models/ShopSetting');
  const responses = await Promise.all(['/api/categories', '/api/products', '/api/shop-settings'].map(async path => {
    const response = await fetch(`http://127.0.0.1:5000${path}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Public catalog failed: ${path}`);
    return response.json();
  }));
  await Category.insertMany(responses[0]);
  await Product.insertMany(responses[1].map(product => ({ ...product, category: product.category?._id || product.category, recipe: [] })));
  const settings = responses[2].list || [];
  if (settings.length) await Setting.insertMany(settings);
  const passwordHash = await bcrypt.hash('Preview-123456', 4);
  for (const [index, role, position, email] of [[1, 'CUSTOMER', undefined, 'customer'], [2, 'ADMIN', undefined, 'admin'], [3, 'STAFF', 'CASHIER', 'cashier'], [4, 'STAFF', 'BARISTA', 'barista'], [5, 'STAFF', 'SHIPPER', 'shipper']]) {
    await User.create({ fullName: `Preview ${email}`, email: `${email}@preview.example`, phone: `099000000${index}`, role, position, totalPoints: role === 'CUSTOMER' ? 120 : 0, passwordHash });
  }
  const port = Number(process.env.PREVIEW_PORT || 5001);
  const server = app.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ preview: `http://127.0.0.1:${port}`, pid: process.pid, dbName, syntheticUsersOnly: true })));
  const stop = async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    if (!/^aura_swp_preview_test_[a-f0-9]+$/.test(mongoose.connection.db.databaseName)) throw new Error('Refusing to remove a non-preview database');
    await mongoose.connection.dropDatabase(); await mongoose.disconnect(); process.exit(0);
  };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
main().catch(async failure => { console.error(failure.message); await mongoose.disconnect(); process.exit(1); });
