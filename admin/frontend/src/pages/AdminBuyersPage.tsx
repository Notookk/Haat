import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  Users,
  Search,
  Eye,
  X,
  MapPin,
  ShoppingBag,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Wifi,
} from 'lucide-react';
import {
  api,
  Panel,
  Button,
  Badge,
  SkeletonBlock,
  ErrorState,
  EmptyState,
  money,
  formatDate,
  createSocketClient,
  getAccessToken,
} from '@haat/shared-frontend';
import { SOCKET_EVENTS } from '@haat/shared-contracts';

interface BuyerListItem {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
  totalOrders: number;
  totalSpentPaise: number;
}

interface BuyerListResponse {
  buyers: BuyerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BuyerDetail {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
  businessName?: string | null;
  gstin?: string | null;
  savedAddresses?: Array<{
    label: string;
    recipientName: string;
    phoneNumber: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
  }>;
  totalOrders: number;
  totalSpentPaise: number;
  recentOrders?: Array<{
    id: string;
    orderNumber: string;
    totalAmountPaise: number;
    paymentStatus: string;
    fulfilmentStatus: string;
    createdAt: string;
  }>;
}

export function AdminBuyersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);

  // Real-time WebSocket synchronization via Socket.IO
  useEffect(() => {
    const token = getAccessToken();
    const socket = createSocketClient({
      token,
    });

    const handleInvalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'buyers'] });
      if (selectedBuyerId) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buyer', selectedBuyerId] });
      }
    };

    socket.on(SOCKET_EVENTS.BUYER_REGISTERED, handleInvalidate);
    socket.on(SOCKET_EVENTS.BUYER_UPDATED, handleInvalidate);
    socket.on(SOCKET_EVENTS.ORDER_CREATED, handleInvalidate);
    socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleInvalidate);

    return () => {
      socket.off(SOCKET_EVENTS.BUYER_REGISTERED, handleInvalidate);
      socket.off(SOCKET_EVENTS.BUYER_UPDATED, handleInvalidate);
      socket.off(SOCKET_EVENTS.ORDER_CREATED, handleInvalidate);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleInvalidate);
      socket.disconnect();
    };
  }, [queryClient, selectedBuyerId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error, refetch } = useQuery<BuyerListResponse>({
    queryKey: ['admin', 'buyers', { search: debouncedSearch, page }],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (debouncedSearch) q.set('search', debouncedSearch);
      q.set('page', String(page));
      q.set('limit', '15');
      const response = await api.get<BuyerListResponse>(`/api/v1/admin/buyers?${q.toString()}`);
      return response.data;
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<{ buyer: BuyerDetail }>({
    queryKey: ['admin', 'buyer', selectedBuyerId],
    queryFn: async () => {
      const response = await api.get<{ buyer: BuyerDetail }>(`/api/v1/admin/buyers/${selectedBuyerId}`);
      return response.data;
    },
    enabled: !!selectedBuyerId,
  });

  const buyerDetail = detailData?.buyer;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-ink-900 tracking-tight sm:text-2xl">Buyers Directory</h1>
          <p className="text-xs text-ink-500">
            Read-only monitoring of all registered marketplace buyers, order volumes, and lifetime spending.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </span>
          <span className="text-xs font-semibold text-ink-600">
            {data?.total ? `${data.total} registered buyers` : 'Loading…'}
          </span>
        </div>
      </div>

      {/* Filter / Search Bar (Live real-time search without button) */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyers by name, email, or phone…"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-8 text-xs placeholder:text-ink-400 focus:border-brand-500 focus:outline-hidden"
          />
          {search && (
            <button
              type="button"
              title="Clear search"
              aria-label="Clear search"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors p-0.5 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      {isLoading ? (
        <div className="space-y-2">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="h-14 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState message="Failed to load buyers directory" onRetry={() => void refetch()} />
      ) : data.buyers.length === 0 ? (
        <Panel className="p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-ink-300" />
          <h3 className="mt-2 text-xs font-bold text-ink-800">No Buyers Found</h3>
          <p className="mt-1 text-micro text-ink-500">
            {search ? 'No buyers matched your search criteria.' : 'No buyers registered on the platform yet.'}
          </p>
        </Panel>
      ) : (
        <Panel className="overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-sunken text-[10px] font-bold uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3">Buyer Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Registration Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total Orders</th>
                  <th className="px-4 py-3">Total Spending</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-surface-sunken/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-ink-900">{buyer.fullName}</td>
                    <td className="px-4 py-3 text-ink-600 font-mono text-micro">{buyer.email || '—'}</td>
                    <td className="px-4 py-3 text-ink-600 font-mono text-micro">{buyer.phoneNumber}</td>
                    <td className="px-4 py-3 text-ink-500 text-micro">{formatDate(buyer.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={buyer.isActive ? 'success' : 'neutral'}>
                        {buyer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-ink-900">{buyer.totalOrders}</td>
                    <td className="px-4 py-3 font-mono font-bold text-ink-900">
                      {money(buyer.totalSpentPaise)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedBuyerId(buyer.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-surface-sunken hover:text-ink-900 transition-colors cursor-pointer"
                        title="View Buyer Details"
                      >
                        <Eye className="h-3.5 w-3.5 text-ink-500" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs">
              <span className="text-ink-500">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* READ-ONLY BUYER DETAILS MODAL (Portaled to body) */}
      {selectedBuyerId &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Full-page translucent backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/80 transition-opacity"
              onClick={() => setSelectedBuyerId(null)}
            />

            {/* Modal Dialog */}
            <div className="relative z-10 w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-elevated">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 font-bold text-xs">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink-900">Buyer Profile Inspection</h2>
                    <p className="text-micro text-ink-400">Strictly read-only monitoring</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBuyerId(null)}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-sunken hover:text-ink-900 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {detailLoading || !buyerDetail ? (
                <div className="py-8 space-y-3">
                  <SkeletonBlock className="h-8 w-1/2" />
                  <SkeletonBlock className="h-20 w-full" />
                </div>
              ) : (
                <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                  {/* Participant Overview */}
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-sunken p-3.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider">Full Name</span>
                      <p className="font-bold text-ink-900 mt-0.5">{buyerDetail.fullName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider">Account Status</span>
                      <div className="mt-0.5">
                        <Badge tone={buyerDetail.isActive ? 'success' : 'neutral'}>
                          {buyerDetail.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider">Phone</span>
                      <p className="font-mono text-ink-800 mt-0.5">{buyerDetail.phoneNumber}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider">Email</span>
                      <p className="font-mono text-ink-800 mt-0.5 truncate">{buyerDetail.email || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider">Total Orders</span>
                      <p className="font-mono font-bold text-ink-900 mt-0.5">{buyerDetail.totalOrders}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider">Total Spending</span>
                      <p className="font-mono font-bold text-ink-900 mt-0.5">{money(buyerDetail.totalSpentPaise)}</p>
                    </div>
                  </div>

                  {/* B2B Credentials if present */}
                  {buyerDetail.businessName && (
                    <div className="rounded-xl border border-line bg-surface p-3 text-xs">
                      <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider">Verified Business Profile</span>
                      <p className="font-bold text-ink-900 mt-0.5">{buyerDetail.businessName}</p>
                      {buyerDetail.gstin && <p className="font-mono text-micro text-ink-500 mt-0.5">GSTIN: {buyerDetail.gstin}</p>}
                    </div>
                  )}

                  {/* Saved Delivery Addresses */}
                  <div>
                    <h3 className="text-xs font-bold text-ink-900 mb-2">Saved Delivery Addresses</h3>
                    {buyerDetail.savedAddresses && buyerDetail.savedAddresses.length > 0 ? (
                      <div className="space-y-2">
                        {buyerDetail.savedAddresses.map((addr, i) => (
                          <div key={i} className="rounded-lg border border-line p-2.5 text-micro text-ink-700 bg-surface">
                            <span className="font-bold text-ink-900">{addr.label || 'Address'} &bull; {addr.recipientName}</span>
                            <p className="mt-0.5">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-micro text-ink-400">No saved addresses on file.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 border-t border-line pt-3 flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setSelectedBuyerId(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
