import { Types } from 'mongoose';
import {
  DeliverySlot,
  SlotCounter,
  DeliveryBlackout,
  SellerProfile,
  Order,
  AppError,
} from '@haat/shared-backend';
import {
  DAYS_OF_WEEK,
  type DayOfWeek,
  type CreateDeliverySlotInput,
  type UpdateDeliverySlotInput,
  type CreateBlackoutInput,
} from '@haat/shared-contracts';

const DAY_NAMES: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

export interface FormattedSlotResponse {
  id: string;
  slotId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  label: string;
  period?: string;
  maxCapacity: number;
  bookedCount: number;
  remainingCapacity: number;
  status: 'AVAILABLE' | 'FILLING_FAST' | 'SOLD_OUT';
  badge?: string;
  badgeColor?: string;
}

export async function getAvailableSlots(sellerId: string, dateStr: string) {
  let sellerObjectId: Types.ObjectId | null = null;
  if (sellerId && Types.ObjectId.isValid(sellerId)) {
    sellerObjectId = new Types.ObjectId(sellerId);
  } else if (sellerId) {
    const profile = await SellerProfile.findOne({
      $or: [{ storeSlug: sellerId }, { businessName: sellerId }],
    }).lean();
    if (profile) {
      sellerObjectId = profile._id as Types.ObjectId;
    }
  }

  // Fallback to active seller if sellerId was not provided or not resolved
  if (!sellerObjectId) {
    const activeSeller =
      (await SellerProfile.findOne({ status: 'ACTIVE' }).lean()) ||
      (await SellerProfile.findOne({}).lean());
    if (activeSeller) {
      sellerObjectId = activeSeller._id as Types.ObjectId;
    }
  }

  if (!sellerObjectId) {
    return { slots: [], isBlackout: false, reason: null };
  }

  // Check blackout
  const blackout = await DeliveryBlackout.findOne({
    sellerId: sellerObjectId,
    date: dateStr,
  }).lean();

  if (blackout) {
    return {
      slots: [],
      isBlackout: true,
      reason: blackout.reason || 'Seller has marked this date as unavailable for deliveries.',
    };
  }

  // Derive day of week
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) {
    throw AppError.badRequest('Invalid date format. Expected YYYY-MM-DD.');
  }
  const dayOfWeek = DAY_NAMES[dateObj.getUTCDay()];

  // Query active slot templates from deliveryslots collection for seller
  const slotTemplates = await DeliverySlot.find({
    sellerId: sellerObjectId,
    isActive: true,
    $or: [
      { date: dateStr },
      { dayOfWeek },
      { date: null, dayOfWeek: null },
      { date: null, dayOfWeek: 'ALL' },
      { date: { $exists: false } },
    ],
  })
    .sort({ startTime: 1 })
    .lean();

  // If no specific slots configured, return empty array (no dummy slots)
  if (!slotTemplates || slotTemplates.length === 0) {
    return { slots: [], isBlackout: false, reason: null };
  }

  // Fetch counters for this date
  const slotIds = slotTemplates.map((s) => s._id);
  const counters = await SlotCounter.find({
    sellerId: sellerObjectId,
    slotId: { $in: slotIds },
    date: dateStr,
  }).lean();

  const counterMap = new Map(counters.map((c) => [String(c.slotId), c]));

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };

  const getWindowPeriod = (t: string) => {
    const [h] = t.split(':').map(Number);
    if (h < 12) return 'Morning Window';
    if (h < 17) return 'Afternoon Window';
    return 'Evening Window';
  };

  const formattedSlots: FormattedSlotResponse[] = slotTemplates.map((slot: any, index: number) => {
    const counter = counterMap.get(String(slot._id));
    const maxCapacity = slot.maxCapacity ?? slot.capacity ?? 20;
    const booked = counter?.booked ?? 0;
    const remaining = Math.max(0, maxCapacity - booked);

    let status: 'AVAILABLE' | 'FILLING_FAST' | 'SOLD_OUT' = 'AVAILABLE';
    if (remaining === 0) {
      status = 'SOLD_OUT';
    } else if (remaining <= Math.ceil(maxCapacity * 0.25)) {
      status = 'FILLING_FAST';
    }

    const badge =
      index === 0 ? 'Fastest Delivery' : index === 1 ? 'Recommended' : 'Available';
    const badgeColor =
      index === 0
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : index === 1
          ? 'bg-blue-100 text-[#16135c] border-blue-200'
          : 'bg-gray-100 text-gray-700 border-gray-200';

    return {
      id: String(slot._id),
      slotId: String(slot._id),
      dayOfWeek: (slot.dayOfWeek || dayOfWeek) as DayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      label: `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`,
      period: getWindowPeriod(slot.startTime),
      maxCapacity,
      bookedCount: booked,
      remainingCapacity: remaining,
      status,
      badge,
      badgeColor,
    };
  });

  return { slots: formattedSlots, isBlackout: false, reason: null };
}

