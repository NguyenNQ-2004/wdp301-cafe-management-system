const { createHash } = require('node:crypto');
const { ObjectId } = require('bson');

const seedId = key => new ObjectId(createHash('sha256').update(`aura-demo-flow:${key}`).digest('hex').slice(0, 24));

// These records make the admin and staff demo screens useful after a fresh seed.
// Keep IDs and dates stable so every teammate restores the same references.
function addDemoFlowFixtures(snapshot) {
  const collection = name => {
    const found = snapshot.collections.find(item => item.name === name);
    if (!found) throw new Error(`Missing seed collection: ${name}`);
    return found.documents;
  };
  const at = value => new Date(value);
  const admin = collection('users').find(user => user.role === 'ADMIN');
  const cashier = collection('users').find(user => user.phone === '0900000003');
  const secondCashier = collection('users').find(user => user.phone === '0987000101');
  const shipper = collection('users').find(user => user.phone === '0900000006');
  const supplier = collection('suppliers').find(item => item.status === 'ACTIVE');
  if (!admin || !cashier || !secondCashier || !shipper || !supplier) throw new Error('Missing staff or supplier for demo flows');
  collection('suppliers').push({ _id: seedId('supplier:inactive'), name: 'Nhà cung cấp cũ (demo)',
    phone: '02838220000', address: 'Quận 1, TP. Hồ Chí Minh', status: 'INACTIVE',
    createdAt: at('2026-11-10T01:00:00.000Z'), updatedAt: at('2026-11-20T01:00:00.000Z') });

  const lowStock = [
    { key: 'arabica', name: 'Hạt cà phê Arabica', unit: 'gram', stock: 120, minimum: 500, unitCost: 480, requested: 2000 },
    { key: 'brown-sugar', name: 'Đường nâu', unit: 'gram', stock: 250, minimum: 1000, unitCost: 65, requested: 3000 }
  ];
  for (const item of lowStock) {
    const ingredientId = seedId(`ingredient:${item.key}`);
    collection('ingredients').push({
      _id: ingredientId, supplier: supplier._id, name: item.name, unit: item.unit, isActive: true,
      currentStock: item.stock, minStockLevel: item.minimum, lotsVersion: 0,
      stockLots: [{ _id: seedId(`lot:${item.key}`), sourceType: 'OPENING', sourceId: `DEMO-OPENING-${item.key}`,
        receivedAt: at('2026-11-23T01:00:00.000Z'), quantity: item.stock, remainingQuantity: item.stock, unitCost: item.unitCost }]
    });
    collection('inventorytransactions').push({
      _id: seedId(`stock:${item.key}`), ingredient: ingredientId, transactionType: 'ADJUSTMENT',
      quantity: item.stock, stockBefore: 0, stockAfter: item.stock, stockDelta: item.stock,
      unitBefore: item.unit, unitAfter: item.unit, referenceType: 'ADJUSTMENT',
      note: 'Tồn đầu kỳ demo; cần bổ sung hàng', createdBy: admin._id,
      valueBefore: 0, valueAfter: item.stock * item.unitCost, costTotal: item.stock * item.unitCost,
      createdAt: at('2026-11-23T01:00:00.000Z'), updatedAt: at('2026-11-23T01:00:00.000Z')
    });
  }
  const ingredient = key => seedId(`ingredient:${key}`);
  const requests = [
    { key: 'draft', status: 'DRAFT', material: 'brown-sugar', requester: secondCashier, quantity: 3000,
      reason: 'Đường nâu dưới mức tồn tối thiểu', actions: ['create'] },
    { key: 'pending', status: 'PENDING_APPROVAL', material: 'arabica', requester: cashier, quantity: 2000,
      reason: 'Cần hạt Arabica cho các ca cuối tuần', actions: ['create', 'submit'] },
    { key: 'approved', status: 'APPROVED', material: 'brown-sugar', requester: cashier, quantity: 1000,
      reason: 'Bổ sung đường nâu', actions: ['create', 'submit', 'approve'], reviewNote: 'Đồng ý nhập bổ sung' },
    { key: 'rejected', status: 'REJECTED', material: 'arabica', requester: secondCashier, quantity: 5000,
      reason: 'Đề xuất số lượng lớn', actions: ['create', 'submit', 'reject'], reviewNote: 'Điều chỉnh số lượng rồi gửi lại' },
    { key: 'cancelled', status: 'CANCELLED', material: 'brown-sugar', requester: cashier, quantity: 500,
      reason: 'Đề xuất trùng', actions: ['create', 'cancel'] }
  ];
  for (const [index, row] of requests.entries()) {
    const createdAt = at(`2026-11-${String(20 + index).padStart(2, '0')}T02:00:00.000Z`);
    const reviewed = ['APPROVED', 'REJECTED'].includes(row.status);
    collection('restockrequests').push({
      _id: seedId(`request:${row.key}`), requester: row.requester._id,
      ...(reviewed ? { reviewer: admin._id, reviewedAt: new Date(createdAt.getTime() + 7200000), reviewNote: row.reviewNote } : {}),
      status: row.status, reason: row.reason, note: 'Dữ liệu demo',
      items: [{ _id: seedId(`request-line:${row.key}`), ingredient: ingredient(row.material), quantity: row.quantity, itemNote: '' }],
      history: row.actions.map((action, actionIndex) => ({ _id: seedId(`request-history:${row.key}:${action}`), action,
        actor: ['approve', 'reject'].includes(action) ? admin._id : row.requester._id,
        at: new Date(createdAt.getTime() + actionIndex * 3600000), note: action === 'reject' ? row.reviewNote : '' })),
      createdAt, updatedAt: new Date(createdAt.getTime() + (row.actions.length - 1) * 3600000)
    });
  }

  const purchaseFixtures = [
    { key: 'draft', status: 'DRAFT', material: 'arabica', quantity: 2000, unitPrice: 480, date: '2026-11-24T03:00:00.000Z' },
    { key: 'cancelled', status: 'CANCELLED', material: 'brown-sugar', quantity: 1000, unitPrice: 65, date: '2026-11-22T03:00:00.000Z' }
  ];
  for (const row of purchaseFixtures) {
    const orderId = seedId(`purchase:${row.key}`);
    const line = { ingredient: ingredient(row.material), quantity: row.quantity, unitPrice: row.unitPrice, totalCost: row.quantity * row.unitPrice };
    const createdAt = at(row.date);
    collection('purchaseorders').push({ _id: orderId, supplier: supplier._id, creator: admin._id,
      status: row.status, totalCost: line.totalCost, items: [line], note: `Phiếu ${row.status === 'DRAFT' ? 'nháp' : 'đã hủy'} demo`, createdAt, updatedAt: createdAt });
    collection('purchaseorderitems').push({ _id: seedId(`purchase-line:${row.key}`), purchaseOrder: orderId,
      ...line, createdAt, updatedAt: createdAt });
  }

  // One unpaid QR order and two paid/in-flight orders cover the order and kitchen boards.
  // The two prepared orders consume one croissant each from the opening lot.
  if (!collection('orders').some(order => String(order._id) === String(seedId('order:pending-qr')))) {
    const customer = collection('users').find(user => user.phone === '0900000004');
    const product = collection('products').find(item => item.name === 'Bánh Croissant Bơ Pháp');
    const qrProduct = collection('products').find(item => item.name === 'Cà Phê Muối Aura Đặc Biệt');
    const croissant = collection('ingredients').find(item => item.name === 'Bánh croissant thành phẩm');
    if (!customer || !product || !qrProduct || !croissant || croissant.currentStock < 2 || !croissant.stockLots?.length) {
      throw new Error('Missing menu or stock for demo orders');
    }
    const rows = [
      { key: 'pending-qr', code: 'AURA-DEMO-QR-PENDING', status: 'PENDING', type: 'ONLINE', method: 'BANK_TRANSFER',
        product: qrProduct, amount: 45000, fee: 18000, paid: false, prepared: false, date: '2026-11-25T01:00:00.000Z' },
      { key: 'preparing-counter', code: 'AURA-DEMO-PREPARING', status: 'PREPARING', type: 'DINE_IN', method: 'CASH',
        product, amount: 35000, fee: 0, paid: true, prepared: true, date: '2026-11-25T02:00:00.000Z' },
      { key: 'delivering-cod', code: 'AURA-DEMO-DELIVERING', status: 'DELIVERING', type: 'ONLINE', method: 'COD',
        product, amount: 35000, fee: 18000, paid: false, prepared: true, date: '2026-11-25T03:00:00.000Z' }
    ];
    let remaining = croissant.currentStock;
    for (const row of rows) {
      const orderId = seedId(`order:${row.key}`);
      const createdAt = at(row.date);
      const finalAmount = row.amount + row.fee;
      const item = { product: row.product._id, productNameAtTime: row.product.name, unitPrice: row.amount,
        customization: { size: 'M' }, quantity: 1, subtotal: row.amount, isPrepared: row.status === 'DELIVERING',
        ...(row.prepared ? { costTotal: 18000, costPerItem: 18000,
          costAllocations: [{ ingredient: croissant._id, ingredientName: croissant.name, unit: croissant.unit,
            lotId: croissant.stockLots[0]._id, quantity: 1, unitCost: 18000 }] } : {}) };
      const order = { _id: orderId, orderCode: row.code, customer: customer._id,
        ...(row.type === 'DINE_IN' ? { cashier: cashier._id, tableNumber: 'T02' } : {
          recipientName: customer.fullName, recipientPhone: customer.phone,
          deliveryAddress: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội', district: 'Thanh Xuân', ward: 'Thượng Đình', addressDetail: 'Số 12 Nguyễn Trãi' }),
        orderType: row.type, status: row.status, items: [item], totalAmount: row.amount,
        discountAmount: 0, deliveryFee: row.fee, finalAmount, paymentMethod: row.method,
        ...(row.status === 'DELIVERING' ? { shipper: shipper._id, delivery: { status: 'DELIVERING',
          assignedAt: createdAt, acceptedAt: new Date(createdAt.getTime() + 600000),
          pickedUpAt: new Date(createdAt.getTime() + 1800000), history: [] } } : {}),
        ...(row.prepared ? { inventoryDeductedAt: createdAt, costTotal: 18000,
          costCapturedAt: createdAt, costStatus: 'COMPLETE' } : {}),
        createdAt, updatedAt: createdAt };
      collection('orders').push(order);
      collection('orderitems').push({ _id: seedId(`order-line:${row.key}`), order: orderId,
        product: item.product, productNameAtTime: item.productNameAtTime, unitPrice: item.unitPrice,
        customization: item.customization, quantity: 1, subtotal: row.amount,
        isPrepared: item.isPrepared, createdAt, updatedAt: createdAt });
      collection('payments').push({ _id: seedId(`payment:${row.key}`), order: orderId,
        paymentMethod: row.method === 'COD' ? 'CASH' : row.method, amount: finalAmount,
        status: row.paid ? 'SUCCESS' : 'PENDING',
        ...(row.paid ? { confirmationMode: 'CASHIER', paidAt: createdAt, receivedAmount: 50000,
          changeAmount: 50000 - finalAmount, receivedBy: cashier._id } : {}),
        createdAt, updatedAt: createdAt });
      if (row.prepared) {
        const before = remaining;
        remaining -= 1;
        collection('inventorytransactions').push({ _id: seedId(`stock-out:${row.key}`), ingredient: croissant._id,
          transactionType: 'OUT_ORDER', quantity: 1, stockBefore: before, stockAfter: remaining,
          stockDelta: -1, unitBefore: croissant.unit, unitAfter: croissant.unit,
          valueBefore: before * 18000, valueAfter: remaining * 18000, costTotal: 18000,
          lotAllocations: [{ _id: seedId(`allocation:${row.key}`), lotId: croissant.stockLots[0]._id, quantity: 1, unitCost: 18000 }],
          referenceType: 'ORDER', referenceId: orderId, createdBy: admin._id,
          note: `Xuất kho cho đơn ${row.code}`, createdAt, updatedAt: createdAt });
      }
    }
    croissant.currentStock = remaining;
    croissant.stockLots[0].remainingQuantity = remaining;
  }

  const deliveredOrder = collection('orders').find(order => order.orderType === 'ONLINE' && order.status === 'COMPLETED' && String(order.shipper) === String(shipper._id));
  if (!deliveredOrder) throw new Error('Missing delivered order for demo issue');
  collection('deliveryissues').push({ _id: seedId('delivery-issue:delay'), order: deliveredOrder._id,
    reporter: shipper._id, issueType: 'DELAY', description: 'Khách yêu cầu giao trễ 15 phút; đã liên hệ xác nhận.',
    outcome: 'REPORT', createdAt: at('2026-11-14T08:00:00.000Z'), updatedAt: at('2026-11-14T08:00:00.000Z') });

  const reviewedOrder = collection('orders').find(order => order.customer && order.status === 'COMPLETED' && String(order.customer) === String(collection('users').find(user => user.phone === '0900000004')?._id));
  if (!reviewedOrder) throw new Error('Missing customer order for demo feedback');
  collection('customerreviews').push({ _id: seedId('complaint:in-progress'), customer: reviewedOrder.customer,
    order: reviewedOrder._id, issueType: 'COMPLAINT', topic: 'Thời gian phục vụ',
    content: 'Khách phản ánh món ra chậm; quản lý đang xác minh.', status: 'IN_PROGRESS',
    adminResponse: 'Quán đã tiếp nhận và đang kiểm tra ca phục vụ.', respondedBy: admin._id,
    respondedAt: at('2026-11-21T04:00:00.000Z'),
    createdAt: at('2026-11-21T03:00:00.000Z'), updatedAt: at('2026-11-21T04:00:00.000Z') });
  collection('customerreviews').push({ _id: seedId('complaint:rejected'), customer: reviewedOrder.customer,
    order: reviewedOrder._id, issueType: 'COMPLAINT', topic: 'Phản ánh trùng lặp',
    content: 'Khách gửi lại cùng một phản ánh đã được xử lý.', status: 'REJECTED',
    adminResponse: 'Phản ánh này trùng với yêu cầu trước; vui lòng theo dõi phản hồi cũ.',
    respondedBy: admin._id, respondedAt: at('2026-11-22T04:00:00.000Z'),
    createdAt: at('2026-11-22T03:00:00.000Z'), updatedAt: at('2026-11-22T04:00:00.000Z') });

  const cashierSchedules = collection('workschedules').filter(schedule => schedule.status === 'COMPLETED' &&
    ['2026-11-17', '2026-11-18'].includes(schedule.workDate.toISOString().slice(0, 10)) &&
    collection('users').some(user => String(user._id) === String(schedule.user) && user.position === 'CASHIER'));
  for (const [index, status] of ['CONFIRMED', 'REJECTED'].entries()) {
    if (collection('shifthandovers').some(item => String(item._id) === String(seedId(`handover:${status.toLowerCase()}`)))) continue;
    const schedule = cashierSchedules[index];
    if (!schedule) throw new Error('Missing completed cashier schedule for demo handover');
    const actualCash = status === 'CONFIRMED' ? 100000 : 90000;
    const submittedAt = new Date(schedule.checkOutTime.getTime() + 600000);
    const reviewedAt = new Date(submittedAt.getTime() + 3600000);
    schedule.startingCash = 100000;
    schedule.endingCashSystem = 100000;
    schedule.endingCashActual = actualCash;
    schedule.handoverAt = submittedAt;
    schedule.handoverNote = status === 'REJECTED' ? 'Két thiếu 10.000đ, cần kiểm tra lại.' : '';
    collection('shifthandovers').push({
      _id: seedId(`handover:${status.toLowerCase()}`), schedule: schedule._id, cashier: schedule.user,
      workDate: schedule.workDate, shiftName: schedule.shiftName, checkInTime: schedule.checkInTime,
      checkOutTime: schedule.checkOutTime, openingCash: 100000, cashSales: 0, codReceipts: 0,
      cashRefunds: 0, expectedCash: 100000, actualCash, difference: actualCash - 100000,
      note: schedule.handoverNote, status, reviewedBy: admin._id, reviewedAt,
      reviewerNote: status === 'REJECTED' ? 'Kiểm đếm và gửi lại biên bản.' : 'Số liệu đã khớp.',
      revision: 0, history: [{ _id: seedId(`handover-history:${status.toLowerCase()}`), action: status === 'CONFIRMED' ? 'CONFIRM' : 'REJECT',
        actor: admin._id, at: reviewedAt, fromStatus: 'SUBMITTED', toStatus: status,
        note: status === 'REJECTED' ? 'Kiểm đếm và gửi lại biên bản.' : 'Số liệu đã khớp.', actualCash, expectedCash: 100000 }],
      createdAt: submittedAt, updatedAt: reviewedAt
    });
  }
  return snapshot;
}

module.exports = { addDemoFlowFixtures };
