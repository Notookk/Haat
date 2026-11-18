import { z } from 'zod';
import { rupeesToPaise, validateTiers, type PriceTier } from '@haat/shared';
import type { Product } from '../../lib/types';
import type { ProductWritePayload } from './api';

/**
 * Editor form model.
 *
 * Rupees live in the form as strings and are converted to integer paise exactly once,
 * at submit time (PRD §15.5.2). Keeping them as strings also means no float drift while
 * the seller types, and empty fields stay empty instead of becoming `NaN` or `0`.
 */

const RUPEES = /^\d+(?:\.\d{1,2})?$/;
const WHOLE = /^\d+$/;

export interface ParsedAttributes {
  ok: boolean;
  attributes: Record<string, string>;
  error: string | null;
}

/** `grade=8.8, length=50 mm` -> `{ grade: '8.8', length: '50 mm' }` */
export function parseAttributes(input: string): ParsedAttributes {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, attributes: {}, error: null };

  const attributes: Record<string, string> = {};
  for (const pair of trimmed.split(',')) {
    const separator = pair.indexOf('=');
    if (separator <= 0) {
      return { ok: false, attributes: {}, error: 'Use key=value pairs, separated by commas.' };
    }
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (!key || !value) {
      return { ok: false, attributes: {}, error: 'Every attribute needs a name and a value.' };
    }
    if (key.length > 40) {
      return { ok: false, attributes: {}, error: `Attribute “${key.slice(0, 40)}…” is too long.` };
    }
    if (value.length > 120) {
      return { ok: false, attributes: {}, error: `The value for “${key}” is too long.` };
    }
    attributes[key] = value;
  }
  return { ok: true, attributes, error: null };
}

export function formatAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

const rupeesField = (label: string, allowZero: boolean) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => RUPEES.test(value), `Enter ${label.toLowerCase()} in rupees, e.g. 249.50`)
    .refine((value) => allowZero || Number(value) > 0, `${label} must be greater than zero`);

const wholeField = (label: string, minimum: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => WHOLE.test(value) && Number(value) >= minimum, message);

const variantFormSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(3, 'SKU must be at least 3 characters').max(64, 'Keep the SKU under 64 characters'),
  title: z.string().trim().min(1, 'Variant title is required').max(120, 'Keep it under 120 characters'),
  priceModifierRupees: z
    .string()
    .trim()
    .refine((value) => value === '' || RUPEES.test(value), 'Use rupees, e.g. 4.20')
    .refine((value) => value === '' || Number(value) >= 0, 'The modifier cannot be negative'),
  stockQuantity: wholeField('Stock', 0, 'Enter stock as a whole number, 0 or more'),
  attributes: z
    .string()
    .trim()
    .max(400, 'Keep attributes under 400 characters')
    .refine((value) => parseAttributes(value).ok, 'Use key=value pairs, separated by commas'),
});

const tierFormSchema = z.object({
  minQuantity: wholeField('Minimum quantity', 1, 'Enter a whole number of at least 1'),
  maxQuantity: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (WHOLE.test(value) && Number(value) >= 1),
      'Enter a whole number, or leave blank for open-ended',
    ),
  unitPriceRupees: rupeesField('Unit price', false),
});

const imageFormSchema = z.object({
  id: z.string().optional(),
  url: z
    .string()
    .trim()
    .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), 'Use a full https image URL'),
  publicId: z.string().optional(),
  altText: z.string().trim().max(160, 'Keep alt text under 160 characters'),
  isPrimary: z.boolean(),
});

export const productEditorSchema = z
  .object({
    title: z.string().trim().min(3, 'Give the product a title').max(160, 'Keep the title under 160 characters'),
    description: z
      .string()
      .trim()
      .min(10, 'Describe the product — at least 10 characters')
      .max(4000, 'Keep the description under 4,000 characters'),
    sku: z.string().trim().min(3, 'SKU must be at least 3 characters').max(64, 'Keep the SKU under 64 characters'),
    brand: z.string().trim().max(80, 'Keep the brand under 80 characters'),
    categoryId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Select a category'),
    retailPriceRupees: rupeesField('Retail price', false),
    moq: wholeField('Minimum order quantity', 1, 'Enter a whole number of at least 1'),
    orderMultiple: wholeField('Order multiple', 1, 'Enter a whole number of at least 1'),
    isWholesaleActive: z.boolean(),
    isActive: z.boolean(),
    variants: z.array(variantFormSchema).min(1, 'Add at least one variant').max(30, 'Up to 30 variants'),
    images: z.array(imageFormSchema).max(10, 'Up to 10 images'),
    pricingTiers: z.array(tierFormSchema).max(20, 'Up to 20 tiers'),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.variants.forEach((variant, index) => {
      const key = variant.sku.trim().toUpperCase();
      if (!key) return;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', index, 'sku'],
          message: 'Variant SKUs must be unique within a product',
        });
      }
      seen.add(key);
    });
  });

export type ProductEditorValues = z.infer<typeof productEditorSchema>;
export type VariantFormValues = ProductEditorValues['variants'][number];
export type TierFormValues = ProductEditorValues['pricingTiers'][number];
export type ImageFormValues = ProductEditorValues['images'][number];

export function emptyVariant(): VariantFormValues {
  return { sku: '', title: '', priceModifierRupees: '0', stockQuantity: '0', attributes: '' };
}

