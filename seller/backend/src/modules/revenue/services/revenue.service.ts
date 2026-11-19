import { Order, SellerProfile, User } from '@haat/shared-backend';

export const sellerRevenueService = {
  async getRevenueStats(sellerId: string, page = 1, limit = 20) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
        { $sort: { revenuePaise: -1 } },
        { $limit: 10 },
      ]);
    } catch {
      bestSellingAgg = [];
    }

    const [
      allOrders,
      completedOrdersCount,
      historyOrders,
      totalHistoryCount,
    ] = await Promise.all([
      Order.find({ sellerId }).select('totalAmountPaise fulfilmentStatus paymentStatus createdAt').lean(),
      Order.countDocuments({ sellerId, fulfilmentStatus: 'DELIVERED' }),
      Order.find({
        sellerId,
        $or: [{ paymentStatus: 'PAID' }, { fulfilmentStatus: 'DELIVERED' }],
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('buyerId', 'fullName phoneNumber')
        .lean(),
      Order.countDocuments({
        sellerId,
        $or: [{ paymentStatus: 'PAID' }, { fulfilmentStatus: 'DELIVERED' }],
      }),
    ]);

    let totalRevenuePaise = 0;
    let todayRevenuePaise = 0;
    let weeklyRevenuePaise = 0;
    let monthlyRevenuePaise = 0;
    let grossSalesPaise = 0;
    let cancelledAmountPaise = 0;
    let deliveredPaise = 0;
    let pendingPaise = 0;

    for (const o of allOrders) {
      const amount = o.totalAmountPaise || 0;
      const orderDate = new Date(o.createdAt);
      const isPaid = o.paymentStatus === 'PAID' || o.fulfilmentStatus === 'DELIVERED';

      if (o.fulfilmentStatus === 'CANCELLED') {
        cancelledAmountPaise += amount;
      } else {
        grossSalesPaise += amount;
      }

      if (o.fulfilmentStatus === 'DELIVERED') {
        deliveredPaise += amount;
      } else if (o.fulfilmentStatus !== 'CANCELLED') {
        pendingPaise += amount;
      }

      if (isPaid) {
        totalRevenuePaise += amount;
        if (orderDate >= todayStart) todayRevenuePaise += amount;
        if (orderDate >= weekStart) weeklyRevenuePaise += amount;
        if (orderDate >= monthStart) monthlyRevenuePaise += amount;
      }
    }

    const averageOrderValuePaise =
      completedOrdersCount > 0 ? Math.round(totalRevenuePaise / completedOrdersCount) : 0;

    // Build 30-day daily timeseries for interactive graphs
    const dailyTrend: Array<{ date: string; label: string; value: number; secondaryValue: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dateStr = dayStart.toISOString().split('T')[0];
      const label = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(dayStart);

      let dayRevenuePaise = 0;
      let dayOrderCount = 0;

      for (const o of allOrders) {
        const isPaid = o.paymentStatus === 'PAID' || o.fulfilmentStatus === 'DELIVERED';
        if (!isPaid) continue;
        const orderDate = new Date(o.createdAt);
        if (orderDate >= dayStart && orderDate <= dayEnd) {
          dayRevenuePaise += o.totalAmountPaise || 0;
          dayOrderCount++;
        }
      }

      dailyTrend.push({
        date: dateStr,
        label,
        value: Math.round(dayRevenuePaise / 100), // In Rupees
        secondaryValue: dayOrderCount,
      });
    }

    // Revenue composition segments
    const composition = [
      { id: 'delivered', label: 'Delivered (Settled)', value: Math.round(deliveredPaise / 100), color: '#10b981' },
      { id: 'pending', label: 'In Progress / Processing', value: Math.round(pendingPaise / 100), color: '#16135c' },
      { id: 'cancelled', label: 'Cancelled / Refunded', value: Math.round(cancelledAmountPaise / 100), color: '#f43f5e' },
    ];

    return {
      metrics: {
        totalRevenuePaise,
        todayRevenuePaise,
        weeklyRevenuePaise,
        monthlyRevenuePaise,
        completedOrders: completedOrdersCount,
        averageOrderValuePaise,
        grossSalesPaise,
        cancelledAmountPaise,
        netRevenuePaise: Math.max(0, grossSalesPaise - cancelledAmountPaise),
      },
      dailyTrend,
      composition,
      bestSellingProducts: bestSellingAgg.map((item: any) => ({
        sku: item._id,
        title: item.title,
        productId: item.productId?.toString(),
        unitsSold: item.unitsSold,
        revenuePaise: item.revenuePaise,
      })),
      salesHistory: {
        items: historyOrders.map((o: any) => ({
          id: o._id.toString(),
          orderNumber: o.orderNumber,
          customerName: o.shippingAddress?.name || o.buyerId?.fullName || 'Customer',
          totalAmountPaise: o.totalAmountPaise,
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod || 'ONLINE',
          fulfilmentStatus: o.fulfilmentStatus,
          itemsCount: o.items?.length || 0,
          createdAt: o.createdAt,
        })),
        meta: {
          total: totalHistoryCount,
          page,
          limit,
          totalPages: Math.ceil(totalHistoryCount / limit) || 1,
        },
      },
    };
  },
};
