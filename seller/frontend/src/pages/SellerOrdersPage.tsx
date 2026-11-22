import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag,
  Search,
  Clock,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  Truck,
  Eye,
  X,
  MapPin,
  Phone,
  User,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import {
  api,
  Button,
  Panel,
  SkeletonBlock,
  ErrorState,
  errorMessage,
  money,
  Badge,
  showToast,
  showPrompt,
  createSocketClient,
  getAccessToken,
  TaxInvoiceModal,
  type Tone,
} from '@haat/shared-frontend';
import { SOCKET_EVENTS } from '@haat/shared-contracts';

interface OrderItem {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  totalAmountPaise: number;
  fulfilmentStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryDate: string | null;
  deliverySlot: {
    slotId?: string;
    startTime?: string;
    endTime?: string;
    label?: string;
  } | null;
  itemsCount: number;
  createdAt: string;
}

interface OrderDetailData {
  id: string;
  orderNumber: string;
  buyer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  shippingAddress: {
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;
  items: Array<{
    productId: string;
    sku: string;
    title: string;
    unitPricePaise: number;
    quantity: number;
    subtotalPaise: number;
    isWholesale: boolean;
  }>;
  totalAmountPaise: number;
  currency: string;
  paymentStatus: string;
  paymentMethod: string;
  fulfilmentStatus: string;
  deliveryDate: string | null;
  deliverySlot: {
    slotId?: string;
    startTime?: string;
    endTime?: string;
    label?: string;
  } | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrdersResponse {
  orders: OrderItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  counts: {
    all: number;
    new: number;
    accepted: number;
    preparing: number;
    ready: number;
    outForDelivery: number;
    completed: number;
    cancelled: number;
  };
}

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

function toneForStatus(status: string): Tone {
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

export function SellerOrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);

  const { data: invoiceData, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ['seller', 'order', 'receipt', invoiceOrderId],
    queryFn: async () => {
      if (!invoiceOrderId) return null;
      const res = await api.get<{ receipt: any }>(`/api/v1/seller/orders/${invoiceOrderId}/receipt`);
      return res.data.receipt;
    },
    enabled: Boolean(invoiceOrderId),
  });

