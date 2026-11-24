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
  Banknote,
  FileText,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Check,
  MessageSquare,
  ArrowLeft,
  Calendar,
  Store,
  Truck,
  Copy,
} from 'lucide-react';
import {
  api,
  money,
  formatDate,
  SkeletonBlock,
  ErrorState,
  showToast,
  TaxInvoiceModal,
} from '@haat/shared-frontend';
import { initiateRazorpayPayment } from '../features/payments/useRazorpay';

interface FulfilmentStep {
  key: string;
  label: string;
  aliases?: string[];
}

const FULFILMENT_STEPS: FulfilmentStep[] = [
  { key: 'PENDING_CONFIRMATION', label: 'Order Placed', aliases: ['PENDING'] },
  { key: 'CONFIRMED', label: 'Confirmed', aliases: ['ACCEPTED'] },
  { key: 'PROCESSING', label: 'Processing', aliases: ['IN_PROGRESS'] },
  { key: 'PACKED', label: 'Packed' },
  { key: 'READY_FOR_DISPATCH', label: 'Staged', aliases: ['READY_FOR_DELIVERY', 'STAGED'] },
  { key: 'DISPATCHED', label: 'Dispatched', aliases: ['OUT_FOR_DELIVERY', 'DISPATCH', 'SHIPPED', 'IN_TRANSIT'] },
  { key: 'DELIVERED', label: 'Delivered', aliases: ['COMPLETED'] },
];

