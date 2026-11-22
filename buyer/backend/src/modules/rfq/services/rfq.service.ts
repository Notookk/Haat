import { Types } from 'mongoose';
import {
  Rfq,
  Quotation,
  Product,
  SellerProfile,
  Order,
  AppError,
  realtimeEventBus,
} from '@haat/shared-backend';
import type {
  SubmitRfqInput,
  CreateQuotationInput,
  UpdateQuotationInput,
  RfqRevisionInput,
} from '@haat/shared-contracts';

export async function submitRfq(buyerId: string, input: SubmitRfqInput) {
  const product = await Product.findById(input.productId).lean();
  if (!product || !product.isActive) {
    throw AppError.notFound('Product is unavailable for quotation.');
  }

  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const rfqNumber = `RFQ-${yearMonth}-${randomSuffix}`;

  const rfq = await Rfq.create({
    rfqNumber,
    buyerId: new Types.ObjectId(buyerId),
    sellerId: product.sellerId,
    productId: product._id,
    variantId: input.variantId ? new Types.ObjectId(input.variantId) : null,
    requestedQuantity: input.requestedQuantity,
    targetPricePaise: input.targetPricePaise || null,
    deliveryPincode: input.deliveryPincode,
    preferredDate: input.preferredDate || null,
    notes: input.notes || '',
    status: 'SUBMITTED',
  });

  return rfq.toObject();
}

export async function listBuyerRfqs(buyerId: string) {
  const rfqs = await Rfq.find({ buyerId: new Types.ObjectId(buyerId) })
    .populate('productId', 'title slug images sku retailPricePaise moq')
    .sort({ createdAt: -1 })
    .lean();

  const rfqIds = rfqs.map((r) => r._id);
  const quotations = await Quotation.find({ rfqId: { $in: rfqIds } })
    .sort({ version: -1 })
    .lean();

  const quoteMap = new Map<string, any[]>();
  for (const q of quotations) {
    const key = String(q.rfqId);
    if (!quoteMap.has(key)) quoteMap.set(key, []);
    quoteMap.get(key)!.push(q);
  }

  return rfqs.map((rfq) => ({
    ...rfq,
    quotations: quoteMap.get(String(rfq._id)) || [],
  }));
}

export async function getRfqDetails(rfqId: string, userId: string) {
  const rfq = await Rfq.findById(rfqId)
    .populate('productId', 'title slug images sku retailPricePaise moq variants')
    .lean();

  if (!rfq) {
    throw AppError.notFound('RFQ not found.');
  }

  // IDOR security check: buyer OR seller
  const seller = await SellerProfile.findOne({ userId }).lean();
  const isOwnerBuyer = String(rfq.buyerId) === userId;
  const isOwnerSeller = seller && String(rfq.sellerId) === String(seller._id);

  if (!isOwnerBuyer && !isOwnerSeller) {
    throw AppError.forbidden('You do not have permission to view this RFQ.');
  }

  const quotations = await Quotation.find({ rfqId: rfq._id }).sort({ version: -1 }).lean();

  return { ...rfq, quotations };
}

export async function listSellerRfqs(userId: string) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only sellers can view incoming RFQs.');
  }

  const rfqs = await Rfq.find({ sellerId: seller._id })
    .populate('productId', 'title slug images sku retailPricePaise moq')
    .sort({ createdAt: -1 })
    .lean();

  const rfqIds = rfqs.map((r) => r._id);
  const quotations = await Quotation.find({ rfqId: { $in: rfqIds } })
    .sort({ version: -1 })
    .lean();

  const quoteMap = new Map<string, any[]>();
  for (const q of quotations) {
    const key = String(q.rfqId);
    if (!quoteMap.has(key)) quoteMap.set(key, []);
    quoteMap.get(key)!.push(q);
  }

  return rfqs.map((rfq) => ({
    ...rfq,
    quotations: quoteMap.get(String(rfq._id)) || [],
  }));
}

export async function createQuotation(
  userId: string,
  rfqId: string,
  input: CreateQuotationInput,
) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only sellers can issue formal quotations.');
  }

  const rfq = await Rfq.findById(rfqId);
  if (!rfq) {
    throw AppError.notFound('RFQ not found.');
  }

  if (String(rfq.sellerId) !== String(seller._id)) {
    throw AppError.forbidden('You can only quote on RFQs sent to your store.');
  }

  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const quotationNumber = `QTE-${yearMonth}-${randomSuffix}`;

  const existingQuotesCount = await Quotation.countDocuments({ rfqId: rfq._id });

  const quotation = await Quotation.create({
    quotationNumber,
    rfqId: rfq._id,
    sellerId: seller._id,
    buyerId: rfq.buyerId,
    version: existingQuotesCount + 1,
    offeredUnitPricePaise: input.offeredUnitPricePaise,
    minQuantity: input.minQuantity,
    deliveryFeePaise: input.deliveryFeePaise || 0,
    validUntil: new Date(input.validUntil),
    sellerTerms: input.sellerTerms || '',
    status: 'ISSUED',
  });

  rfq.status = 'IN_REVIEW';
  await rfq.save();

  return quotation.toObject();
}

