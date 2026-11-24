import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { money, formatDate } from '../lib/format';

export interface TaxInvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  date: string;
  seller: {
    name: string;
    gstin?: string;
    pan?: string;
    address?: string;
  };
  buyer: {
    name: string;
    phone?: string;
    address: string;
  };
  items: Array<{
    title: string;
    sku?: string;
    quantity: number;
    unitPricePaise: number;
    subtotalPaise: number;
    isWholesale?: boolean;
  }>;
  pricing: {
    subtotalPaise: number;
    gstPaise: number;
    deliveryFeePaise?: number;
    totalAmountPaise: number;
    currency?: string;
  };
  scheduledDelivery?: {
    date?: string | null;
    slot?: string | null;
  };
  paymentStatus: string;
  paymentMethod?: string;
  fulfilmentStatus?: string;
}

export interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: TaxInvoiceData | null;
  isLoading?: boolean;
}

export function TaxInvoiceModal({
  isOpen,
  onClose,
  invoiceData,
  isLoading = false,
}: TaxInvoiceModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    const printable = document.getElementById('tax-invoice-printable');
    if (!printable) {
      window.print();
      return;
    }

    try {
      // Remove any existing print iframe
      const oldIframe = document.getElementById('tax-invoice-print-frame');
      if (oldIframe) oldIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'tax-invoice-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '1130px';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        return;
      }

      // Collect host styles but explicitly exclude the modal's own print-hiding style tag
      const styleSheets = Array.from(
        document.querySelectorAll('style:not(#tax-invoice-host-print-style), link[rel="stylesheet"]')
      )
        .map((node) => node.outerHTML)
        .join('\n');

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>Tax Invoice - ${invoiceData?.invoiceNumber || 'HAAT'}</title>
            ${styleSheets}
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 15mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-sizing: border-box;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                color: #374151 !important;
                font-size: 12px !important;
                line-height: 1.5 !important;
                width: 100% !important;
              }
              #tax-invoice-printable {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                box-shadow: none !important;
                border: none !important;
              }
              #tax-invoice-printable * {
                visibility: visible !important;
              }
              .no-print {
                display: none !important;
              }
              /* Standalone print CSS guarantees for full visual fidelity */
              .border-b-2 { border-bottom-width: 2px !important; }
              .border-b { border-bottom-width: 1px !important; }
              .border-t-2 { border-top-width: 2px !important; }
              .border-t { border-top-width: 1px !important; }
              .border { border-width: 1px !important; }
              .border-line, .border-gray-100 { border-color: #f3f4f6 !important; }
              .border-gray-200 { border-color: #e5e7eb !important; }
              .border-emerald-100 { border-color: #d1fae5 !important; }
              .border-emerald-200 { border-color: #a7f3d0 !important; }
              .border-\\[\\#16135c\\] { border-color: #16135c !important; }
              .bg-white { background-color: #ffffff !important; }
              .bg-gray-50 { background-color: #f9fafb !important; }
              .bg-gray-100 { background-color: #f3f4f6 !important; }
              .bg-emerald-50 { background-color: #ecfdf5 !important; }
              .bg-emerald-100 { background-color: #d1fae5 !important; }
              .bg-blue-50 { background-color: #eff6ff !important; }
              .text-\\[\\#16135c\\] { color: #16135c !important; }
              .text-\\[\\#0AAD0A\\] { color: #0AAD0A !important; }
              .text-gray-900 { color: #111827 !important; }
              .text-gray-800 { color: #1f2937 !important; }
              .text-gray-700 { color: #374151 !important; }
              .text-gray-600 { color: #4b5563 !important; }
              .text-gray-500 { color: #6b7280 !important; }
              .text-gray-400 { color: #9ca3af !important; }
              .text-emerald-700 { color: #047857 !important; }
              .text-emerald-800 { color: #065f46 !important; }
              .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
              .font-bold { font-weight: 700 !important; }
              .font-semibold { font-weight: 600 !important; }
              .font-medium { font-weight: 500 !important; }
              .font-black { font-weight: 900 !important; }
              .text-sm { font-size: 14px !important; }
              .text-xs { font-size: 12px !important; }
              .text-lg { font-size: 18px !important; }
              .text-micro { font-size: 10px !important; }
              .uppercase { text-transform: uppercase !important; }
              .flex { display: flex !important; }
              .flex-col { flex-direction: column !important; }
              .flex-wrap { flex-wrap: wrap !important; }
              .items-center { align-items: center !important; }
              .items-start { align-items: flex-start !important; }
              .justify-between { justify-content: space-between !important; }
              .gap-1 { gap: 4px !important; }
              .gap-1\\.5 { gap: 6px !important; }
              .gap-2 { gap: 8px !important; }
              .gap-3 { gap: 12px !important; }
              .gap-4 { gap: 16px !important; }
              .gap-6 { gap: 24px !important; }
              .grid { display: grid !important; }
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              .space-y-6 > * + * { margin-top: 24px !important; }
              .space-y-2 > * + * { margin-top: 8px !important; }
              .space-y-1\\.5 > * + * { margin-top: 6px !important; }
              .w-full { width: 100% !important; }
              table { width: 100% !important; border-collapse: collapse !important; }
              th, td { text-align: left; }
              .text-right { text-align: right !important; }
              .text-center { text-align: center !important; }
            </style>
          </head>
          <body>
            <div id="tax-invoice-printable" class="p-0 space-y-6 text-xs text-gray-700 bg-white">
              ${printable.innerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 350);
    } catch {
      window.print();
    }
  };

  const modalContent = (
    <div
      id="tax-invoice-modal-portal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto print:fixed print:inset-0 print:p-0 print:bg-white print:z-[9999] print:overflow-visible print:block"
    >
      {/* Print isolation stylesheet for fallback window.print() */}
      <style id="tax-invoice-host-print-style">{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body > *:not(#tax-invoice-modal-portal) {
            display: none !important;
          }
          #tax-invoice-modal-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #tax-invoice-modal-wrapper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #tax-invoice-printable {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          #tax-invoice-printable * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        id="tax-invoice-modal-wrapper"
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-200 print:max-h-none print:w-full print:shadow-none print:border-none print:rounded-none"
      >
        {/* Modal Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/80 rounded-t-2xl no-print">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#0AAD0A]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Tax Invoice</h3>
              <p className="text-micro text-gray-500">Generated on the fly from verified ledger records</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading || !invoiceData}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#16135c] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#120f4c] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-200/60 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Area */}
        <div id="tax-invoice-printable" className="p-6 sm:p-8 space-y-6 text-xs text-gray-700 bg-white">
          {isLoading || !invoiceData ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-[#0AAD0A]" />
              <p className="text-xs text-gray-500">Generating invoice on the fly...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#16135c] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-tight text-[#16135c]">HAAT</span>
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-micro font-bold uppercase text-emerald-800">
                      Tax Invoice
                    </span>
                  </div>
                  <p className="text-micro text-gray-500 mt-0.5">India's Retail & Wholesale Marketplace</p>
                  <p className="text-micro text-gray-400">Platform Delivery & Fulfilment Network</p>
                </div>
                <div className="text-right">
                  <p className="text-micro uppercase font-bold text-gray-400 tracking-wider">Invoice No.</p>
                  <p className="font-mono font-bold text-sm text-gray-900">{invoiceData.invoiceNumber}</p>
                  <p className="text-micro text-gray-500 mt-1">Date: {formatDate(invoiceData.date)}</p>
                  <p className="text-micro font-mono text-gray-400">Order ID: {invoiceData.orderNumber}</p>
                </div>
              </div>

              {/* Parties: Seller & Buyer */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl bg-gray-50 p-4 border border-gray-100">
                <div>
                  <p className="text-micro uppercase font-bold text-gray-400 tracking-wider">Sold By (Seller)</p>
                  <p className="mt-1 font-bold text-sm text-gray-900">{invoiceData.seller.name}</p>
                  <p className="text-micro text-gray-600 mt-0.5 font-mono">
                    GSTIN: <span className="font-bold text-gray-900">{invoiceData.seller.gstin || '27AAAAA0000A1Z5'}</span>
                  </p>
                  {invoiceData.seller.pan && (
                    <p className="text-micro text-gray-500 font-mono">PAN: {invoiceData.seller.pan}</p>
                  )}
                  {invoiceData.seller.address && (
                    <p className="text-micro text-gray-500 mt-1">{invoiceData.seller.address}</p>
                  )}
                </div>

                <div>
                  <p className="text-micro uppercase font-bold text-gray-400 tracking-wider">Billed & Shipped To (Buyer)</p>
                  <p className="mt-1 font-bold text-sm text-gray-900">{invoiceData.buyer.name}</p>
                  {invoiceData.buyer.phone && (
                    <p className="text-micro text-gray-600 font-mono">Phone: {invoiceData.buyer.phone}</p>
                  )}
                  <p className="text-micro text-gray-600 mt-0.5 leading-relaxed">{invoiceData.buyer.address}</p>
                </div>
              </div>

              {/* Scheduled Delivery Window */}
              {invoiceData.scheduledDelivery?.slot && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/60 px-3.5 py-2 text-micro">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                    <Clock className="h-3.5 w-3.5 text-[#0AAD0A]" />
                    <span>
                      Scheduled Window: <strong className="text-gray-900">{invoiceData.scheduledDelivery.date || 'Scheduled Date'}</strong> ({invoiceData.scheduledDelivery.slot})
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700 uppercase">Slot Reserved</span>
                </div>
              )}

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100/70 text-micro uppercase tracking-wider text-gray-600">
                      <th className="py-2.5 px-3 font-bold text-center w-10">#</th>
                      <th className="py-2.5 px-3 font-bold">Item Description</th>
                      <th className="py-2.5 px-3 font-bold text-center">Qty</th>
                      <th className="py-2.5 px-3 font-bold text-right">Unit Price</th>
                      <th className="py-2.5 px-3 font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoiceData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 text-center text-gray-400 font-mono">{index + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-900">{item.title}</p>
                          {item.sku && <p className="text-micro font-mono text-gray-400">SKU: {item.sku}</p>}
                          {item.isWholesale && (
                            <span className="inline-block mt-0.5 rounded-sm bg-blue-50 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                              Wholesale Tier Applied
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-800">{item.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono">{money(item.unitPricePaise)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">{money(item.subtotalPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tax & Total Summary */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-t border-gray-200 pt-4">
                <div className="space-y-2 text-micro max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0AAD0A]" />
                    <span className="font-semibold text-gray-800">
                      Payment Status:{' '}
                      <strong className="uppercase text-gray-900">
                        {invoiceData.paymentMethod === 'COD'
                          ? 'Cash on Delivery (Pay on Arrival)'
                          : invoiceData.paymentStatus}
                      </strong>
                    </span>
                  </div>
                  {invoiceData.paymentMethod && (
                    <p className="text-gray-500">Method: {invoiceData.paymentMethod}</p>
                  )}
                  <p className="text-gray-400 leading-relaxed pt-2">
                    * This is a computer-generated tax invoice issued via HAAT Marketplace and requires no physical signature.
                  </p>
                </div>

                <div className="w-full sm:w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono">{money(invoiceData.pricing.subtotalPaise)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-micro">
                    <span>Central GST (CGST @ 9%):</span>
                    <span className="font-mono">{money(Math.round(invoiceData.pricing.gstPaise / 2))}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-micro">
                    <span>State GST (SGST @ 9%):</span>
                    <span className="font-mono">{money(Math.round(invoiceData.pricing.gstPaise / 2))}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery / Slot Charge:</span>
                    <span className="font-mono">
                      {invoiceData.pricing.deliveryFeePaise && invoiceData.pricing.deliveryFeePaise > 0
                        ? money(invoiceData.pricing.deliveryFeePaise)
                        : 'FREE'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t-2 border-[#16135c] pt-2 text-sm font-black text-gray-900">
                    <span>Total Amount (INR):</span>
                    <span className="text-[#0AAD0A] font-mono">{money(invoiceData.pricing.totalAmountPaise)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
