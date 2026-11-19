import { useEffect, useState } from 'react';
import { PackageSearch, PlusCircle, Edit3, Trash2, RotateCcw, X, Filter, Eye, FolderTree } from 'lucide-react';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';
import { useArchiveProduct, useMyProducts, useSellerCategories } from '../features/products/api';
import { ProductEditorModal } from '../components/ProductEditorModal';
import { ProductViewModal } from '../components/ProductViewModal';
import {
  Badge,
  toneForStock,
  Button,
  CustomSelect,
  Notice,
  EmptyState,
  ErrorState,
  SkeletonBlock,
  errorMessage,
  formatDate,
  money,
  showConfirm,
  showToast,
  type Product,
} from '@haat/shared-frontend';

const STOCK_COPY: Record<string, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  SOLD_OUT: 'No stock',
};

export function SellerProductsPage() {
  const { seller } = useSellerAuth();
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal State for Viewing, Adding & Editing Products
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProductId, setModalProductId] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const categories = useSellerCategories();
  const categoryList = categories.data ?? [];

  // Debounced real-time search: typing immediately filters products
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(term.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [term]);

  const products = useMyProducts({
    q: search || undefined,
    category: selectedCategory || undefined,
    page,
    limit: 20,
  });
  const archive = useArchiveProduct();

  const items = products.data?.items ?? [];
  const meta = products.data?.meta;

  const handleDeleteProduct = async (product: Product) => {
    setActionError(null);
    const confirmed = await showConfirm({
      title: 'Delete this product?',
      text: `“${product.title}” and all its uploaded images in Cloudinary will be permanently deleted. This action cannot be undone.`,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      danger: true,
      icon: 'warning',
    });

    if (confirmed) {
      try {
        const prodId = (product as any)._id ? String((product as any)._id) : product.id;
        await archive.mutateAsync(prodId);
        void products.refetch();
      } catch (error) {
        const msg = errorMessage(error);
        setActionError(msg);
        showToast.error('Delete Failed', msg);
      }
    }
  };

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-display-md text-ink-900">Products</h1>
          <p className="mt-1 tnum text-caption text-ink-500">
            {meta ? `${meta.total} ${meta.total === 1 ? 'product' : 'products'} uploaded` : 'Loading products...'}
            {search ? ` matching “${search}”` : ''}
            {selectedCategory
              ? ` in category “${categoryList.find((c) => c.slug === selectedCategory || c._id === selectedCategory)?.name || selectedCategory}”`
              : ''}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setModalProductId(null);
            setIsModalOpen(true);
          }}
          className="bg-[#16135c] hover:bg-[#12104b] text-white cursor-pointer"
        >
          <PlusCircle className="mr-1.5 h-4 w-4" />
          Upload Product
        </Button>
      </header>

      {seller && !seller.isVerified ? (
        <Notice tone="warning" className="mt-4" title="Verification pending">
          Your products are saved safely and will automatically appear in the public marketplace once verification is
          complete.
        </Notice>
      ) : null}

      <div
        className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3"
        role="search"
      >
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <div className="relative w-full max-w-[320px]">
            <input
              id="product-search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search title, SKU or brand"
              className="h-9 w-full rounded-sm border border-line-strong bg-surface pl-3 pr-8 text-body text-ink-900 placeholder:text-ink-300 focus:border-brand-500"
              autoComplete="off"
            />
            {term ? (
              <button
                type="button"
                title="Clear search"
                aria-label="Clear search"
                onClick={() => {
                  setTerm('');
                  setSearch('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors p-0.5 rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>

          {/* Category Options Filter */}
          <div className="w-56 sm:w-64">
            <CustomSelect
              id="category-filter"
              size="sm"
              value={selectedCategory}
              aria-label="Filter by category option"
              placeholder={`All Category Options (${categoryList.length})`}
              icon={<Filter className="h-3.5 w-3.5" />}
              options={[
                { value: '', label: `All Category Options (${categoryList.length})` },
                ...categoryList.map((cat) => ({
                  value: cat._id,
                  label: cat.name,
                })),
              ]}
              onChange={(val) => {
                setSelectedCategory(val);
                setPage(1);
              }}
            />
          </div>
        </div>

        {selectedCategory && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
            }}
            className="text-micro font-bold text-brand-600 hover:underline cursor-pointer"
          >
            Clear category filter
          </button>
        )}
      </div>

      {actionError ? (
        <Notice tone="danger" className="mt-4" title="Action failed">
          {actionError}
        </Notice>
      ) : null}

      {products.isLoading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : products.isError ? (
        <div className="mt-8">
          <ErrorState message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<PackageSearch size={20} />}
            title={search || selectedCategory ? 'No matching products' : 'No products yet'}
            description={
              search || selectedCategory
                ? 'Try a different keyword or category filter to see all listings.'
                : 'Upload your first product with name, price, discount, and available stock.'
            }
            action={
              search || selectedCategory ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setTerm('');
                    setSearch('');
                    setSelectedCategory('');
                  }}
                >
                  Clear filter
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setModalProductId(null);
                    setIsModalOpen(true);
                  }}
                  className="bg-[#16135c] hover:bg-[#12104b] text-white cursor-pointer"
                >
                  Upload first product
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface shadow-2xs">
          <table className="w-full min-w-[720px] text-left text-body">
            <thead className="border-b border-line bg-surface-sunken">
              <tr>
                <th className="table-head px-4 py-3">Product</th>
                <th className="table-head px-4 py-3">Category</th>
                <th className="table-head px-4 py-3">SKU</th>
                <th className="table-head px-4 py-3 text-right">Price</th>
                <th className="table-head px-4 py-3">Stock Present</th>
                <th className="table-head px-4 py-3">Updated</th>
                <th className="table-head px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((product) => {
                const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];
                const totalStock = product.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
                const categoryName =
                  (product as any).categoryName ||
                  categoryList.find((c) => c._id === product.categoryId || c.slug === product.categoryId)?.name ||
                  'General';

                const isOutOfStock = totalStock <= 0;
                const isLowStock = totalStock > 0 && totalStock <= 5;
                const stockLabel = isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock';
                const stockTone = isOutOfStock
                  ? ('danger' as const)
                  : isLowStock
                    ? ('warning' as const)
                    : ('success' as const);

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

                return (
                  <tr
                    key={product.id}
                    className={`transition-colors hover:bg-surface-sunken ${!product.isActive ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-sunken">
                          {primaryImage ? (
                            <img
                              src={primaryImage.url}
                              alt={primaryImage.altText ?? product.title}
                              width={40}
                              height={40}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="img-fallback h-full w-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setViewingProduct(product)}
                            className="block truncate font-semibold text-ink-900 hover:text-brand-600 text-left cursor-pointer"
                            title={`View details for ${product.title}`}
                          >
                            {product.title}
                          </button>
                          {product.brand && (
                            <p className="truncate text-caption text-ink-500">
                              {product.brand}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-200/80 px-2.5 py-0.5 text-caption font-semibold text-brand-900 shadow-2xs">
                        <FolderTree className="h-3 w-3 text-brand-600 shrink-0" />
                        <span>{categoryName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-caption text-ink-700">{product.sku}</td>
                    <td className="tnum px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-extrabold text-ink-900 text-body">
                          {money(product.retailPricePaise)}
                        </span>
                        {originalPricePaise && originalPricePaise > product.retailPricePaise ? (
                          <div className="flex items-center gap-1.5 text-micro text-ink-400 mt-0.5">
                            <span className="line-through">{money(originalPricePaise)}</span>
                            {displayDiscountPercent > 0 ? (
                              <span className="text-emerald-700 font-bold">{displayDiscountPercent}% off</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-900 text-label">{totalStock} units</span>
                        <Badge tone={stockTone}>{stockLabel}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-caption text-ink-500">{formatDate(product.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title="View product details"
                          onClick={() => setViewingProduct(product)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-600 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit product"
                          onClick={() => {
                            const prodId = (product as any)._id ? String((product as any)._id) : product.id;
                            setModalProductId(prodId);
                            setIsModalOpen(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-600 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete product"
                          onClick={() => void handleDeleteProduct(product)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-rose-600 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <footer className="mt-4 flex items-center justify-between text-caption text-ink-500">
          <p className="tnum">
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </footer>
      ) : null}

      {/* Product View Details Modal */}
      <ProductViewModal
        isOpen={Boolean(viewingProduct)}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
        categoryName={
          categoryList.find(
            (c) => c._id === viewingProduct?.categoryId || c.slug === viewingProduct?.categoryId,
          )?.name
        }
        onEdit={(prod) => {
          const prodId = (prod as any)._id ? String((prod as any)._id) : prod.id;
          setModalProductId(prodId);
          setIsModalOpen(true);
        }}
      />

      {/* Product Creation and Editing Modal */}
      <ProductEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId={modalProductId}
        onSuccess={() => void products.refetch()}
      />
    </div>
  );
}
