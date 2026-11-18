import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, SkeletonGrid } from '../components/ui/States';
import { ProductCard } from '../components/catalog/ProductCard';
import { flattenCategories, useCategoryTree, usePublicProducts } from '../features/catalog/api';
import { errorMessage } from '../lib/api-client';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
] as const;

export function CataloguePage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sortParam = params.get('sort') ?? 'newest';
  const sort = (SORTS.find((option) => option.value === sortParam)?.value ?? 'newest') as
    | 'newest'
    | 'price-asc'
    | 'price-desc';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  const categories = useCategoryTree();
  const products = usePublicProducts({
    q: q || undefined,
    category: category || undefined,
    sort,
    page,
    limit: 12,
  });

  const options = flattenCategories(categories.data ?? []);
  const items = products.data?.items ?? [];
  const meta = products.data?.meta;

  const update = (patch: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next, { replace: true });
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    update({ q: term.trim() || undefined, page: undefined });
  };

  return (
    <div className="mx-auto max-w-container px-4 py-8 md:px-6 md:py-10">
      <header>
        <h1 className="text-display-md text-ink-900">Catalogue</h1>
        <p className="mt-1 tnum text-caption text-ink-500">
          {meta ? `${meta.total} ${meta.total === 1 ? 'listing' : 'listings'}` : 'Loading listings'}
          {q ? ` for “${q}”` : ''}
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-3 border-y border-line py-3 md:flex-row md:items-center">
        <form onSubmit={submitSearch} className="flex min-w-0 flex-1 gap-2" role="search">
          <label htmlFor="catalogue-search" className="sr-only">
            Search listings
          </label>
          <input
            id="catalogue-search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by product, brand or SKU"
            className="h-10 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-3 text-body text-ink-900 placeholder:text-ink-300 transition-colors duration-120 hover:border-ink-300 focus:border-brand-500"
            autoComplete="off"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          <label className="sr-only" htmlFor="catalogue-category">
            Category
          </label>
          <select
            id="catalogue-category"
            value={category}
            onChange={(event) => update({ category: event.target.value || undefined, page: undefined })}
            className="h-10 max-w-[220px] rounded-sm border border-line-strong bg-surface px-2 text-label text-ink-800"
          >
            <option value="">All categories</option>
            {options.map((option) => (
              <option key={option.id} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="catalogue-sort">
            Sort
          </label>
          <select
            id="catalogue-sort"
            value={sort}
            onChange={(event) => update({ sort: event.target.value, page: undefined })}
            className="h-10 max-w-[190px] rounded-sm border border-line-strong bg-surface px-2 text-label text-ink-800"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {q || category ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {q ? (
            <button
              type="button"
              onClick={() => {
                setTerm('');
                update({ q: undefined, page: undefined });
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line-strong bg-surface px-3 text-caption text-ink-700 hover:border-ink-300"
            >
              “{q}” <span aria-hidden="true">×</span>
              <span className="sr-only">Remove search filter</span>
            </button>
          ) : null}
          {category ? (
            <button
              type="button"
              onClick={() => update({ category: undefined, page: undefined })}
              className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line-strong bg-surface px-3 text-caption text-ink-700 hover:border-ink-300"
            >
              {options.find((option) => option.slug === category)?.label ?? category} <span aria-hidden="true">×</span>
              <span className="sr-only">Remove category filter</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        {products.isPending ? (
          <SkeletonGrid count={8} />
        ) : products.isError ? (
          <ErrorState message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title={q ? `No matches for “${q}”` : 'Nothing matches these filters'}
            description="Try a broader term, another category, or clear the filters to see everything that is published."
            action={
              <Button variant="secondary" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {meta && meta.totalPages > 1 ? (
              <nav className="mt-8 flex items-center justify-between border-t border-line pt-4" aria-label="Pagination">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => update({ page: page - 1 })}
                >
                  Previous
                </Button>
                <span className="tnum text-caption text-ink-500">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => update({ page: page + 1 })}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </div>

      {categories.isError ? (
        <p className="mt-6 text-caption text-ink-500">
          Categories could not be loaded, so the filter is limited.{' '}
          <button
            type="button"
            onClick={() => void categories.refetch()}
            className="underline underline-offset-2 hover:text-ink-800"
          >
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}
