const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const OrderItem = require('./models/OrderItem');
const Payment = require('./models/Payment');
const CustomerReview = require('./models/CustomerReview');
const PurchaseOrder = require('./models/PurchaseOrder');
const Ingredient = require('./models/Ingredient');
const Supplier = require('./models/Supplier');

const orderSeeds = [
  {
    status: 'COMPLETED', orderType: 'DINE_IN', totalAmount: 90000, discountAmount: 9000, deliveryFee: 0, finalAmount: 81000, tableNumber: 'T01',
    items: [{ productName: 'Cà Phê Muối Aura Đặc Biệt', quantity: 2, unitPrice: 45000 }]
  },
  {
    status: 'DELIVERING', orderType: 'ONLINE', totalAmount: 100000, discountAmount: 0, deliveryFee: 15000, finalAmount: 115000,
    items: [{ productName: 'Trà Đào Cam Sả Tươi', quantity: 1, unitPrice: 45000 }, { productName: 'Bánh Cheesecake Việt Quất', quantity: 1, unitPrice: 55000 }]
  },
  {
    status: 'CONFIRMED', orderType: 'TAKEAWAY', totalAmount: 130000, discountAmount: 20000, deliveryFee: 0, finalAmount: 110000,
    items: [{ productName: 'Caramel Macchiato Đặc Sản', quantity: 2, unitPrice: 65000 }]
  },
  {
    status: 'PREPARING', orderType: 'DINE_IN', totalAmount: 70000, discountAmount: 0, deliveryFee: 0, finalAmount: 70000, tableNumber: 'T02',
    items: [{ productName: 'Bánh Croissant Bơ Pháp', quantity: 2, unitPrice: 35000 }]
  },
  {
    status: 'PREPARING', orderType: 'DINE_IN', totalAmount: 145000, discountAmount: 0, deliveryFee: 0, finalAmount: 145000, tableNumber: 'T03',
    items: [{ productName: 'Cà Phê Muối Aura Đặc Biệt', quantity: 2, unitPrice: 45000 }, { productName: 'Trà Đào Cam Sả Tươi', quantity: 1, unitPrice: 55000 }]
  },
  {
    status: 'CONFIRMED', orderType: 'TAKEAWAY', totalAmount: 90000, discountAmount: 0, deliveryFee: 0, finalAmount: 90000,
    items: [{ productName: 'Cà Phê Muối Aura Đặc Biệt', quantity: 1, unitPrice: 55000 }, { productName: 'Americano Đá Rang Đậm', quantity: 1, unitPrice: 35000 }]
  },
  {
    status: 'CONFIRMED', orderType: 'ONLINE', totalAmount: 125000, discountAmount: 0, deliveryFee: 18000, finalAmount: 143000,
    items: [{ productName: 'Cà Phê Muối Aura Đặc Biệt', quantity: 2, unitPrice: 45000 }, { productName: 'Bánh Croissant Bơ Pháp', quantity: 1, unitPrice: 35000 }]
  },
  {
    status: 'READY', orderType: 'ONLINE', totalAmount: 145000, discountAmount: 0, deliveryFee: 18000, finalAmount: 163000,
    items: [{ productName: 'Trà Đào Cam Sả Tươi', quantity: 2, unitPrice: 45000 }, { productName: 'Bánh Cheesecake Việt Quất', quantity: 1, unitPrice: 55000 }]
  },
  {
    status: 'COMPLETED', orderType: 'ONLINE', totalAmount: 87000, discountAmount: 0, deliveryFee: 18000, finalAmount: 105000,
    items: [{ productName: 'Latte Nghệ Thuật Hạt Phỉ', quantity: 1, unitPrice: 52000 }, { productName: 'Americano Đá Rang Đậm', quantity: 1, unitPrice: 35000 }]
  },
  {
    status: 'CANCELLED', orderType: 'TAKEAWAY', totalAmount: 58000, discountAmount: 0, deliveryFee: 0, finalAmount: 58000, cancelReason: 'Demo report fixture: customer changed mind',
    items: [{ productName: 'Matcha Latte Uji Kyoto Đá Xay', quantity: 1, unitPrice: 58000 }]
  }
];

