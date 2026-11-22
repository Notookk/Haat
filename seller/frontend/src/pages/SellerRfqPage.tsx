import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  X,
  Calendar,
  MapPin,
  Package,
} from 'lucide-react';
import {
  api,
  Button,
  Panel,
  SkeletonBlock,
  ErrorState,
  errorMessage,
  money,
  formatDate,
  Badge,
  showToast,
} from '@haat/shared-frontend';

interface QuotationItem {
  _id: string;
  quotationNumber: string;
  version: number;
  offeredUnitPricePaise: number;
  minQuantity: number;
  deliveryFeePaise: number;
  validUntil: string;
  sellerTerms: string;
  status: string;
  createdAt: string;
}

interface RfqItem {
  _id: string;
  rfqNumber: string;
  productId: {
    _id?: string;
    title?: string;
    sku?: string;
    images?: Array<{ url: string }>;
    retailPricePaise?: number;
    moq?: number;
  } | null;
  requestedQuantity: number;
  targetPricePaise: number | null;
  deliveryPincode: string;
  preferredDate: string | null;
  notes: string;
  status: string;
  createdAt: string;
  quotations: QuotationItem[];
}

export function SellerRfqPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'ACTION_REQUIRED' | 'QUOTED' | 'ACCEPTED'>('ALL');
  const [selectedRfq, setSelectedRfq] = useState<RfqItem | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Quote Form State
  const [offeredPriceRupees, setOfferedPriceRupees] = useState('');
  const [minQuantity, setMinQuantity] = useState(1);
  const [deliveryFeeRupees, setDeliveryFeeRupees] = useState('0');
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [sellerTerms, setSellerTerms] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery<{ rfqs: RfqItem[] }>({
    queryKey: ['seller-rfqs'],
    queryFn: async () => {
      const res = await api.get<{ rfqs: RfqItem[] }>('/api/v1/seller/rfq');
      return res.data;
    },
  });

  const rfqs = data?.rfqs || [];

  const filteredRfqs = rfqs.filter((r) => {
    if (filter === 'ACTION_REQUIRED') {
      return ['SUBMITTED', 'REVISION_REQUESTED'].includes(r.status);
    }
    if (filter === 'QUOTED') {
      return r.status === 'QUOTED';
    }
    if (filter === 'ACCEPTED') {
      return r.status === 'ACCEPTED';
    }
    return true;
  });

  const sendQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRfq) return;
      const unitPricePaise = Math.round(Number(offeredPriceRupees) * 100);
      const feePaise = Math.round(Number(deliveryFeeRupees) * 100);

      const res = await api.post(`/api/v1/seller/rfq/${selectedRfq._id}/quotations`, {
        offeredUnitPricePaise: unitPricePaise,
        minQuantity: Number(minQuantity),
        deliveryFeePaise: feePaise,
        validUntil,
        sellerTerms: sellerTerms.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      showToast.success('Quotation Sent', 'Your custom quote has been transmitted to the buyer.');
      queryClient.invalidateQueries({ queryKey: ['seller-rfqs'] });
      setIsQuoteModalOpen(false);
      setSelectedRfq(null);
    },
    onError: (err) => {
      showToast.error('Quotation Failed', errorMessage(err));
    },
  });

  const openQuoteModal = (rfq: RfqItem) => {
    setSelectedRfq(rfq);
    const suggestedPrice = rfq.targetPricePaise
      ? (rfq.targetPricePaise / 100).toFixed(2)
      : rfq.productId?.retailPricePaise
        ? (rfq.productId.retailPricePaise / 100).toFixed(2)
        : '';
    setOfferedPriceRupees(suggestedPrice);
    setMinQuantity(rfq.requestedQuantity || 1);
    setDeliveryFeeRupees('0');
    setSellerTerms('Payment via platform checkout upon quotation acceptance. Valid for 7 days.');
    setIsQuoteModalOpen(true);
  };

  const getStatusTone = (status: string): 'neutral' | 'brand' | 'b2b' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'ACCEPTED':
        return 'success';
      case 'SUBMITTED':
      case 'REVISION_REQUESTED':
        return 'warning';
      case 'QUOTED':
        return 'brand';
      case 'REJECTED':
      case 'EXPIRED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">B2B Quotations & RFQs</h1>
          <p className="text-caption text-ink-muted mt-0.5">
            Manage bulk buyer requests, prepare customized pricing, and track accepted wholesale deals.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-2">
        {(['ALL', 'ACTION_REQUIRED', 'QUOTED', 'ACCEPTED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              filter === tab
                ? 'border-[#0AAD0A] text-[#0AAD0A]'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab === 'ALL'
              ? `All Inquiries (${rfqs.length})`
              : tab === 'ACTION_REQUIRED'
                ? `Needs Action (${rfqs.filter((r) => ['SUBMITTED', 'REVISION_REQUESTED'].includes(r.status)).length})`
                : tab === 'QUOTED'
                  ? 'Quoted'
                  : 'Converted & Accepted'}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-24 w-full rounded-2xl" />
          <SkeletonBlock className="h-24 w-full rounded-2xl" />
          <SkeletonBlock className="h-24 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : filteredRfqs.length === 0 ? (
        <Panel className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-700">No quotation requests found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            {filter === 'ALL'
              ? 'When buyers submit custom quotation requests for your products, they will appear here.'
              : `No requests currently matching the "${filter.replace('_', ' ')}" filter.`}
          </p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {filteredRfqs.map((rfq) => {
            const hasQuotes = rfq.quotations && rfq.quotations.length > 0;
            const latestQuote = hasQuotes ? rfq.quotations[0] : null;

            return (
              <Panel key={rfq._id} className="p-5 border border-line hover:border-gray-300 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[#16135c]">
                        #{rfq.rfqNumber}
                      </span>
                      <Badge tone={getStatusTone(rfq.status)}>
                        {rfq.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Received {formatDate(rfq.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-500 overflow-hidden">
                        {rfq.productId?.images?.[0]?.url ? (
                          <img
                            src={rfq.productId.images[0].url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package size={20} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-ink">
                          {rfq.productId?.title || 'Product Item'}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted mt-0.5">
                          <span>SKU: {rfq.productId?.sku || 'N/A'}</span>
                          <span>Requested: <strong className="text-ink">{rfq.requestedQuantity} units</strong></span>
                          {rfq.targetPricePaise ? (
                            <span>Buyer Target: <strong className="text-emerald-700">{money(rfq.targetPricePaise)}/unit</strong></span>
                          ) : null}
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} /> Pincode: {rfq.deliveryPincode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {rfq.notes ? (
                      <p className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600 italic">
                        "{rfq.notes}"
                      </p>
                    ) : null}

                    {/* Latest Quotation Summary if any */}
                    {latestQuote ? (
                      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#16135c]">
                            Active Quotation #{latestQuote.quotationNumber} (v{latestQuote.version})
                          </span>
                          <span className="font-semibold text-gray-500">
                            Status: {latestQuote.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-gray-600">
                          <span>Offered: <strong className="text-[#16135c]">{money(latestQuote.offeredUnitPricePaise)}/unit</strong></span>
                          <span>Min Qty: <strong>{latestQuote.minQuantity} units</strong></span>
                          <span>Delivery Fee: <strong>{money(latestQuote.deliveryFeePaise)}</strong></span>
                          <span>Valid Until: <strong>{latestQuote.validUntil}</strong></span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    {['SUBMITTED', 'REVISION_REQUESTED', 'QUOTED'].includes(rfq.status) ? (
                      <Button
                        type="button"
                        onClick={() => openQuoteModal(rfq)}
                        className="bg-[#0AAD0A] hover:bg-[#099b09] text-white text-xs font-bold"
                      >
                        <Send size={14} className="mr-1.5" />
                        {rfq.status === 'REVISION_REQUESTED'
                          ? 'Send Revised Quote'
                          : hasQuotes
                            ? 'Update Quote'
                            : 'Send Quotation'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Send Quotation Modal */}
      {isQuoteModalOpen && selectedRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="text-[#0AAD0A] h-5 w-5" />
                <h3 className="text-base font-bold text-gray-900">
                  Prepare Quotation for #{selectedRfq.rfqNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuoteModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
              <p className="font-semibold text-gray-900">{selectedRfq.productId?.title}</p>
              <div className="flex gap-4 text-micro text-gray-500 mt-1">
                <span>Requested: {selectedRfq.requestedQuantity} units</span>
                {selectedRfq.targetPricePaise ? (
                  <span>Target: {money(selectedRfq.targetPricePaise)}/unit</span>
                ) : null}
                <span>Pincode: {selectedRfq.deliveryPincode}</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendQuoteMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">Offered Unit Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="e.g. 450.00"
                    value={offeredPriceRupees}
                    onChange={(e) => setOfferedPriceRupees(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700">Minimum Order Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(Math.max(1, Number(e.target.value)))}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">Freight / Delivery Fee (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={deliveryFeeRupees}
                    onChange={(e) => setDeliveryFeeRupees(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700">Valid Until Date *</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Terms & Special Conditions</label>
                <textarea
                  rows={3}
                  value={sellerTerms}
                  onChange={(e) => setSellerTerms(e.target.value)}
                  placeholder="Payment milestones, packaging specifications, dispatch timeframe..."
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendQuoteMutation.isPending}
                  className="rounded-xl bg-[#0AAD0A] px-5 py-2 text-xs font-bold text-white hover:bg-[#099b09] shadow-sm disabled:opacity-50"
                >
                  {sendQuoteMutation.isPending ? 'Sending...' : 'Transmit Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
