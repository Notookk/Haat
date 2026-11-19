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
   * List delivery slots.
   * If date is omitted, returns the seller's daily recurring delivery slots (same every day).
   * If date is specified, returns date-specific delivery slots.
   */
  async listSlots(sellerId: string, date?: string) {
    if (date) {
      const slots = await DeliverySlot.find({ sellerId, date }).sort({ startTime: 1 }).lean();
      return slots.map((s) => ({
        id: s._id.toString(),
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        remainingCapacity: Math.max(0, s.capacity - s.bookedCount),
        isActive: s.isActive,
        createdAt: s.createdAt,
      }));
    }

    // Daily Recurring Slots (Default Schedule)
    const seller = await SellerProfile.findById(sellerId);
    if (!seller) {
      throw AppError.notFound('Seller store not found.');
    }

    const dailySlots = (seller as any).deliveryConfig?.dailySlots || [];

    return dailySlots.map((s: any) => ({
      id: s._id ? s._id.toString() : `${s.startTime}-${s.endTime}`,
      date: 'Daily Recurring (Every Operating Day)',
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      bookedCount: 0,
      remainingCapacity: s.capacity,
      isActive: s.isActive ?? true,
      isDailyRecurring: true,
      createdAt: s.createdAt,
    }));
  },

  /**
   * Create a delivery slot.
   * If input.date is provided, creates a date-specific DeliverySlot.
   * If input.date is omitted, creates a daily recurring slot that applies every operating day.
   */
  async createSlot(sellerId: string, input: CreateSlotInput) {
    const { date, startTime, endTime, capacity = 9999 } = input;

    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw AppError.badRequest('Invalid time format. Use HH:MM.');
    }
    if (capacity !== undefined && capacity < 1) {
      throw AppError.badRequest('Capacity must be at least 1 order.');
    }

    // 1. Date-specific slot creation
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw AppError.badRequest('Invalid date format. Use YYYY-MM-DD.');
      }
      const existing = await DeliverySlot.findOne({ sellerId, date, startTime, endTime });
      if (existing) {
        throw AppError.conflict('A delivery slot for this date and time already exists.');
      }

      const slot = await DeliverySlot.create({
        sellerId,
        date,
        startTime,
        endTime,
        capacity,
        bookedCount: 0,
        isActive: true,
      });

      await realtimeEventBus.publishDeliverySlotCapacityUpdated({
        slotId: slot._id.toString(),
        sellerId,
        date: slot.date,
        capacity: slot.capacity,
        bookedCount: 0,
        remainingCapacity: slot.capacity,
      });

      return {
        id: slot._id.toString(),
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity,
        bookedCount: slot.bookedCount,
        remainingCapacity: slot.capacity,
        isActive: slot.isActive,
        isDailyRecurring: false,
      };
    }

    // 2. Daily Recurring Slot Creation (No date required, same everyday)
    const seller = await SellerProfile.findById(sellerId);
    if (!seller) {
      throw AppError.notFound('Seller store not found.');
    }

    if (!(seller as any).deliveryConfig) {
      (seller as any).deliveryConfig = {};
    }
    if (!(seller as any).deliveryConfig.dailySlots) {
      (seller as any).deliveryConfig.dailySlots = [];
    }

    const currentSlots: any[] = (seller as any).deliveryConfig.dailySlots;
    const duplicate = currentSlots.some((s) => s.startTime === startTime && s.endTime === endTime);
    if (duplicate) {
      throw AppError.conflict('A daily delivery slot for this time window already exists.');
    }

    currentSlots.push({
      startTime,
      endTime,
      capacity,
      isActive: true,
    });

    seller.markModified('deliveryConfig');
    await seller.save();

    const createdSlot = currentSlots[currentSlots.length - 1];

    return {
      id: createdSlot._id.toString(),
      date: 'Daily Recurring (Every Operating Day)',
      startTime: createdSlot.startTime,
      endTime: createdSlot.endTime,
      capacity: createdSlot.capacity,
      bookedCount: 0,
      remainingCapacity: createdSlot.capacity,
      isActive: createdSlot.isActive,
      isDailyRecurring: true,
    };
  },

  /**
   * Batch create slots for multiple dates (backwards compatibility).
   */
  async batchCreateSlots(sellerId: string, input: { dates: string[]; startTime: string; endTime: string; capacity: number }) {
    const { dates, startTime, endTime, capacity } = input;
    if (!dates || dates.length === 0) {
      throw AppError.badRequest('Select at least one date.');
    }

    const created = [];
    for (const date of dates) {
      const existing = await DeliverySlot.findOne({ sellerId, date, startTime, endTime });
      if (!existing) {
        const slot = await DeliverySlot.create({
          sellerId,
          date,
          startTime,
          endTime,
          capacity,
          bookedCount: 0,
          isActive: true,
        });
        created.push(slot);
      }
    }

    return { count: created.length };
  },

  /**
   * Update a slot by ID (supports daily recurring slots as well as date-specific slots).
   */
  async updateSlot(sellerId: string, slotId: string, input: UpdateSlotInput) {
    // 1. Check daily recurring slots first
    const seller = await SellerProfile.findById(sellerId);
    if (seller && (seller as any).deliveryConfig?.dailySlots) {
      const dailySlots: any[] = (seller as any).deliveryConfig.dailySlots;
      const targetIndex = dailySlots.findIndex((s) => s._id.toString() === slotId);

      if (targetIndex !== -1) {
        const slot = dailySlots[targetIndex];
        if (input.startTime !== undefined) slot.startTime = input.startTime;
        if (input.endTime !== undefined) slot.endTime = input.endTime;
        if (input.capacity !== undefined) slot.capacity = input.capacity;
        if (input.isActive !== undefined) slot.isActive = input.isActive;

        seller.markModified('deliveryConfig');
        await seller.save();

        return {
          id: slot._id.toString(),
          date: 'Daily Recurring (Every Operating Day)',
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity: slot.capacity,
          bookedCount: 0,
          remainingCapacity: slot.capacity,
          isActive: slot.isActive,
          isDailyRecurring: true,
        };
      }
    }

    // 2. Check date-specific slot
    const slot = await DeliverySlot.findOne({ _id: slotId, sellerId });
    if (!slot) {
      throw AppError.notFound('Delivery slot not found.');
    }

    if (input.startTime !== undefined) slot.startTime = input.startTime;
    if (input.endTime !== undefined) slot.endTime = input.endTime;

    if (input.capacity !== undefined) {
      if (input.capacity < slot.bookedCount) {
        throw AppError.badRequest(
          `Capacity cannot be set below ${slot.bookedCount} because ${slot.bookedCount} order(s) are already booked for this slot.`,
        );
      }
      slot.capacity = input.capacity;
    }

    if (input.isActive !== undefined) {
      slot.isActive = input.isActive;
    }

    await slot.save();

    await realtimeEventBus.publishDeliverySlotCapacityUpdated({
      slotId: slot._id.toString(),
      sellerId,
      date: slot.date,
      capacity: slot.capacity,
      bookedCount: slot.bookedCount,
      remainingCapacity: Math.max(0, slot.capacity - slot.bookedCount),
    });

    return {
      id: slot._id.toString(),
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      bookedCount: slot.bookedCount,
      remainingCapacity: Math.max(0, slot.capacity - slot.bookedCount),
      isActive: slot.isActive,
      isDailyRecurring: false,
    };
  },

  /**
   * Delete a slot by ID (supports daily recurring slots as well as date-specific slots).
   */
  async deleteSlot(sellerId: string, slotId: string) {
    // 1. Check daily recurring slots
    const seller = await SellerProfile.findById(sellerId);
    if (seller && (seller as any).deliveryConfig?.dailySlots) {
      const dailySlots: any[] = (seller as any).deliveryConfig.dailySlots;
      const targetIndex = dailySlots.findIndex((s) => s._id.toString() === slotId);

      if (targetIndex !== -1) {
        dailySlots.splice(targetIndex, 1);
        seller.markModified('deliveryConfig');
        await seller.save();
        return { success: true };
      }
    }

    // 2. Check date-specific slot
    const slot = await DeliverySlot.findOne({ _id: slotId, sellerId });
    if (!slot) {
      throw AppError.notFound('Delivery slot not found.');
    }

    if (slot.bookedCount > 0) {
      throw AppError.badRequest(
        `Cannot delete this delivery slot because it has ${slot.bookedCount} committed order(s). Please fulfill or reschedule them first.`,
      );
    }

    await DeliverySlot.deleteOne({ _id: slotId });
    return { success: true };
  },

  async getSlotOrders(sellerId: string, slotId: string) {
    const slot = await DeliverySlot.findOne({ _id: slotId, sellerId });
    if (!slot) {
      // Slot could be a daily recurring template with orders referencing created date instances
      const orders = await Order.find({
        sellerId,
        $or: [{ 'deliverySlot.slotId': slotId }],
      })
        .sort({ createdAt: -1 })
        .lean();

      return {
        slot: {
          id: slotId,
          date: 'Daily Recurring Slot',
          startTime: '09:00',
          endTime: '11:00',
          capacity: 10,
          bookedCount: orders.length,
          remainingCapacity: Math.max(0, 10 - orders.length),
          isActive: true,
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
    }

    const orders = await Order.find({
      sellerId,
      'deliverySlot.slotId': slot._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return {
      slot: {
        id: slot._id.toString(),
        date: slot.date,
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
   * Get delivery configuration for a seller (operating days, cutoff, lead time, blackout dates, dailySlots)
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
      dailySlots: (seller as any)?.deliveryConfig?.dailySlots ?? [],
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
      dailySlots?: Array<{ startTime: string; endTime: string; capacity: number; isActive?: boolean }>;
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
    if (input.dailySlots !== undefined) {
      current.dailySlots = input.dailySlots;
    }

    (seller as any).deliveryConfig = current;
    seller.markModified('deliveryConfig');
    await seller.save();

    return this.getDeliveryConfig(sellerId);
  },

  /**
   * Public/Buyer endpoint to retrieve available slots for a seller on a given date.
   * Respects blackout dates, operating days, daily cut-off time, and remaining capacity.
   * Automatically projects daily recurring slots onto the requested date.
   */
  async getAvailableSlots(sellerId: string, date: string) {
    const seller = await SellerProfile.findById(sellerId);
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

    // 4. Ensure date-specific DeliverySlot records exist for all active dailySlots
    const dailySlots: any[] = (seller as any).deliveryConfig?.dailySlots || [];
    if (dailySlots.length > 0) {
      for (const ds of dailySlots) {
        if (ds.isActive !== false) {
          const existing = await DeliverySlot.findOne({
            sellerId,
            date,
            startTime: ds.startTime,
            endTime: ds.endTime,
          });
          if (!existing) {
            await DeliverySlot.create({
              sellerId,
              date,
              startTime: ds.startTime,
              endTime: ds.endTime,
              capacity: ds.capacity,
              bookedCount: 0,
              isActive: true,
            });
          }
        }
      }
    }

    const slots = await DeliverySlot.find({
      sellerId,
      date,
      isActive: true,
    })
      .sort({ startTime: 1 })
      .lean();

    return slots
      .filter((s) => s.bookedCount < s.capacity)
      .map((s) => ({
        slotId: s._id.toString(),
        startTime: s.startTime,
        endTime: s.endTime,
        label: `${s.startTime} - ${s.endTime}`,
        remainingCapacity: s.capacity - s.bookedCount,
      }));
  },
};
