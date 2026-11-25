const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isDeepStrictEqual } = require('node:util');
const { passwordError } = require('./passwordPolicy');
const { productNameKey } = require('./productName');
const { runWithTransaction, checkReplicaSet } = require('./mongoTransaction');

for (const filename of fs.readdirSync(path.join(__dirname, '..', 'models'))) {
  if (filename.endsWith('.js')) require(path.join(__dirname, '..', 'models', filename));
}

// The original local import decoded UTF-8 bytes as DOS code page 437.
// Only repair an exact encoding of a known seed string, preserving edited text.
const cp437 = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
const legacyEncoding = value => [...Buffer.from(value, 'utf8')].map(byte => byte < 128 ? String.fromCharCode(byte) : cp437[byte - 128]).join('');
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;

function decodeLegacyText(value) {
  if (!/[\u2500-\u259f]/u.test(value)) return value;
  const bytes = [];
  for (const char of value) {
    const code = char.codePointAt(0);
    const index = cp437.indexOf(char);
    if (code >= 128 && index < 0) return value;
    bytes.push(code < 128 ? code : index + 128);
  }
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
    return legacyEncoding(decoded) === value ? decoded : value;
  } catch { return value; }
}

function reversibleTextRepairs(value, prefix = '', changes = {}) {
  if (typeof value === 'string') {
    const decoded = decodeLegacyText(value);
    if (decoded !== value) changes[prefix] = decoded;
  } else if (Array.isArray(value) || plain(value)) {
    for (const [key, item] of Object.entries(value)) reversibleTextRepairs(item, prefix ? `${prefix}.${key}` : key, changes);
  }
  return changes;
}

function textRepairs(expected, actual, prefix = '', changes = {}) {
  for (const [key, value] of Object.entries(expected)) {
    const field = prefix ? `${prefix}.${key}` : key;
    const current = actual?.[key];
    if (typeof value === 'string' && current !== value && current === legacyEncoding(value)) changes[field] = value;
    else if (plain(value) && plain(current)) textRepairs(value, current, field, changes);
    else if (Array.isArray(value) && Array.isArray(current)) {
      for (const [index, item] of value.entries()) {
        if (typeof item === 'string' && current[index] !== item && current[index] === legacyEncoding(item)) changes[`${field}.${index}`] = item;
        else if (plain(item) && plain(current[index])) {
          // An edited/reordered array must not have text copied from another item.
          if (item._id && String(item._id) !== String(current[index]._id)) continue;
          if (item.product && String(item.product) !== String(current[index].product)) continue;
          textRepairs(item, current[index], `${field}.${index}`, changes);
        }
      }
    }
  }
  return changes;
}

function references(schema, document, prefix = '') {
  const found = [];
  schema.eachPath((field, type) => {
    const value = field.split('.').reduce((value, key) => value?.[key], document);
    if (value == null) return;
    if (type.schema) {
      for (const [index, item] of (Array.isArray(value) ? value : [value]).entries()) {
        found.push(...references(type.schema, item, `${prefix}${field}.${index}.`));
      }
    } else if (type.options.ref) {
      for (const id of (Array.isArray(value) ? value : [value])) {
        found.push({ field: `${prefix}${field}`, collection: mongoose.models[type.options.ref].collection.name, id: String(id) });
      }
    }
  });
  return found;
}

