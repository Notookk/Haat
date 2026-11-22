import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  ShoppingBag,
  MapPin,
  Clock,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  FileText,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { api, money, formatDate, SkeletonBlock, ErrorState, showToast, TaxInvoiceModal } from '@haat/shared-frontend';
import { initiateRazorpayPayment } from '../features/payments/useRazorpay';

const FULFILMENT_STEPS = [
  { key: 'PENDING_CONFIRMATION', label: 'Order Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'READY_FOR_DISPATCH', label: 'Staged' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: async () => {
      const res = await api.get<{ order: any }>(`/orders/${id}`);
      return res.data.order;
    },
    enabled: !!id,
  });

  const { data: receiptData, isLoading: isReceiptLoading } = useQuery({
    queryKey: ['order-receipt', id],
    queryFn: async () => {
      const res = await api.get<{ receipt: any }>(`/orders/${id}/receipt`);
      return res.data.receipt;
    },
    enabled: isReceiptModalOpen && !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await api.post(`/orders/${id}/cancel`, { reason });
      return res.data;
    },
    onSuccess: () => {
      showToast.success('Order Cancelled', 'Your order was successfully cancelled.');
      setIsCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
    },
    onError: (err: any) => {
      showToast.error('Cancellation Failed', err.message || 'Unable to cancel order.');
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-container px-4 md:px-8 py-10 space-y-6">
        <SkeletonBlock className="h-8 w-60" />
        <SkeletonBlock className="h-40 w-full rounded-2xl" />
        <SkeletonBlock className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-container px-4 md:px-8 py-12">
        <ErrorState message={(error as any)?.message || 'Order not found'} onRetry={refetch} />
      </div>
    );
  }

  const order = data;
  const currentStepIndex = FULFILMENT_STEPS.findIndex((s) => s.key === order.fulfilmentStatus);
  const isCancelled = order.fulfilmentStatus === 'CANCELLED';
  const canCancel = ['PENDING_CONFIRMATION', 'CONFIRMED'].includes(order.fulfilmentStatus);
  const isPendingPayment = order.paymentStatus === 'PENDING';

  const handlePayNow = async () => {
    await initiateRazorpayPayment({
      orderId: order._id,
      amountPaise: order.totalAmountPaise,
      buyerName: order.shippingAddress?.name,
      buyerPhone: order.shippingAddress?.phone,
      onSuccess: () => {
        refetch();
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200/80 bg-white py-3">
        <div className="mx-auto flex max-w-container items-center gap-2 px-4 md:px-8 text-xs text-gray-400">
          <Link to="/" className="hover:text-[#16135c]">Home</Link>
          <ChevronRight size={12} />
          <Link to="/orders" className="hover:text-[#16135c]">My Orders</Link>
          <ChevronRight size={12} />
          <span className="font-semibold text-gray-900">{order.orderNumber}</span>
        </div>
      </div>

      <div className="mx-auto max-w-container px-4 md:px-8 pt-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
              {isCancelled ? (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Cancelled</span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {order.fulfilmentStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Placed on {formatDate(order.createdAt)} · Sold by{' '}
              <strong className="text-gray-900">{order.sellerId?.storeName || 'Verified Merchant'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReceiptModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs transition-all"
            >
              <FileText size={14} className="text-[#0AAD0A]" />
              <span>Tax Invoice</span>
            </button>

            {canCancel && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100/70 transition-all"
              >
                <XCircle size={14} />
                <span>Cancel Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Payment Warning Callout */}
        {isPendingPayment && !isCancelled && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">Payment Pending: {money(order.totalAmountPaise)}</h4>
                <p className="text-xs text-amber-700">
                  Please complete payment to guarantee your reserved delivery slot.
                </p>
              </div>
            </div>

            <button
              onClick={handlePayNow}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0AAD0A] hover:bg-[#099b09] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
            >
              <CreditCard size={14} />
              <span>Pay Now via Razorpay</span>
            </button>
          </div>
        )}

        {/* Fulfilment Timeline */}
        {!isCancelled && (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6">Delivery Progress</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {FULFILMENT_STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                        isPassed
                          ? 'border-[#0AAD0A] bg-[#0AAD0A] text-white shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-300'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 size={18} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span
                      className={`mt-2 text-xs ${
                        isCurrent ? 'font-bold text-[#0AAD0A]' : isPassed ? 'font-medium text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid: Items (Span 8) + Delivery & Summary (Span 4) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Items */}
          <div className="space-y-4 lg:col-span-8">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                Purchased Items ({order.items?.length || 0})
              </h3>

              <div className="divide-y divide-gray-100 mt-2">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-xl bg-gray-50 border text-gray-400">
                        <ShoppingBag size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                        <p className="text-xs text-gray-400">
                          SKU: {item.sku} · Qty: {item.quantity} · {money(item.unitPricePaise)}/unit
                        </p>
                        {item.isWholesale && (
                          <span className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-micro font-bold text-amber-800">
                            Wholesale Tier Applied
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{money(item.subtotalPaise)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Delivery & Financial Sidebar */}
          <div className="space-y-4 lg:col-span-4">
            {/* Delivery Details */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Delivery Details</h3>

              <div className="space-y-2 text-xs text-gray-700">
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-[#0AAD0A] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900">{order.shippingAddress?.name}</p>
                    <p className="text-gray-500">{order.shippingAddress?.phone}</p>
                    <p className="text-gray-500 mt-0.5">
                      {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city} - {order.shippingAddress?.pincode}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
                  <Clock size={15} className="text-[#0AAD0A] shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{order.deliveryDate || 'Scheduled Delivery'}</p>
                    <p className="text-gray-500 text-micro">
                      {order.deliverySlot?.label || `${order.deliverySlot?.startTime} – ${order.deliverySlot?.endTime}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Breakdown</h3>

              <div className="space-y-2 text-xs text-gray-600 border-b border-gray-100 pb-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{money(order.totalAmountPaise - (order.deliveryFeePaise || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-medium text-gray-900">{money(order.deliveryFeePaise || 0)}</span>
                </div>
              </div>

              <div className="flex justify-between text-base font-black text-gray-900">
                <span>Total Amount:</span>
                <span className="text-[#0AAD0A]">{money(order.totalAmountPaise)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Confirm Order Cancellation</h3>
            <p className="text-xs text-gray-500">
              Are you sure you want to cancel order #{order.orderNumber}? This action cannot be undone.
            </p>

            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please share the reason for cancellation..."
              className="w-full rounded-xl border border-gray-200 p-3 text-xs text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={cancelMutation.isPending || !cancelReason.trim()}
                onClick={() => cancelMutation.mutate(cancelReason)}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Receipt Modal */}
      <TaxInvoiceModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        invoiceData={receiptData || null}
        isLoading={isReceiptLoading}
      />
    </div>
  );
}
