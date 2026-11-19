import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, ShieldAlert, CheckCircle, Search, Eye, AlertTriangle, Layers, Tag } from 'lucide-react';
import {
  api,
  Badge,
  Button,
  Panel,
  SkeletonBlock,
  ErrorState,
  EmptyState,
  formatPaise,
  formatDate,
  showToast,
} from '@haat/shared-frontend';

interface ProductVariant {
  _id: string;
  sku: string;
  title: string;
  priceModifierPaise: number;
  stockQuantity: number;
  attributes?: Record<string, string>;
}

interface PricingTier {
  minQuantity: number;
  maxQuantity: number | null;
  unitPricePaise: number;
}

interface ProductImage {
  _id: string;
  url: string;
  isPrimary?: boolean;
}

interface AdminProductItem {
  _id: string;
  title: string;
  slug: string;
  sku: string;
  brand?: string;
  description: string;
  retailPricePaise: number;
  moq: number;
  orderMultiple: number;
  isWholesaleActive: boolean;
  isApproved: boolean;
  isActive: boolean;
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
    path?: string;
  };
  sellerId?: {
    _id: string;
    storeName: string;
    storeSlug: string;
    gstin?: string;
  };
  sellerName?: string;
  variants: ProductVariant[];
  pricingTiers: PricingTier[];
  images: ProductImage[];
  createdAt: string;
}

