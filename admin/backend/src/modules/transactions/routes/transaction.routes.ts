import { Router, type RequestHandler } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireRole, sendSuccess, Transaction, Order } from '@haat/shared-backend';
import { rejectAdminWrites } from '../../../middleware/rejectAdminWrites';

export const adminTransactionsRouter = Router();

adminTransactionsRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

const listTransactionsHandler: RequestHandler = async (req, res) => {
  const page = Math.max(1, req.query.page ? Number(req.query.page) : 1);
  const limit = Math.min(100, Math.max(1, req.query.limit ? Number(req.query.limit) : 20));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (req.query.status && req.query.status !== 'ALL') {
    query.paymentStatus = req.query.status;
  }

  if (req.query.search && typeof req.query.search === 'string') {
    const sanitized = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(sanitized, 'i');
    query.transactionId = regex;
  }

  const trustedQuery = mongoose.trusted(query);

  const [transactions, total, volumeAgg] = await Promise.all([
    Transaction.find(trustedQuery)
      .populate('orderId', 'orderNumber totalAmountPaise paymentStatus')
      .populate('buyerId', 'fullName email phoneNumber')
      .populate('sellerId', 'storeName storeSlug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(trustedQuery),
    Transaction.aggregate([
      { $match: { paymentStatus: 'SUCCESS' } },
      { $group: { _id: null, totalVolumePaise: { $sum: '$amountPaise' } } },
    ]),
  ]);

  return sendSuccess(
    res,
    {
      transactions: transactions.map((t) => ({
        id: t._id.toString(),
        transactionId: t.transactionId,
        order: t.orderId,
        buyer: t.buyerId,
        seller: t.sellerId,
        amountPaise: t.amountPaise,
        paymentMethod: t.paymentMethod,
        paymentStatus: t.paymentStatus,
        createdAt: t.createdAt,
      })),
      metrics: {
        totalTransactions: total,
        totalVolumePaise: volumeAgg[0]?.totalVolumePaise || 0,
      },
    },
    200,
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  );
};

adminTransactionsRouter.get('/', listTransactionsHandler);

// Strictly reject any transaction modifications
adminTransactionsRouter.post('*', rejectAdminWrites);
adminTransactionsRouter.put('*', rejectAdminWrites);
adminTransactionsRouter.patch('*', rejectAdminWrites);
adminTransactionsRouter.delete('*', rejectAdminWrites);
