import { Link } from 'react-router-dom';
import { Badge, toneForStock } from '../ui/Badge';
import { money } from '../../lib/format';
import type { Product } from '../../lib/types';
import { ProductMedia } from './ProductMedia';

const STOCK_COPY: Record<string, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  SOLD_OUT: 'Sold out',
};

export function ProductCard({ product }: { product: Product }) {
  const primary = product.images.find((image) => image.isPrimary) ?? product.images[0] ?? null;
  const cheapestTier = product.pricingTiers.reduce<(typeof product.pricingTiers)[number] | null>(
    (lowest, tier) => (lowest === null || tier.unitPricePaise < lowest.unitPricePaise ? tier : lowest),
    null,
  );

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-120 ease-out hover:border-line-strong"
    >
      <div className="relative aspect-[4/3] border-b border-line">
        <ProductMedia image={primary} alt={product.title} sku={product.sku} />
        {product.hasWholesaleTiers ? (
          <span className="absolute left-2 top-2">
            <Badge tone="b2b" shape="chip">
              MOQ {product.moq}
            </Badge>
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <p className="truncate text-micro uppercase tracking-[0.06em] text-ink-500">{product.sellerName}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.9em] text-body font-semibold leading-snug text-ink-900">
          {product.title}
        </h3>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="tnum text-numeric-lg text-ink-900">{money(product.retailPricePaise)}</span>
          <span className="text-caption text-ink-500">per unit</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={toneForStock(product.stockState)} shape="chip">
            {STOCK_COPY[product.stockState] ?? product.stockState}
          </Badge>
          {cheapestTier !== null && cheapestTier.unitPricePaise < product.retailPricePaise ? (
            <span className="tnum text-caption text-b2b-fg">
              from {money(cheapestTier.unitPricePaise)} at {cheapestTier.minQuantity}+
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
