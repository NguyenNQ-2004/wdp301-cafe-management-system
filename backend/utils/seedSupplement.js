const { createHash } = require('node:crypto');
const { ObjectId } = require('bson');

// Stable IDs make repeated runs insert nothing once these fixtures exist.
const seedId = key => new ObjectId(createHash('sha256').update(`aura-complete-seed:${key}`).digest('hex').slice(0, 24));

function supplementSnapshot(snapshot) {
  const collection = name => {
    const found = snapshot.collections.find(item => item.name === name);
    if (!found) throw new Error(`Missing seed collection: ${name}`);
    return found.documents;
  };
  const supplier = collection('suppliers')[0];
  const creator = collection('users').find(user => user.role === 'ADMIN');
  const openingDate = new Date(snapshot.exportedAt);
  const ingredients = [
    ['croissant', 'Bánh croissant thành phẩm', 'cái', 100, 10, 18000],
    ['matcha', 'Bột matcha Uji', 'g', 3000, 300, 500],
    ['chocolate', 'Bột sôcôla Bỉ', 'g', 5000, 500, 180],
    ['almond', 'Hạnh nhân lát', 'g', 2000, 200, 250]
  ];
  for (const [key, name, unit, stock, minStockLevel, unitCost] of ingredients) {
    const _id = seedId(`ingredient:${key}`);
    collection('ingredients').push({ _id, name, supplier: supplier._id, unit, isActive: true,
      currentStock: stock, minStockLevel, lotsVersion: 0,
      stockLots: [{ _id: seedId(`lot:${key}`), sourceType: 'OPENING', sourceId: `SEED-OPENING-${key}`,
        receivedAt: openingDate, quantity: stock, remainingQuantity: stock, unitCost }] });
    collection('inventorytransactions').push({ _id: seedId(`inventory:${key}`), ingredient: _id,
      transactionType: 'ADJUSTMENT', quantity: stock, stockBefore: 0, stockAfter: stock, stockDelta: stock,
      unitBefore: unit, unitAfter: unit, referenceType: 'ADJUSTMENT',
      note: 'SEED: tồn đầu kỳ cho nguyên liệu bổ sung', createdBy: creator._id,
      valueBefore: 0, valueAfter: stock * unitCost, costTotal: stock * unitCost,
      createdAt: openingDate, updatedAt: openingDate });
  }
  const freshMilk = collection('ingredients').find(item => String(item._id) === '6aeb673031b031ff6bfab964');
  const recipes = [
    ['6aeb673031b031ff6bfab959', [[seedId('ingredient:croissant'), 1]]],
    ['6aeb673031b031ff6bfab95a', [[seedId('ingredient:matcha'), 8], [freshMilk._id, 150]]],
    ['6aeb673031b031ff6bfab95e', [[seedId('ingredient:chocolate'), 25], [seedId('ingredient:almond'), 5], [freshMilk._id, 120]]]
  ];
  for (const [productId, lines] of recipes) {
    const product = collection('products').find(item => String(item._id) === productId);
    for (const [ingredient, quantityRequired] of lines) {
      collection('productingredients').push({ _id: seedId(`recipe:${productId}:${ingredient}`),
        product: product._id, ingredient, quantityRequired, createdAt: openingDate, updatedAt: openingDate });
    }
  }
  return snapshot;
}

module.exports = { supplementSnapshot };
