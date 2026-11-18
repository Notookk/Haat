import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, toneForStock } from '../components/ui/Badge';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/States';
import { ProductMedia } from '../components/catalog/ProductMedia';
import { usePublicProduct } from '../features/catalog/api';
import { money, moneyExact, quantityRange } from '../lib/format';
import { errorMessage } from '../lib/api-client';

const STOCK_COPY: Record<string, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  SOLD_OUT: 'Sold out',
};

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = usePublicProduct(slug);
  const [activeImage, setActiveImage] = useState(0);

  if (product.isPending) {
    return (
      <div className="mx-auto max-w-container px-4 py-8 md:px-6" aria-busy="true">
        <SkeletonBlock className="h-4 w-56" />
        <div className="mt-6 grid gap-8 md:grid-cols-[7fr_5fr]">
          <SkeletonBlock className="aspect-[4/3] w-full" />
          <div className="space-y-3">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-9 w-full" />
            <SkeletonBlock className="h-9 w-2/3" />
            <SkeletonBlock className="mt-6 h-7 w-40" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (product.isError) {
    const notFound = errorMessage(product.error).toLowerCase().includes('not found');
    return (
      <div className="mx-auto max-w-container px-4 py-12 md:px-6">
        {notFound ? (
          <EmptyState
            title="This listing isn’t available"
            description="It may have been archived by the seller, or it is still awaiting verification."
            action={
              <Link to="/catalogue" className="text-caption font-semibold text-brand-700 underline underline-offset-2">
                Browse the catalogue
              </Link>
            }
          />
        ) : (
          <ErrorState message={errorMessage(product.error)} onRetry={() => void product.refetch()} />
        )}
      </div>
    );
  }

  const item = product.data;
  if (!item) return null;

  const images = item.images;
  const current = images[Math.min(activeImage, Math.max(0, images.length - 1))] ?? null;
  const primary = images.find((image) => image.isPrimary) ?? images[0] ?? null;
  const shown = current ?? primary;
  const categoryLabel = item.categoryPath.split('/').slice(-1)[0]?.replace(/-/g, ' ') ?? '';

  return (
    <div className="mx-auto max-w-container px-4 py-6 md:px-6 md:py-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-caption text-ink-500">
        <Link to="/catalogue" className="hover:text-ink-800">
          Catalogue
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/catalogue?category=${encodeURIComponent(item.categoryPath.split('/')[0] ?? '')}`} className="capitalize hover:text-ink-800">
          {item.categoryPath.split('/')[0]?.replace(/-/g, ' ')}
        </Link>
        {categoryLabel ? (
          <>
            <span aria-hidden="true">/</span>
            <span className="capitalize text-ink-700">{categoryLabel}</span>
          </>
        ) : null}
      </nav>

      <div className="mt-4 grid gap-8 md:grid-cols-[7fr_5fr] md:items-start">
        <div>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="aspect-[4/3]">
              <ProductMedia image={shown} alt={item.title} sku={item.sku} />
            </div>
          </div>

          {images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show image ${index + 1}`}
                  aria-pressed={index === activeImage}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-sm border ${
                    index === activeImage ? 'border-brand-600' : 'border-line'
                  }`}
                >
                  <ProductMedia image={image} alt={item.title} sku={item.sku} />
                </button>
              ))}
            </div>
          ) : null}

          <section className="mt-6 rounded-lg border border-line bg-surface p-5">
            <h2 className="text-subtitle text-ink-900">About this listing</h2>
            <p className="mt-2 max-w-prose whitespace-pre-line text-body text-ink-600">{item.description}</p>
            <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-caption text-ink-500">SKU</dt>
                <dd className="font-mono text-caption text-ink-800">{item.sku}</dd>
              </div>
              {item.brand ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-caption text-ink-500">Brand</dt>
                  <dd className="text-caption text-ink-800">{item.brand}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-caption text-ink-500">Sold by</dt>
                <dd className="text-caption text-ink-800">{item.sellerName}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-caption text-ink-500">Total stock</dt>
                <dd className="tnum text-caption text-ink-800">{item.totalStock} units</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="md:sticky md:top-[88px]">
          <div className="rounded-lg border border-line bg-surface p-5">
            <p className="text-micro uppercase tracking-[0.08em] text-ink-500">{item.sellerName}</p>
            <h1 className="mt-1 text-display-md text-ink-900">{item.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-caption text-ink-500">
              <span className="font-mono">{item.sku}</span>
              {item.brand ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{item.brand}</span>
                </>
              ) : null}
            </p>

            <div className="mt-5 flex flex-wrap items-baseline gap-2">
              <span className="tnum text-numeric-lg text-ink-900">{moneyExact(item.retailPricePaise)}</span>
              <span className="text-caption text-ink-500">per unit, before delivery and taxes</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={toneForStock(item.stockState)}>{STOCK_COPY[item.stockState] ?? item.stockState}</Badge>
              <Badge tone="neutral" shape="chip">
                MOQ {item.moq}
              </Badge>
              {item.orderMultiple > 1 ? (
                <Badge tone="neutral" shape="chip">
                  Multiples of {item.orderMultiple}
                </Badge>
              ) : null}
            </div>

            {item.pricingTiers.length > 0 ? (
              <div className="mt-5 rounded-md border border-b2b-line bg-b2b-bg p-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-micro uppercase tracking-[0.08em] text-b2b-fg">Quantity pricing</h2>
                  <span className="text-micro text-b2b-fg">{item.pricingTiers.length} tiers</span>
                </div>
                <table className="mt-2 w-full border-collapse text-caption">
                  <thead>
                    <tr className="text-left text-micro uppercase tracking-[0.06em] text-b2b-fg">
                      <th scope="col" className="py-1 font-semibold">
                        Units
                      </th>
                      <th scope="col" className="py-1 text-right font-semibold">
                        Per unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.pricingTiers.map((tier) => (
                      <tr key={tier.minQuantity} className="border-t border-b2b-line">
                        <td className="tnum py-1.5 text-ink-800">{quantityRange(tier.minQuantity, tier.maxQuantity)}</td>
                        <td className="tnum py-1.5 text-right font-semibold text-ink-900">{money(tier.unitPricePaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-micro text-b2b-fg">
                  Tier price applies to every unit in the qualifying quantity.
                </p>
              </div>
            ) : null}

            {item.variants.length > 0 ? (
              <div className="mt-5">
                <h2 className="text-micro uppercase tracking-[0.08em] text-ink-500">Variants</h2>
                <table className="mt-2 w-full border-collapse text-caption">
                  <tbody>
                    {item.variants.map((variant) => (
                      <tr key={variant.id || variant.sku} className="border-t border-line">
                        <td className="py-2 pr-2">
                          <span className="block text-ink-800">{variant.title}</span>
                          <span className="block font-mono text-micro text-ink-400">{variant.sku}</span>
                        </td>
                        <td className="tnum py-2 text-right text-ink-600">
                          {variant.stockQuantity > 0 ? `${variant.stockQuantity} in stock` : 'Out of stock'}
                        </td>
                        <td className="tnum py-2 pl-3 text-right text-ink-900">
                          {money(item.retailPricePaise + variant.priceModifierPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <p className="mt-5 border-t border-line pt-3 text-caption text-ink-500">
              Sold by <span className="text-ink-800">{item.sellerName}</span>. Retail and wholesale quantities are
              handled on the same listing.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