interface CatalogResponse {
  data: AdminProductItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function AdminCatalogPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStatus = searchParams.get('status') || 'ALL';
  const searchQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  const [selectedProduct, setSelectedProduct] = useState<AdminProductItem | null>(null);
  const [moderatingProduct, setModeratingProduct] = useState<{
    product: AdminProductItem;
    targetApproval: boolean;
  } | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<CatalogResponse>({
    queryKey: ['admin', 'catalog', activeStatus, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeStatus !== 'ALL') params.set('status', activeStatus);
      if (searchQuery) params.set('search', searchQuery);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<AdminProductItem[]>(`/api/v1/admin/catalog${queryString}`);
      return {
        data: response.data,
        meta: (response as unknown as { meta: CatalogResponse['meta'] }).meta || {
          page: 1,
          limit: 20,
          total: response.data.length,
          totalPages: 1,
        },
      };
    },
  });

  const moderationMutation = useMutation({
    mutationFn: async ({
      productId,
      isApproved,
      reason,
    }: {
      productId: string;
      isApproved: boolean;
      reason: string;
    }) => {
      await api.patch(`/api/v1/admin/catalog/${productId}/moderation`, {
        isApproved,
        reason,
      });
    },
    onSuccess: (_, variables) => {
      setModeratingProduct(null);
      setModerationReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
      showToast.success(
        variables.isApproved ? 'Listing reinstated' : 'Listing suspended',
        variables.isApproved ? 'Product is now visible in the marketplace.' : 'Product removed from public discovery.',
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Moderation action failed';
      setActionError(msg);
      showToast.error('Moderation failed', msg);
    },
  });

  const setStatusFilter = (status: string) => {
    setActionError(null);
    if (status === 'ALL') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      searchParams.set('q', searchTerm.trim());
    } else {
      searchParams.delete('q');
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight">Catalogue Moderation</h1>
          <p className="mt-1 text-caption text-ink-500">
            Platform-wide product inspection, SKU approval and non-compliant listing suspension.
          </p>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-md border border-danger-fg/20 bg-danger-bg p-3 text-caption text-danger-fg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
        {/* Status Tabs */}
        <div className="flex gap-2">
          {['ALL', 'APPROVED', 'SUSPENDED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1.5 text-caption font-semibold transition-colors cursor-pointer ${
                activeStatus === status
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'bg-surface text-ink-600 hover:bg-surface-sunken hover:text-ink-900 border border-line'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product title, SKU, brand..."
            className="w-full rounded-md border border-line bg-surface pl-8 pr-3 py-1.5 text-caption text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
        </form>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState message="Failed to load catalogue products" onRetry={() => void refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title="No products found" description="There are currently no products matching filter criteria." />
      ) : (
        <Panel className="overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-label">
              <thead className="border-b border-line bg-surface-sunken text-micro font-bold uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-5 py-3">Product &amp; SKU</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Seller Store</th>
                  <th className="px-5 py-3">Pricing &amp; MOQ</th>
                  <th className="px-5 py-3">Moderation</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((product) => {
                  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
                  return (
                    <tr key={product._id} className="hover:bg-surface-sunken/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {primaryImage ? (
                            <img
                              src={primaryImage.url}
                              alt=""
                              className="h-11 w-11 rounded-lg border border-line object-cover shrink-0 bg-surface-sunken"
                            />
                          ) : (
                            <div className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface-sunken text-ink-300 shrink-0">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-ink-900 leading-snug">{product.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-micro text-ink-400">
                              <span className="font-mono">SKU: {product.sku}</span>
                              {product.brand ? <span>• Brand: {product.brand}</span> : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-caption text-ink-700">
                        <span className="font-medium">{product.categoryId?.name || 'Uncategorized'}</span>
                      </td>
                      <td className="px-5 py-4 text-caption text-ink-700">
                        <div className="font-semibold">{product.sellerId?.storeName || product.sellerName || '—'}</div>
                        <div className="text-micro text-ink-400 font-mono">
                          {product.sellerId?.storeSlug ? `@${product.sellerId.storeSlug}` : ''}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-caption text-ink-900">
                        <div className="font-bold">{formatPaise(product.retailPricePaise)}</div>
                        <div className="text-micro text-ink-400 font-sans">
                          MOQ: {product.moq} • Multiples of {product.orderMultiple}
                        </div>
                        {product.isWholesaleActive ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600">
                            Wholesale Active ({product.pricingTiers?.length || 0} tiers)
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        {product.isApproved ? (
                          <Badge tone="success">Approved</Badge>
                        ) : (
                          <Badge tone="danger">Suspended</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Inspect Details"
                            onClick={() => setSelectedProduct(product)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Inspect
                          </Button>

                          {product.isApproved ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-amber-700 hover:bg-amber-50"
                              onClick={() => {
                                setModeratingProduct({ product, targetApproval: false });
                                setModerationReason('');
                              }}
                            >
                              <ShieldAlert className="mr-1 h-3.5 w-3.5 text-amber-600" />
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setModeratingProduct({ product, targetApproval: true });
                                setModerationReason('Product reviewed and approved for marketplace publication.');
                              }}
                            >
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Reinstate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Product Inspection Modal */}
      {selectedProduct
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 animate-in fade-in-50">
              <div className="w-full max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <h3 className="text-title font-bold text-ink-900">{selectedProduct.title}</h3>
                    <p className="text-micro font-mono text-ink-400 mt-0.5">
                      SKU: {selectedProduct.sku} • Store:{' '}
                      {selectedProduct.sellerId?.storeName || selectedProduct.sellerName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="text-ink-400 hover:text-ink-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-4 text-label">
                  <div>
                    <span className="text-micro font-bold uppercase text-ink-400">Description</span>
                    <p className="mt-1 text-caption text-ink-700 leading-relaxed bg-surface-sunken p-3 rounded-lg border border-line">
                      {selectedProduct.description}
                    </p>
                  </div>

                  {/* Variants Matrix */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Layers className="h-4 w-4 text-ink-400" />
                      <span className="text-micro font-bold uppercase text-ink-400">
                        SKU Variants ({selectedProduct.variants?.length || 0})
                      </span>
                    </div>
                    <div className="rounded-lg border border-line overflow-hidden">
                      <table className="w-full text-left text-caption">
                        <thead className="bg-surface-sunken text-micro font-bold text-ink-500 border-b border-line">
                          <tr>
                            <th className="px-3 py-2">Variant Title</th>
                            <th className="px-3 py-2">SKU</th>
                            <th className="px-3 py-2">Stock</th>
                            <th className="px-3 py-2 text-right">Price Modifier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {selectedProduct.variants?.map((v) => (
                            <tr key={v.sku}>
                              <td className="px-3 py-2 font-medium text-ink-900">{v.title}</td>
                              <td className="px-3 py-2 font-mono text-micro text-ink-600">{v.sku}</td>
                              <td className="px-3 py-2 font-mono">{v.stockQuantity} units</td>
                              <td className="px-3 py-2 font-mono text-right">
                                {v.priceModifierPaise > 0 ? `+${formatPaise(v.priceModifierPaise)}` : 'Base price'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pricing Tiers */}
                  {selectedProduct.isWholesaleActive && selectedProduct.pricingTiers?.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Tag className="h-4 w-4 text-ink-400" />
                        <span className="text-micro font-bold uppercase text-ink-400">Wholesale Quantity Tiers</span>
                      </div>
                      <div className="rounded-lg border border-line overflow-hidden">
                        <table className="w-full text-left text-caption">
                          <thead className="bg-surface-sunken text-micro font-bold text-ink-500 border-b border-line">
                            <tr>
                              <th className="px-3 py-2">Quantity Range</th>
                              <th className="px-3 py-2 text-right">Unit Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {selectedProduct.pricingTiers.map((t, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 font-mono text-ink-900">
                                  {t.minQuantity} {t.maxQuantity ? `– ${t.maxQuantity} units` : '+ units'}
                                </td>
                                <td className="px-3 py-2 font-mono font-bold text-brand-600 text-right">
                                  {formatPaise(t.unitPricePaise)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between text-micro text-ink-400 pt-2 border-t border-line">
                    <span>Listed: {formatDate(selectedProduct.createdAt)}</span>
                    <span>
                      Moderation:{' '}
                      {selectedProduct.isApproved ? (
                        <strong className="text-emerald-600">Approved</strong>
                      ) : (
                        <strong className="text-red-600">Suspended</strong>
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedProduct(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Moderation Reason Dialog (Suspend / Reinstate) */}
      {moderatingProduct
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 animate-in fade-in-50">
              <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
                <h3 className="text-title font-bold text-ink-900">
                  {moderatingProduct.targetApproval ? 'Reinstate Product' : 'Suspend Product Listing'}
                </h3>
                <p className="mt-1 text-caption text-ink-500">
                  {moderatingProduct.targetApproval
                    ? `Reinstate "${moderatingProduct.product.title}" to make it visible on public search and storefronts immediately.`
                    : `Suspending "${moderatingProduct.product.title}" will immediately remove it from public search and catalogue browse.`}
                </p>

                <div className="mt-4">
                  <label htmlFor="moderationReason" className="block text-label font-semibold text-ink-800">
                    Moderation Reason / Audit Note
                  </label>
                  <textarea
                    id="moderationReason"
                    rows={3}
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder={
                      moderatingProduct.targetApproval
                        ? 'Reason for reinstatement...'
                        : 'e.g. Non-compliant brand claims, prohibited goods, misleading specifications...'
                    }
                    className="mt-1.5 w-full rounded-md border border-line bg-surface p-2.5 text-caption text-ink-900 focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setModeratingProduct(null);
                      setModerationReason('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={moderatingProduct.targetApproval ? 'primary' : 'danger'}
                    size="sm"
                    disabled={moderationMutation.isPending || !moderationReason.trim()}
                    onClick={() =>
                      moderationMutation.mutate({
                        productId: moderatingProduct.product._id,
                        isApproved: moderatingProduct.targetApproval,
                        reason: moderationReason.trim(),
                      })
                    }
                  >
                    {moderatingProduct.targetApproval ? 'Confirm Reinstatement' : 'Confirm Suspension'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