  // Debounced live search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    const token = getAccessToken();
    const socket = createSocketClient({ token });

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard', 'stats'] });
      if (selectedOrderId) {
        void queryClient.invalidateQueries({ queryKey: ['seller', 'order', selectedOrderId] });
      }
    };

    socket.on(SOCKET_EVENTS.ORDER_CREATED, () => {
      invalidate();
      showToast.info('New Order Received', 'A buyer placed a new scheduled order.');
    });

    socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGED, invalidate);

    return () => {
      socket.disconnect();
    };
  }, [queryClient, selectedOrderId]);

  // Query order list
  const { data, isLoading, error, refetch } = useQuery<OrdersResponse>({
    queryKey: ['seller', 'orders', activeTab, debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.set('status', activeTab);
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', String(page));
      params.set('limit', '15');
      const res = await api.get<{ data: OrdersResponse }>(`/api/v1/seller/orders?${params.toString()}`);
      return (res.data as unknown as { data: OrdersResponse }).data || res.data;
    },
  });

  // Query single order details for modal
  const { data: orderDetails, isLoading: isDetailsLoading } = useQuery<{ order: OrderDetailData }>({
    queryKey: ['seller', 'order', selectedOrderId],
    queryFn: async () => {
      const res = await api.get<{ order: OrderDetailData }>(`/api/v1/seller/orders/${selectedOrderId}`);
      return res.data;
    },
    enabled: Boolean(selectedOrderId),
  });

  // Mutation to update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, reason }: { orderId: string; status: string; reason?: string }) => {
      const res = await api.patch<{ order: OrderDetailData }>(`/api/v1/seller/orders/${orderId}/status`, {
        status,
        reason,
      });
      return res.data.order;
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard', 'stats'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'order', updated.id] });
      showToast.success('Order Updated', `Order #${updated.orderNumber} is now ${updated.fulfilmentStatus.replace(/_/g, ' ')}.`);
    },
    onError: (err) => {
      showToast.error('Update Failed', errorMessage(err));
    },
  });

  const getTabCount = (key: string): number => {
    if (!data?.counts) return 0;
    switch (key) {
      case 'ALL':
        return data.counts.all;
      case 'COMPLETED':
        return data.counts.completed;
      case 'CANCELLED':
        return data.counts.cancelled;
      default:
        return 0;
    }
  };

  const handleNextAction = (order: OrderItem) => {
    switch (order.fulfilmentStatus) {
      case 'PENDING_CONFIRMATION':
        updateStatusMutation.mutate({ orderId: order.id, status: 'CONFIRMED' });
        break;
      case 'CONFIRMED':
        updateStatusMutation.mutate({ orderId: order.id, status: 'PROCESSING' });
        break;
      case 'PROCESSING':
      case 'PACKED':
        updateStatusMutation.mutate({ orderId: order.id, status: 'READY_FOR_DISPATCH' });
        break;
      case 'READY_FOR_DISPATCH':
        updateStatusMutation.mutate({ orderId: order.id, status: 'OUT_FOR_DELIVERY' });
        break;
      case 'OUT_FOR_DELIVERY':
      case 'DISPATCHED':
        updateStatusMutation.mutate({ orderId: order.id, status: 'DELIVERED' });
        break;
      default:
        break;
    }
  };

  const currentOrder = orderDetails?.order;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-display-md text-ink-900 font-extrabold">Order Management</h1>
          <p className="mt-1 text-body text-ink-600">
            Receive, prepare, and deliver customer orders according to scheduled delivery slots.
          </p>
        </div>
      </header>

      {/* Filter Tabs with Dynamic MongoDB Counts */}
      <div className="flex border-b border-line gap-1 overflow-x-auto pb-1 admin-scrollbar">
        {TABS.map((tab) => {
          const count = getTabCount(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 font-semibold text-caption rounded-t-lg transition-colors border-b-2 -mb-[2px] whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-brand-600 text-brand-700 bg-brand-50/60 font-bold'
                  : 'border-transparent text-ink-500 hover:text-ink-800 hover:bg-surface-elevated'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-micro px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer name or phone..."
            className="w-full rounded-lg border border-line bg-surface pl-9 pr-4 py-2 text-label text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Orders List Table */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-64 w-full" />
        </div>
      ) : error ? (
        <ErrorState message="Could not retrieve store orders." onRetry={() => void refetch()} />
      ) : data?.orders.length === 0 ? (
        <Panel className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <ShoppingBag size={28} />
          </div>
          <h3 className="mt-4 text-subtitle font-bold text-ink-900">No orders found</h3>
          <p className="mt-1.5 max-w-md mx-auto text-body text-ink-500">
            {debouncedSearch
              ? `No orders matching “${debouncedSearch}”. Try another keyword.`
              : 'When buyers place orders for your products, they will appear in this queue.'}
          </p>
        </Panel>
      ) : (
        <Panel className="overflow-hidden border border-line">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-label text-ink-800">
              <thead className="border-b border-line text-micro font-bold uppercase text-ink-500 bg-surface-sunken">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Scheduled Slot</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Payment</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data?.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-700">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="hover:underline cursor-pointer"
                      >
                        {order.orderNumber}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-900 truncate max-w-[140px]">{order.buyerName}</p>
                      <p className="text-micro text-ink-400 font-mono">{order.buyerPhone}</p>
                    </td>

                    <td className="px-4 py-3">
                      {order.deliveryDate ? (
                        <div>
                          <p className="font-medium text-ink-900">{order.deliveryDate}</p>
                          <p className="text-micro text-ink-500">
                            {order.deliverySlot?.startTime}–{order.deliverySlot?.endTime}
                          </p>
                        </div>
                      ) : (
                        <span className="text-micro text-ink-400">Standard Delivery</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center font-medium">
                      {order.itemsCount} SKU{order.itemsCount === 1 ? '' : 's'}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-ink-900 font-mono">
                      {money(order.totalAmountPaise)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Badge tone={order.paymentStatus === 'PAID' ? 'success' : 'warning'} shape="chip">
                        {order.paymentStatus}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Badge tone={toneForStatus(order.fulfilmentStatus)} shape="chip">
                        {order.fulfilmentStatus.replace(/_/g, ' ')}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Primary Workflow Advance Button */}
                        {order.fulfilmentStatus === 'PENDING_CONFIRMATION' && (
                          <button
                            type="button"
                            title="Accept Order"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => handleNextAction(order)}
                            className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-micro font-bold text-white transition-colors cursor-pointer"
                          >
                            Accept
                          </button>
                        )}
                        {order.fulfilmentStatus === 'CONFIRMED' && (
                          <button
                            type="button"
                            title="Start Preparing"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => handleNextAction(order)}
                            className="rounded-md bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-micro font-bold text-white transition-colors cursor-pointer"
                          >
                            Prepare
                          </button>
                        )}
                        {(order.fulfilmentStatus === 'PROCESSING' || order.fulfilmentStatus === 'PACKED') && (
                          <button
                            type="button"
                            title="Mark Ready for Delivery"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => handleNextAction(order)}
                            className="rounded-md bg-purple-600 hover:bg-purple-700 px-2.5 py-1 text-micro font-bold text-white transition-colors cursor-pointer"
                          >
                            Ready
                          </button>
                        )}
                        {order.fulfilmentStatus === 'READY_FOR_DISPATCH' && (
                          <button
                            type="button"
                            title="Mark Out for Delivery"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => handleNextAction(order)}
                            className="rounded-md bg-brand-600 hover:bg-brand-700 px-2.5 py-1 text-micro font-bold text-white transition-colors cursor-pointer"
                          >
                            Dispatch
                          </button>
                        )}
                        {(order.fulfilmentStatus === 'OUT_FOR_DELIVERY' || order.fulfilmentStatus === 'DISPATCHED') && (
                          <button
                            type="button"
                            title="Mark Delivered"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => handleNextAction(order)}
                            className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-micro font-bold text-white transition-colors cursor-pointer"
                          >
                            Delivered
                          </button>
                        )}

                        {/* View Order Inspector Button */}
                        <button
                          type="button"
                          title="View Order Details"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink-600 hover:bg-surface-sunken hover:text-ink-900 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* View Tax Invoice Button */}
                        <button
                          type="button"
                          title="View Tax Invoice"
                          onClick={() => setInvoiceOrderId(order.id)}
                          className="flex h-7 items-center gap-1 px-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer text-xs font-semibold"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Invoice</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-caption text-ink-600">
              <p>
                Showing <span className="font-semibold">{data.orders.length}</span> of{' '}
                <span className="font-semibold">{data.meta.total}</span> orders
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
                <span className="text-label font-medium px-2">
                  Page {page} of {data.meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* Order Details Modal / Drawer */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl border border-line admin-scrollbar">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-title font-extrabold text-ink-900">
                    Order #{currentOrder?.orderNumber || '...'}
                  </h2>
                  {currentOrder && (
                    <Badge tone={toneForStatus(currentOrder.fulfilmentStatus)}>
                      {currentOrder.fulfilmentStatus.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                <p className="text-caption text-ink-400 mt-0.5">
                  Placed on {currentOrder ? new Date(currentOrder.createdAt).toLocaleString('en-IN') : '...'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-sunken hover:text-ink-900 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isDetailsLoading || !currentOrder ? (
              <div className="py-10 space-y-4">
                <SkeletonBlock className="h-20 w-full" />
                <SkeletonBlock className="h-32 w-full" />
              </div>
            ) : (
              <div className="mt-5 space-y-5 text-label">
                {/* 1. Scheduled Slot & Fulfilment Badge */}
                <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-surface-sunken p-3.5 border border-line">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-brand-600 shrink-0" />
                    <div>
                      <p className="text-micro font-bold uppercase text-ink-400">Scheduled Delivery Slot</p>
                      <p className="text-caption font-bold text-ink-900">
                        {currentOrder.deliveryDate || 'Standard Delivery'}
                      </p>
                      {currentOrder.deliverySlot && (
                        <p className="text-micro text-ink-600">
                          {currentOrder.deliverySlot.startTime}–{currentOrder.deliverySlot.endTime}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-micro font-bold uppercase text-ink-400">Payment Status</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge tone={currentOrder.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                          {currentOrder.paymentStatus}
                        </Badge>
                        <span className="text-micro text-ink-500 font-mono">({currentOrder.paymentMethod})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Customer & Delivery Address */}
                <div className="grid gap-4 sm:grid-cols-2 border border-line rounded-xl p-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-ink-500 mb-1">
                      <User className="h-4 w-4" />
                      <span className="text-micro font-bold uppercase">Customer</span>
                    </div>
                    <p className="font-bold text-ink-900">{currentOrder.buyer.name}</p>
                    <p className="text-caption text-ink-600 font-mono mt-0.5">{currentOrder.buyer.phone}</p>
                    {currentOrder.buyer.email && (
                      <p className="text-caption text-ink-500 truncate">{currentOrder.buyer.email}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-ink-500 mb-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-micro font-bold uppercase">Shipping Address</span>
                    </div>
                    {currentOrder.shippingAddress ? (
                      <p className="text-caption text-ink-700 leading-relaxed">
                        {currentOrder.shippingAddress.addressLine1}
                        {currentOrder.shippingAddress.addressLine2 && `, ${currentOrder.shippingAddress.addressLine2}`}
                        <br />
                        {currentOrder.shippingAddress.city}, {currentOrder.shippingAddress.state} -{' '}
                        {currentOrder.shippingAddress.pincode}
                      </p>
                    ) : (
                      <p className="text-caption text-ink-400">No shipping address recorded</p>
                    )}
                  </div>
                </div>

                {/* 3. Itemized Products Table */}
                <div>
                  <h3 className="text-label font-bold uppercase text-ink-400 mb-2">Ordered Products</h3>
                  <div className="border border-line rounded-xl overflow-hidden">
                    <table className="w-full text-left text-caption">
                      <thead className="bg-surface-sunken text-micro font-bold uppercase text-ink-400 border-b border-line">
                        <tr>
                          <th className="px-3.5 py-2">Item</th>
                          <th className="px-3.5 py-2 text-center">Qty</th>
                          <th className="px-3.5 py-2 text-right">Price</th>
                          <th className="px-3.5 py-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {currentOrder.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3.5 py-2.5">
                              <p className="font-semibold text-ink-900">{item.title}</p>
                              <p className="text-micro font-mono text-ink-400">SKU: {item.sku}</p>
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-bold">{item.quantity}</td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-ink-700">
                              {money(item.unitPricePaise)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-bold font-mono text-ink-900">
                              {money(item.subtotalPaise)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-surface-sunken/60 font-bold border-t border-line">
                        <tr>
                          <td colSpan={3} className="px-3.5 py-2.5 text-right text-ink-700">
                            Total Order Amount:
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-brand-700 font-mono text-label">
                            {money(currentOrder.totalAmountPaise)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 4. Action Buttons Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 mt-6">
                  <div className="flex items-center gap-2">
                    {/* Status Advance Actions */}
                    {currentOrder.fulfilmentStatus === 'PENDING_CONFIRMATION' && (
                      <Button
                        variant="primary"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({ orderId: currentOrder.id, status: 'CONFIRMED' })
                        }
                      >
                        Accept Order
                      </Button>
                    )}
                    {currentOrder.fulfilmentStatus === 'CONFIRMED' && (
                      <Button
                        variant="primary"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({ orderId: currentOrder.id, status: 'PROCESSING' })
                        }
                      >
                        Start Preparing
                      </Button>
                    )}
                    {(currentOrder.fulfilmentStatus === 'PROCESSING' ||
                      currentOrder.fulfilmentStatus === 'PACKED') && (
                      <Button
                        variant="primary"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({ orderId: currentOrder.id, status: 'READY_FOR_DISPATCH' })
                        }
                      >
                        Mark Ready for Dispatch
                      </Button>
                    )}
                    {currentOrder.fulfilmentStatus === 'READY_FOR_DISPATCH' && (
                      <Button
                        variant="primary"
                        className="bg-brand-600 hover:bg-brand-700 text-white"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({ orderId: currentOrder.id, status: 'OUT_FOR_DELIVERY' })
                        }
                      >
                        Mark Out for Delivery
                      </Button>
                    )}
                    {(currentOrder.fulfilmentStatus === 'OUT_FOR_DELIVERY' ||
                      currentOrder.fulfilmentStatus === 'DISPATCHED') && (
                      <Button
                        variant="primary"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({ orderId: currentOrder.id, status: 'DELIVERED' })
                        }
                      >
                        Confirm Delivered
                      </Button>
                    )}

                    {/* Cancellation Action if order not yet fulfilled */}
                    {['PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING'].includes(
                      currentOrder.fulfilmentStatus,
                    ) && (
                      <Button
                        variant="danger"
                        disabled={updateStatusMutation.isPending}
                        onClick={async () => {
                          const reason = await showPrompt({
                            title: 'Cancel Order?',
                            text: 'Please provide a reason for cancelling this order:',
                            inputPlaceholder: 'e.g. Out of stock, Seller unable to fulfill...',
                            confirmButtonText: 'Yes, cancel order',
                            cancelButtonText: 'Keep order',
                            danger: true,
                            required: true,
                          });
                          if (reason !== null) {
                            updateStatusMutation.mutate({
                              orderId: currentOrder.id,
                              status: 'CANCELLED',
                              reason: reason.trim() || 'Seller unable to fulfill',
                            });
                          }
                        }}
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => setInvoiceOrderId(currentOrder.id)}
                    >
                      <FileText className="h-4 w-4 mr-1.5" />
                      View Tax Invoice
                    </Button>
                    <Button variant="secondary" onClick={() => setSelectedOrderId(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      <TaxInvoiceModal
        isOpen={Boolean(invoiceOrderId)}
        onClose={() => setInvoiceOrderId(null)}
        invoiceData={invoiceData || null}
        isLoading={isInvoiceLoading}
      />
    </div>
  );
}
