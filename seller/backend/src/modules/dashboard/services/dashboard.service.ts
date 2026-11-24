import { Product, SellerProfile, Order, DeliverySlot, User } from '@haat/shared-backend';

export const sellerDashboardService = {
  async getStats(userId: string) {
    const seller = await SellerProfile.findOne({ userId });
    if (!seller) {
      return {
        isOnboarded: false,
        store: null,
        metrics: {
          totalProducts: 0,
          activeProducts: 0,
          lowStockProducts: 0,
          newOrders: 0,
          pendingOrders: 0,
          ordersProcessing: 0,
          ordersAwaitingFulfilment: 0,
          completedOrders: 0,
          totalCompletedSales: 0,
          todayRevenuePaise: 0,
          weeklyRevenuePaise: 0,
          monthlyRevenuePaise: 0,
          totalRevenuePaise: 0,
        },
        recentOrders: [],
        bestSellingProducts: [],
        upcomingDeliverySlots: [],
        revenueOverview: [],
      };
    }

    const sellerId = seller._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Core KPIs
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      newOrders,
      pendingOrders,
      ordersAwaitingFulfilment,
      ordersProcessing,
      completedOrders,
      allPaidOrders,
      recentOrdersRaw,
      upcomingSlotsRaw,
    ] = await Promise.all([
      Product.countDocuments({ sellerId }),
      Product.countDocuments({ sellerId, isActive: true }),
      Product.countDocuments({ sellerId, isActive: true, 'variants.stockQuantity': { $lte: 10 } }),
      Order.countDocuments({ sellerId, fulfilmentStatus: 'PENDING_CONFIRMATION' }),
      Order.countDocuments({ sellerId, fulfilmentStatus: { $in: ['PENDING_CONFIRMATION', 'CONFIRMED'] } }),
      Order.countDocuments({ sellerId, fulfilmentStatus: { $in: ['PROCESSING', 'PACKED', 'READY_FOR_DISPATCH'] } }),
      Order.countDocuments({ sellerId, fulfilmentStatus: { $in: ['PROCESSING', 'PACKED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DISPATCHED'] } }),
      Order.countDocuments({ sellerId, fulfilmentStatus: 'DELIVERED' }),
      Order.find({
        sellerId,
        $or: [{ paymentStatus: 'PAID' }, { fulfilmentStatus: 'DELIVERED' }],
      }).select('totalAmountPaise createdAt').lean(),
      Order.find({ sellerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('buyerId', 'fullName phoneNumber')
        .lean(),
      DeliverySlot.find({
        sellerId,
        $or: [
          { date: { $gte: now.toISOString().split('T')[0] } },
          { date: null },
          { date: { $exists: false } },
        ],
        isActive: true,
      })
        .sort({ date: 1, startTime: 1 })
        .limit(4)
        .lean(),
    ]);

    // Calculate Real Revenue figures from actual eligible paid/delivered orders
    let totalRevenuePaise = 0;
    let todayRevenuePaise = 0;
    let weeklyRevenuePaise = 0;
    let monthlyRevenuePaise = 0;

    for (const o of allPaidOrders) {
      const amount = o.totalAmountPaise || 0;
      const orderDate = new Date(o.createdAt);
      totalRevenuePaise += amount;
      if (orderDate >= todayStart) {
        todayRevenuePaise += amount;
      }
      if (orderDate >= weekStart) {
        weeklyRevenuePaise += amount;
      }
      if (orderDate >= monthStart) {
        monthlyRevenuePaise += amount;
      }
    }

    // 2. 7-Day Real Revenue Overview
    const revenueOverview: Array<{ date: string; label: string; revenuePaise: number; ordersCount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dateStr = dayStart.toISOString().split('T')[0];
      const label = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric' }).format(dayStart);

      let dayRevenue = 0;
      let dayCount = 0;

      for (const o of allPaidOrders) {
        const orderDate = new Date(o.createdAt);
        if (orderDate >= dayStart && orderDate <= dayEnd) {
          dayRevenue += o.totalAmountPaise || 0;
          dayCount++;
        }
      }

      revenueOverview.push({
        date: dateStr,
        label,
        revenuePaise: dayRevenue,
        ordersCount: dayCount,
      });
    }

    // 3. Best-Selling Products from actual Order items
    let bestSellingAgg: any[] = [];
    try {
      bestSellingAgg = await Order.aggregate([
        { $match: { sellerId, fulfilmentStatus: { $ne: 'CANCELLED' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.sku',
            title: { $first: '$items.title' },
            productId: { $first: '$items.productId' },
            unitsSold: { $sum: '$items.quantity' },
            revenuePaise: { $sum: '$items.subtotalPaise' },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 5 },
      ]);
    } catch {
      bestSellingAgg = [];
    }

    return {
      isOnboarded: true,
      store: {
        id: seller._id.toString(),
        storeName: seller.storeName,
        storeSlug: seller.storeSlug,
        status: seller.status,
        isOpen: (seller as any).isOpen ?? true,
        isVerified: seller.isVerified,
        isActive: seller.isActive,
      },
      metrics: {
        totalProducts,
        activeProducts,
        lowStockProducts,
        newOrders,
        pendingOrders,
        ordersProcessing,
        ordersAwaitingFulfilment,
        completedOrders,
        totalCompletedSales: completedOrders,
        todayRevenuePaise,
        weeklyRevenuePaise,
        monthlyRevenuePaise,
        totalRevenuePaise,
      },
      recentOrders: recentOrdersRaw.map((o: any) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        buyerName: o.shippingAddress?.name || o.buyerId?.fullName || 'Customer',
        totalAmountPaise: o.totalAmountPaise,
        fulfilmentStatus: o.fulfilmentStatus,
        paymentStatus: o.paymentStatus,
        deliveryDate: o.deliveryDate || null,
        createdAt: o.createdAt,
      })),
      bestSellingProducts: bestSellingAgg.map((item: any) => ({
        sku: item._id,
        title: item.title,
        productId: item.productId?.toString(),
        unitsSold: item.unitsSold,
        revenuePaise: item.revenuePaise,
      })),
      upcomingDeliverySlots: upcomingSlotsRaw.map((s) => ({
        id: s._id.toString(),
        date: s.date || 'Daily Recurring (Every Day)',
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        remainingCapacity: Math.max(0, s.capacity - s.bookedCount),
        isActive: s.isActive,
      })),
      revenueOverview,
    };
  },
};