const paymentSeeds = [
  { paymentMethod: 'CASH', amount: 81000, status: 'SUCCESS' },
  { paymentMethod: 'MOMO', amount: 115000, status: 'SUCCESS' },
  { paymentMethod: 'VNPAY', amount: 110000, status: 'SUCCESS' },
  { paymentMethod: 'CASH', amount: 70000, status: 'SUCCESS' },
  { paymentMethod: 'CASH', amount: 145000, status: 'SUCCESS' },
  { paymentMethod: 'MOMO', amount: 90000, status: 'SUCCESS' },
  { paymentMethod: 'CASH', amount: 143000, status: 'PENDING' },
  { paymentMethod: 'VNPAY', amount: 163000, status: 'SUCCESS' },
  { paymentMethod: 'CASH', amount: 105000, status: 'SUCCESS' },
  { paymentMethod: 'MOMO', amount: 58000, status: 'FAILED' }
];

function requireLocalDatabase(uri) {
  const parsed = new URL(uri);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0] || '');
  if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname) || databaseName !== 'aura_cafe_erp') {
    throw new Error('Demo report fixtures are restricted to localhost database aura_cafe_erp.');
  }
}

async function seedReportDemo() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not configured in backend/.env.');
  requireLocalDatabase(uri);

  await mongoose.connect(uri);
  const [customers, cashier, shipper, products, supplier, admin, ingredients] = await Promise.all([
    User.find({ role: 'CUSTOMER' }).sort({ phone: 1 }).limit(2),
    User.findOne({ role: 'STAFF', position: 'CASHIER' }),
    User.findOne({ role: 'STAFF', position: 'SHIPPER' }),
    Product.find({}).select('name basePrice variantsConfig'),
    Supplier.findOne({ status: 'ACTIVE' }),
    User.findOne({ role: 'ADMIN' }),
    Ingredient.find({}).sort({ name: 1 }).limit(2)
  ]);

  if (customers.length < 2 || !cashier || !shipper || !supplier || !admin) {
    throw new Error('Seed the base users, products, suppliers, and ingredients before adding report demo data.');
  }

  const productsByName = new Map(products.map((product) => [product.name, product]));
  for (const seed of orderSeeds) {
    for (const item of seed.items) {
      if (!productsByName.has(item.productName)) throw new Error(`Required demo product is missing: ${item.productName}`);
    }
  }

  const now = new Date();
  const businessDay = new Date(now);
  businessDay.setDate(businessDay.getDate() - 1);
  businessDay.setHours(0, 0, 0, 0);
  const orderIds = [];

  for (const [index, seed] of orderSeeds.entries()) {
    const createdAt = new Date(businessDay);
    createdAt.setHours(9 + index, index * 5, 0, 0);
    const customer = customers[index % customers.length];
    const items = seed.items.map((item) => {
      const product = productsByName.get(item.productName);
      return {
        product: product._id,
        productNameAtTime: product.name,
        unitPrice: item.unitPrice,
        customization: { size: 'M', demoFixture: true },
        quantity: item.quantity,
        subtotal: item.unitPrice * item.quantity,
        isPrepared: ['READY', 'COMPLETED'].includes(seed.status)
      };
    });

    const order = await Order.findOneAndUpdate(
      { orderCode: `DEMO-REPORT-${String(index + 1).padStart(3, '0')}` },
      {
        $setOnInsert: {
          orderCode: `DEMO-REPORT-${String(index + 1).padStart(3, '0')}`,
          customer: seed.orderType === 'DINE_IN' && index === 3 ? undefined : customer._id,
          cashier: ['DINE_IN', 'TAKEAWAY'].includes(seed.orderType) ? cashier._id : undefined,
          shipper: seed.orderType === 'ONLINE' && ['READY', 'DELIVERING', 'COMPLETED'].includes(seed.status) ? shipper._id : undefined,
          orderType: seed.orderType,
          status: seed.status,
          items,
          totalAmount: seed.totalAmount,
          discountAmount: seed.discountAmount,
          deliveryFee: seed.deliveryFee,
          finalAmount: seed.finalAmount,
          paymentMethod: paymentSeeds[index].paymentMethod,
          recipientName: seed.orderType === 'ONLINE' ? customer.fullName : undefined,
          recipientPhone: seed.orderType === 'ONLINE' ? customer.phone : undefined,
          deliveryAddress: seed.orderType === 'ONLINE' ? '28 Trang Tien, Hoan Kiem, Ha Noi' : undefined,
          tableNumber: seed.tableNumber,
          cancelReason: seed.cancelReason,
          createdAt,
          updatedAt: createdAt
        }
      },
      { upsert: true, returnDocument: 'after', runValidators: true, timestamps: false }
    );
    orderIds.push(order._id);

    await OrderItem.deleteMany({ order: order._id });
    await OrderItem.insertMany(items.map((item) => ({ ...item, order: order._id })));

    const payment = paymentSeeds[index];
    const paidAt = payment.status === 'SUCCESS' ? new Date(createdAt.getTime() + 5 * 60 * 1000) : undefined;
    await Payment.findOneAndUpdate(
      { order: order._id },
      {
        $setOnInsert: {
          order: order._id,
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          status: payment.status,
          paidAt,
          transactionCode: payment.paymentMethod === 'CASH' ? undefined : `DEMO-RPT-${String(index + 1).padStart(3, '0')}`,
          paymentNote: 'Local report dashboard demo fixture'
        }
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
  }

  await CustomerReview.findOneAndUpdate(
    { order: orderIds[1], content: 'Demo report fixture: delivery took longer than expected' },
    {
      $setOnInsert: {
        customer: customers[1]._id,
        order: orderIds[1],
        issueType: 'COMPLAINT',
        content: 'Demo report fixture: delivery took longer than expected',
        status: 'PENDING'
      }
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );
  await CustomerReview.findOneAndUpdate(
    { order: orderIds[2], content: 'Demo report fixture: customer feedback needs review' },
    {
      $setOnInsert: {
        customer: customers[0]._id,
        order: orderIds[2],
        issueType: 'RATING',
        rating: 3,
        content: 'Demo report fixture: customer feedback needs review',
        status: 'PENDING'
      }
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );

  if (ingredients.length > 0) {
    await PurchaseOrder.findOneAndUpdate(
      { note: 'DEMO_REPORT_FIXTURE' },
      {
        $setOnInsert: {
          supplier: supplier._id,
          creator: admin._id,
          totalCost: 150000,
          status: 'DRAFT',
          note: 'DEMO_REPORT_FIXTURE',
          items: [{ ingredient: ingredients[0]._id, quantity: 1000, unitPrice: 150 }]
        }
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
  }

  const [reportOrderCount, reportPayments, topProducts, pendingReviews, pendingPurchaseOrders] = await Promise.all([
    Order.countDocuments({ orderCode: /^DEMO-REPORT-/ }),
    Payment.countDocuments({ order: { $in: orderIds }, status: 'SUCCESS' }),
    OrderItem.aggregate([
      { $match: { order: { $in: orderIds } } },
      { $group: { _id: '$productNameAtTime', quantity: { $sum: '$quantity' } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]),
    CustomerReview.countDocuments({ order: { $in: orderIds }, status: 'PENDING' }),
    PurchaseOrder.countDocuments({ note: 'DEMO_REPORT_FIXTURE', status: { $in: ['DRAFT', 'ORDERED'] } })
  ]);

  console.log(JSON.stringify({
    database: mongoose.connection.name,
    insertedOrExistingDemoOrders: reportOrderCount,
    successfulDemoPayments: reportPayments,
    topProducts,
    pendingDemoReviews: pendingReviews,
    pendingDemoPurchaseOrders: pendingPurchaseOrders,
    note: 'Only DEMO-REPORT-* orders and records explicitly marked as report demo fixtures were added; existing records were not deleted.'
  }, null, 2));
}

seedReportDemo()
  .catch((error) => {
    console.error('Could not seed report demo fixtures:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
