import mongoose from 'mongoose';
import { User, Order, BuyerProfile, Address, AppError } from '@haat/shared-backend';

export interface BuyerFilter {
  search?: string;
  page?: number;
  limit?: number;
}

export const adminBuyerService = {
  async listBuyers(filter: BuyerFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { role: 'BUYER' };

    if (filter.search) {
      const sanitized = filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(sanitized, 'i');
      query.$or = [{ fullName: regex }, { email: regex }, { phoneNumber: regex }];
    }

    const trustedQuery = mongoose.trusted(query);

    const [buyers, total] = await Promise.all([
      User.find(trustedQuery)
        .select('-passwordHash')
        .sort({ createdAt: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(trustedQuery),
    ]);

    // Aggregate order count and spend for each buyer
    const buyerIds = buyers.map((b) => b._id);
    const orderAgg = await Order.aggregate([
      { $match: { buyerId: { $in: buyerIds } } },
      {
        $group: {
          _id: '$buyerId',
          totalOrders: { $sum: 1 },
          totalSpentPaise: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$totalAmountPaise', 0],
            },
          },
        },
      },
    ]);

    const orderMap = new Map(orderAgg.map((o) => [o._id.toString(), o]));

    const buyersWithMetrics = buyers.map((b) => {
      const metrics = orderMap.get(b._id.toString());
      return {
        id: b._id.toString(),
        fullName: b.fullName,
        email: b.email,
        phoneNumber: b.phoneNumber,
        isActive: b.isActive,
        createdAt: b.createdAt,
        totalOrders: metrics?.totalOrders || 0,
        totalSpentPaise: metrics?.totalSpentPaise || 0,
      };
    });

    return {
      buyers: buyersWithMetrics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getBuyer(id: string) {
    const buyer = await User.findOne({ _id: id, role: 'BUYER' }).select('-passwordHash').lean();
    if (!buyer) {
      throw AppError.notFound('Buyer not found.');
    }

    const [profile, addresses, orders] = await Promise.all([
      BuyerProfile.findOne({ userId: buyer._id }).lean(),
      Address.find({ userId: buyer._id }).lean(),
      Order.find({ buyerId: buyer._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const totalOrders = await Order.countDocuments({ buyerId: buyer._id });
    const spendAgg = await Order.aggregate([
      { $match: { buyerId: buyer._id, paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$totalAmountPaise' } } },
    ]);

    return {
      buyer: {
        id: buyer._id.toString(),
        fullName: buyer.fullName,
        email: buyer.email,
        phoneNumber: buyer.phoneNumber,
        isActive: buyer.isActive,
        createdAt: buyer.createdAt,
        businessName: profile?.businessName || null,
        gstin: profile?.gstin || null,
        savedAddresses: addresses || [],
        totalOrders,
        totalSpentPaise: spendAgg[0]?.total || 0,
        recentOrders: orders.map((o) => ({
          id: o._id.toString(),
          orderNumber: o.orderNumber,
          totalAmountPaise: o.totalAmountPaise,
          paymentStatus: o.paymentStatus,
          fulfilmentStatus: o.fulfilmentStatus,
          createdAt: o.createdAt,
        })),
      },
    };
  },
};
