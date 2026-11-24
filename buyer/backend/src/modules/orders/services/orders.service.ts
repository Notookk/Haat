import { Types } from 'mongoose';
import {
  Order,
  SellerProfile,
  AppError,
  realtimeEventBus,
} from '@haat/shared-backend';
import {
  type FulfilmentStatus,
  type UpdateOrderStatusInput,
  type CancelOrderInput,
} from '@haat/shared-contracts';

const ALLOWED_ORDER_TRANSITIONS: Record<FulfilmentStatus, readonly FulfilmentStatus[]> = {
  PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['READY_FOR_DISPATCH'],
  READY_FOR_DISPATCH: ['DISPATCHED'],
  DISPATCHED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DISPUTED'],
  RETURNED: [],
  DISPUTED: [],
  CANCELLED: [],
};

export async function listBuyerOrders(buyerId: string) {
  return Order.find({ buyerId: new Types.ObjectId(buyerId) })
    .populate('sellerId', 'storeName storeSlug logoUrl')
    .sort({ createdAt: -1, _id: -1 })
    .lean();
}

export async function getOrderDetails(orderId: string, userId: string, role?: string) {
  const order = await Order.findById(orderId)
    .populate('sellerId', 'storeName storeSlug gstin pan logoUrl servicePincodes')
    .populate('buyerId', 'phoneNumber email name')
    .populate('items.productId', 'images title retailPricePaise')
    .lean();

  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  // IDOR Authorization: buyer OR seller OR admin
  const isBuyer = String(order.buyerId?._id || order.buyerId) === userId;
  const seller = await SellerProfile.findOne({ userId }).lean();
  const isSeller = seller && String(order.sellerId?._id || order.sellerId) === String(seller._id);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  if (!isBuyer && !isSeller && !isAdmin) {
    throw AppError.forbidden('You do not have access to this order.');
  }

  return order;
}

export async function listSellerOrders(userId: string) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only registered sellers can view seller orders.');
  }

  return Order.find({ sellerId: seller._id })
    .populate('buyerId', 'name phoneNumber email')
    .sort({ createdAt: -1, _id: -1 })
    .lean();
}

export async function updateOrderStatus(
  userId: string,
  orderId: string,
  input: UpdateOrderStatusInput,
) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only sellers can update order fulfilment status.');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  if (String(order.sellerId) !== String(seller._id)) {
    throw AppError.forbidden('You can only update orders for your store.');
  }

  const currentStatus = order.fulfilmentStatus as FulfilmentStatus;
  const targetStatus = input.status;

  const allowedNext = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw AppError.badRequest(
      `Invalid state transition: Cannot change order from "${currentStatus}" to "${targetStatus}".`,
    );
  }

  order.fulfilmentStatus = targetStatus;
  order.statusHistory.push({
    from: currentStatus,
    to: targetStatus,
    changedByUserId: new Types.ObjectId(userId),
    remarks: input.remarks || `Status transitioned to ${targetStatus}`,
    at: new Date(),
  });

  await order.save();
  return order.toObject();
}

export async function cancelBuyerOrder(buyerId: string, orderId: string, input: CancelOrderInput) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  if (String(order.buyerId) !== buyerId) {
    throw AppError.forbidden('You can only cancel your own orders.');
  }

  if (!['PENDING_CONFIRMATION', 'CONFIRMED'].includes(order.fulfilmentStatus)) {
    throw AppError.badRequest(
      `Order cannot be cancelled in "${order.fulfilmentStatus}" state. Please contact seller.`,
    );
  }

  const currentStatus = order.fulfilmentStatus;
  order.fulfilmentStatus = 'CANCELLED';
  order.statusHistory.push({
    from: currentStatus,
    to: 'CANCELLED',
    changedByUserId: new Types.ObjectId(buyerId),
    remarks: input.reason || 'Cancelled by buyer',
    at: new Date(),
  });

  await order.save();

  void realtimeEventBus.publishOrderStatusChanged({
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    sellerId: String(order.sellerId),
    buyerId: String(order.buyerId),
    previousStatus: currentStatus,
    newStatus: 'CANCELLED',
    at: new Date().toISOString(),
  });

  return order.toObject();
}

export async function getOrderReceipt(orderId: string, userId: string, role?: string) {
  const order = await getOrderDetails(orderId, userId, role);
  const seller = (order.sellerId as any) || {};

  const subtotalPaise = order.items.reduce((acc, it) => acc + (it.subtotalPaise || 0), 0);
  const gstPaise = Math.round(subtotalPaise * 0.18); // 18% standard GST breakdown snapshot

  return {
    invoiceNumber: `INV-${order.orderNumber}`,
    orderNumber: order.orderNumber,
    date: order.createdAt,
    seller: {
      name: seller.storeName || 'HAAT Verified Merchant',
      gstin: seller.gstin || '27AAAAA0000A1Z5',
      pan: seller.pan || '',
    },
    buyer: {
      name: order.shippingAddress?.name || 'Customer',
      phone: order.shippingAddress?.phone || '',
      address: `${order.shippingAddress?.addressLine1 || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.pincode || ''}`,
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
    paymentMethod: order.paymentMethod || 'ONLINE',
    paymentStatus: order.paymentStatus,
    fulfilmentStatus: order.fulfilmentStatus,
  };
}