async function buildPlan(db, snapshot, { session, repairEncoding, password }) {
  const models = new Map(Object.values(mongoose.models).map(model => [model.collection.name, model]));
  const state = new Map();
  const plan = { inserts: [], updates: [], summary: {}, repairedTextFields: 0, synchronizedRecipes: 0 };
  const liveProducts = new Map((await db.collection('products').find({}, { session }).toArray()).map(product => [String(product._id), product]));
  let passwordHash;
  for (const item of snapshot.collections) {
    if (item.name === 'passwordrecoveries') throw new Error('Recovery tokens cannot be seeded.');
    const live = await db.collection(item.name).find({}, { session }).toArray();
    const byId = new Map(live.map(document => [String(document._id), document]));
    const missing = [];
    plan.summary[item.name] = 0;
    for (const document of item.documents) {
      const existing = byId.get(String(document._id));
      if (!existing) {
        if (item.name === 'productingredients') {
          const embedded = liveProducts.get(String(document.product))?.recipe?.find(line => String(line.ingredient) === String(document.ingredient));
          if (embedded) document.quantityRequired = embedded.quantityRequired;
        }
        if (item.name === 'users') {
          passwordHash ||= await bcrypt.hash(password, 10);
          document.passwordHash = passwordHash;
        }
        missing.push(document);
        byId.set(String(document._id), document);
        plan.summary[item.name]++;
      } else if (repairEncoding) {
        const changes = textRepairs(document, existing);
        plan.repairedTextFields += Object.keys(changes).length;
        if (item.name === 'products' && changes.name) changes.nameKey = productNameKey(changes.name);
        if (Object.keys(changes).length) plan.updates.push({ collection: item.name, _id: existing._id, changes });
      }
    }
    if (repairEncoding) for (const document of live) {
      // Also recover edited/new text when the byte-level round trip proves
      // this same import encoding error; no original wording is substituted.
      const recovered = reversibleTextRepairs(document);
      const update = plan.updates.find(update => update.collection === item.name && String(update._id) === String(document._id));
      const changes = update?.changes || {};
      for (const [field, value] of Object.entries(recovered)) {
        if (!Object.hasOwn(changes, field)) { changes[field] = value; plan.repairedTextFields++; }
      }
      if (item.name === 'products' && (changes.name || changes.nameKey)) changes.nameKey = productNameKey(changes.name || document.name);
      if (!update && Object.keys(changes).length) plan.updates.push({ collection: item.name, _id: document._id, changes });
    }
    if (missing.length) plan.inserts.push({ collection: item.name, documents: missing });
    state.set(item.name, byId);
  }

  // ProductIngredient is the recipe source used by checkout. Fill embedded
  // recipes from it, retaining live quantities rather than copying old values.
  const linesByProduct = new Map();
  for (const line of state.get('productingredients').values()) {
    const key = String(line.product);
    if (!linesByProduct.has(key)) linesByProduct.set(key, []);
    linesByProduct.get(key).push({ ingredient: line.ingredient, quantityRequired: line.quantityRequired });
  }
  const recipeValues = lines => lines.map(line => `${line.ingredient}:${line.quantityRequired}`).sort();
  const seededProducts = new Set(snapshot.collections.find(item => item.name === 'products').documents.map(product => String(product._id)));
  for (const product of state.get('products').values()) {
    if (!seededProducts.has(String(product._id))) continue;
    const lines = linesByProduct.get(String(product._id)) || [];
    // Retain custom embedded ingredients too; never erase a user's recipe.
    for (const embedded of product.recipe || []) {
      if (lines.some(line => String(line.ingredient) === String(embedded.ingredient))) continue;
      const document = { _id: new mongoose.Types.ObjectId(), product: product._id,
        ingredient: embedded.ingredient, quantityRequired: embedded.quantityRequired };
      let batch = plan.inserts.find(batch => batch.collection === 'productingredients');
      if (!batch) { batch = { collection: 'productingredients', documents: [] }; plan.inserts.push(batch); }
      batch.documents.push(document);
      state.get('productingredients').set(String(document._id), document);
      plan.summary.productingredients++;
      lines.push({ ingredient: document.ingredient, quantityRequired: document.quantityRequired });
    }
    if (!isDeepStrictEqual(recipeValues(product.recipe || []), recipeValues(lines))) {
      plan.updates.push({ collection: 'products', _id: product._id, changes: { recipe: lines } });
      plan.synchronizedRecipes++;
    }
  }

  // Check all new references against the final union, including nested lines.
  for (const batch of plan.inserts) {
    const Model = models.get(batch.collection);
    for (const document of batch.documents) {
      if (Model) {
        await new Model(document).validate();
        for (const reference of references(Model.schema, document)) {
          if (!state.get(reference.collection)?.has(reference.id)) {
            throw new Error(`Broken seed reference: ${batch.collection}/${document._id}/${reference.field}`);
          }
        }
      }
      if (batch.collection === 'inventorytransactions' && document.referenceId) {
        const target = { ORDER: 'orders', PURCHASE_ORDER: 'purchaseorders' }[document.referenceType];
        if (target && !state.get(target)?.has(String(document.referenceId))) throw new Error(`Broken inventory reference: ${document._id}`);
      }
    }
  }
  // Restoring history must never reapply stock deductions or loyalty changes.
  return plan;
}

async function mergeSnapshot(db, snapshot, { dryRun = false, repairEncoding = true,
  password = process.env.SEED_USER_PASSWORD || 'AuraCafe123!' } = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Seed is restricted to development databases.');
  if (passwordError(password)) throw new Error(`SEED_USER_PASSWORD: ${passwordError(password)}`);
  if (!dryRun && !await checkReplicaSet()) throw new Error('Additive seed requires a MongoDB replica set; no records were changed.');
  const known = new Set((await db.listCollections().toArray()).map(item => item.name));
  // Collections/indexes are created only when absent; live indexes are retained.
  if (!dryRun) for (const item of snapshot.collections) {
    if (known.has(item.name)) continue;
    await db.createCollection(item.name);
    for (const index of item.indexes) {
      const { key, ...options } = index;
      await db.collection(item.name).createIndex(key, options);
    }
  }
  const execute = async session => {
    const plan = await buildPlan(db, snapshot, { session, repairEncoding, password });
    if (!dryRun) {
      for (const batch of plan.inserts) await db.collection(batch.collection).insertMany(batch.documents, { session });
      for (const update of plan.updates) {
        await db.collection(update.collection).updateOne({ _id: update._id }, { $set: update.changes }, { session });
      }
    }
    return { dryRun, inserted: Object.values(plan.summary).reduce((sum, count) => sum + count, 0),
      insertedByCollection: plan.summary, repairedTextFields: plan.repairedTextFields,
      synchronizedRecipes: plan.synchronizedRecipes };
  };
  return dryRun ? execute() : runWithTransaction(execute);
}

module.exports = { mergeSnapshot, legacyEncoding, decodeLegacyText };