export async function acceptQuotation(buyerId: string, rfqId: string, quotationId: string) {
  const rfq = await Rfq.findById(rfqId).populate('productId').lean();
  if (!rfq) {
    throw AppError.notFound('RFQ not found.');
  }

  if (String(rfq.buyerId) !== buyerId) {
    throw AppError.forbidden('Only the RFQ owner can accept this quotation.');
  }

  const quotation = await Quotation.findById(quotationId);
  if (!quotation) {
    throw AppError.notFound('Quotation not found.');
  }

  if (quotation.status !== 'ISSUED') {
    throw AppError.badRequest(`Quotation cannot be accepted in "${quotation.status}" state.`);
  }

  if (new Date(quotation.validUntil).getTime() < Date.now()) {
    quotation.status = 'EXPIRED';
    await quotation.save();
    throw AppError.badRequest('This quotation has expired.');
  }

  // Atomically convert to confirmed order draft
  const product = rfq.productId as any;
  const unitPricePaise = quotation.offeredUnitPricePaise;
  const quantity = Math.max(quotation.minQuantity, rfq.requestedQuantity);
  const lineSubtotalPaise = unitPricePaise * quantity;
  const totalAmountPaise = lineSubtotalPaise + (quotation.deliveryFeePaise || 0);

  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `HAAT-${yearMonth}-${randomSuffix}`;

  const order = await Order.create({
    orderNumber,
    buyerId: new Types.ObjectId(buyerId),
    sellerId: quotation.sellerId,
    items: [
      {
        productId: product?._id || rfq.productId,
        variantId: rfq.variantId || null,
        sku: product?.sku || 'RFQ-CUSTOM',
        title: product?.title || 'B2B Custom Quotation Order',
        unitPricePaise,
        quantity,
        subtotalPaise: lineSubtotalPaise,
        isWholesale: true,
      },
    ],
    totalAmountPaise,
    deliveryFeePaise: quotation.deliveryFeePaise || 0,
    currency: 'INR',
    paymentStatus: 'PENDING',
    fulfilmentStatus: 'CONFIRMED',
    paymentMethod: 'ONLINE',
    shippingAddress: {
      name: 'B2B Buyer',
      phone: '9999999999',
      addressLine1: 'RFQ Delivery Destination',
      city: 'Commercial Hub',
      state: 'State',
      pincode: rfq.deliveryPincode,
    },
    deliveryDate: rfq.preferredDate || null,
    notes: `Generated from Quotation ${quotation.quotationNumber}. Terms: ${quotation.sellerTerms}`,
    statusHistory: [
      {
        from: 'RFQ_ACCEPTED',
        to: 'CONFIRMED',
        changedByUserId: new Types.ObjectId(buyerId),
        remarks: `Converted from accepted quotation ${quotation.quotationNumber}`,
        at: new Date(),
      },
    ],
  });

  quotation.status = 'CONVERTED_TO_ORDER';
  await quotation.save();

  await Rfq.findByIdAndUpdate(rfqId, { status: 'QUOTED' });

  // Broadcast real-time order creation across platform (Seller & Admin)
  void realtimeEventBus.publishOrderCreated({
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    sellerId: String(order.sellerId),
    buyerId: String(order.buyerId),
    totalAmountPaise: order.totalAmountPaise,
    deliveryDate: order.deliveryDate,
    fulfilmentStatus: order.fulfilmentStatus,
    paymentStatus: order.paymentStatus,
    createdAt: (order as any).createdAt || new Date().toISOString(),
  });

  return { order: order.toObject(), quotation: quotation.toObject() };
}

export async function rejectQuotation(buyerId: string, rfqId: string, quotationId: string) {
  const rfq = await Rfq.findById(rfqId).lean();
  if (!rfq || String(rfq.buyerId) !== buyerId) {
    throw AppError.forbidden('Unauthorized.');
  }

  const quotation = await Quotation.findOneAndUpdate(
    { _id: quotationId, rfqId },
    { $set: { status: 'REJECTED_BY_BUYER' } },
    { new: true },
  ).lean();

  if (!quotation) throw AppError.notFound('Quotation not found.');
  return quotation;
}

export async function requestQuotationRevision(
  buyerId: string,
  rfqId: string,
  quotationId: string,
  input: RfqRevisionInput,
) {
  const rfq = await Rfq.findById(rfqId);
  if (!rfq || String(rfq.buyerId) !== buyerId) {
    throw AppError.forbidden('Unauthorized.');
  }

  const quotation = await Quotation.findOneAndUpdate(
    { _id: quotationId, rfqId },
    { $set: { status: 'REVISION_REQUESTED' } },
    { new: true },
  ).lean();

  if (!quotation) throw AppError.notFound('Quotation not found.');

  rfq.notes = `${rfq.notes}\n[Revision Request]: ${input.notes}`.trim();
  await rfq.save();

  return quotation;
}
