const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { EJSON } = require('bson');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

test('seed restores the exported records, BSON references and indexes in an isolated database', async () => {
  const root = path.join(__dirname, '..');
  const snapshot = require('../seed').getSnapshot();
  assert.ok(!snapshot.collections.some(item => item.name === 'passwordrecoveries'));
  assert.ok(snapshot.collections.find(item => item.name === 'users').documents.every(user => !Object.hasOwn(user, 'passwordHash')));
  const name = `aura_seed_verify_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const uri = new URL(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp');
  uri.pathname = `/${name}`;
  const connection = await mongoose.createConnection(uri.toString()).asPromise();
  try {
    const password = randomBytes(16).toString('hex') + 'A1';
    const result = spawnSync(process.execPath, ['seed.js'], { cwd: root, encoding: 'utf8', timeout: 60000,
      env: { ...process.env, MONGO_URI: uri.toString(), NODE_ENV: 'test', ALLOW_DESTRUCTIVE_SEED: 'true', SEED_USER_PASSWORD: password } });
    assert.equal(result.status, 0, result.stderr);
    for (const item of snapshot.collections) {
      const actual = await connection.db.collection(item.name).find({}).sort({ _id: 1 }).toArray();
      assert.equal(actual.length, item.documents.length, item.name);
      if (item.name === 'users') {
        for (const user of actual) {
          assert.equal(await bcrypt.compare(password, user.passwordHash), true);
          delete user.passwordHash;
        }
      }
      // Compare canonical BSON values, including IDs, dates and embedded references.
      const canonical = value => {
        const json = EJSON.serialize(value, { relaxed: false });
        const sort = node => Array.isArray(node) ? node.map(sort) : node && typeof node === 'object' ? Object.fromEntries(Object.keys(node).sort().map(key => [key, sort(node[key])])) : node;
        return sort(json);
      };
      assert.deepEqual(canonical(actual), canonical(item.documents), item.name);
      const indexes = await connection.db.collection(item.name).indexes();
      for (const index of item.indexes) {
        const actualIndex = indexes.find(candidate => candidate.name === index.name);
        assert.ok(actualIndex, `${item.name}/${index.name}`);
        for (const [key, value] of Object.entries(index)) assert.deepEqual(actualIndex[key], value);
      }
    }
    assert.equal(await connection.db.collection('passwordrecoveries').countDocuments(), 0);
  } finally {
    assert.equal(connection.name, name);
    assert.ok(name.startsWith('aura_seed_verify_'));
    await connection.dropDatabase();
    await connection.close();
  }
});