export async function createSellerSlot(userId: string, input: CreateDeliverySlotInput) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only registered sellers can manage delivery slots.');
  }

  const slot = await DeliverySlot.create({
    sellerId: seller._id,
    ...input,
    isActive: true,
  });

  return slot;
}

export async function listSellerSlots(userId: string) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only registered sellers can view delivery slots.');
  }

  return DeliverySlot.find({ sellerId: seller._id, isActive: true })
    .sort({ dayOfWeek: 1, startTime: 1 })
    .lean();
}

export async function updateSellerSlot(
  userId: string,
  slotId: string,
  input: UpdateDeliverySlotInput,
) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only registered sellers can modify delivery slots.');
  }

  const slot = await DeliverySlot.findOneAndUpdate(
    { _id: slotId, sellerId: seller._id },
    { $set: input },
    { new: true },
  ).lean();

  if (!slot) {
    throw AppError.notFound('Slot not found or unauthorized.');
  }
  return slot;
}

export async function deleteSellerSlot(userId: string, slotId: string) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only registered sellers can delete delivery slots.');
  }

  const slot = await DeliverySlot.findOneAndUpdate(
    { _id: slotId, sellerId: seller._id },
    { $set: { isActive: false } },
    { new: true },
  ).lean();

  if (!slot) {
    throw AppError.notFound('Slot not found.');
  }
  return { message: 'Slot deactivated successfully.' };
}

export async function addBlackoutDate(userId: string, input: CreateBlackoutInput) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only registered sellers can configure blackout dates.');
  }

  const blackout = await DeliveryBlackout.findOneAndUpdate(
    { sellerId: seller._id, date: input.date },
    { $set: { reason: input.reason ?? null } },
    { upsert: true, new: true },
  ).lean();

  return blackout;
}

export async function listBlackoutDates(userId: string) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only registered sellers can view blackout dates.');
  }

  return DeliveryBlackout.find({ sellerId: seller._id }).sort({ date: 1 }).lean();
}

export async function getSlotOrders(userId: string, slotId: string) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only registered sellers can view slot orders.');
  }

  const slot = await DeliverySlot.findOne({ _id: slotId, sellerId: seller._id }).lean();
  if (!slot) {
    throw AppError.notFound('Delivery slot not found.');
  }

  const orders = await Order.find({
    sellerId: seller._id,
    'deliverySlot.slotId': new Types.ObjectId(slotId),
  })
    .sort({ createdAt: -1 })
    .lean();

  const formattedOrders = orders.map((o: any) => ({
    id: String(o._id),
    orderNumber: o.orderNumber,
    totalAmountPaise: o.totalAmountPaise,
    fulfilmentStatus: o.fulfilmentStatus,
    paymentStatus: o.paymentStatus,
    customerName: o.shippingAddress?.fullName || 'Customer',
    customerPhone: o.shippingAddress?.phoneNumber || '',
    itemsCount: o.items?.length || 0,
    createdAt: o.createdAt?.toISOString?.() || String(o.createdAt),
  }));

  return { slot, orders: formattedOrders };
}
