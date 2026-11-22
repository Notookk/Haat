import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { api, money, formatDate, SkeletonBlock, ErrorState, showToast } from '@haat/shared-frontend';

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
}

interface RfqItem {
  _id: string;
  rfqNumber: string;
  productId: { title?: string; sku?: string; images?: any[]; retailPricePaise?: number; moq?: number } | null;
  requestedQuantity: number;
  targetPricePaise: number | null;
  deliveryPincode: string;
  preferredDate: string | null;
  notes: string;
  status: string;
  createdAt: string;
  quotations: QuotationItem[];
}

export function RfqPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [revisionModal, setRevisionModal] = useState<{
    rfqId: string;
    quotationId: string;
  } | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery<{ rfqs: RfqItem[] }>({
    queryKey: ['buyer-rfqs'],
    queryFn: async () => {
      const res = await api.get<{ rfqs: RfqItem[] }>('/rfq');
      return res.data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ rfqId, quotationId }: { rfqId: string; quotationId: string }) => {
      const res = await api.post<{ order: any }>(`/rfq/${rfqId}/quotations/${quotationId}/accept`, {});
      return res.data.order;
    },
    onSuccess: (order: any) => {
      showToast.success('Quotation Accepted!', `Converted into confirmed Order #${order.orderNumber}`);
      queryClient.invalidateQueries({ queryKey: ['buyer-rfqs'] });
      navigate(`/orders/${order._id}`);
    },
    onError: (err: any) => {
      showToast.error('Acceptance Failed', err.message || 'Could not convert quotation to order.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ rfqId, quotationId }: { rfqId: string; quotationId: string }) => {
      await api.post(`/rfq/${rfqId}/quotations/${quotationId}/reject`, {});
    },
    onSuccess: () => {
      showToast.info('Quotation Declined', 'Quotation marked as rejected.');
      queryClient.invalidateQueries({ queryKey: ['buyer-rfqs'] });
    },
  });

  const revisionMutation = useMutation({
    mutationFn: async () => {
      if (!revisionModal) return;
      await api.post(`/rfq/${revisionModal.rfqId}/quotations/${revisionModal.quotationId}/request-revision`, {
        notes: revisionNotes,
      });
    },
    onSuccess: () => {
      showToast.success('Revision Requested', 'Merchant has been notified with your counter-notes.');
      setRevisionModal(null);
      setRevisionNotes('');
      queryClient.invalidateQueries({ queryKey: ['buyer-rfqs'] });
    },
  });

  const rfqs = data?.rfqs || [];

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200/80 bg-white py-3">
        <div className="mx-auto flex max-w-container items-center gap-2 px-4 md:px-8 text-xs text-gray-400">
          <Link to="/" className="hover:text-[#16135c]">Home</Link>
          <ChevronRight size={12} />
          <span className="font-semibold text-gray-900">Custom Quotations (RFQ)</span>
        </div>
      </div>

      <div className="mx-auto max-w-container px-4 md:px-8 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commercial Quotation Inquiries (RFQ)</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage bulk volume requests, negotiate custom rates with verified suppliers, and accept formal quotes.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <SkeletonBlock className="h-40 w-full rounded-2xl" />
            <SkeletonBlock className="h-40 w-full rounded-2xl" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6">
            <ErrorState message={(error as any)?.message || 'Failed to load RFQs'} onRetry={refetch} />
          </div>
        ) : rfqs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0AAD0A] mb-3">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No quotation requests</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              You haven&apos;t submitted any RFQs yet. You can request volume pricing on any product listing.
            </p>
            <Link
              to="/catalogue"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#0AAD0A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#099b09]"
            >
              <span>Explore Products</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {rfqs.map((rfq) => (
              <div key={rfq._id} className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-gray-900">{rfq.rfqNumber}</span>
                    <span className="text-xs text-gray-400">· {formatDate(rfq.createdAt)}</span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      rfq.status === 'QUOTED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rfq.status === 'IN_REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {rfq.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{rfq.productId?.title || 'Custom Product'}</h4>
                    <p className="text-gray-400">SKU: {rfq.productId?.sku} · Standard Retail: {money(rfq.productId?.retailPricePaise || 0)}</p>
                    <p className="mt-2 text-gray-600">
                      Requested Qty: <strong className="text-gray-900">{rfq.requestedQuantity} units</strong>
                      {rfq.targetPricePaise ? ` · Target Price: ${money(rfq.targetPricePaise)}/unit` : ''}
                    </p>
                    {rfq.notes && (
                      <p className="mt-1 text-gray-500 italic bg-gray-50 p-2 rounded-lg">
                        &quot;{rfq.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-2">
                      Formal Merchant Quotations ({rfq.quotations?.length || 0})
                    </h4>

                    {rfq.quotations && rfq.quotations.length > 0 ? (
                      <div className="space-y-3">
                        {rfq.quotations.map((q) => {
                          const isIssued = q.status === 'ISSUED';
                          const isConverted = q.status === 'CONVERTED_TO_ORDER';

                          return (
                            <div
                              key={q._id}
                              className={`rounded-xl border p-4 transition-all ${
                                isConverted
                                  ? 'border-emerald-200 bg-emerald-50/50'
                                  : isIssued
                                    ? 'border-[#0AAD0A] bg-emerald-50/20 shadow-xs'
                                    : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <span className="font-mono text-xs font-bold text-gray-900">{q.quotationNumber}</span>
                                <span className="text-micro font-bold text-emerald-800 uppercase">{q.status}</span>
                              </div>

                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-400">Offered Rate:</span>{' '}
                                  <strong className="text-[#0AAD0A] font-bold text-sm">
                                    {money(q.offeredUnitPricePaise)}
                                  </strong>
                                  <span className="text-gray-400">/unit</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Min Commitment:</span>{' '}
                                  <strong className="text-gray-900">{q.minQuantity} units</strong>
                                </div>
                                <div>
                                  <span className="text-gray-400">Delivery Fee:</span>{' '}
                                  <strong className="text-gray-900">{money(q.deliveryFeePaise)}</strong>
                                </div>
                                <div>
                                  <span className="text-gray-400">Valid Until:</span>{' '}
                                  <span className="text-gray-700">{formatDate(q.validUntil)}</span>
                                </div>
                              </div>

                              {q.sellerTerms && (
                                <p className="mt-2 text-micro text-gray-500 bg-white p-2 rounded border border-gray-100">
                                  <strong>Terms:</strong> {q.sellerTerms}
                                </p>
                              )}

                              {isIssued && (
                                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                  <button
                                    onClick={() =>
                                      acceptMutation.mutate({ rfqId: rfq._id, quotationId: q._id })
                                    }
                                    disabled={acceptMutation.isPending}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0AAD0A] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#099b09] shadow-2xs"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Accept Quote & Order</span>
                                  </button>

                                  <button
                                    onClick={() =>
                                      setRevisionModal({ rfqId: rfq._id, quotationId: q._id })
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                  >
                                    <RotateCcw size={12} />
                                    <span>Request Revision</span>
                                  </button>

                                  <button
                                    onClick={() =>
                                      rejectMutation.mutate({ rfqId: rfq._id, quotationId: q._id })
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    <XCircle size={12} />
                                    <span>Decline</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">Merchant has received your RFQ and is preparing a custom quote.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revision Modal */}
      {revisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Request Quotation Revision</h3>
            <p className="text-xs text-gray-500">
              Provide counter-terms or specific rate/quantity adjustments for the seller to revise.
            </p>

            <textarea
              required
              rows={3}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="e.g. Can you offer ₹420 if we increase volume to 500 units?"
              className="w-full rounded-xl border border-gray-200 p-3 text-xs text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevisionModal(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revisionMutation.isPending || revisionNotes.trim().length < 5}
                onClick={() => revisionMutation.mutate()}
                className="rounded-xl bg-[#0AAD0A] px-4 py-2 text-xs font-bold text-white hover:bg-[#099b09] disabled:opacity-50"
              >
                {revisionMutation.isPending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
