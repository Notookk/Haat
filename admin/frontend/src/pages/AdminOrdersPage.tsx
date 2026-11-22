import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  ShoppingBag,
  Search,
  Eye,
  X,
  Calendar,
  AlertCircle,
  Truck,
  CheckCircle2,
  Clock,
  IndianRupee,
  FileText,
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
  TaxInvoiceModal,
} from '@haat/shared-frontend';

interface OrderItem {
  id: string;
  orderNumber: string;
  buyer: { fullName?: string; email?: string; phoneNumber?: string } | null;
  seller: { storeName?: string; storeSlug?: string } | null;
  itemsCount: number;
  totalAmountPaise: number;
  paymentStatus: string;
  fulfilmentStatus: string;
  createdAt: string;
}

interface OrdersResponse {
  orders: OrderItem[];
  metrics: {
    totalOrders: number;
    totalGmvPaise: number;
  };
}

export function AdminOrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<OrdersResponse>({
    queryKey: ['admin-orders', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      const res = await api.get<OrdersResponse>(`/admin/orders?${params.toString()}`);
      return res.data;
    },
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-order-detail', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await api.get<{ order: any }>(`/admin/orders/${selectedOrderId}`);
      return res.data.order;
    },
    enabled: !!selectedOrderId,
  });

  const { data: invoiceReceiptData, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ['admin-order-receipt', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return null;
      const res = await api.get<{ receipt: any }>(`/admin/orders/${selectedInvoiceId}/receipt`);
      return res.data.receipt;
    },
    enabled: !!selectedInvoiceId,
  });

  const orders = data?.orders || [];
  const metrics = data?.metrics || { totalOrders: 0, totalGmvPaise: 0 };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge tone="success">Delivered</Badge>;
      case 'CONFIRMED':
      case 'PROCESSING':
        return <Badge tone="neutral">Processing</Badge>;
      case 'DISPATCHED':
      case 'OUT_FOR_DELIVERY':
        return <Badge tone="warning">In Transit</Badge>;
      case 'CANCELLED':
        return <Badge tone="danger">Cancelled</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge tone="success">Paid</Badge>;
      case 'PENDING':
        return <Badge tone="warning">Pending</Badge>;
      case 'FAILED':
        return <Badge tone="danger">Failed</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Platform Orders</h1>
        <p className="mt-1 text-sm text-ink-500">
          Supervisory oversight of marketplace order fulfilment and gross merchandise volume. (Read-Only)
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Total Volume</p>
              <h3 className="mt-2 text-2xl font-bold text-ink-900">{metrics.totalOrders} Orders</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Marketplace GMV</p>
              <h3 className="mt-2 text-2xl font-bold text-ink-900">{money(metrics.totalGmvPaise)}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <IndianRupee className="h-6 w-6" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Filter and Search Bar */}
      <Panel className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search by order number (e.g. HAAT-202611-1234)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas pl-9 pr-4 py-2 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">All Fulfilment States</option>
              <option value="PENDING_CONFIRMATION">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </Panel>

      {/* Orders Table */}
      <Panel className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 p-6">
            <SkeletonBlock className="h-8 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorState message={(error as any)?.message || 'Failed to load orders'} onRetry={refetch} />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<ShoppingBag className="h-10 w-10 text-ink-300" />}
              title="No orders found"
              description="No marketplace orders match the applied search filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-600">
              <thead className="border-b border-line bg-canvas-muted text-xs uppercase text-ink-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Order</th>
                  <th className="px-6 py-3 font-semibold">Buyer</th>
                  <th className="px-6 py-3 font-semibold">Seller</th>
                  <th className="px-6 py-3 font-semibold">Items</th>
                  <th className="px-6 py-3 font-semibold">Total Amount</th>
                  <th className="px-6 py-3 font-semibold">Payment</th>
                  <th className="px-6 py-3 font-semibold">Fulfilment</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-canvas-subtle">
                    <td className="px-6 py-4 font-mono font-semibold text-ink-900">{o.orderNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink-900">{o.buyer?.fullName || 'Customer'}</div>
                      <div className="text-xs text-ink-400">{o.buyer?.phoneNumber || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink-800">{o.seller?.storeName || 'Merchant'}</div>
                    </td>
                    <td className="px-6 py-4 text-ink-600">{o.itemsCount} items</td>
                    <td className="px-6 py-4 font-semibold text-ink-900">{money(o.totalAmountPaise)}</td>
                    <td className="px-6 py-4">{getPaymentBadge(o.paymentStatus)}</td>
                    <td className="px-6 py-4">{getStatusBadge(o.fulfilmentStatus)}</td>
                    <td className="px-6 py-4 text-xs text-ink-400">{formatDate(o.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoiceId(o.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-[#0AAD0A] border-emerald-200 hover:bg-emerald-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Invoice
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrderId(o.id)}
                          className="inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Order Detail Modal */}
      {selectedOrderId &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-canvas p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h3 className="text-lg font-bold text-ink-900">
                    Order Details: {detailData?.orderNumber || '...'}
                  </h3>
                  <p className="text-xs text-ink-500">Read-only platform supervision</p>
                </div>
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="rounded-lg p-1 text-ink-400 hover:bg-canvas-muted hover:text-ink-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isDetailLoading || !detailData ? (
                <div className="space-y-4 py-8">
                  <SkeletonBlock className="h-6 w-1/2" />
                  <SkeletonBlock className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-6 pt-4 text-sm text-ink-700">
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-canvas-muted p-4">
                    <div>
                      <p className="text-xs text-ink-400 uppercase font-semibold">Buyer Information</p>
                      <p className="mt-1 font-medium text-ink-900">{detailData.shippingAddress?.name || 'Customer'}</p>
                      <p className="text-xs text-ink-500">{detailData.shippingAddress?.phone}</p>
                      <p className="text-xs text-ink-500">
                        {detailData.shippingAddress?.addressLine1}, {detailData.shippingAddress?.city} - {detailData.shippingAddress?.pincode}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-400 uppercase font-semibold">Delivery Window</p>
                      <p className="mt-1 font-medium text-ink-900">{detailData.deliveryDate || 'Standard'}</p>
                      <p className="text-xs text-ink-500">{detailData.deliverySlot?.label || 'Scheduled Slot'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-ink-900">Item Breakdown</h4>
                    <div className="mt-2 divide-y divide-line rounded-lg border border-line">
                      {detailData.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 text-xs">
                          <div>
                            <p className="font-medium text-ink-900">{item.title}</p>
                            <p className="text-ink-400">SKU: {item.sku} · Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-ink-900">{money(item.subtotalPaise)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-line pt-4 text-base font-bold text-ink-900">
                    <span>Order Total:</span>
                    <span>{money(detailData.totalAmountPaise)}</span>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="primary"
                      onClick={() => setSelectedInvoiceId(detailData._id || selectedOrderId)}
                      className="inline-flex items-center gap-1.5 bg-[#16135c] text-white hover:bg-[#120f4c]"
                    >
                      <FileText className="h-4 w-4" />
                      View Full Tax Invoice
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Dynamic On-The-Fly Tax Invoice Modal */}
      <TaxInvoiceModal
        isOpen={!!selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        invoiceData={invoiceReceiptData || null}
        isLoading={isInvoiceLoading}
      />
    </div>
  );
}
