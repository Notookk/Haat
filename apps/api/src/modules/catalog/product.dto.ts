import { resolveUnitPricePaise, type PriceTier } from '@haat/shared';

export type StockState = 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT';

export interface ProductVariantView {
  id: string;
  sku: string;
  title: string;
  priceModifierPaise: number;
  stockQuantity: number;
  attributes: Record<string, string>;
}

export interface ProductImageView {
  id: string;
  url: string;
  publicId: string | null;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductTierView {
  minQuantity: number;
  maxQuantity: number | null;
  unitPricePaise: number;
}

export interface ProductView {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerSlug: string;
  categoryId: string;
  categoryPath: string;
  title: string;
  slug: string;
  description: string;
  sku: string;
  brand: string | null;
  retailPricePaise: number;
  /** Unit price at the product's MOQ under the current tier ladder. */
  effectiveUnitPricePaise: number;
  moq: number;
  orderMultiple: number;
  isWholesaleActive: boolean;
  hasWholesaleTiers: boolean;
  variants: ProductVariantView[];
  images: ProductImageView[];
  pricingTiers: ProductTierView[];
  totalStock: number;
  stockState: StockState;
  ratingAverage: number;
  ratingCount: number;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProductLike {
  _id: unknown;
  sellerId: unknown;
  sellerName: string;
  sellerSlug: string;
  categoryId: unknown;
  categoryPath: string;
  title: string;
  slug: string;
  description: string;
  sku: string;
  brand?: string | null;
  retailPricePaise: number;
  moq: number;
  orderMultiple: number;
  isWholesaleActive: boolean;
  variants: ReadonlyArray<{
    _id?: unknown;
    sku: string;
    title: string;
    priceModifierPaise: number;
    stockQuantity: number;
    attributes?: Record<string, string> | null;
  }>;
  images: ReadonlyArray<{
    _id?: unknown;
    url: string;
    publicId?: string | null;
    altText?: string | null;
    displayOrder: number;
    isPrimary: boolean;
  }>;
  pricingTiers: ReadonlyArray<{ minQuantity: number; maxQuantity?: number | null; unitPricePaise: number }>;
  ratingAverage: number;
  ratingCount: number;
  isActive: boolean;
  isApproved: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

const LOW_STOCK_THRESHOLD = 10;

export function toProductView(product: ProductLike): ProductView {
  const tiers: PriceTier[] = product.pricingTiers.map((tier) => ({
    minQuantity: tier.minQuantity,
    maxQuantity: tier.maxQuantity ?? null,
    unitPricePaise: tier.unitPricePaise,
  }));

  const totalStock = product.variants.reduce((total, variant) => total + variant.stockQuantity, 0);
  const stockState: StockState =
    totalStock === 0 ? 'SOLD_OUT' : totalStock <= LOW_STOCK_THRESHOLD ? 'LOW_STOCK' : 'IN_STOCK';

  return {
    id: String(product._id),
    sellerId: String(product.sellerId),
    sellerName: product.sellerName,
    sellerSlug: product.sellerSlug,
    categoryId: String(product.categoryId),
    categoryPath: product.categoryPath,
    title: product.title,
    slug: product.slug,
    description: product.description,
    sku: product.sku,
    brand: product.brand ?? null,
    retailPricePaise: product.retailPricePaise,
    effectiveUnitPricePaise: resolveUnitPricePaise(product.retailPricePaise, tiers, Math.max(1, product.moq)),
    moq: product.moq,
    orderMultiple: product.orderMultiple,
    isWholesaleActive: product.isWholesaleActive,
    hasWholesaleTiers: product.isWholesaleActive && tiers.length > 0,
    variants: product.variants.map((variant) => ({
      id: String(variant._id ?? ''),
      sku: variant.sku,
      title: variant.title,
      priceModifierPaise: variant.priceModifierPaise,
      stockQuantity: variant.stockQuantity,
      attributes: variant.attributes ?? {},
    })),
    images: product.images.map((image) => ({
      id: String(image._id ?? ''),
      url: image.url,
      publicId: image.publicId ?? null,
      altText: image.altText ?? null,
      displayOrder: image.displayOrder,
      isPrimary: image.isPrimary,
    })),
    pricingTiers: tiers,
    totalStock,
    stockState,
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
    isActive: product.isActive,
    isApproved: product.isApproved,
    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : null,
    updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : null,
  };
}
