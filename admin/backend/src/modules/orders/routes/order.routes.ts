import { Router, type RequestHandler } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireRole, sendSuccess, Order, AppError } from '@haat/shared-backend';
import { rejectAdminWrites } from '../../../middleware/rejectAdminWrites';

export const adminOrdersRouter = Router();

adminOrdersRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

/**
 * Read-only orders list handler with pagination, search, and status filters.
 */
const listOrdersHandler: RequestHandler = async (req, res) => {
  const page = Math.max(1, req.query.page ? Number(req.query.page) : 1);
  const limit = Math.min(100, Math.max(1, req.query.limit ? Number(req.query.limit) : 20));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (req.query.status && req.query.status !== 'ALL') {
    query.fulfilmentStatus = req.query.status;
  }

  if (req.query.paymentStatus && req.query.paymentStatus !== 'ALL') {
    query.paymentStatus = req.query.paymentStatus;
  }

  if (req.query.sellerId && typeof req.query.sellerId === 'string') {
    query.sellerId = new mongoose.Types.ObjectId(req.query.sellerId);
  }

  if (req.query.search && typeof req.query.search === 'string') {
    const sanitized = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(sanitized, 'i');
    query.orderNumber = regex;
  }

  const trustedQuery = mongoose.trusted(query);

  const [orders, total, totalGmvAgg] = await Promise.all([
    Order.find(trustedQuery)
      .populate('buyerId', 'fullName email phoneNumber')
      .populate('sellerId', 'storeName storeSlug')
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(trustedQuery),
    Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, totalGmvPaise: { $sum: '$totalAmountPaise' } } },
    ]),
  ]);

  return sendSuccess(
    res,
    {
      orders: orders.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        buyer: o.buyerId,
        seller: o.sellerId,
        itemsCount: o.items?.length || 0,
        totalAmountPaise: o.totalAmountPaise,
        paymentStatus: o.paymentStatus,
        fulfilmentStatus: o.fulfilmentStatus,
        createdAt: o.createdAt,
      })),
      metrics: {
        totalOrders: total,
        totalGmvPaise: totalGmvAgg[0]?.totalGmvPaise || 0,
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

const getOrderDetailsHandler: RequestHandler = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyerId', 'fullName email phoneNumber')
    .populate('sellerId', 'storeName storeSlug storeAddress gstin panNumber')
    .lean();

  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  return sendSuccess(res, { order });
};

const getOrderReceiptHandler: RequestHandler = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyerId', 'fullName email phoneNumber')
    .populate('sellerId', 'storeName storeSlug storeAddress gstin panNumber')
    .lean();

  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  const seller = (order.sellerId as any) || {};
  const subtotalPaise = order.items.reduce((acc, it) => acc + (it.subtotalPaise || 0), 0);
  const gstPaise = Math.round(subtotalPaise * 0.18);

  return sendSuccess(res, {
    receipt: {
      invoiceNumber: `INV-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      seller: {
        name: seller.storeName || 'HAAT Verified Merchant',
        gstin: seller.gstin || '27AAAAA0000A1Z5',
        pan: seller.panNumber || seller.pan || '',
        address: seller.storeAddress || '',
      },
      buyer: {
        name: order.shippingAddress?.name || (order.buyerId as any)?.fullName || 'Customer',
        phone: order.shippingAddress?.phone || (order.buyerId as any)?.phoneNumber || '',
        address: `${order.shippingAddress?.addressLine1 || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.pincode || ''}`,
      },
      items: order.items,
      pricing: {
        subtotalPaise,
        gstPaise,
        deliveryFeePaise: order.deliveryFeePaise || 0,
        totalAmountPaise: order.totalAmountPaise,
        currency: order.currency || 'INR',
      },
      scheduledDelivery: {
        date: order.deliveryDate,
        slot: order.deliverySlot?.label || `${order.deliverySlot?.startTime} – ${order.deliverySlot?.endTime}`,
      },
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      fulfilmentStatus: order.fulfilmentStatus,
    },
  });
};

adminOrdersRouter.get('/', listOrdersHandler);
adminOrdersRouter.get('/:id', getOrderDetailsHandler);
adminOrdersRouter.get('/:id/receipt', getOrderReceiptHandler);

// Strictly reject any order modifications/cancellations
adminOrdersRouter.post('*', rejectAdminWrites);
adminOrdersRouter.put('*', rejectAdminWrites);
adminOrdersRouter.patch('*', rejectAdminWrites);
adminOrdersRouter.delete('*', rejectAdminWrites);
