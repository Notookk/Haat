import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Package,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  PieChart,
  ArrowUpRight,
} from 'lucide-react';
import {
  api,
  Panel,
  SkeletonBlock,
  ErrorState,
  money,
  Badge,
  Button,
  TrendAreaChart,
  DonutDistributionChart,
  BarComparisonChart,
  type TrendDataPoint,
  type DonutSegment,
  type BarMetricItem,
} from '@haat/shared-frontend';

interface RevenueStatsResponse {
  metrics: {
    totalRevenuePaise: number;
    todayRevenuePaise: number;
    weeklyRevenuePaise: number;
    monthlyRevenuePaise: number;
    completedOrders: number;
    averageOrderValuePaise: number;
    grossSalesPaise: number;
    cancelledAmountPaise: number;
    netRevenuePaise: number;
  };
  dailyTrend?: Array<{
    date: string;
    label: string;
    value: number;
    secondaryValue: number;
  }>;
  composition?: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
  }>;
  bestSellingProducts: Array<{
    sku: string;
    title: string;
    productId?: string;
    unitsSold: number;
    revenuePaise: number;
  }>;
  salesHistory: {
    items: Array<{
      id: string;
      orderNumber: string;
      customerName: string;
      totalAmountPaise: number;
      paymentStatus: string;
      paymentMethod: string;
      fulfilmentStatus: string;
      itemsCount: number;
      createdAt: string;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export function SellerRevenuePage() {
  const [page, setPage] = useState(1);
  const [selectedRange, setSelectedRange] = useState('7D');

  const { data, isLoading, error, refetch } = useQuery<RevenueStatsResponse>({
    queryKey: ['seller', 'revenue', 'stats', page],
    queryFn: async () => {
      const res = await api.get<{ data: RevenueStatsResponse }>(`/api/v1/seller/revenue/stats?page=${page}&limit=15`);
      return (res.data as unknown as { data: RevenueStatsResponse }).data || res.data;
    },
  });

  const metrics = data?.metrics ?? {
    totalRevenuePaise: 0,
    todayRevenuePaise: 0,
    weeklyRevenuePaise: 0,
    monthlyRevenuePaise: 0,
    completedOrders: 0,
    averageOrderValuePaise: 0,
    grossSalesPaise: 0,
    cancelledAmountPaise: 0,
    netRevenuePaise: 0,
  };

  const trendPoints: TrendDataPoint[] = (
    selectedRange === '7D'
      ? (data?.dailyTrend || []).slice(-7)
      : (data?.dailyTrend || [])
  ).map((d) => ({
    label: d.label,
    value: d.value,
    secondaryValue: d.secondaryValue,
    date: d.date,
  }));

  const donutData: DonutSegment[] = data?.composition || [
    { id: 'delivered', label: 'Delivered (Settled)', value: 0, color: '#10b981' },
    { id: 'pending', label: 'In Progress / Processing', value: 0, color: '#16135c' },
    { id: 'cancelled', label: 'Cancelled / Refunded', value: 0, color: '#f43f5e' },
  ];

  const topProductsBarData: BarMetricItem[] = (data?.bestSellingProducts || []).slice(0, 5).map((p) => ({
    label: p.title,
    sublabel: `${p.unitsSold} sold (${p.sku})`,
    value: Math.round(p.revenuePaise / 100),
    color: '#16135c',
    badge: `₹${Math.round(p.revenuePaise / 100).toLocaleString('en-IN')}`,
  }));

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-display-md text-ink-900 font-extrabold tracking-tight">Revenue &amp; Analytics</h1>
          <p className="mt-1 text-body text-ink-600">
            Real earnings telemetry, daily trajectory curves, order value averages, and settlement history.
          </p>
        </div>
        <div className="flex items-center gap-2 text-micro text-ink-500 font-medium bg-surface-sunken border border-line px-3 py-1.5 rounded-lg">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Currency: INR (₹) • Verified Ledger</span>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
          </div>
          <SkeletonBlock className="h-96 w-full" />
          <div className="grid gap-6 lg:grid-cols-12">
            <SkeletonBlock className="lg:col-span-5 h-72 w-full" />
            <SkeletonBlock className="lg:col-span-7 h-72 w-full" />
          </div>
        </div>
      ) : error ? (
        <ErrorState message="Could not retrieve store revenue data." onRetry={() => void refetch()} />
      ) : (
        <>
          {/* 1. Unified 4-Card Primary Metrics Row */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Net Total Revenue */}
            <Panel className="p-5 border-l-4 border-l-emerald-600 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-ink-500">
                <span className="text-micro font-bold uppercase tracking-wider text-ink-500">Total Net Revenue</span>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-ink-900 font-mono tracking-tight">
                {money(metrics.totalRevenuePaise)}
              </p>
              <p className="text-micro text-ink-400 font-medium">Paid and completed orders</p>
            </Panel>

            {/* Today's Sales */}
            <Panel className="p-5 border-l-4 border-l-brand-600 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-ink-500">
                <span className="text-micro font-bold uppercase tracking-wider text-ink-500">Today's Revenue</span>
                <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-200">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-ink-900 font-mono tracking-tight">
                {money(metrics.todayRevenuePaise)}
              </p>
              <p className="text-micro text-ink-400 font-medium">Sales recorded today</p>
            </Panel>

            {/* Monthly (30-Day) Sales */}
            <Panel className="p-5 border-l-4 border-l-blue-600 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-ink-500">
                <span className="text-micro font-bold uppercase tracking-wider text-ink-500">30-Day Monthly Sales</span>
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-ink-900 font-mono tracking-tight">
                {money(metrics.monthlyRevenuePaise)}
              </p>
              <p className="text-micro text-ink-400 font-medium">
                Last 7 Days: <span className="font-semibold text-ink-700">{money(metrics.weeklyRevenuePaise)}</span>
              </p>
            </Panel>

            {/* Average Order Value */}
            <Panel className="p-5 border-l-4 border-l-indigo-600 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-ink-500">
                <span className="text-micro font-bold uppercase tracking-wider text-ink-500">Avg Order Value (AOV)</span>
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-ink-900 font-mono tracking-tight">
                {money(metrics.averageOrderValuePaise)}
              </p>
              <p className="text-micro text-ink-400 font-medium">
                Across <span className="font-semibold text-ink-700">{metrics.completedOrders}</span> orders
              </p>
            </Panel>
          </div>

          {/* 2. FULL-WIDTH REVENUE & ORDER TRAJECTORY GRAPH (NOT SQUEEZED) */}
          <div className="w-full">
            <TrendAreaChart
              title="Revenue & Order Trajectory"
              subtitle="Daily net earnings in INR and completed order volume over time"
              data={trendPoints}
              ranges={['7D', '30D']}
              selectedRange={selectedRange}
              onRangeChange={setSelectedRange}
              primaryLabel="Net Revenue"
              secondaryLabel="Orders"
              valueFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
              secondaryValueFormatter={(v) => `${v} orders`}
              primaryColor="#16135c"
              secondaryColor="#10b981"
              height={300}
              svgWidth={1000}
              className="w-full shadow-2xs p-5 lg:p-6"
              emptyMessage="No revenue activity recorded in this period"
              headerAction={
                <div className="hidden sm:flex items-center gap-4 text-micro mr-3">
                  <span className="flex items-center gap-1.5 font-bold text-[#16135c]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#16135c]" />
                    Net Revenue (₹)
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Orders Count
                  </span>
                </div>
              }
            />
          </div>

          {/* 3. Deep-Dive Analytics: Composition & Top Products Breakdown */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
            {/* Left: Revenue Composition Donut (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <DonutDistributionChart
                title="Revenue Composition"
                subtitle="Fulfilment & settlement distribution"
                totalLabel="Gross Sales"
                data={donutData}
                enableHover
                className="shadow-2xs p-5"
                emptyMessage="No orders placed yet"
              />

              {/* Gross Sales vs Cancelled Callout */}
              <div className="rounded-xl border border-line bg-surface p-4 flex items-center justify-between text-label shadow-2xs">
                <div>
                  <span className="text-micro font-bold uppercase text-ink-400 block">Gross Sales Value</span>
                  <span className="text-lg font-black text-ink-900 font-mono">{money(metrics.grossSalesPaise)}</span>
                </div>
                <div className="text-right">
                  <span className="text-micro font-bold uppercase text-rose-500 block">Cancelled / Refunded</span>
                  <span className="text-lg font-black text-rose-600 font-mono">-{money(metrics.cancelledAmountPaise)}</span>
                </div>
              </div>
            </div>

            {/* Right: Best-Selling Products Table & Comparative Ranking (7 cols) */}
            <div className="lg:col-span-7">
              <Panel className="p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-brand-600" />
                    <h2 className="text-subtitle font-bold text-ink-900">Top-Selling Products by Revenue</h2>
                  </div>
                  <span className="text-micro font-bold text-ink-400">
                    {data?.bestSellingProducts?.length || 0} products ranked
                  </span>
                </div>

                {/* Bar Comparison Visual Breakdown */}
                {topProductsBarData.length > 0 && (
                  <div className="pb-3 border-b border-line">
                    <BarComparisonChart
                      title=""
                      data={topProductsBarData}
                      valueFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                      maxItems={4}
                      className="border-0 p-0 shadow-none bg-transparent"
                    />
                  </div>
                )}

                {/* Detailed Table */}
                {data?.bestSellingProducts && data.bestSellingProducts.length > 0 ? (
                  <div className="divide-y divide-line overflow-x-auto">
                    <table className="w-full text-left text-label">
                      <thead>
                        <tr className="text-micro font-bold uppercase text-ink-400 border-b border-line">
                          <th className="py-2">Rank</th>
                          <th className="py-2">Product Title</th>
                          <th className="py-2">SKU</th>
                          <th className="py-2 text-center">Units Sold</th>
                          <th className="py-2 text-right">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {data.bestSellingProducts.map((p, idx) => (
                          <tr key={p.sku} className="hover:bg-surface-sunken transition-colors">
                            <td className="py-2.5 font-bold text-ink-400">#{idx + 1}</td>
                            <td className="py-2.5 font-semibold text-ink-900">{p.title}</td>
                            <td className="py-2.5 font-mono text-caption text-ink-500">{p.sku}</td>
                            <td className="py-2.5 text-center font-bold text-ink-800">{p.unitsSold}</td>
                            <td className="py-2.5 text-right font-bold text-brand-700 font-mono">
                              {money(p.revenuePaise)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-caption text-ink-400">
                    No product sales recorded yet. Once orders are fulfilled, top products will appear here.
                  </div>
                )}
              </Panel>
            </div>
          </div>

          {/* 4. Full-Width Sales History Ledger */}
          <Panel className="p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-brand-600" />
                <h2 className="text-subtitle font-bold text-ink-900">Completed Sales History</h2>
              </div>
              <span className="text-caption text-ink-500 font-medium">
                {data?.salesHistory.meta.total || 0} paid/completed orders
              </span>
            </div>

            {data?.salesHistory.items && data.salesHistory.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-label">
                  <thead>
                    <tr className="text-micro font-bold uppercase text-ink-400 border-b border-line bg-surface-sunken">
                      <th className="px-3 py-2.5">Order #</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Customer</th>
                      <th className="px-3 py-2.5 text-center">Items</th>
                      <th className="px-3 py-2.5 text-center">Payment</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.salesHistory.items.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-sunken transition-colors">
                        <td className="px-3 py-2.5 font-mono font-bold text-brand-700">
                          {item.orderNumber}
                        </td>
                        <td className="px-3 py-2.5 text-caption text-ink-600">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-3 py-2.5 text-caption font-semibold text-ink-800">
                          {item.customerName}
                        </td>
                        <td className="px-3 py-2.5 text-center text-caption font-medium">
                          {item.itemsCount} SKU{item.itemsCount === 1 ? '' : 's'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge tone="success" shape="chip">
                            {item.paymentMethod}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-ink-900 font-mono">
                          {money(item.totalAmountPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {data.salesHistory.meta.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-line px-3 py-3 mt-2 text-caption text-ink-600">
                    <p>
                      Page {page} of {data.salesHistory.meta.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={page >= data.salesHistory.meta.totalPages}
                        onClick={() => setPage((p) => Math.min(data.salesHistory.meta.totalPages, p + 1))}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-caption text-ink-400">
                No completed sales recorded yet. Completed orders will appear in this ledger.
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