export function emptyTier(): TierFormValues {
  return { minQuantity: '', maxQuantity: '', unitPriceRupees: '' };
}

export function emptyProductForm(): ProductEditorValues {
  return {
    title: '',
    description: '',
    sku: '',
    brand: '',
    categoryId: '',
    retailPriceRupees: '',
    moq: '1',
    orderMultiple: '1',
    isWholesaleActive: false,
    isActive: true,
    variants: [emptyVariant()],
    images: [],
    pricingTiers: [],
  };
}

/** Paise -> the shortest exact rupee string ("1850" -> "18.50", "34900" -> "349"). */
export function paiseToRupeeInput(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

export function tryRupeesToPaise(value: string): number | null {
  const trimmed = value.trim();
  if (!RUPEES.test(trimmed)) return null;
  try {
    return rupeesToPaise(trimmed);
  } catch {
    return null;
  }
}

export function productToFormValues(product: Product): ProductEditorValues {
  return {
    title: product.title,
    description: product.description,
    sku: product.sku,
    brand: product.brand ?? '',
    categoryId: product.categoryId,
    retailPriceRupees: paiseToRupeeInput(product.retailPricePaise),
    moq: String(product.moq),
    orderMultiple: String(product.orderMultiple),
    isWholesaleActive: product.isWholesaleActive,
    isActive: product.isActive,
    variants:
      product.variants.length > 0
        ? product.variants.map((variant) => ({
            id: variant.id || undefined,
            sku: variant.sku,
            title: variant.title,
            priceModifierRupees: paiseToRupeeInput(variant.priceModifierPaise),
            stockQuantity: String(variant.stockQuantity),
            attributes: formatAttributes(variant.attributes),
          }))
        : [emptyVariant()],
    images: product.images.map((image) => ({
      id: image.id || undefined,
      url: image.url,
      publicId: image.publicId ?? undefined,
      altText: image.altText ?? '',
      isPrimary: image.isPrimary,
    })),
    pricingTiers: product.pricingTiers.map((tier) => ({
      minQuantity: String(tier.minQuantity),
      maxQuantity: tier.maxQuantity === null ? '' : String(tier.maxQuantity),
      unitPriceRupees: paiseToRupeeInput(tier.unitPricePaise),
    })),
  };
}

export interface ParsedTierRows {
  tiers: PriceTier[];
  complete: boolean;
}

/** Parses every row, or reports that at least one row is still incomplete/invalid. */
export function parseTierRows(rows: readonly TierFormValues[]): ParsedTierRows {
  const tiers: PriceTier[] = [];
  for (const row of rows) {
    const min = row.minQuantity.trim();
    const max = row.maxQuantity.trim();
    const price = row.unitPriceRupees.trim();
    if (!WHOLE.test(min) || (max !== '' && !WHOLE.test(max))) {
      return { tiers: [], complete: false };
    }
    const paise = tryRupeesToPaise(price);
    if (paise === null) return { tiers: [], complete: false };
    tiers.push({
      minQuantity: Number(min),
      maxQuantity: max === '' ? null : Number(max),
      unitPricePaise: paise,
    });
  }
  return { tiers, complete: true };
}

export function tierIssues(rows: readonly TierFormValues[]): string[] {
  const parsed = parseTierRows(rows);
  if (!parsed.complete) return [];
  return validateTiers(parsed.tiers);
}

/** Converts a validated form into the API payload. Money crosses the boundary exactly once. */
export function toProductPayload(
  values: ProductEditorValues,
  tiers: readonly PriceTier[],
): ProductWritePayload {
  const retailPricePaise = rupeesToPaise(values.retailPriceRupees);

  const variants = values.variants.map((variant) => {
    const attributes = parseAttributes(variant.attributes);
    if (!attributes.ok) throw new Error(attributes.error ?? 'Check the variant attributes.');
    return {
      id: variant.id,
      sku: variant.sku.toUpperCase(),
      title: variant.title,
      priceModifierPaise: variant.priceModifierRupees.trim() === '' ? 0 : rupeesToPaise(variant.priceModifierRupees),
      stockQuantity: Number(variant.stockQuantity),
      attributes: attributes.attributes,
    };
  });

  const images = values.images
    .filter((image) => image.url.trim() !== '')
    .map((image, index) => ({
      id: image.id,
      url: image.url.trim(),
      publicId: image.publicId,
      altText: image.altText.trim() || undefined,
      displayOrder: index,
      isPrimary: image.isPrimary,
    }));

  return {
    title: values.title.trim(),
    description: values.description.trim(),
    sku: values.sku.trim().toUpperCase(),
    brand: values.brand.trim() || undefined,
    categoryId: values.categoryId,
    retailPricePaise,
    moq: Number(values.moq),
    orderMultiple: Number(values.orderMultiple),
    isWholesaleActive: values.isWholesaleActive,
    isActive: values.isActive,
    variants,
    images,
    pricingTiers: tiers.map((tier) => ({
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      unitPricePaise: tier.unitPricePaise,
    })),
  };
}

/** First few orderable quantities, used by the MOQ + multiple live hint. */
export function orderableQuantities(moq: number, multiple: number, count = 3): number[] {
  if (!Number.isInteger(moq) || moq < 1) return [];
  const step = Number.isInteger(multiple) && multiple > 1 ? multiple : 1;
  const start = Math.ceil(moq / step) * step;
  return Array.from({ length: count }, (_, index) => start + index * step);
}
