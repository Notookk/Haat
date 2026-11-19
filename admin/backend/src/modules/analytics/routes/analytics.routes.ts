import { Router, type RequestHandler } from 'express';
import { requireAuth, requireRole, sendSuccess, User, SellerProfile, Product, Order, Transaction } from '@haat/shared-backend';
import { rejectAdminWrites } from '../../../middleware/rejectAdminWrites';

export const adminAnalyticsRouter = Router();

adminAnalyticsRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

const getMarketplaceAnalyticsHandler: RequestHandler = async (_req, res) => {
  const [
    totalBuyers,
    activeBuyers,
    totalSellers,
    activeSellers,
    totalOrders,
    totalTransactions,
    gmvAgg,
    completedSalesAgg,
    topSellersAgg,
    topProducts,
  ] = await Promise.all([
    User.countDocuments({ role: 'BUYER' }),
    User.countDocuments({ role: 'BUYER', isActive: true }),
    SellerProfile.countDocuments({}),
    SellerProfile.countDocuments({ status: 'ACTIVE' }),
    Order.countDocuments({}),
    Transaction.countDocuments({}),
    Order.aggregate([
      { $group: { _id: null, grossSalesPaise: { $sum: '$totalAmountPaise' } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, completedOrderValuePaise: { $sum: '$totalAmountPaise' } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: '$sellerId', revenuePaise: { $sum: '$totalAmountPaise' }, ordersCount: { $sum: 1 } } },
      { $sort: { revenuePaise: -1 } },
      { $limit: 5 },
    ]),
    Product.find({ isActive: true })
      .sort({ ratingCount: -1, retailPricePaise: -1 })
      .limit(6)
      .select('title sku retailPricePaise isWholesaleActive sellerName categoryPath')
      .lean(),
  ]);

  const grossSalesPaise = gmvAgg[0]?.grossSalesPaise || 0;
  const completedOrderValuePaise = completedSalesAgg[0]?.completedOrderValuePaise || 0;

  // 14-day timeline
  const days = 14;
  const now = new Date();
  const dates: Array<{ date: string; label: string }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const label = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(d);
    dates.push({ date: d.toISOString().split('T')[0], label });
  }

  const revenueTrends = dates.map((d) => ({
    date: d.date,
    label: d.label,
    value: 0,
    secondaryValue: 0,
  }));

  // Populate top seller names
  const sellerIds = topSellersAgg.map((s) => s._id);
  const sellerProfiles = await SellerProfile.find({ _id: { $in: sellerIds } })
    .select('storeName storeSlug')
    .lean();
  const sellerProfileMap = new Map(sellerProfiles.map((s) => [s._id.toString(), s]));

  const topSellers = topSellersAgg.map((s) => {
    const prof = sellerProfileMap.get(s._id.toString());
    return {
      id: s._id.toString(),
      storeName: prof?.storeName || 'Merchant',
      storeSlug: prof?.storeSlug || '',
      revenuePaise: s.revenuePaise,
      ordersCount: s.ordersCount,
    };
  });

  return sendSuccess(res, {
    financialOverview: {
      grossSalesPaise, // Total GMV of all orders placed
      completedOrderValuePaise, // Verified completed / paid transactions
      platformCommissionPaise: 0, // Commission ledger (Phase 8 integration)
      totalTransactions: totalTransactions || totalOrders,
      totalOrders,
      disclaimer:
        'Gross sales represents gross merchandise value (GMV) across merchants. Platform commission ledger is slated for Phase 8.',
    },
    participantMetrics: {
      totalBuyers,
      activeBuyers,
      totalSellers,
      activeSellers,
    },
    revenueTrends,
    topSellers,
    bestSellingProducts: topProducts.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      sku: p.sku,
      retailPricePaise: p.retailPricePaise,
      sellerName: p.sellerName,
      category: p.categoryPath?.split('/').pop() || 'General',
      isWholesaleActive: p.isWholesaleActive,
    })),
    channelPerformance: {
      retailSharePercent: 100,
      wholesaleSharePercent: 0,
    },
  });
};

adminAnalyticsRouter.get('/overview', getMarketplaceAnalyticsHandler);

// Strictly reject any analytics modifications
adminAnalyticsRouter.post('*', rejectAdminWrites);
adminAnalyticsRouter.put('*', rejectAdminWrites);
adminAnalyticsRouter.patch('*', rejectAdminWrites);
adminAnalyticsRouter.delete('*', rejectAdminWrites);
