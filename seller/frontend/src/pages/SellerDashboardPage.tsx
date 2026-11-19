import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Store,
  Layers,
  Calendar,
} from 'lucide-react';
import {
  api,
  Button,
  Panel,
  SkeletonBlock,
  ErrorState,
  money,
  Badge,
  createSocketClient,
  getAccessToken,
  type Tone,
} from '@haat/shared-frontend';
import { SOCKET_EVENTS } from '@haat/shared-contracts';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';

interface DashboardStatsResponse {
  isOnboarded: boolean;
  store: {
    id: string;
    storeName: string;
    storeSlug: string;
    status?: string;
    isOpen?: boolean;
    isVerified: boolean;
    isActive: boolean;
  } | null;
  metrics: {
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    newOrders: number;
    pendingOrders: number;
    ordersProcessing: number;
    ordersAwaitingFulfilment: number;
    completedOrders: number;
    totalCompletedSales: number;
    todayRevenuePaise: number;
    weeklyRevenuePaise: number;
    monthlyRevenuePaise: number;
    totalRevenuePaise: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    buyerName: string;
    totalAmountPaise: number;
    fulfilmentStatus: string;
    paymentStatus: string;
    deliveryDate: string | null;
    createdAt: string;
  }>;
  bestSellingProducts: Array<{
    sku: string;
    title: string;
    productId?: string;
    unitsSold: number;
    revenuePaise: number;
  }>;
  upcomingDeliverySlots: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    bookedCount: number;
    remainingCapacity: number;
    isActive: boolean;
  }>;
  revenueOverview: Array<{
    date: string;
    label: string;
    revenuePaise: number;
    ordersCount: number;
  }>;
}

function toneForFulfilment(status: string): Tone {
  switch (status) {
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    case 'PROCESSING':
    case 'PACKED':
    case 'READY_FOR_DISPATCH':
    case 'OUT_FOR_DELIVERY':
      return 'brand';
    case 'CONFIRMED':
      return 'neutral';
    default:
      return 'warning';
  }
}

