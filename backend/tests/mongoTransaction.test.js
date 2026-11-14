const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomBytes } = require('crypto');
require('dotenv').config();

const { checkReplicaSet, resetReplicaSetCheck, runWithTransaction } = require('../utils/mongoTransaction');

test('mongoTransaction utility: real sessions, rollback and fail-closed standalone behavior', async (t) => {
  const dbName = `aura_tx_test_${randomBytes(5).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });

  t.after(async () => {
    assert.match(mongoose.connection.db.databaseName, /^aura_tx_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  resetReplicaSetCheck();

  // 1. Check replica set detection
  const isReplica = await checkReplicaSet();
  assert.equal(typeof isReplica, 'boolean');
  if (!isReplica) {
    let executed = false;
    await assert.rejects(runWithTransaction(async () => { executed = true; }), error => error.status === 503);
    assert.equal(executed, false);
    return;
  }

  // 2. Successful operation execution
  const result = await runWithTransaction(async (session) => {
    return { success: true, sessionUsed: !!session };
  });
  assert.equal(result.success, true);
  assert.equal(result.sessionUsed, true);

  // 3. Compensating rollback execution when error occurs on standalone
  let rollbackCalled = false;
  let caughtError = null;

  try {
    await runWithTransaction(
      async () => {
        throw new Error('Cố ý gây lỗi giao dịch');
      },
      {
        rollback: async () => {
          rollbackCalled = true;
        }
      }
    );
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError);
  assert.equal(caughtError.message, 'Cố ý gây lỗi giao dịch');
  if (!isReplica) {
    assert.equal(rollbackCalled, true);
  }
});
