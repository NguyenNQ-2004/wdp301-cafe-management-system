const { createHash } = require('node:crypto');
const { ObjectId } = require('bson');

// Stable IDs make repeated runs insert nothing once these fixtures exist.
const seedId = key => new ObjectId(createHash('sha256').update(`aura-complete-seed:${key}`).digest('hex').slice(0, 24));

function supplementSnapshot(snapshot, { staffSchedulesOnly = false } = {}) {
  const fixtureIds = {
    users: new Set(),
    workshifts: new Set(),
    workschedules: new Set()
  };
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

  // Fixed rota around 2026-11-25: completed history and scheduled current shifts.
  // Stable IDs let additive seed preserve attendance and staff edits on later runs.
  const staffFixtures = [
    ['cashier-ha', 'Lê Thu Hà', '0987000101', 'aura.cashier.ha.demo@gmail.com', 'CASHIER', 7200000],
    ['cashier-chau', 'Phạm Minh Châu', '0987000102', 'aura.cashier.chau.demo@gmail.com', 'CASHIER', 7200000],
    ['barista-son', 'Võ Hồng Sơn', '0987000103', 'aura.barista.son.demo@gmail.com', 'BARISTA', 7600000],
    ['barista-linh', 'Đỗ Khánh Linh', '0987000104', 'aura.barista.linh.demo@gmail.com', 'BARISTA', 7600000],
    ['shipper-long', 'Trần Đức Long', '0987000105', 'aura.shipper.long.demo@gmail.com', 'SHIPPER', 7000000],
    ['shipper-phuc', 'Nguyễn Hữu Phúc', '0987000106', 'aura.shipper.phuc.demo@gmail.com', 'SHIPPER', 7000000]
  ];
  for (const [key, fullName, phone, email, position, baseSalary] of staffFixtures) {
    fixtureIds.users.add(String(seedId(`staff:${key}`)));
    collection('users').push({
      _id: seedId(`staff:${key}`), fullName, phone, email, emailKey: email,
      role: 'STAFF', position, status: 'ACTIVE', baseSalary,
      hireDate: new Date('2026-10-01T00:00:00.000Z'),
      totalPoints: 0, createdAt: new Date('2026-10-01T00:00:00.000Z'),
      updatedAt: new Date('2026-10-01T00:00:00.000Z')
    });
  }

  const staffByPhone = phone => {
    const user = collection('users').find(item => item.phone === phone);
    if (!user) throw new Error(`Missing seed staff: ${phone}`);
    return user._id;
  };
  const teams = [
    [staffByPhone('0900000003'), staffByPhone('099898989'), staffByPhone('0987000101'), staffByPhone('0987000102')],
    [staffByPhone('0900000002'), staffByPhone('0987000103'), staffByPhone('0987000104')],
    [staffByPhone('0900000006'), staffByPhone('09999999999'), staffByPhone('0987000105'), staffByPhone('0987000106')]
  ];
  const shiftDefinitions = [
    { name: 'Ca sáng', start: '07:00', end: '15:00' },
    { name: 'Ca tối', start: '15:00', end: '22:30' }
  ];
  const workDays = Array.from({ length: 14 }, (_, day) => new Date(Date.UTC(2026, 10, 16 + day)));
  const shiftIds = new Map();
  for (const week of ['2026-11-16', '2026-11-23']) {
    for (const definition of shiftDefinitions) {
      const _id = seedId(`workshift:${week}:${definition.name}`);
      fixtureIds.workshifts.add(String(_id));
      shiftIds.set(`${week}:${definition.name}`, _id);
      collection('workshifts').push({
        _id, weekStart: new Date(`${week}T00:00:00.000Z`), shiftName: definition.name,
        startTime: definition.start, endTime: definition.end,
        createdAt: openingDate, updatedAt: openingDate
      });
    }
  }
  for (const [dayIndex, workDate] of workDays.entries()) {
    const date = workDate.toISOString().slice(0, 10);
    const week = dayIndex < 7 ? '2026-11-16' : '2026-11-23';
    const completed = date <= '2026-11-24';
    for (const [shiftIndex, definition] of shiftDefinitions.entries()) {
      for (const [teamIndex, team] of teams.entries()) {
        const user = team[(dayIndex * 2 + shiftIndex) % team.length];
        const start = new Date(`${date}T${definition.start}:00+07:00`);
        const end = new Date(`${date}T${definition.end}:00+07:00`);
        const arrivalMinutes = [-4, 2, -2, 1][(dayIndex + shiftIndex + teamIndex) % 4];
        const departureMinutes = [3, -2, 5, 0][(dayIndex + shiftIndex + teamIndex) % 4];
        const _id = seedId(`schedule:${date}:${definition.name}:${user}`);
        fixtureIds.workschedules.add(String(_id));
        collection('workschedules').push({
          _id, user, workDate,
          shiftName: definition.name, shift: shiftIds.get(`${week}:${definition.name}`),
          shiftStartTime: definition.start, shiftEndTime: definition.end,
          status: completed ? 'COMPLETED' : 'SCHEDULED',
          ...(completed ? {
            checkInTime: new Date(start.getTime() + arrivalMinutes * 60000),
            checkOutTime: new Date(end.getTime() + departureMinutes * 60000)
          } : {}),
          note: completed ? 'Lịch và chấm công mẫu' : 'Lịch phân ca mẫu',
          createdAt: openingDate, updatedAt: completed ? end : openingDate
        });
      }
    }
  }
  if (!staffSchedulesOnly) require('./seedDemoFlows').addDemoFlowFixtures(snapshot);
  // The same fixtures may already be embedded in seed.js. Keep each stable ID once.
  for (const item of snapshot.collections) {
    const seen = new Set();
    item.documents = item.documents.filter(document => {
      const id = String(document._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  if (staffSchedulesOnly) {
    for (const item of snapshot.collections) {
      item.documents = item.documents.filter(document => fixtureIds[item.name]?.has(String(document._id)));
    }
  }
  return snapshot;
}

module.exports = { supplementSnapshot };
