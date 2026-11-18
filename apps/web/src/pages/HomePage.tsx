import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, SkeletonBlock, SkeletonGrid } from '../components/ui/States';
import { ProductCard } from '../components/catalog/ProductCard';
import { ProductMedia } from '../components/catalog/ProductMedia';
import { useCategoryTree, usePublicProducts } from '../features/catalog/api';
import { money, quantityRange } from '../lib/format';
import { errorMessage } from '../lib/api-client';
import type { CategoryNode, Product } from '../lib/types';

function subtreeCount(node: CategoryNode): number {
  return node.productCount + node.children.reduce((total, child) => total + subtreeCount(child), 0);
}

function FeaturedLot({ product }: { product: Product }) {
  const primary = product.images.find((image) => image.isPrimary) ?? product.images[0] ?? null;

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-micro uppercase tracking-[0.08em] text-ink-500">
          {product.hasWholesaleTiers ? 'Wholesale lot' : 'Retail listing'}
        </span>
        <span className="font-mono text-micro text-ink-400">{product.sku}</span>
      </div>

      <div className="mt-3 aspect-[4/3] overflow-hidden rounded-sm border border-line">
        <ProductMedia image={primary} alt={product.title} sku={product.sku} />
      </div>

      <h2 className="mt-3 line-clamp-2 text-subtitle text-ink-900">{product.title}</h2>
      <p className="mt-0.5 truncate text-caption text-ink-500">{product.sellerName}</p>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="tnum text-numeric-lg text-ink-900">{money(product.retailPricePaise)}</span>
        <Badge tone="b2b" shape="chip">
          MOQ {product.moq}
        </Badge>
      </div>

      {product.pricingTiers.length > 0 ? (
        <dl className="mt-3 space-y-1 border-t border-line pt-3">
          {product.pricingTiers.slice(0, 3).map((tier) => (
            <div key={tier.minQuantity} className="flex items-baseline justify-between gap-3 text-caption">
              <dt className="tnum text-ink-500">{quantityRange(tier.minQuantity, tier.maxQuantity)} units</dt>
              <dd className="tnum font-semibold text-b2b-fg">{money(tier.unitPricePaise)} each</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <Link
        to={`/product/${product.slug}`}
        className="mt-3 inline-block text-caption font-semibold text-brand-700 underline underline-offset-2"
      >
        Open the listing
      </Link>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const categories = useCategoryTree();
  const products = usePublicProducts({ limit: 8, sort: 'newest' });

  const roots = categories.data ?? [];
  const items = products.data?.items ?? [];
  const featured = useMemo(() => items.find((product) => product.hasWholesaleTiers) ?? items[0] ?? null, [items]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    navigate(query ? `/catalogue?q=${encodeURIComponent(query)}` : '/catalogue');
  };

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-container gap-10 px-4 py-10 md:grid-cols-[1.15fr_0.85fr] md:items-start md:px-6 md:py-14">
          <div>
            <p className="text-micro uppercase tracking-[0.1em] text-ink-500">India Â· retail &amp; wholesale</p>
            <h1 className="mt-3 text-display-xl text-ink-900">
              Stock the shop.
              <br />
              Price it by the case.
            </h1>
            <p className="mt-4 max-w-prose text-body text-ink-600">
              Order from verified Indian sellers with quantity pricing, minimum order rules and scheduled delivery
              windows — on the same listing as the retail price.
            </p>

            <form onSubmit={submitSearch} className="mt-6 flex max-w-[540px] gap-2" role="search">
              <label htmlFor="home-search" className="sr-only">
                Search the catalogue
              </label>
              <input
                id="home-search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Bolts, cable, canvas, gloves…"
                className="h-11 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-3 text-body text-ink-900 placeholder:text-ink-300 transition-colors duration-120 hover:border-ink-300 focus:border-brand-500"
                autoComplete="off"
              />
              <Button type="submit" size="lg">
                Search
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption">
              <Link to="/catalogue" className="font-semibold text-brand-700 underline underline-offset-2">
                Browse the catalogue
              </Link>
              <Link to="/register?role=SELLER" className="text-ink-600 underline underline-offset-2">
                Sell on HAAT
              </Link>
            </div>
          </div>

          <div className="w-full max-w-[380px] md:justify-self-end">
            {products.isPending ? (
              <div className="rounded-lg border border-line bg-surface p-4">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-3 aspect-[4/3] w-full" />
                <SkeletonBlock className="mt-4 h-4 w-4/5" />
                <SkeletonBlock className="mt-2 h-6 w-1/2" />
              </div>
            ) : featured ? (
              <FeaturedLot product={featured} />
            ) : (
              <EmptyState
                title="No public listings yet"
                description="Once a store completes verification and publishes a product, the newest lot is featured here."
                action={
                  <Link to="/register?role=SELLER">
                    <Button size="sm">Open a store</Button>
                  </Link>
                }
              />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 py-10 md:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-title text-ink-900">Categories</h2>
          <Link to="/catalogue" className="text-caption text-ink-500 underline underline-offset-2">
            See all products
          </Link>
        </div>

        {categories.isPending ? (
          <div className="mt-4 flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-[88px] w-[168px] shrink-0" />
            ))}
          </div>
        ) : categories.isError ? (
          <div className="mt-4">
            <ErrorState message={errorMessage(categories.error)} onRetry={() => void categories.refetch()} />
          </div>
        ) : (
          <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {roots.map((root) => {
              const count = subtreeCount(root);
              return (
                <Link
                  key={root.id}
                  to={`/catalogue?category=${encodeURIComponent(root.slug)}`}
                  className="flex h-[88px] w-[168px] shrink-0 snap-start flex-col justify-between rounded-lg border border-line bg-surface p-3 transition-colors duration-120 hover:border-line-strong"
                >
                  <span className="line-clamp-2 text-label text-ink-900">{root.name}</span>
                  <span className="tnum text-caption text-ink-500">
                    {count > 0 ? `${count} ${count === 1 ? 'item' : 'items'}` : 'New'}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-container px-4 pb-12 md:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-title text-ink-900">New on the market</h2>
          <span className="tnum text-caption text-ink-500">
            {products.data?.meta ? `${products.data.meta.total} listings` : ''}
          </span>
        </div>

        <div className="mt-4">
          {products.isPending ? (
            <SkeletonGrid count={8} />
          ) : products.isError ? (
            <ErrorState message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              title="The catalogue is empty"
              description="Nothing has been published yet. If you sell, create your store and add the first product."
              action={
                <Link to="/register?role=SELLER">
                  <Button size="sm">Open a store</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-container gap-6 px-4 py-10 md:grid-cols-[1fr_auto] md:items-center md:px-6">
          <div>
            <h2 className="text-display-md text-ink-900">Your catalogue, priced properly.</h2>
            <p className="mt-2 max-w-prose text-body text-ink-600">
              Quantity tiers, minimum order quantities and order multiples are enforced by the platform — not by a
              spreadsheet and a phone call.
            </p>
            <div className="mt-4 rounded-lg border border-line bg-canvas">
              <ul className="divide-y divide-line">
                <li className="px-4 py-3 text-caption text-ink-600">Tier ladders checked for gaps and overlaps</li>
                <li className="px-4 py-3 text-caption text-ink-600">Retail and wholesale on one listing</li>
                <li className="px-4 py-3 text-caption text-ink-600">Gallery images hosted on a signed upload path</li>
              </ul>
            </div>
          </div>
          <Link to="/register?role=SELLER" className="md:justify-self-end">
            <Button size="lg">Start selling</Button>
          </Link>
        </div>
      </section>
    </>
  );
}

