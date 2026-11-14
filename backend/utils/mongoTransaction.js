const mongoose = require('mongoose');

mongoose.set('transactionAsyncLocalStorage', true);

/**
 * Checks whether the active MongoDB connection belongs to a replica set
 * and therefore supports multi-document transactions.
 */
async function checkReplicaSet() {
  if (!mongoose.connection.db) return false;
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  return !!(hello.setName || hello.msg === 'isdbgrid') && hello.logicalSessionTimeoutMinutes != null;
}

/**
 * Reset cached check (useful for tests switching databases)
 */
function resetReplicaSetCheck() {
  // No cached capability: reconnecting must not retain another server's result.
}

/**
 * Runs critical writes in a real transaction. Nested helpers join the same session.
 * Unsupported infrastructure fails before the operation; compensation is not atomicity.
 *
 * @param {Function} operation - async (session) => Promise<any>
 * @returns {Promise<any>}
 */
async function runWithTransaction(operation) {
  const active = mongoose.transactionAsyncLocalStorage.getStore()?.session;
  if (active) return operation(active);
  if (!await checkReplicaSet()) throw Object.assign(new Error('Thao tác này cần MongoDB replica set để bảo đảm dữ liệu. Chưa có thay đổi nào được lưu.'), { status: 503 });
  return mongoose.connection.transaction(operation, {
    readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }
  });
}

module.exports = {
  checkReplicaSet,
  resetReplicaSetCheck,
  runWithTransaction
};
