import { AppError, Order, DeliverySlot, realtimeEventBus, User } from '@haat/shared-backend';
import { FULFILMENT_STATUSES, type FulfilmentStatus } from '@haat/shared-contracts';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'READY_FOR_DISPATCH', 'CANCELLED'],
  PACKED: ['READY_FOR_DISPATCH', 'CANCELLED'],
  READY_FOR_DISPATCH: ['OUT_FOR_DELIVERY', 'DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const sellerOrderService = {
  async listOrders(
    sellerId: string,
    params: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const baseQuery: Record<string, unknown> = { sellerId };

    if (params.search) {
      const q = params.search.trim();
      baseQuery.$or = [
        { orderNumber: { $regex: q, $options: 'i' } },
        { 'shippingAddress.name': { $regex: q, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: q, $options: 'i' } },
      ];
    }

    if (params.status && params.status !== 'ALL') {
      switch (params.status.toUpperCase()) {
        case 'NEW':
          baseQuery.fulfilmentStatus = 'PENDING_CONFIRMATION';
          break;
        case 'ACCEPTED':
          baseQuery.fulfilmentStatus = 'CONFIRMED';
          break;
        case 'PREPARING':
          baseQuery.fulfilmentStatus = { $in: ['PROCESSING', 'PACKED'] };
          break;
        case 'READY_FOR_DELIVERY':
          baseQuery.fulfilmentStatus = 'READY_FOR_DISPATCH';
          break;
        case 'OUT_FOR_DELIVERY':
          baseQuery.fulfilmentStatus = { $in: ['OUT_FOR_DELIVERY', 'DISPATCHED'] };
          break;
        case 'COMPLETED':
          baseQuery.fulfilmentStatus = 'DELIVERED';
          break;
        case 'CANCELLED':
          baseQuery.fulfilmentStatus = 'CANCELLED';
          break;
        default:
          if (FULFILMENT_STATUSES.includes(params.status as FulfilmentStatus)) {
            baseQuery.fulfilmentStatus = params.status;
          }
      }
    }

    const [total, orders, tabCounts] = await Promise.all([
      Order.countDocuments(baseQuery),
      Order.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'fullName email phoneNumber')
        .lean(),
      Promise.all([
        Order.countDocuments({ sellerId }),
        Order.countDocuments({ sellerId, fulfilmentStatus: 'PENDING_CONFIRMATION' }),
        Order.countDocuments({ sellerId, fulfilmentStatus: 'CONFIRMED' }),
        Order.countDocuments({ sellerId, fulfilmentStatus: { $in: ['PROCESSING', 'PACKED'] } }),
        Order.countDocuments({ sellerId, fulfilmentStatus: 'READY_FOR_DISPATCH' }),
        Order.countDocuments({ sellerId, fulfilmentStatus: { $in: ['OUT_FOR_DELIVERY', 'DISPATCHED'] } }),
        Order.countDocuments({ sellerId, fulfilmentStatus: 'DELIVERED' }),
        Order.countDocuments({ sellerId, fulfilmentStatus: 'CANCELLED' }),
      ]),
    ]);

    const [allCount, newCount, acceptedCount, preparingCount, readyCount, outCount, completedCount, cancelledCount] =
      tabCounts;

    return {
      orders: orders.map((o: any) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        buyerName: o.shippingAddress?.name || o.buyerId?.fullName || 'Customer',
        buyerPhone: o.shippingAddress?.phone || o.buyerId?.phoneNumber || 'N/A',
        totalAmountPaise: o.totalAmountPaise,
        fulfilmentStatus: o.fulfilmentStatus,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        deliveryDate: o.deliveryDate || null,
        deliverySlot: o.deliverySlot || null,
        itemsCount: o.items?.length || 0,
        createdAt: o.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: {
        all: allCount,
        new: newCount,
        accepted: acceptedCount,
        preparing: preparingCount,
        ready: readyCount,
        outForDelivery: outCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
    };
  },

  async getOrder(sellerId: string, orderId: string) {
    const order = await Order.findOne({ _id: orderId, sellerId })
      .populate('buyerId', 'fullName email phoneNumber')
      .lean();

    if (!order) {
      throw AppError.notFound(`Order ${orderId} not found.`);
    }

    const o = order as any;
    return {
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      buyer: {
        id: o.buyerId?._id?.toString() || '',
        name: o.shippingAddress?.name || o.buyerId?.fullName || 'Customer',
        phone: o.shippingAddress?.phone || o.buyerId?.phoneNumber || 'N/A',
        email: o.buyerId?.email || null,
      },
      shippingAddress: o.shippingAddress || null,
      items: (o.items || []).map((item: any) => ({
        productId: item.productId?.toString(),
        sku: item.sku,
        title: item.title,
        unitPricePaise: item.unitPricePaise,
        quantity: item.quantity,
        subtotalPaise: item.subtotalPaise,
        isWholesale: item.isWholesale || false,
      })),
      totalAmountPaise: o.totalAmountPaise,
      currency: o.currency || 'INR',
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      fulfilmentStatus: o.fulfilmentStatus,
      deliveryDate: o.deliveryDate || null,
      deliverySlot: o.deliverySlot || null,
      notes: o.notes || null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  },

  async updateOrderStatus(sellerId: string, orderId: string, targetStatus: string, reason?: string) {
    const order = await Order.findOne({ _id: orderId, sellerId });
    if (!order) {
      throw AppError.notFound(`Order ${orderId} not found.`);
    }

    const currentStatus = order.fulfilmentStatus || 'PENDING_CONFIRMATION';
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      throw AppError.badRequest(
        `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed next steps: ${allowed.join(', ') || 'None (terminal)'}`,
      );
    }

    // If order was cancelled, release delivery slot capacity
    if (targetStatus === 'CANCELLED' && order.deliverySlot?.slotId) {
      await DeliverySlot.updateOne(
        { _id: order.deliverySlot.slotId, bookedCount: { $gt: 0 } },
        { $inc: { bookedCount: -1 } },
      );
    }

    order.fulfilmentStatus = targetStatus as FulfilmentStatus;
    if (reason) {
      order.notes = order.notes ? `${order.notes} | Note: ${reason}` : `Status update: ${reason}`;
    }

    await order.save();

    await realtimeEventBus.publishOrderStatusChanged({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      sellerId,
      buyerId: order.buyerId?.toString(),
      previousStatus: currentStatus,
      newStatus: targetStatus,
    });

    return this.getOrder(sellerId, orderId);
  },
};
