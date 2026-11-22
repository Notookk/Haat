import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, Edit3, Tag, Package, FolderTree, Calendar, Copy, Check } from 'lucide-react';
import { Badge, Button, money, formatDate, type Product } from '@haat/shared-frontend';

interface ProductViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categoryName?: string;
  onEdit?: (product: Product) => void;
}

export function ProductViewModal({
  isOpen,
  onClose,
  product,
  categoryName,
  onEdit,
}: ProductViewModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedSku, setCopiedSku] = useState(false);

  if (!isOpen || !product) return null;

  const images = product.images || [];
  const activeImage = images[selectedImageIndex] || images[0];
  const totalStock = product.variants?.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) ?? 0;

  const isOutOfStock = totalStock <= 0;
  const isLowStock = totalStock > 0 && totalStock <= 5;
  const stockLabel = isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock';
  const stockTone = isOutOfStock ? ('danger' as const) : isLowStock ? ('warning' as const) : ('success' as const);

  const originalPricePaise =
    product.totalPricePaise && product.totalPricePaise > product.retailPricePaise
      ? product.totalPricePaise
      : product.discountPercent && product.discountPercent > 0
        ? Math.round(product.retailPricePaise / (1 - product.discountPercent / 100))
        : null;

  const displayDiscountPercent =
    product.discountPercent ||
    (originalPricePaise && originalPricePaise > product.retailPricePaise
      ? Math.round(((originalPricePaise - product.retailPricePaise) / originalPricePaise) * 100)
      : 0);

  const copySku = () => {
    if (product.sku) {
      navigator.clipboard.writeText(product.sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/60 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-elevated shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-title font-extrabold text-ink-900">Product Details</h2>
              <p className="text-caption text-ink-500">View product catalog details and inventory status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={product.isActive ? 'success' : 'neutral'}>
              {product.isActive ? 'Active Listing' : 'Archived'}
            </Badge>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-sunken hover:text-ink-900 transition-colors cursor-pointer ml-1"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Column: Photos & SKU */}
            <div className="md:col-span-5 space-y-4">
              <div className="aspect-square w-full rounded-2xl border border-line bg-surface-sunken/40 overflow-hidden flex items-center justify-center shadow-xs">
                {activeImage ? (
                  <img
                    src={activeImage.url}
                    alt={activeImage.altText || product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-16 w-16 text-ink-300" />
                )}
              </div>

              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`h-16 w-16 shrink-0 rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-brand-600 ring-2 ring-brand-500/20 shadow-xs'
                          : 'border-line hover:border-brand-300'
                      }`}
                    >
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* SKU & Brand Bar */}
              <div className="rounded-xl border border-line bg-surface-sunken/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-micro font-bold uppercase tracking-wider text-ink-500">SKU Code</span>
                  <button
                    type="button"
                    onClick={copySku}
                    className="flex items-center gap-1 text-micro font-semibold text-brand-600 hover:underline cursor-pointer"
                  >
                    {copiedSku ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-label font-bold text-ink-900 bg-surface px-2.5 py-1.5 rounded border border-line">
                  {product.sku}
                </p>

                {product.brand && (
                  <div className="pt-1 flex items-center justify-between text-caption">
                    <span className="text-ink-500">Brand</span>
                    <span className="font-semibold text-ink-900">{product.brand}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Pricing, Inventory & Details */}
            <div className="md:col-span-7 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-micro font-bold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-full">
                    <FolderTree className="h-3.5 w-3.5 text-brand-600" />
                    <span>{categoryName || 'General'}</span>
                  </span>
                  <Badge tone={stockTone}>{stockLabel}</Badge>
                </div>
                <h1 className="text-display-xs font-black text-ink-900 leading-snug">{product.title}</h1>
              </div>

              {/* Price, Stock and Category Highlights */}
              <div className="space-y-3">
                {/* Product Pricing Card */}
                <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-micro font-bold uppercase tracking-wider text-ink-500 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-brand-600" />
                      Product Pricing
                    </span>
                    {displayDiscountPercent > 0 ? (
                      <span className="text-micro font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {displayDiscountPercent}% OFF
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-baseline gap-4 flex-wrap">
                    {originalPricePaise && originalPricePaise > product.retailPricePaise ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-caption font-medium text-ink-400">Original Price:</span>
                        <span className="text-title font-bold text-ink-400 line-through">
                          {money(originalPricePaise)}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-caption font-medium text-ink-500">
                        {originalPricePaise && originalPricePaise > product.retailPricePaise
                          ? 'Discount Price:'
                          : 'Selling Price:'}
                      </span>
                      <span className="text-display-xs font-black text-ink-900">
                        {money(product.retailPricePaise)}
                      </span>
                    </div>
                  </div>

                  {originalPricePaise && originalPricePaise > product.retailPricePaise ? (
                    <p className="text-micro text-emerald-700 font-medium">
                      Buyer checkout price is {money(product.retailPricePaise)} (saves {money(originalPricePaise - product.retailPricePaise)})
                    </p>
                  ) : null}
                </div>

                {/* Stock & Category 2-Column Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line bg-surface-sunken/40 p-3.5">
                    <span className="text-micro font-bold uppercase tracking-wider text-ink-500 flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-brand-600" />
                      Stock Present
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-subtitle font-black text-ink-900">{totalStock} units</span>
                      <Badge tone={stockTone}>{stockLabel}</Badge>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-surface-sunken/40 p-3.5">
                    <span className="text-micro font-bold uppercase tracking-wider text-ink-500 flex items-center gap-1">
                      <FolderTree className="h-3.5 w-3.5 text-brand-600" />
                      Category
                    </span>
                    <p className="mt-1 text-subtitle font-bold text-ink-900 truncate">
                      {categoryName || 'General'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h3 className="text-subtitle font-bold text-ink-900">Product Description</h3>
                <div className="rounded-xl border border-line bg-surface p-4 text-body text-ink-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                  {product.description || 'No description provided.'}
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-micro text-ink-400 pt-2 border-t border-line">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Last Updated: {formatDate(product.updatedAt)}
                </span>
                {product.createdAt && (
                  <span className="flex items-center gap-1">
                    Created: {formatDate(product.createdAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-surface-elevated shrink-0">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>

          {onEdit && (
            <Button
              type="button"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="bg-[#16135c] hover:bg-[#12104b] text-white cursor-pointer"
            >
              <Edit3 className="mr-1.5 h-4 w-4" />
              Edit This Product
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
