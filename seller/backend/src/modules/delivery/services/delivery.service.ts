import { Types } from 'mongoose';
import { AppError, DeliverySlot, Order, SellerProfile, realtimeEventBus } from '@haat/shared-backend';

export interface CreateSlotInput {
  date?: string; // Optional 'YYYY-MM-DD' — if omitted, slot applies daily recurring
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
  capacity?: number;
}

export interface UpdateSlotInput {
  startTime?: string;
  endTime?: string;
  capacity?: number;
  isActive?: boolean;
}

export const sellerDeliveryService = {
  /**
   * List delivery slots directly from the deliveryslots collection.
   * If date is omitted, returns all configured delivery slots for the seller.
   * If date is specified, returns slots applicable to that date.
   */
  async listSlots(sellerId: string, date?: string) {
    const sellerObjId = new Types.ObjectId(sellerId);
    const seller = await SellerProfile.findById(sellerObjId);
    if (!seller) {
      throw AppError.notFound('Seller store not found.');
    }

    // Auto-migrate any legacy slots from seller.deliveryConfig.dailySlots into deliveryslots collection
    const legacySlots: any[] = (seller as any).deliveryConfig?.dailySlots || [];
    if (legacySlots.length > 0) {
      for (const ls of legacySlots) {
        const exists = await DeliverySlot.findOne({
          sellerId: sellerObjId,
          startTime: ls.startTime,
          endTime: ls.endTime,
          $or: [{ date: null }, { date: { $exists: false } }],
        });
        if (!exists) {
          await DeliverySlot.create({
            sellerId: sellerObjId,
            date: null,
            dayOfWeek: null,
            startTime: ls.startTime,
            endTime: ls.endTime,
            capacity: ls.capacity || 20,
            maxCapacity: ls.capacity || 20,
            bookedCount: 0,
            isActive: ls.isActive !== false,
          });
        }
      }
      (seller as any).deliveryConfig.dailySlots = [];
      seller.markModified('deliveryConfig');
      await seller.save();
    }

    const query: any = { sellerId: sellerObjId, isActive: true };
    if (date) {
      query.$or = [{ date }, { date: null }, { date: { $exists: false } }];
    }

    const slots = await DeliverySlot.find(query).sort({ startTime: 1 }).lean();

    return slots.map((s) => ({
      id: s._id.toString(),
      date: s.date || 'Daily Recurring (Every Operating Day)',
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity ?? s.maxCapacity ?? 20,
      bookedCount: s.bookedCount || 0,
      remainingCapacity: Math.max(0, (s.capacity ?? s.maxCapacity ?? 20) - (s.bookedCount || 0)),
      isActive: s.isActive !== false,
      isDailyRecurring: !s.date,
      createdAt: (s as any).createdAt,
    }));
  },

  /**
   * Create a delivery slot directly in the deliveryslots MongoDB collection.
   * If input.date is provided, creates a date-specific DeliverySlot.
   * If input.date is omitted, creates a daily recurring slot (date: null) that applies every operating day.
   */
  async createSlot(sellerId: string, input: CreateSlotInput) {
    const { date, startTime, endTime, capacity = 20 } = input;

    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw AppError.badRequest('Invalid time format. Use HH:MM.');
    }
    if (startTime >= endTime) {
      throw AppError.badRequest('Start time must be before end time.');
    }
    if (capacity !== undefined && capacity < 1) {
      throw AppError.badRequest('Capacity must be at least 1 order.');
    }

    const sellerObjId = new Types.ObjectId(sellerId);
    const seller = await SellerProfile.findById(sellerObjId);
    if (!seller) {
      throw AppError.notFound('Seller store not found.');
    }

    // Check duplicate delivery slot in deliveryslots collection
    const duplicateQuery: any = {
      sellerId: sellerObjId,
      startTime,
      endTime,
      isActive: true,
    };
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw AppError.badRequest('Invalid date format. Use YYYY-MM-DD.');
      }
      duplicateQuery.date = date;
    } else {
      duplicateQuery.$or = [{ date: null }, { date: { $exists: false } }];
    }

    const existing = await DeliverySlot.findOne(duplicateQuery);
    if (existing) {
      throw AppError.conflict('A delivery slot for this time window already exists.');
    }

    // Store directly in deliveryslots collection
    const slot = await DeliverySlot.create({
      sellerId: sellerObjId,
      date: date || null,
      dayOfWeek: null,
      startTime,
      endTime,
      capacity,
      maxCapacity: capacity,
      bookedCount: 0,
      isActive: true,
    });

    await realtimeEventBus.publishDeliverySlotCapacityUpdated({
      slotId: slot._id.toString(),
      sellerId: sellerId.toString(),
      date: slot.date,
      capacity: slot.capacity,
      bookedCount: 0,
      remainingCapacity: slot.capacity,
    });

    return {
      id: slot._id.toString(),
      date: slot.date || 'Daily Recurring (Every Operating Day)',
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      bookedCount: slot.bookedCount,
      remainingCapacity: slot.capacity,
      isActive: slot.isActive,
      isDailyRecurring: !slot.date,
    };
  },

  /**
   * Batch create slots for multiple dates in the deliveryslots collection.
   */
  async batchCreateSlots(
    sellerId: string,
    input: { dates: string[]; startTime: string; endTime: string; capacity: number },
  ) {
    const { dates, startTime, endTime, capacity } = input;
    if (!dates || dates.length === 0) {
      throw AppError.badRequest('Select at least one date.');
    }

    const sellerObjId = new Types.ObjectId(sellerId);
    const created = [];
    for (const date of dates) {
      const existing = await DeliverySlot.findOne({
        sellerId: sellerObjId,
        date,
        startTime,
        endTime,
      });
      if (!existing) {
        const slot = await DeliverySlot.create({
          sellerId: sellerObjId,
          date,
          dayOfWeek: null,
          startTime,
          endTime,
          capacity,
          maxCapacity: capacity,
          bookedCount: 0,
          isActive: true,
        });
        created.push(slot);
      }
    }

    return { count: created.length };
  },

  /**
   * Update a slot by ID directly in the deliveryslots collection.
   */
  async updateSlot(sellerId: string, slotId: string, input: UpdateSlotInput) {
    const sellerObjId = new Types.ObjectId(sellerId);
    const slot = await DeliverySlot.findOne({ _id: slotId, sellerId: sellerObjId });
    if (!slot) {
      throw AppError.notFound('Delivery slot not found in database.');
    }

    if (input.startTime !== undefined) slot.startTime = input.startTime;
    if (input.endTime !== undefined) slot.endTime = input.endTime;

    if (slot.startTime >= slot.endTime) {
      throw AppError.badRequest('Start time must be before end time.');
    }

    if (input.capacity !== undefined) {
      if (input.capacity < slot.bookedCount) {
        throw AppError.badRequest(
          `Capacity cannot be set below ${slot.bookedCount} because ${slot.bookedCount} order(s) are already booked for this slot.`,
        );
      }
      slot.capacity = input.capacity;
      slot.maxCapacity = input.capacity;
    }

    if (input.isActive !== undefined) {
      slot.isActive = input.isActive;
    }

    await slot.save();

    await realtimeEventBus.publishDeliverySlotCapacityUpdated({
      slotId: slot._id.toString(),
      sellerId: sellerId.toString(),
      date: slot.date,
      capacity: slot.capacity,
      bookedCount: slot.bookedCount,
      remainingCapacity: Math.max(0, slot.capacity - slot.bookedCount),
    });

    return {
      id: slot._id.toString(),
      date: slot.date || 'Daily Recurring (Every Operating Day)',
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      bookedCount: slot.bookedCount,
      remainingCapacity: Math.max(0, slot.capacity - slot.bookedCount),
      isActive: slot.isActive,
      isDailyRecurring: !slot.date,
    };
  },

  /**
   * Delete a slot by ID directly from the deliveryslots collection.
   */
  async deleteSlot(sellerId: string, slotId: string) {
    const sellerObjId = new Types.ObjectId(sellerId);
    const slot = await DeliverySlot.findOne({ _id: slotId, sellerId: sellerObjId });
    if (!slot) {
      throw AppError.notFound('Delivery slot not found in database.');
    }

    if (slot.bookedCount > 0) {
      throw AppError.badRequest(
        `Cannot delete this delivery slot because it has ${slot.bookedCount} committed order(s). Please fulfill or reschedule them first.`,
      );
    }

    await DeliverySlot.deleteOne({ _id: slot._id });
    return { success: true };
  },

  /**
   * Retrieve orders associated with a delivery slot.
   */
  async getSlotOrders(sellerId: string, slotId: string) {
    const sellerObjId = new Types.ObjectId(sellerId);
    const slot = await DeliverySlot.findOne({ _id: slotId, sellerId: sellerObjId }).lean();
    if (!slot) {
      throw AppError.notFound('Delivery slot not found in database.');
    }

    const orders = await Order.find({
      sellerId: sellerObjId,
      'deliverySlot.slotId': slot._id,
    })
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    return {
      slot: {
        id: slot._id.toString(),
        date: slot.date || 'Daily Recurring Slot',
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity,
        bookedCount: slot.bookedCount,
        remainingCapacity: Math.max(0, slot.capacity - slot.bookedCount),
        isActive: slot.isActive,
      },
      orders: orders.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        totalAmountPaise: o.totalAmountPaise,
        fulfilmentStatus: o.fulfilmentStatus,
        paymentStatus: o.paymentStatus,
        customerName: o.shippingAddress?.name || 'Customer',
        customerPhone: o.shippingAddress?.phone || 'N/A',
        itemsCount: o.items?.length || 0,
        createdAt: o.createdAt,
      })),
    };
  },

  /**
   * Get delivery configuration for a seller (operating days, cutoff, lead time, blackout dates)
   */
  async getDeliveryConfig(sellerId: string) {
    const seller = await SellerProfile.findById(sellerId).select('deliveryConfig').lean();
    return {
      operatingDays: (seller as any)?.deliveryConfig?.operatingDays ?? [
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
        'SUNDAY',
      ],
      leadTimeHours: (seller as any)?.deliveryConfig?.leadTimeHours ?? 2,
      dailyCutoffTime: (seller as any)?.deliveryConfig?.dailyCutoffTime ?? '18:00',
      blackoutDates: (seller as any)?.deliveryConfig?.blackoutDates ?? [],
    };
  },

  /**
   * Update delivery configuration for a seller
   */
  async updateDeliveryConfig(
    sellerId: string,
    input: {
      operatingDays?: string[];
      leadTimeHours?: number;
      dailyCutoffTime?: string;
      blackoutDates?: string[];
    },
  ) {
    const seller = await SellerProfile.findById(sellerId);
    if (!seller) {
      throw AppError.notFound('Seller store not found.');
    }

    const current = (seller as any).deliveryConfig || {};

    if (input.operatingDays !== undefined) {
      current.operatingDays = input.operatingDays;
    }
    if (input.leadTimeHours !== undefined) {
      current.leadTimeHours = Math.max(0, input.leadTimeHours);
    }
    if (input.dailyCutoffTime !== undefined) {
      current.dailyCutoffTime = input.dailyCutoffTime;
    }
    if (input.blackoutDates !== undefined) {
      current.blackoutDates = input.blackoutDates.filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    }

    (seller as any).deliveryConfig = current;
    seller.markModified('deliveryConfig');
    await seller.save();

    return this.getDeliveryConfig(sellerId);
  },

  /**
   * Public/Buyer endpoint to retrieve available slots for a seller on a given date.
   * Respects blackout dates, operating days, daily cut-off time, and remaining capacity.
   * Queries directly from the deliveryslots collection.
   */
  async getAvailableSlots(sellerId: string, date: string) {
    const sellerObjId = new Types.ObjectId(sellerId);
    const seller = await SellerProfile.findById(sellerObjId);
    if (!seller) return [];

    const config = await this.getDeliveryConfig(sellerId);

    // 1. Check if requested date is in blackout dates
    if (config.blackoutDates.includes(date)) {
      return [];
    }

    // 2. Check if day of week is supported
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayName = DAYS[targetDate.getDay()];

    if (!config.operatingDays.includes(dayName)) {
      return [];
    }

    // 3. Check same-day cut-off time
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (date === todayStr) {
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      if (currentTimeStr > config.dailyCutoffTime) {
        return [];
      }
    }

    // 4. Query deliveryslots collection directly
    const slots = await DeliverySlot.find({
      sellerId: sellerObjId,
      isActive: true,
      $or: [{ date }, { date: null }, { dayOfWeek: dayName }],
    })
      .sort({ startTime: 1 })
      .lean();

    return slots
      .filter((s) => s.bookedCount < (s.capacity ?? s.maxCapacity ?? 20))
      .map((s) => ({
        slotId: s._id.toString(),
        startTime: s.startTime,
        endTime: s.endTime,
        label: `${s.startTime} - ${s.endTime}`,
        remainingCapacity: (s.capacity ?? s.maxCapacity ?? 20) - s.bookedCount,
      }));
  },
};