export function SellerDashboardPage() {
  const { seller } = useSellerAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<DashboardStatsResponse>({
    queryKey: ['seller', 'dashboard', 'stats'],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardStatsResponse }>('/api/v1/seller/dashboard/stats');
      return (res.data as unknown as { data: DashboardStatsResponse }).data || res.data;
    },
    enabled: Boolean(seller),
    retry: 2,
    retryDelay: 1000,
  });

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    const token = getAccessToken();
    const socket = createSocketClient({ token });

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard', 'stats'] });
    };

    socket.on(SOCKET_EVENTS.ORDER_CREATED, invalidate);
    socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGED, invalidate);
    socket.on(SOCKET_EVENTS.DELIVERY_SLOT_CAPACITY_UPDATED, invalidate);
    socket.on(SOCKET_EVENTS.SELLER_STATUS_CHANGED, invalidate);

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const metrics = data?.metrics ?? {
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
  };

  const store = data?.store;

  return (
    <div className="w-full space-y-6">
      {/* 1. Header with Store Status & Quick Actions */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-display-md text-ink-900 font-extrabold">
              {seller?.storeName || store?.storeName || 'My Store'}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-micro font-bold border tracking-wide ${
                (seller?.status || store?.status) === 'ACTIVE'
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : (seller?.status || store?.status) === 'PENDING_APPROVAL'
                    ? 'border-amber-500 text-amber-700 bg-amber-50'
                    : 'border-line text-ink-600 bg-surface-sunken'
              }`}
            >
              {seller?.status || store?.status || 'ACTIVE'}
            </span>
            <Badge tone={store?.isOpen !== false ? 'success' : 'warning'}>
              {store?.isOpen !== false ? 'Open for Orders' : 'Temporarily Closed'}
            </Badge>
          </div>
          <p className="mt-1 text-body text-ink-500">
            Real-time store operations, inventory health, order processing, and scheduled slots.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="secondary" size="sm">
            <Link to="/orders">
              <ShoppingBag className="mr-1.5 h-4 w-4 text-brand-600" />
              View Orders
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/delivery-slots">
              <Clock className="mr-1.5 h-4 w-4 text-brand-600" />
              Manage Slots
            </Link>
          </Button>
          <Button asChild className="bg-[#16135c] hover:bg-[#12104b] text-white" size="sm">
            <Link to="/products/new">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
          </div>
          <SkeletonBlock className="h-64 w-full" />
        </div>
      ) : error ? (
        <ErrorState message="Could not load store dashboard statistics." onRetry={() => void refetch()} />
      ) : (
        <>
          {/* 2. Fully Dynamic Operational KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Products Card */}
            <Panel className="p-4 border-l-4 border-l-brand-600 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-ink-500">
                  <span className="text-micro font-bold uppercase tracking-wider text-ink-500">Products &amp; Stock</span>
                  <Package className="h-5 w-5 text-brand-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-ink-900">{metrics.totalProducts}</span>
                    <span className="text-micro text-ink-400 ml-1.5">Total</span>
                  </div>
                  <div className="text-right">
                    <span className="text-title font-bold text-emerald-600">{metrics.activeProducts}</span>
                    <span className="text-micro text-ink-400 block">Active</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-micro">
                <span className="text-ink-500">Low Stock Listings:</span>
                <span className={`font-bold ${metrics.lowStockProducts > 0 ? 'text-amber-600' : 'text-ink-400'}`}>
                  {metrics.lowStockProducts} item{metrics.lowStockProducts === 1 ? '' : 's'}
                </span>
              </div>
            </Panel>

            {/* Orders Pipeline Card */}
            <Panel className="p-4 border-l-4 border-l-amber-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-ink-500">
                  <span className="text-micro font-bold uppercase tracking-wider text-ink-500">New &amp; Pending Orders</span>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-amber-600">{metrics.newOrders}</span>
                    <span className="text-micro text-ink-400 ml-1.5">New</span>
                  </div>
                  <div className="text-right">
                    <span className="text-title font-bold text-ink-800">{metrics.pendingOrders}</span>
                    <span className="text-micro text-ink-400 block">Pending</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-micro">
                <span className="text-ink-500">Orders Being Processed:</span>
                <span className="font-bold text-brand-700">{metrics.ordersProcessing} active</span>
              </div>
            </Panel>

            {/* Fulfilment & Completed Sales Card */}
            <Panel className="p-4 border-l-4 border-l-blue-600 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-ink-500">
                  <span className="text-micro font-bold uppercase tracking-wider text-ink-500">Fulfilment &amp; Sales</span>
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-blue-600">{metrics.ordersAwaitingFulfilment}</span>
                    <span className="text-micro text-ink-400 ml-1.5">In Progress</span>
                  </div>
                  <div className="text-right">
                    <span className="text-title font-bold text-emerald-600">{metrics.completedOrders}</span>
                    <span className="text-micro text-ink-400 block">Delivered</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-micro">
                <span className="text-ink-500">Total Completed Sales:</span>
                <span className="font-bold text-emerald-700">{metrics.totalCompletedSales} orders</span>
              </div>
            </Panel>

            {/* Revenue Telemetry Card */}
            <Panel className="p-4 border-l-4 border-l-emerald-600 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-ink-500">
                  <span className="text-micro font-bold uppercase tracking-wider text-ink-500">Revenue (Paise / INR)</span>
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-ink-900">{money(metrics.todayRevenuePaise)}</span>
                    <span className="text-micro text-ink-400 block">Today</span>
                  </div>
                  <div className="text-right">
                    <span className="text-title font-bold text-emerald-700">{money(metrics.totalRevenuePaise)}</span>
                    <span className="text-micro text-ink-400 block">Total Gross</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-micro text-ink-500">
                <span>7d: <strong className="text-ink-800">{money(metrics.weeklyRevenuePaise)}</strong></span>
                <span>30d: <strong className="text-ink-800">{money(metrics.monthlyRevenuePaise)}</strong></span>
              </div>
            </Panel>
          </div>

          {/* 3. Main Operational Sections (2-Column Grid) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Recent Orders */}
            <Panel className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-brand-600" />
                    <h2 className="text-subtitle font-bold text-ink-900">Recent Orders</h2>
                  </div>
                  <Link to="/orders" className="text-caption font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1">
                    All orders <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {data?.recentOrders && data.recentOrders.length > 0 ? (
                  <div className="mt-3 divide-y divide-line overflow-x-auto">
                    <table className="w-full text-left text-label">
                      <thead>
                        <tr className="text-micro font-bold uppercase text-ink-400 border-b border-line">
                          <th className="py-2">Order #</th>
                          <th className="py-2">Customer</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {data.recentOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-surface-sunken transition-colors">
                            <td className="py-2.5 font-mono text-caption font-bold text-brand-700">
                              <Link to="/orders" className="hover:underline">
                                {order.orderNumber}
                              </Link>
                            </td>
                            <td className="py-2.5 text-caption text-ink-800 truncate max-w-[120px]">
                              {order.buyerName}
                            </td>
                            <td className="py-2.5">
                              <Badge tone={toneForFulfilment(order.fulfilmentStatus)} shape="chip">
                                {order.fulfilmentStatus.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right font-bold text-ink-900 text-caption">
                              {money(order.totalAmountPaise)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-caption text-ink-400">
                    No orders placed yet. Orders received from buyers will appear here in real-time.
                  </div>
                )}
              </div>
            </Panel>

            {/* Right: Upcoming Scheduled Delivery Slots */}
            <Panel className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-brand-600" />
                    <h2 className="text-subtitle font-bold text-ink-900">Upcoming Delivery Slots</h2>
                  </div>
                  <Link to="/delivery-slots" className="text-caption font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1">
                    Manage slots <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {data?.upcomingDeliverySlots && data.upcomingDeliverySlots.length > 0 ? (
                  <div className="mt-3 space-y-2.5">
                    {data.upcomingDeliverySlots.map((slot) => {
                      const isFull = slot.remainingCapacity <= 0;
                      return (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-lg border border-line p-3 bg-surface hover:bg-surface-sunken transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 font-bold text-caption border border-brand-200">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-label font-bold text-ink-900">
                                {slot.date} • {slot.startTime}–{slot.endTime}
                              </p>
                              <p className="text-micro text-ink-400">
                                Booked: <strong className="text-ink-700">{slot.bookedCount}</strong> orders scheduled
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <Badge tone="success" shape="chip">
                              Active
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center text-caption text-ink-400">
                    No active slots configured. Click "Manage slots" to create delivery schedules for buyers.
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* 4. Secondary Operational Row: Revenue Overview & Best-Selling Products */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Simple 7-Day Revenue Overview */}
            <Panel className="p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <h2 className="text-subtitle font-bold text-ink-900">7-Day Revenue Overview</h2>
                </div>
                <Link to="/revenue" className="text-caption font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1">
                  Revenue report <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-4 space-y-2">
                {data?.revenueOverview && data.revenueOverview.length > 0 ? (
                  data.revenueOverview.map((item) => (
                    <div key={item.date} className="flex items-center justify-between py-1.5 border-b border-line/50 text-caption">
                      <span className="text-ink-600 font-medium">{item.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-micro text-ink-400">{item.ordersCount} orders</span>
                        <span className="font-bold text-ink-900 font-mono">{money(item.revenuePaise)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-caption text-ink-400 py-6 text-center">No sales recorded this week.</p>
                )}
              </div>
            </Panel>

            {/* Best-Selling Products */}
            <Panel className="p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-brand-600" />
                  <h2 className="text-subtitle font-bold text-ink-900">Best-Selling Products</h2>
                </div>
                <Link to="/products" className="text-caption font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1">
                  Catalogue <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-4 space-y-2.5">
                {data?.bestSellingProducts && data.bestSellingProducts.length > 0 ? (
                  data.bestSellingProducts.map((p, idx) => (
                    <div key={p.sku} className="flex items-center justify-between py-1 border-b border-line/50 text-caption">
                      <div className="flex items-center gap-2.5 truncate max-w-[240px]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-micro font-bold text-ink-500">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-ink-900 truncate" title={p.title}>
                          {p.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-micro text-ink-500">{p.unitsSold} units</span>
                        <span className="font-bold text-ink-900 font-mono">{money(p.revenuePaise)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-caption text-ink-400 py-6 text-center">
                    Product sales rankings will appear here once orders are processed.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
