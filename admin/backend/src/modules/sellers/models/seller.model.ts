import mongoose from 'mongoose';
import { SellerProfile, User, Product, Order } from '@haat/shared-backend';
import type { SellerStatus } from '@haat/shared-contracts';

export interface SellerFilter {
  status?: SellerStatus | string;
  search?: string;
  page?: number;
  limit?: number;
}

export const adminSellerModel = {
  async listSellers(filter: SellerFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filter.status && filter.status !== 'ALL') {
      query.status = filter.status;
    }

    if (filter.search) {
      const sanitized = filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(sanitized, 'i');

      const matchingUsers = await User.find({
        $or: [{ fullName: regex }, { email: regex }, { phoneNumber: regex }],
      })
        .select('_id')
        .lean();
      const userIds = matchingUsers.map((u) => u._id);

      const orConditions: Array<Record<string, unknown>> = [
        { storeName: regex },
        { storeSlug: regex },
        { storeAddress: regex },
        { gstin: regex },
        { panNumber: regex },
      ];

      if (userIds.length > 0) {
        orConditions.push({ userId: { $in: userIds } });
      }

      query.$or = orConditions;
    }

    const [sellers, total] = await Promise.all([
      SellerProfile.find(query)
        .populate('userId', 'fullName phoneNumber email isActive')
        .sort({ createdAt: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SellerProfile.countDocuments(query),
    ]);

    // Aggregate product counts and order volumes for each seller
    const sellerIds = sellers.map((s) => s._id);

    const [productCounts, orderAgg] = await Promise.all([
      Product.aggregate([
        { $match: { sellerId: { $in: sellerIds } } },
        { $group: { _id: '$sellerId', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { sellerId: { $in: sellerIds } } },
        {
          $group: {
            _id: '$sellerId',
            totalOrders: { $sum: 1 },
            revenuePaise: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$totalAmountPaise', 0] },
            },
          },
        },
      ]),
    ]);

    const productMap = new Map(productCounts.map((p) => [p._id.toString(), p.count]));
    const orderMap = new Map(orderAgg.map((o) => [o._id.toString(), o]));

    const enrichedSellers = sellers.map((s) => ({
      ...s,
      productCount: productMap.get(s._id.toString()) || 0,
      totalOrders: orderMap.get(s._id.toString())?.totalOrders || 0,
      revenueGeneratedPaise: orderMap.get(s._id.toString())?.revenuePaise || 0,
    }));

    return {
      sellers: enrichedSellers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findSellerById(id: string) {
    const seller = await SellerProfile.findById(id).populate('userId', 'fullName phoneNumber email isActive').lean();
    if (!seller) return null;

    const [productCount, totalOrders, revenueAgg] = await Promise.all([
      Product.countDocuments({ sellerId: seller._id }),
      Order.countDocuments({ sellerId: seller._id }),
      Order.aggregate([
        { $match: { sellerId: seller._id, paymentStatus: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$totalAmountPaise' } } },
      ]),
    ]);

    return {
      ...seller,
      productCount,
      totalOrders,
      revenueGeneratedPaise: revenueAgg[0]?.total || 0,
    };
  },

  async getSellerStats() {
    const [total, pending, active, rejected, blocked] = await Promise.all([
      SellerProfile.countDocuments({}),
      SellerProfile.countDocuments({ status: 'PENDING_APPROVAL' }),
      SellerProfile.countDocuments({ status: 'ACTIVE' }),
      SellerProfile.countDocuments({ status: 'REJECTED' }),
      SellerProfile.countDocuments({ status: 'BLOCKED' }),
    ]);

    return {
      total,
      pending,
      active,
      rejected,
      blocked,
    };
  },
};
