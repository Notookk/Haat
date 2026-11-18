import { Badge } from '../ui/Badge';
import { money, quantityRange } from '../../lib/format';
import {
  parseTierRows,
  tryRupeesToPaise,
  type ProductEditorValues,
} from '../../features/products/editor-schema';

interface ProductPreviewProps {
  values: ProductEditorValues;
  sellerName: string;
  categoryLabel: string;
  isApproved: boolean;
}

/**
 * Live buyer-facing preview (§9.11). It reads exactly what the form holds, so a seller
 * never has to publish to find out how the listing will read.
 */
export function ProductPreview({ values, sellerName, categoryLabel, isApproved }: ProductPreviewProps) {
  const retailPaise = tryRupeesToPaise(values.retailPriceRupees);
  const parsedTiers = parseTierRows(values.pricingTiers);
  const tiers = parsedTiers.complete ? parsedTiers.tiers : [];

  const primaryImage =
    values.images.find((image) => image.isPrimary && image.url.trim() !== '') ??
    values.images.find((image) => image.url.trim() !== '') ??
    null;

  const totalStock = values.variants.reduce((total, variant) => {
    const quantity = Number(variant.stockQuantity);
    return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);

  const title = values.title.trim() || 'Untitled product';
  const sku = values.sku.trim().toUpperCase() || 'SKU-PENDING';
  const moq = Number(values.moq) || 1;
  const multiple = Number(values.orderMultiple) || 1;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="text-micro uppercase tracking-[0.08em] text-ink-500">Buyer preview</span>
        {isApproved ? (
          <Badge tone="success" shape="chip">
            Public
          </Badge>
        ) : (
          <Badge tone="warning" shape="chip">
            Awaiting KYC
          </Badge>
        )}
      </div>

      <div className="aspect-[4/3] border-b border-line">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.altText || title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="img-fallback grid h-full w-full place-items-center" aria-hidden="true">
            <span className="px-3 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
              {sku}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="truncate text-micro uppercase tracking-[0.06em] text-ink-500">{sellerName || 'Your store'}</p>
        <h3 className="mt-1 line-clamp-2 text-body font-semibold leading-snug text-ink-900">{title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-micro text-ink-400">
          <span>{sku}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{categoryLabel || 'No category'}</span>
        </p>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="tnum text-numeric-lg text-ink-900">{retailPaise === null ? '—' : money(retailPaise)}</span>
          <span className="text-caption text-ink-500">per unit</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral" shape="chip">
            MOQ {moq}
          </Badge>
          {multiple > 1 ? (
            <Badge tone="neutral" shape="chip">
              Multiples of {multiple}
            </Badge>
          ) : null}
          {values.isWholesaleActive && tiers.length > 0 ? (
            <Badge tone="b2b" shape="chip">
              Wholesale
            </Badge>
          ) : null}
        </div>

        {tiers.length > 0 ? (
          <table className="mt-3 w-full border-collapse text-caption">
            <thead>
              <tr className="text-left text-micro uppercase tracking-[0.06em] text-ink-500">
                <th scope="col" className="py-1 font-semibold">
                  Units
                </th>
                <th scope="col" className="py-1 text-right font-semibold">
                  Each
                </th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={`${tier.minQuantity}-${tier.maxQuantity ?? 'open'}`} className="border-t border-line">
                  <td className="tnum py-1 text-ink-700">{quantityRange(tier.minQuantity, tier.maxQuantity)}</td>
                  <td className="tnum py-1 text-right font-semibold text-ink-900">{money(tier.unitPricePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 border-t border-line pt-2 text-micro text-ink-400">
            No quantity pricing — buyers pay the retail price at any quantity.
          </p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
          <span className="text-micro text-ink-500">Total stock</span>
          <span className="tnum text-caption text-ink-800">{totalStock} units</span>
        </div>

        {!values.isWholesaleActive && tiers.length > 0 ? (
          <p className="mt-2 text-micro text-warning-fg">
            Tiers are saved but ignored publicly while wholesale is off.
          </p>
        ) : null}
      </div>
    </div>
  );
}
