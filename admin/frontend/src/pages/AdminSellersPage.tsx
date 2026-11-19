import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Store,
  Eye,
  Search,
  AlertCircle,
  FileText,
  CreditCard,
  MapPin,
  Clock,
  TrendingUp,
  X,
  Check,
  Ban,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SOCKET_EVENTS, type SellerStatus } from '@haat/shared-contracts';
import {
  api,
  Badge,
  Button,
  Panel,
  SkeletonBlock,
  ErrorState,
  EmptyState,
  formatDate,
  money,
  showToast,
  getAccessToken,
  createSocketClient,
  TrendAreaChart,
  DonutDistributionChart,
} from '@haat/shared-frontend';

interface SellerItem {
  _id: string;
  storeName: string;
  storeSlug: string;
  storeAddress?: string;
  description?: string;
  status: SellerStatus;
  statusReason?: string | null;
  blockedReason?: string | null;
  approvalNotes?: string | null;
  approvedAt?: string | null;
  blockedAt?: string | null;
  gstin: string;
  panNumber: string;
  bankAccountName?: string;
  bankAccountNo?: string;
  bankIfscCode?: string;
  servicePincodes?: string[];
  isVerified: boolean;
  productCount?: number;
  totalOrders?: number;
  revenueGeneratedPaise?: number;
  userId: {
    _id: string;
    fullName: string;
    phoneNumber: string;
    email?: string;
    isActive: boolean;
  };
  createdAt: string;
}

