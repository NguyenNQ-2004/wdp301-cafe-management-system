const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const { ObjectId } = require('bson');
const bcrypt = require('bcryptjs');
const { getSnapshot } = require('../seed');
const { mergeSnapshot, legacyEncoding, decodeLegacyText } = require('../utils/seedMerge');
const { supplementSnapshot } = require('../utils/seedSupplement');

test('encoding recovery preserves wording and ignores normal Unicode and box drawing', () => {
  const value = 'Ghi chú khách tự sửa: trà đào thêm sữa';
  assert.equal(decodeLegacyText(legacyEncoding(value)), value);
  assert.equal(decodeLegacyText(value), value);
  assert.equal(decodeLegacyText('├── Bảng dữ liệu ──┤'), '├── Bảng dữ liệu ──┤');
});

test('additive seed restores missing data atomically and preserves existing business data', async t => {
  const name = `aura_seed_merge_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const uri = new URL(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp');
  uri.pathname = `/${name}`;
  const password = `Seed${randomBytes(16).toString('hex')}!`;
  await mongoose.connect(uri.toString(), { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  const snapshot = () => supplementSnapshot(getSnapshot());
  const counts = async () => Object.fromEntries(await Promise.all(snapshot().collections.map(async item => [item.name, await db.collection(item.name).countDocuments()])));
  try {
    await t.test('dry run leaves an empty database untouched', async () => {
      const result = await mergeSnapshot(db, snapshot(), { dryRun: true, password });
      assert.ok(result.inserted > 200);
      assert.equal((await db.listCollections().toArray()).length, 0);
    });

    await t.test('a fresh database has complete menu recipes and opening stock lots', async () => {
      const result = await mergeSnapshot(db, snapshot(), { password });
      assert.ok(result.inserted > 200);
      const products = await db.collection('products').find({}).toArray();
      assert.equal(products.length, 12);
      for (const product of products) {
        assert.ok(product.recipe.length, `missing recipe for ${product.name}`);
        const lines = await db.collection('productingredients').find({ product: product._id }).toArray();
        assert.deepEqual(product.recipe.map(line => `${line.ingredient}:${line.quantityRequired}`).sort(),
          lines.map(line => `${line.ingredient}:${line.quantityRequired}`).sort());
        for (const line of lines) assert.ok(await db.collection('ingredients').findOne({ _id: line.ingredient }));
      }
      for (const ingredient of await db.collection('ingredients').find({ name: { $in: ['Bột matcha Uji', 'Bột sôcôla Bỉ', 'Hạnh nhân lát', 'Bánh croissant thành phẩm'] } }).toArray()) {
        assert.equal(ingredient.currentStock, ingredient.stockLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0));
        assert.ok(ingredient.stockLots.every(lot => lot.unitCost > 0));
      }
      const user = await db.collection('users').findOne({});
      assert.ok(await bcrypt.compare(password, user.passwordHash));
    });

    await t.test('missing records return without resetting passwords, points, stock or edited fields', async () => {
      const original = getSnapshot();
      const user = original.collections.find(item => item.name === 'users').documents[0];
      const ingredient = original.collections.find(item => item.name === 'ingredients').documents[0];
      const category = original.collections.find(item => item.name === 'categories').documents[0];
      const product = original.collections.find(item => item.name === 'products').documents[0];
      await db.collection('users').updateOne({ _id: user._id }, { $set: { totalPoints: 777, fullName: 'Tên khách đã chỉnh sửa', passwordHash: 'existing-password-hash' } });
      await db.collection('ingredients').updateOne({ _id: ingredient._id }, { $set: { currentStock: 4321 } });
      await db.collection('products').updateOne({ _id: product._id }, { $set: { basePrice: 67890 } });
      await db.collection('categories').updateOne({ _id: category._id }, { $set: { name: legacyEncoding(category.name) } });
      const schedule = await db.collection('workschedules').findOne({});
      await db.collection('workschedules').updateOne({ _id: schedule._id }, { $set: { note: legacyEncoding('Ghi chú ca đã chỉnh sửa') } });
      // Additional live records must survive too.
      const extra = { _id: new ObjectId(), phone: '0999999988', fullName: 'Khách mới', role: 'CUSTOMER', passwordHash: 'untouched' };
      await db.collection('users').insertOne(extra);
      const removed = original.collections.find(item => item.name === 'orders').documents.at(-1);
      await db.collection('orders').deleteOne({ _id: removed._id });
      const before = await counts();
      const preview = await mergeSnapshot(db, snapshot(), { dryRun: true, password });
      assert.equal(preview.inserted, 1);
      assert.equal(preview.repairedTextFields, 2);
      assert.deepEqual(await counts(), before);
      const result = await mergeSnapshot(db, snapshot(), { password });
      assert.equal(result.inserted, 1);
      assert.deepEqual(await db.collection('orders').findOne({ _id: removed._id }), removed);
      const retained = await db.collection('users').findOne({ _id: user._id });
      assert.equal(retained.passwordHash, 'existing-password-hash');
      assert.equal(retained.totalPoints, 777);
      assert.equal(retained.fullName, 'Tên khách đã chỉnh sửa');
      assert.equal((await db.collection('ingredients').findOne({ _id: ingredient._id })).currentStock, 4321);
      assert.equal((await db.collection('products').findOne({ _id: product._id })).basePrice, 67890);
      assert.equal((await db.collection('categories').findOne({ _id: category._id })).name, category.name);
      assert.equal((await db.collection('workschedules').findOne({ _id: schedule._id })).note, 'Ghi chú ca đã chỉnh sửa');
      assert.deepEqual(await db.collection('users').findOne({ _id: extra._id }), extra);
    });

    await t.test('repeated execution inserts nothing and repairs nothing', async () => {
      const result = await mergeSnapshot(db, snapshot(), { password });
      assert.equal(result.inserted, 0);
      assert.equal(result.repairedTextFields, 0);
      assert.equal(result.synchronizedRecipes, 0);
    });

    await t.test('restoring a recipe row keeps live quantities and custom products', async () => {
      const line = await db.collection('productingredients').findOne({});
      await db.collection('productingredients').deleteOne({ _id: line._id });
      await db.collection('products').updateOne({ _id: line.product }, { $set: { 'recipe.$[line].quantityRequired': 42 } },
        { arrayFilters: [{ 'line.ingredient': line.ingredient }] });
      const custom = { _id: new ObjectId(), name: 'Món riêng của quán', recipe: [{ ingredient: line.ingredient, quantityRequired: 7 }] };
      await db.collection('products').insertOne(custom);
      const result = await mergeSnapshot(db, snapshot(), { password });
      assert.equal(result.inserted, 1);
      assert.equal((await db.collection('productingredients').findOne({ _id: line._id })).quantityRequired, 42);
      assert.deepEqual(await db.collection('products').findOne({ _id: custom._id }), custom);
    });

    await t.test('a broken nested reference rejects the entire change', async () => {
      const before = await counts();
      const broken = snapshot();
      const order = broken.collections.find(item => item.name === 'orders').documents.at(-1);
      order._id = new ObjectId();
      order.orderCode = 'SEED-INVALID-REFERENCE';
      order.items[0].product = new ObjectId();
      await assert.rejects(mergeSnapshot(db, broken, { password }), /Broken seed reference/);
      assert.deepEqual(await counts(), before);
    });

    await t.test('a unique conflict rolls back earlier collection inserts', async () => {
      const before = await counts();
      const conflict = snapshot();
      conflict.collections.find(item => item.name === 'categories').documents.push({ _id: new ObjectId(), name: 'Seed rollback category' });
      const existing = conflict.collections.find(item => item.name === 'orders').documents[0];
      conflict.collections.find(item => item.name === 'orders').documents.push({ ...existing, _id: new ObjectId() });
      await assert.rejects(mergeSnapshot(db, conflict, { password }), error => error.code === 11000);
      assert.deepEqual(await counts(), before);
      assert.equal(await db.collection('categories').countDocuments({ name: 'Seed rollback category' }), 0);
    });
  } finally {
    assert.equal(mongoose.connection.name, name);
    assert.ok(name.startsWith('aura_seed_merge_'));
    await db.dropDatabase();
    await mongoose.disconnect();
  }
});
