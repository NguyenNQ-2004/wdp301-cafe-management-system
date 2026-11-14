const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'isolated-product-name-test-secret';
const app = require('../server');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const ProductIngredient = require('../models/ProductIngredient');
const Cart = require('../models/Cart');

test('products reject duplicate names on create and edit without changing existing records', async t => {
  const dbName = `aura_product_names_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName });
  let server;
  t.after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    assert.equal(mongoose.connection.name, dbName);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const admin = await User.create({ fullName: 'Product Admin', phone: '0909991122', role: 'ADMIN', passwordHash: 'unused' });
  const token = jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET);
  const category = await Category.create({ name: 'Test Menu' });
  const body = { name: 'Trà Đào Test', category: String(category._id), basePrice: 35000 };
  const request = async (method, path, data) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/products${path}`, { method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return { status: response.status, data: await response.json() };
  };
  const first = await request('POST', '', body);
  assert.equal(first.status, 201);
  assert.equal(first.data.nameKey, undefined);
  for (const name of ['Trà Đào Test', ' trà  đào TEST ', 'TRÀ ĐÀO TEST'.normalize('NFD')]) {
    const duplicate = await request('POST', '', { ...body, name });
    assert.equal(duplicate.status, 409);
    assert.match(duplicate.data.message, /Tên sản phẩm đã tồn tại/);
  }
  const second = await request('POST', '', { ...body, name: 'Coffee + Tea [A]' });
  assert.equal(second.status, 201);
  assert.equal((await request('PUT', `/${second.data._id}`, { name: 'TRÀ ĐÀO TEST', basePrice: 99000 })).status, 409);
  assert.equal((await Product.findById(second.data._id)).basePrice, 35000);
  assert.equal((await request('PUT', `/${first.data._id}`, { name: ' trà  đào TEST ', basePrice: 36000 })).status, 200);
  assert.equal((await request('PUT', `/${first.data._id}`, { name: 'Trà Đào Mới' })).status, 200);
  // Legacy products have no normalized key, but still block equivalent names.
  await Product.collection.insertOne({ name: 'Cà Phê Cũ', category: category._id, basePrice: 30000 });
  assert.equal((await request('POST', '', { ...body, name: ' CÀ PHÊ  CŨ ' })).status, 409);
  assert.equal((await request('POST', '', { ...body, name: 'Coffeeeee Tea A' })).status, 201);
  const concurrent = await Promise.all([1, 2].map(() => request('POST', '', { ...body, name: 'Concurrent Drink' })));
  assert.equal(concurrent.filter(result => result.status === 201).length, 1);
  assert.equal(concurrent.filter(result => result.status === 409).length, 1);
  assert.equal(await Product.countDocuments({ name: 'Concurrent Drink' }), 1);
  // Protect historical orders in both embedded and legacy item representations.
  await Order.collection.insertOne({ items: [{ product: new mongoose.Types.ObjectId(first.data._id) }] });
  const blocked = await request('DELETE', `/${first.data._id}`, {});
  assert.equal(blocked.status, 409);
  assert.match(blocked.data.message, /Tạm ngưng bán/);
  assert.ok(await Product.findById(first.data._id));
  await OrderItem.collection.insertOne({ product: new mongoose.Types.ObjectId(second.data._id) });
  assert.equal((await request('DELETE', `/${second.data._id}`, {})).status, 409);
  const removable = await request('POST', '', { ...body, name: 'Removable Drink' });
  const removableId = new mongoose.Types.ObjectId(removable.data._id);
  await ProductIngredient.collection.insertOne({ product: removableId, ingredient: new mongoose.Types.ObjectId(), quantityRequired: 1 });
  await Cart.create({ customer: admin._id, items: [{ product: removableId, quantity: 1 }, { product: first.data._id, quantity: 1 }] });
  assert.equal((await request('DELETE', `/${removableId}`, {})).status, 200);
  assert.equal(await Product.findById(removableId), null);
  assert.equal(await ProductIngredient.countDocuments({ product: removableId }), 0);
  assert.deepEqual((await Cart.findOne({ customer: admin._id })).items.map(item => String(item.product)), [first.data._id]);
  assert.equal((await request('DELETE', `/${removableId}`, {})).status, 404);
});
