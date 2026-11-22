import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Package,
  Calendar,
  Clock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Truck,
  FileText,
} from 'lucide-react';
import { api, money, formatDate, SkeletonBlock, ErrorState, EmptyState, TaxInvoiceModal } from '@haat/shared-frontend';

interface OrderItem {
  _id: string;
  orderNumber: string;
  sellerId: { storeName?: string; storeSlug?: string } | null;
  items: Array<{ title: string; quantity: number; subtotalPaise: number }>;
  totalAmountPaise: number;
  deliveryDate: string | null;
  deliverySlot: { label?: string; startTime?: string; endTime?: string } | null;
  paymentStatus: string;
  fulfilmentStatus: string;
  createdAt: string;
}

export function OrdersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<{ orders: OrderItem[] }>({
    queryKey: ['buyer-orders'],
    queryFn: async () => {
      const res = await api.get<{ orders: OrderItem[] }>('/orders');
      return res.data;
    },
  });

  const { data: invoiceData, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ['order-receipt', invoiceOrderId],
    queryFn: async () => {
      if (!invoiceOrderId) return null;
      const res = await api.get<{ receipt: any }>(`/orders/${invoiceOrderId}/receipt`);
      return res.data.receipt;
    },
    enabled: !!invoiceOrderId,
  });

  const orders = data?.orders || [];

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ACTIVE') {
      return !['DELIVERED', 'CANCELLED'].includes(o.fulfilmentStatus);
    }
    if (filter === 'DELIVERED') {
      return o.fulfilmentStatus === 'DELIVERED';
    }
    if (filter === 'CANCELLED') {
      return o.fulfilmentStatus === 'CANCELLED';
    }
    return true;
  });

  const getFulfilmentBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Delivered</span>;
      case 'DISPATCHED':
      case 'OUT_FOR_DELIVERY':
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">Out for Delivery</span>;
      case 'CONFIRMED':
      case 'PROCESSING':
      case 'PACKED':
      case 'READY_FOR_DISPATCH':
        return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">In Progress</span>;
      case 'CANCELLED':
        return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">Cancelled</span>;
      default:
        return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200/80 bg-white py-3">
        <div className="mx-auto flex max-w-container items-center gap-2 px-4 md:px-8 text-xs text-gray-400">
          <Link to="/" className="hover:text-[#16135c]">Home</Link>
          <ChevronRight size={12} />
          <span className="font-semibold text-gray-900">My Orders</span>
        </div>
      </div>

      <div className="mx-auto max-w-container px-4 md:px-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders & Fulfilment</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track live deliveries, review past purchases and view tax receipts.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
            {(['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  filter === tab
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <SkeletonBlock className="h-28 w-full rounded-2xl" />
              <SkeletonBlock className="h-28 w-full rounded-2xl" />
              <SkeletonBlock className="h-28 w-full rounded-2xl" />
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-red-200 bg-white p-6">
              <ErrorState message={(error as any)?.message || 'Failed to load orders'} onRetry={refetch} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0AAD0A] mb-3">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No orders found</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                {filter === 'ALL'
                  ? "You haven't placed any orders yet. Discover high-quality products from verified stores."
                  : `You have no ${filter.toLowerCase()} orders.`}
              </p>
              <Link
                to="/catalogue"
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#0AAD0A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#099b09] shadow-sm transition-all"
              >
                <span>Browse Products</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order._id}
                onClick={() => navigate(`/orders/${order._id}`)}
                className="cursor-pointer rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xs hover:border-[#0AAD0A]/50 hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</span>
                    <span className="text-xs text-gray-400">· {formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getFulfilmentBadge(order.fulfilmentStatus)}
                    <span
                      className={`rounded-full px-2 py-0.5 text-micro font-semibold uppercase ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-800">
                      Merchant: <span className="font-bold text-gray-900">{order.sellerId?.storeName || 'Verified Store'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}:{' '}
                      {order.items.slice(0, 2).map((it) => it.title).join(', ')}
                      {order.items.length > 2 ? ` + ${order.items.length - 2} more` : ''}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total Amount</div>
                    <div className="text-base font-black text-gray-900">{money(order.totalAmountPaise)}</div>
                  </div>
                </div>

                {/* Footer Bar: Slot Info & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  {order.deliverySlot ? (
                    <div className="flex items-center gap-1.5 text-micro text-gray-500">
                      <Clock size={12} className="text-[#0AAD0A]" />
                      <span>
                        Slot: {order.deliveryDate} ({order.deliverySlot.label || `${order.deliverySlot.startTime} – ${order.deliverySlot.endTime}`})
                      </span>
                    </div>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInvoiceOrderId(order._id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#0AAD0A] hover:text-[#0AAD0A] hover:bg-emerald-50/30 transition-all cursor-pointer shadow-2xs"
                    >
                      <FileText size={13} className="text-[#0AAD0A]" />
                      <span>View Invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${order._id}`);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      <span>Track</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dynamic On-The-Fly Tax Invoice Modal */}
      <TaxInvoiceModal
        isOpen={!!invoiceOrderId}
        onClose={() => setInvoiceOrderId(null)}
        invoiceData={invoiceData || null}
        isLoading={isInvoiceLoading}
      />
    </div>
  );
}
