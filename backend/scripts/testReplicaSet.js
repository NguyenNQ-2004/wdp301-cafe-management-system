// Isolated replica-set test runner. Never reconfigures or seeds the user's DB.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const mongoose = require('mongoose');

async function main() {
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aura-code-test-'));
  const binary = process.env.MONGOD_BINARY || (process.platform === 'win32' ? 'C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe' : 'mongod');
  const mongo = spawn(binary, ['--dbpath', dbPath, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', 'auraTest', '--quiet'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let startupError;
  mongo.on('error', error => { startupError = error; });
  let diagnostics = '';
  mongo.stderr.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-2000); });
  try {
    const uri = `mongodb://127.0.0.1:${port}/aura_isolated_test?directConnection=true`;
    let client;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (startupError) throw startupError;
      try { client = await new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 500 }).connect(); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    if (!client) throw new Error(`Could not start isolated MongoDB. ${diagnostics}`);
    try {
      await client.db('admin').command({ replSetInitiate: { _id: 'auraTest', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
      let primary = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if ((await client.db('admin').command({ hello: 1 })).isWritablePrimary) { primary = true; break; }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (!primary) throw new Error('Isolated replica set did not elect a primary');
    } finally { await client.close(); }
    const files = process.argv.slice(2);
    const selected = files.length ? files : fs.readdirSync(path.join(__dirname, '../tests')).filter(name => name.endsWith('.test.js')).map(name => `tests/${name}`);
    console.log('Running tests against a fresh isolated replica set; application database untouched.');
    const child = spawn(process.execPath, ['--test', '--test-concurrency=4', ...selected], { cwd: path.join(__dirname, '..'), windowsHide: true, stdio: 'inherit', env: { ...process.env, MONGO_URI: `mongodb://127.0.0.1:${port}/aura_isolated_test?replicaSet=auraTest` } });
    process.exitCode = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)); });
  } finally {
    // Ask the isolated process to shut down; retain its private files for diagnostics.
    if (mongo.exitCode === null) {
      mongo.kill();
      await new Promise(resolve => { if (mongo.exitCode !== null) resolve(); else mongo.once('exit', resolve); });
    }
    console.log(`Isolated test files retained at ${dbPath}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
