import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, money, showToast } from '@haat/shared-frontend';

interface RfqModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    _id?: string;
    id?: string;
    title: string;
    sellerId: string;
    sellerName: string;
    sku: string;
    moq: number;
    retailPricePaise: number;
  };
}

export function RfqModal({ isOpen, onClose, product }: RfqModalProps) {
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState(product.moq || 10);
  const [targetPriceRupees, setTargetPriceRupees] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('400001');
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      const targetPaise = targetPriceRupees ? Math.round(Number(targetPriceRupees) * 100) : null;
      const res = await api.post('/rfq', {
        productId: product.id || product._id,
        sellerId: product.sellerId,
        requestedQuantity: Number(quantity),
        targetPricePaise: targetPaise,
        deliveryPincode: deliveryPincode.trim(),
        preferredDate: preferredDate || null,
        notes: notes.trim(),
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      showToast.success('RFQ Submitted', `RFQ #${data.rfq?.rfqNumber || ''} sent to ${product.sellerName}`);
      queryClient.invalidateQueries({ queryKey: ['buyer-rfqs'] });
      onClose();
    },
    onError: (err: any) => {
      showToast.error('Submission Failed', err.message || 'Could not submit RFQ.');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="text-[#0AAD0A] h-5 w-5" />
            <h3 className="text-base font-bold text-gray-900">Request Custom Quotation (RFQ)</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-900">{product.title}</p>
          <p className="text-micro text-gray-400">Merchant: {product.sellerName} · Retail: {money(product.retailPricePaise)}/unit</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate();
          }}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="font-semibold text-gray-700">Requested Quantity (Min: {product.moq}) *</label>
            <input
              type="number"
              required
              min={product.moq}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700">Target Unit Price (₹ Optional)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 450.00"
                value={targetPriceRupees}
                onChange={(e) => setTargetPriceRupees(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Delivery 6-Digit Pincode *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={deliveryPincode}
                onChange={(e) => setDeliveryPincode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700">Preferred Delivery By (Optional)</label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700">Specification & Customization Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Requirement for 200 bulk cartons, custom packaging, GST credit invoice needed..."
              className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-[#0AAD0A] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="rounded-xl bg-[#0AAD0A] px-5 py-2 text-xs font-bold text-white hover:bg-[#099b09] shadow-sm disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Send RFQ to Merchant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
