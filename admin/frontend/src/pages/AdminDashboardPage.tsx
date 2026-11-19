import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Store,
  Users,
  History,
  TrendingUp,
  Package,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { SOCKET_EVENTS } from '@haat/shared-contracts';
import {
  api,
  Panel,
  SkeletonBlock,
  ErrorState,
  Badge,
  formatDate,
  money,
  getAccessToken,
  createSocketClient,
  TrendAreaChart,
  DonutDistributionChart,
  BarComparisonChart,
  type TrendDataPoint,
  type DonutSegment,
  type BarMetricItem,
} from '@haat/shared-frontend';

interface AuditLogSummary {
  _id: string;
  actorUserId?: {
    _id: string;
    fullName: string;
    email?: string;
    role: string;
  };
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

interface DashboardStats {
  metrics: {
    totalBuyers: number;
    totalUsers: number;
    totalSellers: number;
    pendingSellers: number;
    verifiedSellers: number;
    rejectedSellers?: number;
    blockedSellers?: number;
    totalProducts: number;
    activeProducts: number;
    suspendedProducts: number;
    totalCategories: number;
    totalOrders: number;
    totalMarketplaceRevenuePaise: number;
    totalTransactions: number;
    recentAuditLogs: AuditLogSummary[];
    sellerGrowthTrend?: TrendDataPoint[];
    sellerDistribution?: DonutSegment[];
    categoryDistribution?: BarMetricItem[];
    activityVelocity?: Array<{ label: string; date: string; value: number }>;
  };
  timestamp: string;
}

export function AdminDashboardPage() {
  const [trendMetric, setTrendMetric] = useState<'sellers' | 'audit'>('sellers');
  const [trendRange, setTrendRange] = useState<string>('14D');

  const { data, isLoading, error, refetch } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/api/v1/admin/dashboard/stats');
      return response.data;
    },
  });

  // Real-time monitoring telemetry via Socket.IO
  useEffect(() => {
    const token = getAccessToken();
    const socket = createSocketClient({
      token,
    });

    socket.on(SOCKET_EVENTS.ADMIN_SELLER_UPDATED, () => {
      void refetch();
    });

    socket.on(SOCKET_EVENTS.SELLER_STATUS_CHANGED, () => {
      void refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-8 w-60" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SkeletonBlock className="h-64 w-full" />
          <SkeletonBlock className="h-64 w-full" />
          <SkeletonBlock className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message="Failed to load marketplace monitoring metrics" onRetry={() => void refetch()} />;
  }

  const { metrics } = data;

  const coreKpis = [
    {
      title: 'Total Buyers',
      value: metrics.totalBuyers ?? metrics.totalUsers ?? 0,
      subtitle: 'Registered buyers',
      icon: Users,
      link: '/buyers',
    },
    {
      title: 'Total Sellers',
      value: metrics.totalSellers,
      subtitle: 'Registered merchant stores',
      icon: Store,
      link: '/sellers',
    },
    {
      title: 'Active Sellers',
      value: metrics.verifiedSellers,
      subtitle: 'Live verified storefronts',
      icon: CheckCircle2,
      link: '/sellers',
    },
    {
      title: 'Pending Registrations',
      value: metrics.pendingSellers,
      subtitle: 'Awaiting admin review',
      icon: Clock,
      link: '/sellers',
    },
  ];

  const subKpis = [
    {
      label: 'Active Sellers',
      value: metrics.verifiedSellers,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pending Registrations',
      value: metrics.pendingSellers,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
    },
    {
      label: 'Blocked Sellers',
      value: metrics.blockedSellers || 0,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
    },
    {
      label: 'Rejected Applications',
      value: metrics.rejectedSellers || 0,
      color: 'text-ink-600',
      bg: 'bg-surface-sunken',
    },
  ];

  const allGrowthData = metrics.sellerGrowthTrend || [];
  const displayedGrowthData = trendRange === '7D' ? allGrowthData.slice(-7) : allGrowthData;

  const allActivityData: TrendDataPoint[] = (metrics.activityVelocity || []).map((item) => ({
    label: item.label,
    date: item.date,
    value: item.value,
  }));
  const displayedActivityData = trendRange === '7D' ? allActivityData.slice(-7) : allActivityData;

  const sellerDistributionData: DonutSegment[] = metrics.sellerDistribution || [
    { label: 'Active', value: metrics.verifiedSellers, color: '#10b981' },
    { label: 'Pending', value: metrics.pendingSellers, color: '#f59e0b' },
    { label: 'Rejected', value: metrics.rejectedSellers || 0, color: '#ef4444' },
    { label: 'Blocked', value: metrics.blockedSellers || 0, color: '#64748b' },
  ];

  const categoryData: BarMetricItem[] = metrics.categoryDistribution || [];

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-ink-900 tracking-tight sm:text-2xl">Marketplace Overview</h1>
          <p className="text-xs text-ink-500">
            Read-only platform monitoring, participant statistics, and live transaction analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Monitoring
          </span>
        </div>
      </div>

      {/* 1. PRIMARY METRICS STRIP: All 4 core KPIs in a single line */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {coreKpis.map((kpi) => (
          <Link
            key={kpi.title}
            to={kpi.link}
            className="group flex items-center justify-between rounded-xl border border-line bg-surface p-3.5 transition-all shadow-card hover:border-line-strong hover:bg-surface-sunken/40"
          >
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-ink-500 group-hover:text-ink-800">
                {kpi.title}
              </span>
              <div className="mt-0.5">
                <span className="text-xl font-black text-ink-900">{kpi.value}</span>
              </div>
              <p className="truncate text-[10px] text-ink-400">{kpi.subtitle}</p>
            </div>

            <div className="rounded-lg bg-surface-sunken p-2 shrink-0 text-brand-600">
              <kpi.icon className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {subKpis.map((k) => (
          <div
            key={k.label}
            className={`flex items-center justify-between rounded-lg border border-line/60 ${k.bg} px-3 py-1.5 text-xs`}
          >
            <span className="text-[11px] font-medium text-ink-600">{k.label}</span>
            <span className={`font-mono font-bold ${k.color}`}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* 2. SINGLE-LINE UNIFIED ANALYTICS ROW: All 3 graphs in ONE line */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Graph 1: Velocity Trend (with toggle for Sellers vs Audit) */}
        <div className="min-w-0">
          <TrendAreaChart
            title={trendMetric === 'sellers' ? 'Seller Growth Velocity' : 'Marketplace Activity Velocity'}
            subtitle={
              trendMetric === 'sellers'
                ? 'Merchant registration timeline'
                : 'Platform security & operational events'
            }
            primaryLabel={trendMetric === 'sellers' ? 'New Registrations' : 'Platform Events'}
            secondaryLabel={trendMetric === 'sellers' ? 'Active Merchants' : undefined}
            primaryColor={trendMetric === 'sellers' ? '#1f319d' : '#0284c7'}
            secondaryColor="#10b981"
            data={trendMetric === 'sellers' ? displayedGrowthData : displayedActivityData}
            ranges={['7D', '14D']}
            selectedRange={trendRange}
            onRangeChange={setTrendRange}
            headerAction={
              <div className="flex items-center rounded-md border border-line bg-surface-sunken p-0.5">
                <button
                  type="button"
                  onClick={() => setTrendMetric('sellers')}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    trendMetric === 'sellers'
                      ? 'bg-surface text-ink-900 shadow-2xs'
                      : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  Sellers
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMetric('audit')}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    trendMetric === 'audit'
                      ? 'bg-surface text-ink-900 shadow-2xs'
                      : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  Activity
                </button>
              </div>
            }
            emptyMessage="No velocity telemetry recorded"
            className="h-full"
          />
        </div>

        {/* Graph 2: Donut Status Distribution */}
        <div className="min-w-0">
          <DonutDistributionChart
            title="Seller Status Distribution"
            subtitle="Merchant lifecycle breakdown"
            totalLabel="Sellers"
            data={sellerDistributionData}
            emptyMessage="No merchant accounts"
            className="h-full"
          />
        </div>

        {/* Graph 3: Category SKU Distribution */}
        <div className="min-w-0">
          <BarComparisonChart
            title="Catalogue SKUs by Category"
            subtitle="Active inventory volume"
            data={categoryData}
            valueFormatter={(val) => `${val} SKUs`}
            emptyMessage="No catalog items found"
            className="h-full"
            maxItems={4}
          />
        </div>
      </div>

      {/* 3. RECENT ACTIVITY PANEL */}
      <Panel className="p-4 shadow-card">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-ink-500" />
            <h2 className="text-xs font-bold text-ink-900">Recent Marketplace Activity</h2>
          </div>
          <span className="text-[10px] text-ink-400 font-medium">Logged immutably</span>
        </div>

        {metrics.recentAuditLogs && metrics.recentAuditLogs.length > 0 ? (
          <div className="mt-2 divide-y divide-line/70">
            {metrics.recentAuditLogs.map((log) => (
              <div key={log._id} className="flex items-center justify-between py-2 text-micro">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Badge tone="brand">{log.action}</Badge>
                  <span className="text-ink-700 font-medium truncate">
                    {log.entityType} ({log.entityId.slice(0, 8)}…)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-ink-400 shrink-0">
                  <span>{log.actorUserId?.fullName || 'System'}</span>
                  <span>{formatDate(log.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-micro text-ink-400">No marketplace activity recorded yet.</div>
        )}
      </Panel>
    </div>
  );
}
