import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { useArchiveProduct, useMyProducts } from '../features/products/api';
import { Badge, toneForStock } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Notice } from '../components/ui/Panel';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/States';
import { errorMessage } from '../lib/api-client';
import { formatDate, money } from '../lib/format';
import type { Product } from '../lib/types';

const STOCK_COPY: Record<string, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  SOLD_OUT: 'Sold out',
};

export function SellerProductsPage() {
  const { seller } = useAuth();
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pendingArchive, setPendingArchive] = useState<Product | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => setPage(1), [search]);

  const products = useMyProducts({ q: search || undefined, page, limit: 20 });
  const archive = useArchiveProduct();

  const items = products.data?.items ?? [];
  const meta = products.data?.meta;

  const confirmArchive = async () => {
    if (!pendingArchive) return;
    setActionError(null);
    try {
      await archive.mutateAsync(pendingArchive.id);
      setPendingArchive(null);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-display-md text-ink-900">Products</h1>
          <p className="mt-1 tnum text-caption text-ink-500">
            {meta ? `${meta.total} ${meta.total === 1 ? 'product' : 'products'}` : 'Loading catalogue'}
            {search ? ` matching “${search}”` : ''}
          </p>
        </div>
        <Link to="/seller/products/new">
          <Button>Add product</Button>
        </Link>
      </header>

      {seller && !seller.isVerified ? (
        <Notice tone="warning" className="mt-4" title="Verification pending">
          Your products are saved but stay out of the public catalogue until KYC is approved.
        </Notice>
      ) : null}

      <form
        className="mt-5 flex flex-wrap items-center gap-2 border-y border-line py-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(term.trim());
        }}
        role="search"
      >
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search title, SKU or brand"
          className="h-9 w-full max-w-[360px] rounded-sm border border-line-strong bg-surface px-3 text-body text-ink-900 placeholder:text-ink-300 focus:border-brand-500"
          autoComplete="off"
        />
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
        {search ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTerm('');
              setSearch('');
            }}
          >
            Clear
          </Button>
        ) : null}
      </form>

      {actionError ? (
        <Notice tone="danger" className="mt-4">
          {actionError}
        </Notice>
      ) : null}

      <div className="mt-5">
        {products.isPending ? (
          <div className="space-y-px overflow-hidden rounded-lg border border-line bg-surface">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-3">
                <SkeletonBlock className="h-4 w-1/3" />
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="ml-auto h-4 w-20" />
              </div>
            ))}
          </div>
        ) : products.isError ? (
          <ErrorState message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
        ) : items.length === 0 ? (
          search ? (
            <EmptyState
              title={`No products match “${search}”`}
              description="Search looks at the title, SKU, brand and description. Clear the term to see everything."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setTerm('');
                    setSearch('');
                  }}
                >
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No products yet"
              description="Add your first listing with variants, stock and a quantity ladder. It takes about two minutes."
              action={
                <Link to="/seller/products/new">
                  <Button size="sm">Create your first product</Button>
                </Link>
              }
            />
          )
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="table-head px-4 py-2.5">
                    Product
                  </th>
                  <th scope="col" className="table-head px-4 py-2.5">
                    Price
                  </th>
                  <th scope="col" className="table-head px-4 py-2.5">
                    Stock
                  </th>
                  <th scope="col" className="table-head px-4 py-2.5">
                    State
                  </th>
                  <th scope="col" className="table-head px-4 py-2.5">
                    Updated
                  </th>
                  <th scope="col" className="table-head px-4 py-2.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="line-clamp-1 text-label text-ink-900">{product.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-micro text-ink-400">
                        <span>{product.sku}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{product.categoryPath.split('/').slice(-1)[0]?.replace(/-/g, ' ')}</span>
                      </p>
                    </td>
                    <td className="tnum px-4 py-3 text-numeric text-ink-900">{money(product.retailPricePaise)}</td>
                    <td className="px-4 py-3">
                      <span className="tnum text-caption text-ink-700">{product.totalStock} units</span>
                      <div className="mt-1">
                        <Badge tone={toneForStock(product.stockState)} shape="chip">
                          {STOCK_COPY[product.stockState] ?? product.stockState}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={product.isActive ? 'success' : 'neutral'} shape="chip">
                          {product.isActive ? 'Active' : 'Archived'}
                        </Badge>
                        {!product.isApproved ? (
                          <Badge tone="warning" shape="chip">
                            Awaiting KYC
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-micro text-ink-500">{formatDate(product.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/seller/products/${product.id}/edit`}
                          className="inline-flex h-8 items-center rounded-sm px-2.5 text-caption text-ink-700 hover:bg-surface-sunken"
                        >
                          Edit
                        </Link>
                        {product.isActive ? (
                          <button
                            type="button"
                            onClick={() => setPendingArchive(product)}
                            className="inline-flex h-8 items-center rounded-sm px-2.5 text-caption text-danger-fg hover:bg-danger-bg"
                          >
                            Archive
                          </button>
                        ) : (
                          <span className="px-2.5 text-caption text-ink-400">Archived</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="tnum text-caption text-ink-500">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}

      <ConfirmDialog
        open={pendingArchive !== null}
        title="Archive this product?"
        description={
          pendingArchive
            ? `“${pendingArchive.title}” will disappear from the public catalogue. Existing links stop resolving.`
            : ''
        }
        confirmLabel="Archive product"
        destructive
        busy={archive.isPending}
        onConfirm={() => void confirmArchive()}
        onCancel={() => setPendingArchive(null)}
      />
    </div>
  );
}
