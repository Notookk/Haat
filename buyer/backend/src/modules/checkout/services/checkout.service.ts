import { Types } from 'mongoose';
import {
  Order,
  Product,
  DeliverySlot,
  SlotCounter,
  Cart,
  AppError,
  realtimeEventBus,
} from '@haat/shared-backend';
import {
  resolveUnitPricePaise,
  quantityViolation,
  type CheckoutInitiateInput,
} from '@haat/shared-contracts';

export async function initiateCheckout(buyerId: string, input: CheckoutInitiateInput) {
  // 1. Idempotency guard — prevents duplicate order creation on network retries
  if (input.idempotencyKey) {
    const existingOrder = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean();
    if (existingOrder) {
      return existingOrder;
    }
  }

  // 2. Fetch all products from DB (NEVER trust client price or metadata)
  const productIds = input.items.map((i) => new Types.ObjectId(i.productId));
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  if (products.length === 0) {
    throw AppError.badRequest('No valid products found for checkout.');
  }

  // Identify seller (single-seller checkout or first seller group)
  const firstProduct = products[0];
  const sellerId = String(firstProduct.sellerId);

  // 3. Revalidate stock, price tiers, and MOQ/multiples for each line item
  let itemsSubtotalPaise = 0;
  const snapshotItems = [];

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product || !product.isActive || !product.isApproved) {
      throw AppError.badRequest(`Product "${product?.title || item.productId}" is currently unavailable.`);
    }

    if (String(product.sellerId) !== sellerId) {
      throw AppError.badRequest('Multi-seller orders must be checked out per seller.');
    }

    const violation = quantityViolation(item.quantity, {
      moq: product.moq ?? 1,
      orderMultiple: product.orderMultiple ?? 1,
    });
    if (violation) {
      throw AppError.badRequest(`${product.title}: ${violation}`);
    }

    let variantStock = 0;
    let variantSku = product.sku;
    let variantPriceModifier = 0;
    let targetVariantId: Types.ObjectId | null = null;

    if (item.variantId) {
      const variant = product.variants?.find((v) => String(v._id) === item.variantId);
      if (!variant) {
        throw AppError.badRequest(`Selected variant for "${product.title}" does not exist.`);
      }
      variantStock = variant.stockQuantity ?? 0;
      variantSku = variant.sku;
      variantPriceModifier = variant.priceModifierPaise ?? 0;
      targetVariantId = new Types.ObjectId(item.variantId);
    } else {
      variantStock = product.variants?.[0]?.stockQuantity ?? 0;
      targetVariantId = (product.variants?.[0]?._id as Types.ObjectId) || null;
    }

    if (variantStock < item.quantity) {
      throw AppError.badRequest(
        `Insufficient inventory for "${product.title}". Requested: ${item.quantity}, In Stock: ${variantStock}.`,
      );
    }

    const basePricePaise = (product.retailPricePaise ?? 0) + variantPriceModifier;
    const unitPricePaise = resolveUnitPricePaise(
      basePricePaise,
      (product.pricingTiers as any[]) ?? [],
      item.quantity,
    );
    const lineTotalPaise = unitPricePaise * item.quantity;
    itemsSubtotalPaise += lineTotalPaise;

    snapshotItems.push({
      productId: product._id,
      variantId: targetVariantId,
      sku: variantSku,
      title: product.title,
      unitPricePaise,
      quantity: item.quantity,
      subtotalPaise: lineTotalPaise,
      isWholesale: unitPricePaise < basePricePaise,
    });
  }

  // Minimum order is ₹99 (9900 paise) and order above ₹199 (19900 paise) qualifies for free delivery
  const MIN_ORDER_PAISE = 9900;
  const FREE_DELIVERY_THRESHOLD_PAISE = 19900;
  const STANDARD_DELIVERY_FEE_PAISE = 4900;

  if (itemsSubtotalPaise < MIN_ORDER_PAISE) {
    throw AppError.badRequest('Minimum order value is ₹99. Please add more items to checkout.');
  }

  const deliveryFeePaise = itemsSubtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE ? 0 : STANDARD_DELIVERY_FEE_PAISE;
  const totalAmountPaise = itemsSubtotalPaise + deliveryFeePaise;

  // 4. Resolve delivery slot and enforce atomic capacity reservation
  const sellerObjectId = new Types.ObjectId(sellerId);
  let slotObjectId: Types.ObjectId | null = null;
  let startTime: string | null = null;
  let endTime: string | null = null;
  let slotLabel = 'Delivery will happen shortly';

  if (input.deliverySlotId && Types.ObjectId.isValid(input.deliverySlotId)) {
    const candidateSlotId = new Types.ObjectId(input.deliverySlotId);

    const slot = await DeliverySlot.findOne({ _id: candidateSlotId, sellerId: sellerObjectId }).lean();
    if (slot) {
      slotObjectId = candidateSlotId;
      const maxCapacity = (slot as any).maxCapacity ?? (slot as any).capacity ?? 20;
      startTime = slot.startTime;
      endTime = slot.endTime;
      slotLabel = `${slot.startTime} – ${slot.endTime}`;

      // Ensure slot counter exists
      await SlotCounter.findOneAndUpdate(
        { sellerId: sellerObjectId, slotId: slotObjectId, date: input.deliveryDate },
        { $setOnInsert: { booked: 0, maxCapacity } },
        { upsert: true },
      );

      // Atomic capacity decrement
      const reservedCounter = await SlotCounter.findOneAndUpdate(
        {
          sellerId: sellerObjectId,
          slotId: slotObjectId,
          date: input.deliveryDate,
          $expr: { $lt: ['$booked', '$maxCapacity'] },
        },
        { $inc: { booked: 1 } },
        { new: true },
      );

      if (!reservedCounter) {
        throw AppError.conflict(
          'The selected delivery slot is fully booked. Please select another slot.',
          'SLOT_OVERBOOKED',
        );
      }
    }
  }

  // 5. Atomic stock decrement for each line item
  for (const line of snapshotItems) {
    if (line.variantId) {
      await Product.updateOne(
        { _id: line.productId },
        { $inc: { 'variants.$[v].stockQuantity': -line.quantity } },
        {
          arrayFilters: [
            { 'v._id': line.variantId, 'v.stockQuantity': { $gte: line.quantity } },
          ],
        },
      );
    }
  }

  // 6. Generate human-readable order number
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `HAAT-${yearMonth}-${randomSuffix}`;

  // 7. Create immutable Order document
  const order = await Order.create({
    orderNumber,
    idempotencyKey: input.idempotencyKey,
    buyerId: new Types.ObjectId(buyerId),
    sellerId: sellerObjectId,
    items: snapshotItems,
    totalAmountPaise,
    deliveryFeePaise,
    currency: 'INR',
    paymentStatus: 'PENDING',
    fulfilmentStatus: 'PENDING_CONFIRMATION',
    paymentMethod: input.paymentMethod || 'ONLINE',
    shippingAddress: input.shippingAddress,
    deliveryDate: input.deliveryDate,
    deliverySlot: {
      slotId: slotObjectId,
      startTime,
      endTime,
      label: slotLabel,
    },
    statusHistory: [
      {
        from: 'INITIAL',
        to: 'PENDING_CONFIRMATION',
        changedByUserId: new Types.ObjectId(buyerId),
        remarks: 'Order submitted by buyer',
        at: new Date(),
      },
    ],
  });

  // 8. Clear checked-out items from buyer's cart
  const orderedProductIds = input.items.map((i) => i.productId);
  await Cart.updateOne(
    { userId: new Types.ObjectId(buyerId) },
    {
      $pull: {
        items: {
          productId: { $in: orderedProductIds.map((id) => new Types.ObjectId(id)) },
        },
      },
    },
  );

  // 9. Broadcast real-time order creation across platform (Seller & Admin)
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

  return order.toObject();
}