interface SellersResponse {
  data: SellerItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SellerStats {
  total: number;
  pending: number;
  active: number;
  rejected: number;
  blocked: number;
}

interface SellerAnalyticsData {
  seller: {
    id: string;
    storeName: string;
    storeSlug: string;
    ownerName: string;
    status: string;
  };
  metrics: {
    totalRevenuePaise: number;
    totalCompletedOrders: number;
    totalOrders: number;
    totalProducts: number;
    averageOrderValuePaise: number;
    retailRevenuePaise: number;
    wholesaleRevenuePaise: number;
  };
  salesTrends: Array<{
    date: string;
    label: string;
    value: number;
    secondaryValue: number;
  }>;
  bestSellingProducts: Array<{
    id: string;
    title: string;
    sku: string;
    retailPricePaise: number;
    variantsCount: number;
    stockQuantity: number;
    isWholesaleActive: boolean;
  }>;
}

function toneForSellerStatus(status: SellerStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING_APPROVAL':
      return 'warning';
    case 'BLOCKED':
      return 'danger';
    case 'REJECTED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function AdminSellersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeStatus = searchParams.get('status') || 'ALL';
  const searchQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  // Sync searchTerm when URL search query changes externally
  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  // Real-time debounced search: typing immediately updates search query
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || '';
      const trimmed = searchTerm.trim();
      if (trimmed !== currentQ) {
        const next = new URLSearchParams(searchParams);
        if (trimmed) {
          next.set('q', trimmed);
        } else {
          next.delete('q');
        }
        next.set('page', '1');
        setSearchParams(next, { replace: true });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Inspector & Action dialog states
  const [inspectingSeller, setInspectingSeller] = useState<SellerItem | null>(null);
  const [analyticsSeller, setAnalyticsSeller] = useState<SellerItem | null>(null);

  const [blockingSeller, setBlockingSeller] = useState<SellerItem | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const [unblockingSeller, setUnblockingSeller] = useState<SellerItem | null>(null);
  const [unblockReason, setUnblockReason] = useState('');

  // 1. Fetch Dynamic Statistics from Backend
  const { data: statsData, isLoading: isStatsLoading } = useQuery<SellerStats>({
    queryKey: ['admin', 'sellers', 'stats'],
    queryFn: async () => {
      const response = await api.get<SellerStats>('/api/v1/admin/sellers/stats');
      return response.data;
    },
  });

  // 2. Fetch Filtered Seller Directory List
  const { data, isLoading, error, refetch } = useQuery<SellersResponse>({
    queryKey: ['admin', 'sellers', activeStatus, searchQuery, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeStatus !== 'ALL') params.set('status', activeStatus);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', String(currentPage));
      params.set('limit', '15');
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<SellerItem[]>(`/api/v1/admin/sellers${queryString}`);
      return {
        data: response.data,
        meta: (response as unknown as { meta: SellersResponse['meta'] }).meta || {
          page: currentPage,
          limit: 15,
          total: response.data.length,
          totalPages: 1,
        },
      };
    },
    retry: 2,
    retryDelay: 1000,
  });

  // 3. Fetch Single Seller Analytics for Modal
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery<SellerAnalyticsData>({
    queryKey: ['admin', 'seller-analytics', analyticsSeller?._id],
    queryFn: async () => {
      const res = await api.get<SellerAnalyticsData>(`/api/v1/admin/sellers/${analyticsSeller?._id}/analytics`);
      return res.data;
    },
    enabled: Boolean(analyticsSeller?._id),
  });

  const invalidateQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'sellers'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'sellers', 'stats'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    if (analyticsSeller) {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'seller-analytics', analyticsSeller._id] });
    }
  };

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    const token = getAccessToken();
    const socket = createSocketClient({
      token,
    });

    socket.on(SOCKET_EVENTS.SELLER_STATUS_CHANGED, () => {
      invalidateQueries();
    });

    socket.on(SOCKET_EVENTS.APPLICATION_CREATED, () => {
      invalidateQueries();
      showToast.info('New Registration', 'A merchant submitted a store registration.');
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  // Mutations for Activate (Approve), Reject, Block, Unblock
  const approveMutation = useMutation({
    mutationFn: async ({ sellerId, notes }: { sellerId: string; notes?: string }) => {
      return api.post<{ seller: SellerItem }>(`/api/v1/admin/sellers/${sellerId}/approve`, { notes });
    },
    onSuccess: (res) => {
      if (inspectingSeller && res.data?.seller) {
        setInspectingSeller(res.data.seller);
      }
      invalidateQueries();
      showToast.success('Seller Activated', 'Store approved. Products are now live on the marketplace.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Activation failed.';
      showToast.error('Activation Failed', msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ sellerId, reason }: { sellerId: string; reason: string }) => {
      return api.post<{ seller: SellerItem }>(`/api/v1/admin/sellers/${sellerId}/reject`, { reason });
    },
    onSuccess: (res) => {
      if (inspectingSeller && res.data?.seller) {
        setInspectingSeller(res.data.seller);
      }
      invalidateQueries();
      showToast.info('Seller Application Rejected', 'Application status updated to REJECTED.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Rejection failed.';
      showToast.error('Rejection Failed', msg);
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ sellerId, reason }: { sellerId: string; reason: string }) => {
      return api.post<{ seller: SellerItem }>(`/api/v1/admin/sellers/${sellerId}/block`, { reason });
    },
    onSuccess: (res) => {
      setBlockingSeller(null);
      setBlockReason('');
      if (inspectingSeller && res.data?.seller) {
        setInspectingSeller(res.data.seller);
      }
      invalidateQueries();
      showToast.warning('Seller Blocked', 'Merchant account suspended and products concealed from catalogue.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Block action failed.';
      showToast.error('Action Failed', msg);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async ({ sellerId, reason }: { sellerId: string; reason: string }) => {
      return api.post<{ seller: SellerItem }>(`/api/v1/admin/sellers/${sellerId}/unblock`, { reason });
    },
    onSuccess: (res) => {
      setUnblockingSeller(null);
      setUnblockReason('');
      if (inspectingSeller && res.data?.seller) {
        setInspectingSeller(res.data.seller);
      }
      invalidateQueries();
      showToast.success('Seller Unblocked', 'Store restored to ACTIVE status and catalogue visibility resumed.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unblock action failed.';
      showToast.error('Action Failed', msg);
    },
  });

  const handleClearSearch = () => {
    setSearchTerm('');
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  };

  const handleStatusFilter = (status: string) => {
    const next = new URLSearchParams(searchParams);
    if (status === 'ALL') {
      next.delete('status');
    } else {
      next.set('status', status);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  };

  const sellers = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 15, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight">Marketplace Sellers</h1>
          <p className="mt-1 text-caption text-ink-500">
            Directory of registered merchant accounts, verification controls, and business performance metrics.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4 shadow-card border border-line bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-ink-400">Total Registered</p>
              <h2 className="mt-1 text-headline font-black text-ink-900">
                {isStatsLoading ? <SkeletonBlock className="h-7 w-16" /> : statsData?.total ?? 0}
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken text-ink-500">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-micro text-ink-500">All registered merchant records</p>
        </Panel>

        <Panel className="p-4 shadow-card border border-line bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-ink-400">Active Sellers</p>
              <h2 className="mt-1 text-headline font-black text-success-fg">
                {isStatsLoading ? <SkeletonBlock className="h-7 w-16" /> : statsData?.active ?? 0}
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-bg text-success-fg">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-micro text-ink-500">Live storefronts in catalogue</p>
        </Panel>

        <Panel className="p-4 shadow-card border border-line bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-ink-400">Pending Registrations</p>
              <h2 className="mt-1 text-headline font-black text-warning-fg">
                {isStatsLoading ? <SkeletonBlock className="h-7 w-16" /> : statsData?.pending ?? 0}
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-bg text-warning-fg">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-micro text-ink-500">Awaiting approval action</p>
        </Panel>

        <Panel className="p-4 shadow-card border border-line bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-ink-400">Rejected Applications</p>
              <h2 className="mt-1 text-headline font-black text-danger-fg">
                {isStatsLoading ? <SkeletonBlock className="h-7 w-16" /> : statsData?.rejected ?? 0}
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-bg text-danger-fg">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-micro text-ink-500">Declined registration submissions</p>
        </Panel>
      </div>

      {/* Filter and Search Bar */}
      <Panel className="p-4 shadow-card border border-line bg-surface space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2 md:border-b-0 md:pb-0">
            {[
              { id: 'ALL', label: `All Sellers (${statsData?.total ?? 0})` },
              { id: 'ACTIVE', label: `Active (${statsData?.active ?? 0})` },
              { id: 'PENDING_APPROVAL', label: `Pending Registrations (${statsData?.pending ?? 0})` },
              { id: 'REJECTED', label: `Rejected (${statsData?.rejected ?? 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-label font-medium transition-colors ${
                  activeStatus === tab.id
                    ? 'bg-ink-900 text-white font-semibold'
                    : 'text-ink-600 hover:bg-surface-sunken hover:text-ink-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Live Search Input (Real-time as you type, no button needed) */}
          <div className="relative min-w-[280px] sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search store, owner, email, GSTIN..."
              className="w-full h-9 rounded-lg border border-line bg-surface pl-9 pr-8 text-caption text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {searchTerm && (
              <button
                type="button"
                title="Clear search"
                aria-label="Clear search"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors p-0.5 rounded cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </Panel>

      {/* Sellers Data Table */}
      <Panel className="overflow-hidden border border-line shadow-card bg-surface">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState
              message="Could not query seller profiles from the administration database."
              onRetry={() => void refetch()}
            />
          </div>
        ) : sellers.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Store className="h-10 w-10 text-ink-400" />}
              title="No Sellers Found"
              description="No seller profiles match your current search or filter query."
              action={
                activeStatus !== 'ALL' || searchQuery ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchTerm('');
                      handleStatusFilter('ALL');
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-label border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-sunken/60 text-micro font-bold uppercase tracking-wider text-ink-500">
                  <th className="py-3.5 pl-6 pr-3">Merchant / Store</th>
                  <th className="py-3.5 px-3">Owner Contact</th>
                  <th className="py-3.5 px-3">KYC &amp; Tax</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 text-center">Products</th>
                  <th className="py-3.5 px-3 text-center">Total Orders</th>
                  <th className="py-3.5 px-3 text-right">Revenue</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sellers.map((seller) => (
                  <tr key={seller._id} className="hover:bg-surface-sunken/40 transition-colors">
                    <td className="py-4 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-caption font-bold text-ink-700 border border-line">
                          {seller.storeName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-ink-900">{seller.storeName}</p>
                          <p className="text-micro text-ink-400">/{seller.storeSlug}</p>
                          <p className="text-micro text-ink-400 mt-0.5">Reg: {formatDate(seller.createdAt)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <p className="font-semibold text-ink-800">{seller.userId?.fullName || 'N/A'}</p>
                      <p className="text-micro text-ink-600">{seller.userId?.phoneNumber || 'N/A'}</p>
                      <p className="text-micro text-ink-400">{seller.userId?.email || 'No email'}</p>
                    </td>

                    <td className="py-4 px-3">
                      <p className="text-caption font-mono text-ink-700">GST: {seller.gstin || 'N/A'}</p>
                      <p className="text-micro font-mono text-ink-400">PAN: {seller.panNumber || 'N/A'}</p>
                    </td>

                    <td className="py-4 px-3">
                      <Badge tone={toneForSellerStatus(seller.status)}>
                        {seller.status}
                      </Badge>
                    </td>

                    <td className="py-4 px-3 text-center">
                      <span className="font-semibold text-ink-800">{seller.productCount ?? 0}</span>
                      <span className="text-micro text-ink-400 block">SKUs</span>
                    </td>

                    <td className="py-4 px-3 text-center">
                      <span className="font-semibold text-ink-800">{seller.totalOrders ?? 0}</span>
                      <span className="text-micro text-ink-400 block">orders</span>
                    </td>

                    <td className="py-4 px-3 text-right">
                      <span className="font-bold text-ink-900">
                        {money(seller.revenueGeneratedPaise ?? 0)}
                      </span>
                    </td>

                    <td className="py-4 pl-3 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. Activate / Approve Action */}
                        <button
                          type="button"
                          aria-label={seller.status === 'ACTIVE' ? 'Already Approved' : 'Accept'}
                          title={seller.status === 'ACTIVE' ? 'Already Approved' : 'Accept'}
                          disabled={seller.status === 'ACTIVE' || approveMutation.isPending}
                          onClick={() => {
                            if (seller.status !== 'ACTIVE') {
                              approveMutation.mutate({
                                sellerId: seller._id,
                                notes: 'Directly approved by admin',
                              });
                            }
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                            seller.status === 'ACTIVE'
                              ? 'border-line text-ink-300 bg-surface-sunken cursor-not-allowed opacity-40'
                              : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer'
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </button>

                        {/* 2. Reject Action */}
                        <button
                          type="button"
                          aria-label={seller.status === 'REJECTED' ? 'Already Rejected' : 'Reject'}
                          title={seller.status === 'REJECTED' ? 'Already Rejected' : 'Reject'}
                          disabled={seller.status === 'REJECTED' || rejectMutation.isPending}
                          onClick={() => {
                            if (seller.status !== 'REJECTED') {
                              rejectMutation.mutate({
                                sellerId: seller._id,
                                reason: 'Rejected by admin',
                              });
                            }
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                            seller.status === 'REJECTED'
                              ? 'border-line text-ink-300 bg-surface-sunken cursor-not-allowed opacity-40'
                              : 'border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer'
                          }`}
                        >
                          <X className="h-4 w-4" />
                        </button>

                        {/* 4. Unblock Action for Blocked */}
                        {seller.status === 'BLOCKED' && (
                          <button
                            type="button"
                            aria-label="Unblock Seller"
                            title="Unblock"
                            onClick={() => setUnblockingSeller(seller)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}

                        {/* 5. View Details */}
                        <button
                          type="button"
                          aria-label="View Details"
                          title="View Details"
                          onClick={() => setInspectingSeller(seller)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-600 hover:bg-surface-sunken hover:text-ink-900 transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* 6. View Analytics (Opens Analytics Modal) */}
                        <button
                          type="button"
                          aria-label="Seller Analytics"
                          title="Seller Analytics"
                          onClick={() => setAnalyticsSeller(seller)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors cursor-pointer"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-6 py-3 text-caption text-ink-600">
            <p>
              Showing <span className="font-semibold">{sellers.length}</span> of{' '}
              <span className="font-semibold">{meta.total}</span> merchants
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-label font-medium px-2">
                Page {currentPage} of {meta.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= meta.totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {/* 1. READ-ONLY INSPECT DETAILS MODAL (Full-page overlay portal) */}
      {inspectingSeller &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl border border-line admin-scrollbar">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-sunken text-headline font-black text-ink-800 border border-line">
                    {inspectingSeller.storeName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-title font-extrabold text-ink-900">{inspectingSeller.storeName}</h2>
                      <Badge tone={toneForSellerStatus(inspectingSeller.status)}>
                        {inspectingSeller.status}
                      </Badge>
                    </div>
                    <p className="text-caption text-ink-500">
                      ID: <span className="font-mono text-ink-700">{inspectingSeller._id}</span> • /{inspectingSeller.storeSlug}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  title="Close"
                  aria-label="Close"
                  onClick={() => setInspectingSeller(null)}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-sunken hover:text-ink-900 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content Sections */}
              <div className="mt-5 space-y-5 text-label">
                {/* Store Profile & Proprietor Details */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-line bg-surface-sunken/40 p-4">
                    <p className="text-micro font-bold uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-ink-500" />
                      Storefront Profile
                    </p>
                    <div className="space-y-1.5 text-caption">
                      <p>
                        <span className="text-ink-500">Address: </span>
                        <span className="font-medium text-ink-800">{inspectingSeller.storeAddress || 'Not specified'}</span>
                      </p>
                      <p>
                        <span className="text-ink-500">Description: </span>
                        <span className="text-ink-700">{inspectingSeller.description || 'No store description provided.'}</span>
                      </p>
                      <p>
                        <span className="text-ink-500">Registered: </span>
                        <span className="font-medium text-ink-800">{formatDate(inspectingSeller.createdAt)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-surface-sunken/40 p-4">
                    <p className="text-micro font-bold uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-ink-500" />
                      Proprietor &amp; Account
                    </p>
                    <div className="space-y-1.5 text-caption">
                      <p>
                        <span className="text-ink-500">Full Name: </span>
                        <span className="font-semibold text-ink-900">{inspectingSeller.userId?.fullName || 'N/A'}</span>
                      </p>
                      <p>
                        <span className="text-ink-500">Phone: </span>
                        <span className="font-medium text-ink-800">{inspectingSeller.userId?.phoneNumber || 'N/A'}</span>
                      </p>
                      <p>
                        <span className="text-ink-500">Email: </span>
                        <span className="font-medium text-ink-800">{inspectingSeller.userId?.email || 'N/A'}</span>
                      </p>
                      <p>
                        <span className="text-ink-500">User Active: </span>
                        <span className="font-medium text-ink-800">
                          {inspectingSeller.userId?.isActive ? 'Yes (Normal)' : 'No (Deactivated)'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tax Identifiers & Bank Settlement */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-line bg-surface-sunken/40 p-4">
                    <p className="text-micro font-bold uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-ink-500" />
                      Tax Verification (KYC)
                    </p>
                    <div className="space-y-1.5 text-caption">
                      <p>
                        <span className="text-ink-500">GSTIN: </span>
                        <span className="font-mono font-bold text-ink-800">{inspectingSeller.gstin || 'N/A'}</span>
                      </p>
                      <p>
                        <span className="text-ink-500">PAN Number: </span>
                        <span className="font-mono font-bold text-ink-800">{inspectingSeller.panNumber || 'N/A'}</span>
                      </p>
                      <p>
                        <span className="text-ink-500">Verified Flag: </span>
                        <span className="font-medium text-ink-800">{inspectingSeller.isVerified ? 'Verified' : 'Unverified'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-surface-sunken/40 p-4">
                    <p className="text-micro font-bold uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-ink-500" />
                      Settlement Bank Account
                    </p>
                    <div className="space-y-1.5 text-caption">
                      <p>
                        <span className="text-ink-500">Account Holder: </span>
                        <span className="font-semibold text-ink-800">{inspectingSeller.bankAccountName || 'N/A'}</span>
                      </p>
                      <p>
                        <span className="text-ink-500">Account No: </span>
                        <span className="font-mono text-ink-800">
                          {inspectingSeller.bankAccountNo
                            ? `••••••${inspectingSeller.bankAccountNo.slice(-4)}`
                            : 'N/A'}
                        </span>
                      </p>
                      <p>
                        <span className="text-ink-500">IFSC Code: </span>
                        <span className="font-mono text-ink-800">{inspectingSeller.bankIfscCode || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delivery Coverage */}
                <div className="rounded-xl border border-line bg-surface-sunken/40 p-4">
                  <p className="text-micro font-bold uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-ink-500" />
                    Serviceable Delivery Pincodes ({inspectingSeller.servicePincodes?.length || 0})
                  </p>
                  {inspectingSeller.servicePincodes && inspectingSeller.servicePincodes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {inspectingSeller.servicePincodes.map((pin) => (
                        <span
                          key={pin}
                          className="rounded-md bg-surface px-2.5 py-1 text-micro font-mono font-semibold text-ink-700 border border-line"
                        >
                          {pin}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-caption text-ink-400">No serviceable delivery pincodes configured.</p>
                  )}
                </div>

                {/* Marketplace Metrics Summary */}
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-surface p-4">
                  <div className="text-center border-r border-line pr-2">
                    <p className="text-micro font-bold uppercase text-ink-400">Catalogue SKUs</p>
                    <p className="mt-1 text-headline font-black text-ink-900">{inspectingSeller.productCount ?? 0}</p>
                  </div>
                  <div className="text-center border-r border-line px-2">
                    <p className="text-micro font-bold uppercase text-ink-400">Total Orders</p>
                    <p className="mt-1 text-headline font-black text-ink-900">{inspectingSeller.totalOrders ?? 0}</p>
                  </div>
                  <div className="text-center pl-2">
                    <p className="text-micro font-bold uppercase text-ink-400">Revenue</p>
                    <p className="mt-1 text-headline font-black text-brand-700">
                      {money(inspectingSeller.revenueGeneratedPaise ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex items-center gap-2">
                  {/* Activate / Approve button */}
                  <Button
                    variant="primary"
                    disabled={inspectingSeller.status === 'ACTIVE' || approveMutation.isPending}
                    onClick={() => {
                      if (inspectingSeller.status !== 'ACTIVE') {
                        approveMutation.mutate({
                          sellerId: inspectingSeller._id,
                          notes: 'Directly approved by admin',
                        });
                      }
                    }}
                    className={
                      inspectingSeller.status === 'ACTIVE'
                        ? 'opacity-40 cursor-not-allowed bg-slate-300 text-slate-600'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    }
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    {approveMutation.isPending ? 'Activating...' : inspectingSeller.status === 'ACTIVE' ? 'Approved' : 'Approve Application'}
                  </Button>

                  {/* Reject button */}
                  <Button
                    variant="danger"
                    disabled={inspectingSeller.status === 'REJECTED' || rejectMutation.isPending}
                    onClick={() => {
                      if (inspectingSeller.status !== 'REJECTED') {
                        rejectMutation.mutate({
                          sellerId: inspectingSeller._id,
                          reason: 'Rejected by admin',
                        });
                      }
                    }}
                    className={
                      inspectingSeller.status === 'REJECTED'
                        ? 'opacity-40 cursor-not-allowed bg-slate-300 text-slate-600'
                        : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                    }
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    {rejectMutation.isPending ? 'Rejecting...' : inspectingSeller.status === 'REJECTED' ? 'Rejected' : 'Reject Application'}
                  </Button>

                  {/* Block button */}
                  {inspectingSeller.status === 'ACTIVE' && (
                    <Button
                      variant="danger"
                      onClick={() => {
                        const s = inspectingSeller;
                        setInspectingSeller(null);
                        setBlockingSeller(s);
                      }}
                    >
                      <Ban className="h-4 w-4 mr-1.5" />
                      Block Seller
                    </Button>
                  )}

                  {/* Unblock button */}
                  {inspectingSeller.status === 'BLOCKED' && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        const s = inspectingSeller;
                        setInspectingSeller(null);
                        setUnblockingSeller(s);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <RotateCcw className="h-4 w-4 mr-1.5" />
                      Unblock Seller
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const s = inspectingSeller;
                      setInspectingSeller(null);
                      setAnalyticsSeller(s);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-label font-bold text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                  >
                    <TrendingUp className="h-4 w-4" />
                    View Analytics
                  </button>
                  <Button variant="secondary" onClick={() => setInspectingSeller(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 2. SELLER ANALYTICS MODAL (Portal) */}
      {analyticsSeller &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl border border-line admin-scrollbar">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-headline font-black text-brand-700 border border-brand-200">
                    {analyticsSeller.storeName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-title font-extrabold text-ink-900">{analyticsSeller.storeName}</h2>
                      <Badge tone={toneForSellerStatus(analyticsSeller.status)}>
                        {analyticsSeller.status}
                      </Badge>
                    </div>
                    <p className="text-caption text-ink-500">
                      Proprietor: <span className="font-semibold text-ink-800">{analyticsSeller.userId?.fullName || 'N/A'}</span> • Slug:{' '}
                      <span className="font-mono text-ink-700">/{analyticsSeller.storeSlug}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  title="Close"
                  aria-label="Close"
                  onClick={() => setAnalyticsSeller(null)}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-sunken hover:text-ink-900 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isAnalyticsLoading ? (
                <div className="py-8 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SkeletonBlock className="h-20" />
                    <SkeletonBlock className="h-20" />
                    <SkeletonBlock className="h-20" />
                    <SkeletonBlock className="h-20" />
                  </div>
                  <SkeletonBlock className="h-52 w-full" />
                </div>
              ) : !analyticsData ? (
                <div className="py-8 text-center text-caption text-ink-400">
                  Analytics data could not be retrieved for this merchant.
                </div>
              ) : (
                <div className="mt-5 space-y-5 text-label">
                  {/* KPI Stat Cards */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Panel className="p-3.5 shadow-card border border-line bg-surface">
                      <p className="text-micro font-bold uppercase tracking-wider text-ink-400">Total Net Revenue</p>
                      <h3 className="mt-1 text-headline font-black text-brand-700">
                        {money(analyticsData.metrics.totalRevenuePaise)}
                      </h3>
                      <p className="mt-0.5 text-micro text-ink-500">Paid &amp; settled orders</p>
                    </Panel>

                    <Panel className="p-3.5 shadow-card border border-line bg-surface">
                      <p className="text-micro font-bold uppercase tracking-wider text-ink-400">Completed Orders</p>
                      <h3 className="mt-1 text-headline font-black text-ink-900">
                        {analyticsData.metrics.totalCompletedOrders}{' '}
                        <span className="text-caption font-normal text-ink-400">/ {analyticsData.metrics.totalOrders} total</span>
                      </h3>
                      <p className="mt-0.5 text-micro text-ink-500">Successfully fulfilled</p>
                    </Panel>

                    <Panel className="p-3.5 shadow-card border border-line bg-surface">
                      <p className="text-micro font-bold uppercase tracking-wider text-ink-400">Average Order Value</p>
                      <h3 className="mt-1 text-headline font-black text-ink-900">
                        {money(analyticsData.metrics.averageOrderValuePaise)}
                      </h3>
                      <p className="mt-0.5 text-micro text-ink-500">Per order</p>
                    </Panel>

                    <Panel className="p-3.5 shadow-card border border-line bg-surface">
                      <p className="text-micro font-bold uppercase tracking-wider text-ink-400">Catalogue SKUs</p>
                      <h3 className="mt-1 text-headline font-black text-ink-900">{analyticsData.metrics.totalProducts}</h3>
                      <p className="mt-0.5 text-micro text-ink-500">Active listings</p>
                    </Panel>
                  </div>

                  {/* Graphs Container: 50-50 equal width, equal height */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    <TrendAreaChart
                      title="14-Day Sales Velocity"
                      subtitle="Daily gross order volume trajectory"
                      data={analyticsData.salesTrends}
                      primaryLabel="Order Volume"
                      primaryColor="#1F319D"
                      height={160}
                      className="h-full"
                    />
                    <DonutDistributionChart
                      title="Sales Channel"
                      subtitle="Retail vs Wholesale B2B"
                      data={[
                        { label: 'Retail Orders', value: Math.max(1, analyticsData.metrics.retailRevenuePaise), color: '#1F319D' },
                        { label: 'Wholesale B2B', value: analyticsData.metrics.wholesaleRevenuePaise, color: '#0D9488' },
                      ]}
                      totalLabel="Total Revenue"
                      className="h-full"
                      enableHover={false}
                    />
                  </div>

                  {/* Top SKUs table */}
                  {analyticsData.bestSellingProducts.length > 0 && (
                    <Panel className="border border-line shadow-card bg-surface overflow-hidden">
                      <div className="p-3 border-b border-line flex items-center justify-between text-micro font-bold uppercase tracking-wider text-ink-500 bg-surface-sunken/60">
                        <span>Top Catalogue Items ({analyticsData.bestSellingProducts.length})</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-label border-collapse">
                          <thead>
                            <tr className="border-b border-line text-micro text-ink-400">
                              <th className="py-2.5 pl-4 pr-2">Product Title</th>
                              <th className="py-2.5 px-2">Price</th>
                              <th className="py-2.5 px-2">Stock</th>
                              <th className="py-2.5 pl-2 pr-4 text-right">Wholesale Tier</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line text-caption">
                            {analyticsData.bestSellingProducts.map((p) => (
                              <tr key={p.id} className="hover:bg-surface-sunken/40">
                                <td className="py-2.5 pl-4 pr-2">
                                  <p className="font-bold text-ink-900">{p.title}</p>
                                  <p className="text-micro font-mono text-ink-400">SKU: {p.sku}</p>
                                </td>
                                <td className="py-2.5 px-2 font-semibold text-ink-800">{money(p.retailPricePaise)}</td>
                                <td className="py-2.5 px-2 text-ink-700">{p.stockQuantity} units</td>
                                <td className="py-2.5 pl-2 pr-4 text-right">
                                  <Badge tone={p.isWholesaleActive ? 'brand' : 'neutral'}>
                                    {p.isWholesaleActive ? 'Active B2B' : 'Retail Only'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="mt-6 flex items-center justify-end border-t border-line pt-4">
                <Button variant="secondary" onClick={() => setAnalyticsSeller(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}


      {/* 5. BLOCK SELLER MODAL */}
      {blockingSeller &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
            <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-line">
              <div className="flex items-center gap-3 pb-3 border-b border-line">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-title font-bold text-ink-900">Block / Suspend Seller</h3>
                  <p className="text-caption text-ink-500">{blockingSeller.storeName}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-caption text-ink-600">
                <p>
                  Suspending <strong className="text-ink-900">{blockingSeller.storeName}</strong> will immediately conceal
                  all of their products from public search and prevent any new orders from being placed.
                </p>
                <div>
                  <label htmlFor="block-reason" className="block text-micro font-bold uppercase text-ink-400 mb-1">
                    Suspension Reason (Required)
                  </label>
                  <textarea
                    id="block-reason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g. Policy violation or fraudulent activity detected."
                    rows={3}
                    className="w-full rounded-lg border border-line p-2.5 text-caption text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                <Button variant="secondary" onClick={() => setBlockingSeller(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={!blockReason.trim() || blockMutation.isPending}
                  onClick={() =>
                    blockMutation.mutate({
                      sellerId: blockingSeller._id,
                      reason: blockReason.trim(),
                    })
                  }
                >
                  {blockMutation.isPending ? 'Blocking...' : 'Block Seller'}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 6. UNBLOCK SELLER MODAL */}
      {unblockingSeller &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
            <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-line">
              <div className="flex items-center gap-3 pb-3 border-b border-line">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-title font-bold text-ink-900">Unblock Merchant Account</h3>
                  <p className="text-caption text-ink-500">{unblockingSeller.storeName}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-caption text-ink-600">
                <p>
                  Restore <strong className="text-ink-900">{unblockingSeller.storeName}</strong> to active operations.
                  Their storefront and approved catalogue items will be restored to public visibility.
                </p>
                <div>
                  <label htmlFor="unblock-reason" className="block text-micro font-bold uppercase text-ink-400 mb-1">
                    Restoration Reason (Required)
                  </label>
                  <textarea
                    id="unblock-reason"
                    value={unblockReason}
                    onChange={(e) => setUnblockReason(e.target.value)}
                    placeholder="e.g. Issue resolved after compliance review."
                    rows={3}
                    className="w-full rounded-lg border border-line p-2.5 text-caption text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                <Button variant="secondary" onClick={() => setUnblockingSeller(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!unblockReason.trim() || unblockMutation.isPending}
                  onClick={() =>
                    unblockMutation.mutate({
                      sellerId: unblockingSeller._id,
                      reason: unblockReason.trim(),
                    })
                  }
                >
                  {unblockMutation.isPending ? 'Unblocking...' : 'Unblock Seller'}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
