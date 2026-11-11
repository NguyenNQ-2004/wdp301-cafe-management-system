// Start a persistent local replica set and copy the existing standalone cafe DB once.
// The source database is never modified or deleted.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { MongoClient } = require('mongodb');

const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
const localDir = path.join(backendDir, '.local');
const dataDir = path.join(localDir, 'mongo-data');
const logPath = path.join(localDir, 'mongod.log');
const markerPath = path.join(localDir, 'replica-migration.json');
const port = 27019;
const replicaSet = 'auraCafeLocal';
const targetUri = `mongodb://127.0.0.1:${port}/aura_cafe_erp?replicaSet=${replicaSet}`;

function findMongod() {
  if (process.env.MONGOD_BINARY) return process.env.MONGOD_BINARY;
  const versionsDir = 'C:/Program Files/MongoDB/Server';
  if (process.platform === 'win32' && fs.existsSync(versionsDir)) {
    const versions = fs.readdirSync(versionsDir).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const version of versions) {
      const binary = path.join(versionsDir, version, 'bin', 'mongod.exe');
      if (fs.existsSync(binary)) return binary;
    }
  }
  return 'mongod';
}

async function connect(uri, timeout = 1500) {
  return new MongoClient(uri, { serverSelectionTimeoutMS: timeout }).connect();
}

async function startReplica() {
  let client;
  try { client = await connect(`mongodb://127.0.0.1:${port}/?directConnection=true`); }
  catch {
    fs.mkdirSync(dataDir, { recursive: true });
    const child = spawn(findMongod(), ['--dbpath', dataDir, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', replicaSet, '--logpath', logPath, '--logappend'], { detached: true, windowsHide: true, stdio: 'ignore' });
    child.on('error', error => { console.error(`Could not launch mongod: ${error.message}`); });
    child.unref();
    for (let attempt = 0; attempt < 40 && !client; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      try { client = await connect(`mongodb://127.0.0.1:${port}/?directConnection=true`, 500); } catch { /* startup */ }
    }
    if (!client) throw new Error(`Could not start local MongoDB. Check ${logPath}`);
  }
  const hello = await client.db('admin').command({ hello: 1 });
  if (hello.setName && hello.setName !== replicaSet) throw new Error(`Port ${port} belongs to another replica set.`);
  if (!hello.setName) {
    await client.db('admin').command({ replSetInitiate: { _id: replicaSet, members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
  }
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await client.db('admin').command({ hello: 1 })).isWritablePrimary) return client;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  await client.close();
  throw new Error('Local replica set did not elect a primary.');
}

async function copyDatabase(sourceUri, target) {
  const source = await connect(sourceUri, 5000);
  try {
    const sourceDb = source.db('aura_cafe_erp');
    const targetDb = target.db('aura_cafe_erp');
    const existing = await targetDb.listCollections().toArray();
    if (existing.length) throw new Error('Target already contains data without a migration marker; refusing to overwrite it.');
    const collections = await sourceDb.listCollections().toArray();
    let documents = 0;
    for (const collection of collections) {
      if (collection.name.startsWith('system.')) continue;
      await targetDb.createCollection(collection.name, collection.options || {});
      const from = sourceDb.collection(collection.name);
      const to = targetDb.collection(collection.name);
      let batch = [];
      for await (const document of from.find({})) {
        batch.push(document);
        if (batch.length === 500) { await to.insertMany(batch); documents += batch.length; batch = []; }
      }
      if (batch.length) { await to.insertMany(batch); documents += batch.length; }
      const indexes = (await from.listIndexes().toArray()).filter(index => index.name !== '_id_').map(index => {
        const { key, name, unique, sparse, expireAfterSeconds, partialFilterExpression, collation, weights, default_language, language_override } = index;
        return { key, name, ...(unique ? { unique } : {}), ...(sparse ? { sparse } : {}), ...(expireAfterSeconds != null ? { expireAfterSeconds } : {}), ...(partialFilterExpression ? { partialFilterExpression } : {}), ...(collation ? { collation } : {}), ...(weights ? { weights } : {}), ...(default_language ? { default_language } : {}), ...(language_override ? { language_override } : {}) };
      });
      if (indexes.length) await to.createIndexes(indexes);
      if (await from.countDocuments() !== await to.countDocuments()) throw new Error(`Copy count mismatch: ${collection.name}`);
    }
    fs.writeFileSync(markerPath, JSON.stringify({ source: sourceUri.replace(/\/\/[^@]+@/, '//***@'), collectionCount: collections.length, documents, copiedAt: new Date().toISOString() }, null, 2));
    console.log(`Copied ${documents} documents in ${collections.length} collections; source database untouched.`);
  } finally { await source.close(); }
}

async function main() {
  if (!fs.existsSync(envPath)) throw new Error('backend/.env is missing.');
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(/^MONGO_URI=(.+)$/m);
  if (!match) throw new Error('MONGO_URI is missing from backend/.env.');
  const sourceUri = match[1].trim();
  if (sourceUri !== targetUri && !/^mongodb:\/\/(localhost|127\.0\.0\.1):27017\/aura_cafe_erp(?:\?.*)?$/.test(sourceUri)) throw new Error('Only the local standalone cafe database can be copied automatically.');
  fs.mkdirSync(localDir, { recursive: true });
  const target = await startReplica();
  try {
    if (!fs.existsSync(markerPath)) {
      if (sourceUri === targetUri) {
        const existing = await target.db('aura_cafe_erp').listCollections().toArray();
        if (existing.length) throw new Error('The target contains data but has no migration marker; refusing to guess its origin.');
        fs.writeFileSync(markerPath, JSON.stringify({ source: null, collectionCount: 0, documents: 0, createdAt: new Date().toISOString() }, null, 2));
        console.log('Created a fresh local replica set database. Run seed.js if sample data is needed.');
      } else {
        await copyDatabase(sourceUri, target);
      }
    }
    if (sourceUri !== targetUri) fs.writeFileSync(envPath, env.replace(/^MONGO_URI=.+$/m, `MONGO_URI=${targetUri}`));
    console.log(`Replica set ready at ${targetUri}. Restart the backend to use it.`);
  } finally { await target.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