function getFulfilmentStatusInfo(status: string) {
  switch (status) {
    case 'PENDING_CONFIRMATION':
      return {
        label: 'Order Placed • Awaiting Confirmation',
        badgeClass: 'bg-blue-50 text-[#16135c] border-blue-200',
      };
    case 'CONFIRMED':
      return {
        label: 'Order Confirmed',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'PROCESSING':
      return {
        label: 'Processing & Preparing',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      };
    case 'PACKED':
      return {
        label: 'Packed & Ready',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      };
    case 'READY_FOR_DISPATCH':
      return {
        label: 'Staged for Dispatch',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    case 'DISPATCHED':
    case 'OUT_FOR_DELIVERY':
      return {
        label: 'Dispatched & On the Way',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'DELIVERED':
      return {
        label: 'Delivered Successfully',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'CANCELLED':
      return {
        label: 'Order Cancelled',
        badgeClass: 'bg-red-50 text-red-800 border-red-200',
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
      };
  }
}

function getOrderItemImageUrl(item: any): string | null {
  if (!item) return null;

  // 1. Populated product images array
  const images = item.productId?.images;
  if (Array.isArray(images) && images.length > 0) {
    const primary = images.find((img: any) => img?.isPrimary) || images[0];
    if (typeof primary === 'string' && primary.trim()) {
      return primary;
    }
    if (primary && typeof primary.url === 'string' && primary.url.trim()) {
      return primary.url;
    }
  }

  // 2. Direct item image (string or { url })
  if (typeof item.image === 'string' && item.image.trim()) {
    return item.image;
  }
  if (item.image && typeof item.image.url === 'string' && item.image.url.trim()) {
    return item.image.url;
  }

  // 3. Direct product single image
  if (typeof item.productId?.image === 'string' && item.productId.image.trim()) {
    return item.productId.image;
  }
  if (item.productId?.image && typeof item.productId.image.url === 'string' && item.productId.image.url.trim()) {
    return item.productId.image.url;
  }

  // 4. Product image property
  if (typeof item.productImage === 'string' && item.productImage.trim()) {
    return item.productImage;
  }

  return null;
}

function OrderItemThumbnail({ item }: { item: any }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = getOrderItemImageUrl(item);

  if (!imageUrl || hasError) {
    return (
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-[#16135c] font-bold text-base shrink-0 shadow-2xs border border-blue-100">
        {item.title?.charAt(0) || <Package size={20} />}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={item.title || 'Product item'}
      onError={() => setHasError(true)}
      className="h-16 w-16 rounded-2xl object-cover border border-gray-100 bg-gray-50 shrink-0 shadow-2xs"
    />
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

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
      <div className="min-h-screen bg-[#fafbfc] pb-16">
        <div className="mx-auto max-w-container px-4 md:px-8 py-10 space-y-6">
          <SkeletonBlock className="h-8 w-60 rounded-xl" />
          <SkeletonBlock className="h-44 w-full rounded-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <SkeletonBlock className="lg:col-span-8 h-80 w-full rounded-3xl" />
            <SkeletonBlock className="lg:col-span-4 h-80 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#fafbfc] pb-16">
        <div className="mx-auto max-w-container px-4 md:px-8 py-12">
          <ErrorState message={(error as any)?.message || 'Order not found'} onRetry={refetch} />
        </div>
      </div>
    );
  }

  const order = data;
  const isCancelled = order.fulfilmentStatus === 'CANCELLED';
  const currentStepIndex = (() => {
    const status = (order.fulfilmentStatus || '').toUpperCase();
    const idx = FULFILMENT_STEPS.findIndex(
      (s) => s.key === status || s.aliases?.includes(status),
    );
    if (idx !== -1) return idx;
    return isCancelled ? -1 : 0;
  })();
  const canCancel = ['PENDING_CONFIRMATION', 'CONFIRMED'].includes(order.fulfilmentStatus);
  const isOnlinePending = order.paymentMethod !== 'COD' && order.paymentStatus === 'PENDING';
  const statusInfo = getFulfilmentStatusInfo(order.fulfilmentStatus);
  const sellerStoreName = order.sellerId?.storeName || 'Verified Merchant';
  const sellerSlug = order.sellerId?.storeSlug || '';
  const deliveryFee = order.deliveryFeePaise || 0;
  const itemsSubtotal = order.totalAmountPaise - deliveryFee;

  const handleCopyOrderNumber = () => {
    if (order.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopiedOrderNumber(true);
      showToast.info('Copied', `Order #${order.orderNumber} copied to clipboard.`);
      setTimeout(() => setCopiedOrderNumber(false), 2000);
    }
  };

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
    <div className="min-h-screen bg-[#fafbfc] pb-20">
      {/* 1. Breadcrumbs */}
      <div className="border-b border-gray-200/80 bg-white py-3">
        <div className="mx-auto flex max-w-container items-center gap-2 px-4 md:px-8 text-xs text-[#889397]">
          <Link to="/" className="hover:text-[#16135c] transition-colors">
            Home
          </Link>
          <ChevronRight size={12} className="text-gray-300" />
          <Link to="/orders" className="hover:text-[#16135c] transition-colors">
            My Orders
          </Link>
          <ChevronRight size={12} className="text-gray-300" />
          <span className="font-semibold text-[#16135c]">{order.orderNumber}</span>
        </div>
      </div>

      <div className="mx-auto max-w-container px-4 md:px-8 pt-8 space-y-6">
        {/* 2. Top Header & Action Controls */}
        <div className="border-b border-gray-200/80 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16135c] hover:underline"
                >
                  <ArrowLeft size={14} />
                  <span>All Orders</span>
                </Link>
                <span className="text-gray-300">•</span>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-[#16135c]">
                  HAAT Verified Fulfilment
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-[#16135c] sm:text-3xl">
                  Order #{order.orderNumber}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  title="Copy Order Number"
                  className="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#16135c] hover:border-[#16135c] transition-all cursor-pointer shadow-2xs"
                >
                  {copiedOrderNumber ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${statusInfo.badgeClass}`}
                >
                  {statusInfo.label}
                </span>
              </div>

              <p className="text-xs text-[#5c6c75] mt-1.5 flex items-center gap-2 flex-wrap">
                <span>Placed on <strong>{formatDate(order.createdAt)}</strong></span>
                <span>•</span>
                <span>
                  Sold by{' '}
                  {sellerSlug ? (
                    <Link
                      to={`/chat?sellerId=${encodeURIComponent(sellerSlug)}`}
                      className="text-[#16135c] font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <Store size={12} className="text-[#16135c]" />
                      <span>{sellerStoreName}</span>
                    </Link>
                  ) : (
                    <strong className="text-gray-800">{sellerStoreName}</strong>
                  )}
                </span>
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 px-4 py-2.5 text-xs font-bold text-[#16135c] shadow-2xs transition-all cursor-pointer"
              >
                <FileText size={14} className="text-[#0AAD0A]" />
                <span>Tax Invoice</span>
              </button>

              {sellerSlug && (
                <Link
                  to={`/chat?sellerId=${encodeURIComponent(sellerSlug)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:text-[#16135c] hover:border-blue-200 px-4 py-2.5 text-xs font-bold text-gray-700 shadow-2xs transition-all"
                >
                  <MessageSquare size={14} className="text-[#16135c]" />
                  <span>Chat Seller</span>
                </Link>
              )}

              {canCancel && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100/80 px-4 py-2.5 text-xs font-bold text-red-700 shadow-2xs transition-all cursor-pointer"
                >
                  <XCircle size={14} />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Payment Status Banner */}
        {isOnlinePending && !isCancelled ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800 shadow-2xs">
                <CreditCard size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-amber-950">
                    Online Payment Pending · {money(order.totalAmountPaise)}
                  </h4>
                  <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.2 text-[10px] font-bold">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Please complete your online payment to guarantee and lock your reserved delivery slot.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePayNow}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16135c] hover:bg-[#12104b] px-6 py-3 text-xs font-bold text-white shadow-md transition-all cursor-pointer shrink-0"
            >
              <CreditCard size={15} />
              <span>Pay Now via Razorpay</span>
            </button>
          </div>
        ) : order.paymentMethod === 'COD' && !isCancelled ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-blue-200 bg-blue-50/70 p-5 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-[#16135c] shadow-2xs">
                <Banknote size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-[#16135c]">
                    Cash on Delivery (COD) · {money(order.totalAmountPaise)}
                  </h4>
                  <span className="rounded-full bg-blue-100 text-[#16135c] border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold">
                    Pay on Arrival
                  </span>
                </div>
                <p className="text-xs text-[#5c6c75] mt-0.5">
                  Please keep {money(order.totalAmountPaise)} ready in cash or UPI to pay our delivery executive upon doorstep arrival.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16135c] bg-white border border-blue-200 px-3.5 py-2 rounded-xl shrink-0 shadow-2xs">
              <ShieldCheck size={16} className="text-[#0AAD0A]" />
              <span>Verified COD Fulfilment</span>
            </div>
          </div>
        ) : null}

        {/* 4. Connected Fulfilment Progress Timeline */}
        {!isCancelled ? (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#16135c] text-white text-xs font-bold shadow-2xs">
                  <Truck size={14} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#16135c]">Delivery Fulfilment Progress</h2>
                  <p className="text-[11px] text-[#5c6c75]">Live status updates from merchant dispatch</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Live Status
              </span>
            </div>

            {/* Stepper with Connecting Line */}
            <div className="relative pt-2 pb-4 overflow-x-auto buyer-scrollbar">
              <div className="min-w-[640px] px-4">
                <div className="grid grid-cols-7 relative">
                  {FULFILMENT_STEPS.map((step, idx) => {
                    const isPassed = currentStepIndex >= idx;
                    const isCurrent = currentStepIndex === idx;

                    return (
                      <div key={step.key} className="relative flex flex-col items-center text-center">
                        {/* Connecting Line Segment to Previous Step */}
                        {idx > 0 && (
                          <div
                            className={`absolute top-5 right-1/2 w-full h-1 -translate-y-1/2 z-0 transition-colors duration-300 ${
                              currentStepIndex >= idx ? 'bg-[#16135c]' : 'bg-gray-200'
                            }`}
                          />
                        )}

                        {/* Step Circle */}
                        <div
                          className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                            isCurrent
                              ? 'border-[#16135c] bg-[#16135c] text-white ring-4 ring-blue-100 shadow-sm scale-110'
                              : isPassed
                                ? 'border-[#16135c] bg-[#16135c] text-white shadow-2xs'
                                : 'border-gray-200 bg-white text-gray-400'
                          }`}
                        >
                          {isPassed ? (
                            <Check size={15} strokeWidth={3} />
                          ) : (
                            <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                          )}
                        </div>
                        <span
                          className={`mt-2.5 text-[11px] leading-tight max-w-[85px] ${
                            isCurrent
                              ? 'font-bold text-[#16135c]'
                              : isPassed
                                ? 'font-semibold text-gray-800'
                                : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 flex items-center gap-3 text-red-800 text-xs">
            <XCircle size={20} className="text-red-600 shrink-0" />
            <div>
              <span className="font-bold text-sm">This order has been cancelled</span>
              <p className="text-[11px] text-red-700 mt-0.5">
                No further fulfilment or charges will be processed for this order.
              </p>
            </div>
          </div>
        )}

        {/* 5. Main 2-Column Content Layout (Grid 12) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Items & Delivery Window (Span 8) */}
          <div className="space-y-6 lg:col-span-8">
            {/* Purchased Items Card */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#16135c] text-white text-xs font-bold shadow-2xs">
                    <ShoppingBag size={14} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#16135c]">Purchased Items</h2>
                    <p className="text-[11px] text-[#5c6c75]">
                      {order.items?.length || 0} line {order.items?.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>

                {sellerSlug && (
                  <Link
                    to={`/chat?sellerId=${encodeURIComponent(sellerSlug)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16135c] hover:underline"
                  >
                    <MessageSquare size={13} />
                    <span>Inquire About Items</span>
                  </Link>
                )}
              </div>

              {/* Items List */}
              <div className="divide-y divide-gray-100">
                {order.items?.map((item: any, i: number) => {
                  const productId = item.productId?._id || item.productId;

                  return (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <OrderItemThumbnail item={item} />

                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/products/${productId}`}
                            className="text-sm font-bold text-[#16135c] hover:underline line-clamp-1"
                          >
                            {item.title}
                          </Link>

                          <div className="flex items-center gap-2 text-xs text-[#5c6c75] mt-1 flex-wrap">
                            <span>SKU: <strong className="text-gray-700 font-medium">{item.sku}</strong></span>
                            <span>•</span>
                            <span>Qty: <strong className="text-gray-900 font-bold">{item.quantity}</strong></span>
                            <span>•</span>
                            <span className="font-semibold text-gray-800">
                              {money(item.unitPricePaise)} <span className="text-[10px] text-gray-500 font-normal">/ unit</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {item.isCustomQuote && (
                              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.2 text-[9px] font-bold text-indigo-700">
                                Custom Quote
                              </span>
                            )}
                            {item.isWholesale && (
                              <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.2 text-[9px] font-bold text-purple-700">
                                Wholesale Tier
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right sm:text-right shrink-0">
                        <span className="text-sm font-black text-[#16135c]">
                          {money(item.subtotalPaise)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scheduled Fulfilment & Logistics Card */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#16135c] text-white text-xs font-bold shadow-2xs">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#16135c]">Scheduled Delivery Logistics</h2>
                    <p className="text-[11px] text-[#5c6c75]">Reserved delivery window & merchant allocation</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Capacity Locked
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Delivery Window */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#16135c]">
                    <Clock size={15} className="text-[#16135c]" />
                    <span>Scheduled Delivery Window</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {order.deliveryDate || 'Scheduled Delivery'}
                  </div>
                  <p className="text-xs text-[#5c6c75]">
                    {order.deliverySlot?.label ||
                      (order.deliverySlot?.startTime && order.deliverySlot?.endTime
                        ? `${order.deliverySlot.startTime} – ${order.deliverySlot.endTime}`
                        : 'Delivery will happen shortly')}
                  </p>
                </div>

                {/* Delivery Address */}
                <div className="rounded-2xl border border-gray-200/80 bg-gray-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <MapPin size={15} className="text-[#0AAD0A]" />
                    <span>Delivery Address</span>
                  </div>
                  <div className="text-xs font-bold text-gray-900">
                    {order.shippingAddress?.name} · <span className="text-gray-600 font-normal">{order.shippingAddress?.phone}</span>
                  </div>
                  <p className="text-xs text-[#5c6c75] leading-relaxed">
                    {order.shippingAddress?.addressLine1}
                    {order.shippingAddress?.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
                    , {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Financial & Seller Breakdown (Span 4 - Sticky) */}
          <div className="space-y-6 lg:col-span-4 sticky top-6">
            {/* Payment Breakdown Card */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#16135c]">
                  Payment Summary
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    order.paymentMethod === 'COD'
                      ? 'bg-blue-50 text-[#16135c] border-blue-200'
                      : order.paymentStatus === 'PAID'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {order.paymentMethod === 'COD'
                    ? 'Cash on Delivery (COD)'
                    : order.paymentStatus === 'PAID'
                      ? 'Paid Online'
                      : 'Payment Pending'}
                </span>
              </div>

              {/* Price Rows */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-[#5c6c75]">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-gray-900">{money(itemsSubtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-[#5c6c75]">
                  <span>Scheduled Delivery</span>
                  <span className="font-semibold">
                    {deliveryFee === 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-gray-400 line-through text-[11px]">₹49</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                          FREE
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-900 font-semibold">{money(deliveryFee)}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#5c6c75]">
                  <span>GST & Taxes</span>
                  <span className="text-[11px] text-gray-400">Included in prices</span>
                </div>

                <div className="flex items-center justify-between text-[#5c6c75] pt-1">
                  <span>Payment Method</span>
                  <span className="font-semibold text-gray-800">
                    {order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment (Razorpay)'}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-bold text-[#16135c]">Total Amount</span>
                    <p className="text-[10px] text-[#5c6c75]">All taxes & delivery included</p>
                  </div>
                  <span className="text-xl font-black text-[#16135c]">{money(order.totalAmountPaise)}</span>
                </div>
              </div>

              {/* Pay Now Button (if online pending) */}
              {isOnlinePending && !isCancelled && (
                <button
                  type="button"
                  onClick={handlePayNow}
                  className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <CreditCard size={15} />
                  <span>Pay {money(order.totalAmountPaise)} Now</span>
                </button>
              )}

              {/* Download Tax Invoice CTA */}
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(true)}
                className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
              >
                <FileText size={14} className="text-[#0AAD0A]" />
                <span>View & Print Tax Invoice</span>
              </button>
            </div>

            {/* Seller Info Card */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-[#16135c] font-bold text-sm shadow-2xs">
                  {sellerStoreName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#16135c] truncate">{sellerStoreName}</h4>
                  <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck size={12} />
                    <span>Verified Merchant</span>
                  </p>
                </div>
              </div>

              {sellerSlug && (
                <div className="pt-2 border-t border-gray-100 flex gap-2">
                  <Link
                    to={`/chat?sellerId=${encodeURIComponent(sellerSlug)}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 py-2 text-xs font-bold text-[#16135c] transition-colors"
                  >
                    <MessageSquare size={13} />
                    <span>Chat Seller</span>
                  </Link>

                  <Link
                    to={`/catalogue?seller=${encodeURIComponent(sellerSlug)}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 py-2 text-xs font-bold text-gray-700 transition-colors"
                  >
                    <Store size={13} />
                    <span>Visit Store</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Guarantees Box */}
            <div className="rounded-2xl border border-gray-100 bg-[#f8f9fa] p-4 text-xs space-y-2 text-[#5c6c75]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span className="font-semibold text-gray-800">HAAT Fulfilment Guarantee</span>
              </div>
              <p className="text-[11px] text-[#5c6c75] leading-relaxed">
                Slot-locked delivery capacity with direct local merchant accountability. 100% genuine products.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-red-50 text-red-600">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Confirm Order Cancellation</h3>
                <p className="text-[11px] text-gray-500">Order #{order.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to cancel this order? This action cannot be undone and will release your scheduled delivery window.
            </p>

            <div>
              <label className="text-xs font-bold text-gray-700">Cancellation Reason *</label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please share why you are cancelling this order..."
                className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-xs text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-2 focus:ring-[#16135c]/10"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={cancelMutation.isPending || !cancelReason.trim()}
                onClick={() => cancelMutation.mutate(cancelReason)}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tax Receipt Modal */}
      <TaxInvoiceModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        invoiceData={receiptData || null}
        isLoading={isReceiptLoading}
      />
    </div>
  );
}
