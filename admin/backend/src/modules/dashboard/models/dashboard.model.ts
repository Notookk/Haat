import mongoose from 'mongoose';
import { User, SellerProfile, Product, Category, AuditLog, Order, Transaction } from '@haat/shared-backend';

export const dashboardModel = {
  async getMetrics() {
    const days = 14;
    const now = new Date();
    const dates: Array<{ date: string; label: string; start: Date; end: Date }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const label = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(start);
      const dateStr = start.toISOString().split('T')[0];
      dates.push({ date: dateStr, label, start, end });
    }

    const fourteenDaysAgo = dates[0].start;

    const [
      totalBuyers,
      totalSellers,
      pendingSellers,
      verifiedSellers,
      rejectedSellers,
      blockedSellers,
      totalProducts,
      activeProducts,
      suspendedProducts,
      totalCategories,
      totalOrders,
      revenueAgg,
      totalTransactions,
      recentAuditLogs,
      sellerGrowthAgg,
      auditVelocityAgg,
      categoryDistributionAgg,
    ] = await Promise.all([
      User.countDocuments({ role: 'BUYER' }),
      SellerProfile.countDocuments({}),
      SellerProfile.countDocuments({ status: 'PENDING_APPROVAL' }),
      SellerProfile.countDocuments({ status: 'ACTIVE' }),
      SellerProfile.countDocuments({ status: 'REJECTED' }),
      SellerProfile.countDocuments({ status: 'BLOCKED' }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments(mongoose.trusted({ isApproved: true, isActive: true })),
      Product.countDocuments(mongoose.trusted({ isApproved: false, isActive: true })),
      Category.countDocuments({ isActive: true }),
      Order.countDocuments({}),
      Order.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        { $group: { _id: null, totalRevenuePaise: { $sum: '$totalAmountPaise' } } },
      ]),
      Transaction.countDocuments({ paymentStatus: 'SUCCESS' }),
      AuditLog.find({ action: mongoose.trusted({ $nin: ['ADMIN_LOGIN', 'SELLER_LOGIN'] }) })
        .populate('actorUserId', 'fullName email role')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      SellerProfile.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            newSellers: { $sum: 1 },
            approvedSellers: {
              $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] },
            },
          },
        },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$categoryPath',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    const totalMarketplaceRevenuePaise = revenueAgg[0]?.totalRevenuePaise || 0;

    // Build 14-day seller growth trendline
    const sellerGrowthMap = new Map(sellerGrowthAgg.map((item) => [item._id, item]));
    const sellerGrowthTrend = dates.map((d) => {
      const found = sellerGrowthMap.get(d.date);
      return {
        date: d.date,
        label: d.label,
        value: found ? found.newSellers : 0,
        secondaryValue: found ? found.approvedSellers : 0,
      };
    });

    // Donut status distribution
    const sellerDistribution = [
      { label: 'Active', value: verifiedSellers, color: '#10b981' },
      { label: 'Pending Approval', value: pendingSellers, color: '#f59e0b' },
      { label: 'Rejected', value: rejectedSellers, color: '#ef4444' },
      { label: 'Blocked', value: blockedSellers, color: '#64748b' },
    ];

    // Categories breakdown
    const categoryPalette = ['#1f319d', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const categoryDistribution = categoryDistributionAgg.map((item, idx) => {
      const parts = (item._id || 'General').split('/');
      const rawName = parts[parts.length - 1] || 'General';
      const label = rawName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      return {
        label,
        value: item.count,
        color: categoryPalette[idx % categoryPalette.length],
        badge: `${item.count} SKUs`,
      };
    });

    if (categoryDistribution.length === 0) {
      const categories = await Category.find({ isActive: true }).limit(5).lean();
      for (let i = 0; i < categories.length; i++) {
        categoryDistribution.push({
          label: categories[i].name,
          value: 0,
          color: categoryPalette[i % categoryPalette.length],
          badge: '0 SKUs',
        });
      }
    }

    // 7-day administrative activity velocity
    const auditMap = new Map(auditVelocityAgg.map((item) => [item._id, item]));
    const activityVelocity = dates.slice(-7).map((d) => {
      const found = auditMap.get(d.date);
      return {
        label: d.label,
        date: d.date,
        value: found ? found.count : 0,
      };
    });

    return {
      totalBuyers,
      totalUsers: totalBuyers,
      totalSellers,
      pendingSellers,
      verifiedSellers,
      rejectedSellers,
      blockedSellers,
      totalProducts,
      activeProducts,
      suspendedProducts,
      totalCategories,
      totalOrders,
      totalMarketplaceRevenuePaise,
      totalTransactions: totalTransactions || totalOrders,
      recentAuditLogs,
      sellerGrowthTrend,
      sellerDistribution,
      categoryDistribution,
      activityVelocity,
    };
  },
};
