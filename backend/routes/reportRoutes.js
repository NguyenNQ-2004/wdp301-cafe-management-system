const express = require('express');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Ingredient = require('../models/Ingredient');
const PurchaseOrder = require('../models/PurchaseOrder');
const CustomerReview = require('../models/CustomerReview');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

function parseLocalDate(value, fieldName) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new Error(`${fieldName} phải có định dạng YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime()) || date.toLocaleDateString('en-CA', { timeZone: TIME_ZONE }) !== value) {
    throw new Error(`${fieldName} không hợp lệ.`);
  }
  return date;
}

router.use(protect, adminOnly);

router.get('/', async (req, res) => {
  try {
    const startDate = parseLocalDate(req.query.startDate, 'Ngày bắt đầu');
    const endDate = parseLocalDate(req.query.endDate, 'Ngày kết thúc');
    const groupBy = req.query.groupBy || 'day';
    if (!['day', 'month'].includes(groupBy)) {
      return res.status(400).json({ message: 'Kiểu nhóm báo cáo không hợp lệ.' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' });
    }

    const endExclusive = new Date(endDate);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const periodFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
    const orderReport = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endExclusive } } },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                orderCount: { $sum: 1 },
                completedOrderCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
                },
                inProgressCount: {
                  $sum: {
                    $cond: [{ $not: [{ $in: ['$status', ['COMPLETED', 'CANCELLED']] }] }, 1, 0]
                  }
                }
              }
            }
          ],
          statuses: [
            { $group: { _id: '$status', orderCount: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          salesByOrderType: [
            { $match: { status: { $ne: 'CANCELLED' } } },
            {
              $group: {
                _id: '$orderType',
                sales: { $sum: '$finalAmount' },
                orderCount: { $sum: 1 }
              }
            },
            { $sort: { sales: -1 } }
          ],
          topProducts: [
            { $match: { status: { $ne: 'CANCELLED' } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.productNameAtTime',
                quantity: { $sum: '$items.quantity' },
                orderIds: { $addToSet: '$_id' }
              }
            },
            { $sort: { quantity: -1, _id: 1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                productName: '$_id',
                quantity: 1,
                orderCount: { $size: '$orderIds' }
              }
            }
          ]
        }
      }
    ]);
    const paymentReport = await Payment.aggregate([
      { $match: { status: 'SUCCESS' } },
      {
        $lookup: {
          from: Order.collection.name,
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $match: {
          'order.createdAt': { $gte: startDate, $lt: endExclusive }
        }
      },
      {
        $facet: {
          paymentMethods: [
            {
              $group: {
                _id: '$paymentMethod',
                revenue: { $sum: '$amount' },
                orderCount: { $sum: 1 }
              }
            },
            { $sort: { revenue: -1 } }
          ],
          completedRevenue: [
            { $match: { 'order.status': 'COMPLETED' } },
            {
              $group: {
                _id: null,
                revenue: { $sum: '$amount' },
                paidOrderCount: { $sum: 1 }
              }
            }
          ],
          completedRevenueByPeriod: [
            { $match: { 'order.status': 'COMPLETED' } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: periodFormat,
                    date: '$order.createdAt',
                    timezone: TIME_ZONE
                  }
                },
                revenue: { $sum: '$amount' },
                orderCount: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]);
    const [inventoryReport] = await Ingredient.aggregate([
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                ingredientCount: { $sum: 1 },
                lowStockCount: {
                  $sum: {
                    $cond: [{ $lte: ['$currentStock', '$minStockLevel'] }, 1, 0]
                  }
                }
              }
            }
          ],
          lowStockItems: [
            { $match: { $expr: { $lte: ['$currentStock', '$minStockLevel'] } } },
            { $sort: { currentStock: 1 } },
            { $limit: 8 },
            { $project: { name: 1, currentStock: 1, minStockLevel: 1, unit: 1 } }
          ]
        }
      }
    ]);
    const [pendingPurchaseOrders, pendingReviews] = await Promise.all([
      PurchaseOrder.countDocuments({ status: { $in: ['DRAFT', 'ORDERED'] } }),
      CustomerReview.countDocuments({ status: 'PENDING' })
    ]);
    const [orders = {}] = orderReport;
    const [overview = {}] = orders.overview || [];
    const [payments = {}] = paymentReport;
    const [completedPaymentOverview = {}] = payments.completedRevenue || [];
    const [inventoryOverview = {}] = inventoryReport.overview || [];
    const completedOrderCount = overview.completedOrderCount || 0;
    const revenue = completedPaymentOverview.revenue || 0;

    return res.json({
      filters: { startDate: req.query.startDate, endDate: req.query.endDate, groupBy },
      overview: {
        orderCount: overview.orderCount || 0,
        completedOrderCount,
        inProgressCount: overview.inProgressCount || 0,
        revenue,
        averageOrderValue: completedOrderCount ? revenue / completedOrderCount : 0
      },
      revenue: (payments.completedRevenueByPeriod || []).map(({ _id, ...period }) => ({ period: _id, ...period })),
      paymentMethods: (payments.paymentMethods || []).map(({ _id, ...method }) => ({
        method: _id || 'UNKNOWN',
        ...method
      })),
      salesByOrderType: (orders.salesByOrderType || []).map(({ _id, ...orderType }) => ({
        orderType: _id || 'UNKNOWN',
        ...orderType
      })),
      topProducts: orders.topProducts || [],
      orderStatuses: (orders.statuses || []).map(({ _id, ...status }) => ({
        status: _id || 'UNKNOWN',
        ...status
      })),
      inventory: {
        ingredientCount: inventoryOverview.ingredientCount || 0,
        lowStockCount: inventoryOverview.lowStockCount || 0,
        lowStockItems: inventoryReport.lowStockItems || []
      },
      attention: { pendingPurchaseOrders, pendingReviews }
    });
  } catch (error) {
    if (error.message.includes('YYYY-MM-DD') || error.message.includes('không hợp lệ') || error.message.includes('Ngày bắt đầu')) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Failed to generate admin reports:', error);
    return res.status(500).json({ message: 'Không thể tải báo cáo lúc này.' });
  }
});

module.exports = router;
