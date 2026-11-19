import { z } from 'zod';
import { rupeesToPaise, type PriceTier } from '@haat/shared-contracts';
import type { Product } from '@haat/shared-frontend';
import type { ProductWritePayload } from './api';

const RUPEES = /^\d+(?:\.\d{1,2})?$/;
const WHOLE = /^\d+$/;

export function generateSkuFromTitle(title: string): string {
  if (!title || !title.trim()) return '';

  const cleaned = title.trim().replace(/[^a-zA-Z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);

  // Filter out pure numbers and common package/unit suffixes (500g, 1kg, 250ml, etc.)
  const nonUnitWords = words.filter(
    (w) => !/^\d+(g|kg|ml|l|oz|lb|pc|pcs|pack|gm)?$/i.test(w),
  );
  const wordsToUse = nonUnitWords.length > 0 ? nonUnitWords : (words.length > 0 ? words : ['HAAT']);

  let prefix = '';
  if (wordsToUse.length === 1) {
    prefix = wordsToUse[0].slice(0, 6).toUpperCase();
  } else if (wordsToUse.length === 2) {
    prefix = `${wordsToUse[0].slice(0, 4)}-${wordsToUse[1].slice(0, 4)}`.toUpperCase();
  } else {
    // 3 or more words: take initials of leading words + last word abbreviation
    const initials = wordsToUse.slice(0, -1).map((w) => w[0]).join('').slice(0, 4).toUpperCase();
    const lastWord = wordsToUse[wordsToUse.length - 1].slice(0, 4).toUpperCase();
    prefix = `${initials}-${lastWord}`;
  }

  if (prefix.length < 2) {
    prefix = 'HAAT';
  }

  // 6-digit random number to guarantee uniqueness
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${randomNum}`;
}

export function generateRandomSku(prefixSeed = ''): string {
  return generateSkuFromTitle(prefixSeed) || `HAAT-${Math.floor(100000 + Math.random() * 900000)}`;
}

const rupeesField = (label: string, allowZero: boolean) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => RUPEES.test(value), `Enter ${label.toLowerCase()} in rupees (e.g. 249.50)`)
    .refine((value) => allowZero || Number(value) > 0, `${label} must be greater than zero`);

const wholeField = (label: string, minimum: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => WHOLE.test(value) && Number(value) >= minimum, message);

const imageFormSchema = z.object({
  id: z.string().optional(),
  url: z
    .string()
    .trim()
    .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), 'Use a full https image URL'),
  publicId: z.string().optional(),
  altText: z.string().trim().max(160, 'Keep alt text under 160 characters').default(''),
  isPrimary: z.boolean().default(false),
});

const variantFormSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().max(64).default(''),
  title: z.string().trim().default('Standard'),
  priceModifierRupees: z.string().trim().default('0'),
  stockQuantity: z.string().trim().default('0'),
  attributes: z.string().trim().default(''),
});

const tierFormSchema = z.object({
  minQuantity: z.string().trim().default('1'),
  maxQuantity: z.string().trim().default(''),
  unitPriceRupees: z.string().trim().default('0'),
});

export const productEditorSchema = z.object({
  // 1. Product Name
  title: z.string().trim().min(3, 'Product name must be at least 3 characters').max(160, 'Keep title under 160 characters'),
  // 2. Product Description
  description: z.string().trim().min(10, 'Provide a description (at least 10 characters)').max(4000),
  // 3. SKU (Auto Generated)
  sku: z.string().trim().max(64),
  // 4. Total Price
  totalPriceRupees: rupeesField('Total price', false),
  // 5. Discount (% or 0)
  discountPercent: z.string().trim().refine(
    (v) => v === '' || (WHOLE.test(v) && Number(v) >= 0 && Number(v) <= 99),
    'Discount must be between 0% and 99%',
  ).default('0'),
  // 6. Discounted Price (Auto Generated)
  retailPriceRupees: rupeesField('Discounted selling price', false),
  // 7. Stock Present
  stockQuantity: wholeField('Stock present', 0, 'Enter available stock as a whole number (0 or more)'),
  // Category Selection
  categoryId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Select a category'),
  brand: z.string().trim().max(80).optional(),
  isActive: z.boolean().default(true),
  images: z.array(imageFormSchema).max(5, 'Maximum 5 images allowed').default([]),
  // Compatibility fields
  moq: z.string().default('1'),
  orderMultiple: z.string().default('1'),
  isWholesaleActive: z.boolean().default(false),
  variants: z.array(variantFormSchema).default([]),
  pricingTiers: z.array(tierFormSchema).default([]),
});

export type ProductEditorValues = z.infer<typeof productEditorSchema>;
export type ImageFormValues = ProductEditorValues['images'][number];

export function emptyProductForm(): ProductEditorValues {
  return {
    title: '',
    description: '',
    sku: '',
    brand: '',
    categoryId: '',
    totalPriceRupees: '',
    discountPercent: '0',
    retailPriceRupees: '',
    stockQuantity: '10',
    moq: '1',
    orderMultiple: '1',
    isWholesaleActive: false,
    isActive: true,
    variants: [
      {
        sku: '',
        title: 'Standard',
        priceModifierRupees: '0',
        stockQuantity: '10',
        attributes: '',
      },
    ],
    images: [],
    pricingTiers: [],
  };
}

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
  const sellingRupees = paiseToRupeeInput(product.retailPricePaise);
  const totalRupees = product.totalPricePaise ? paiseToRupeeInput(product.totalPricePaise) : sellingRupees;
  const discountPercentStr =
    product.discountPercent !== undefined && product.discountPercent !== null
      ? String(product.discountPercent)
      : '0';
  const stock = product.variants?.[0]?.stockQuantity ?? 0;
  const variantId = (product.variants?.[0] as any)?._id
    ? String((product.variants?.[0] as any)._id)
    : product.variants?.[0]?.id;

  return {
    title: product.title || '',
    description: product.description || '',
    sku: product.sku || '',
    brand: product.brand ?? '',
    categoryId: (product as any).categoryId ? String((product as any).categoryId) : '',
    totalPriceRupees: totalRupees,
    discountPercent: discountPercentStr,
    retailPriceRupees: sellingRupees,
    stockQuantity: String(stock),
    moq: '1',
    orderMultiple: '1',
    isWholesaleActive: false,
    isActive: product.isActive ?? true,
    variants: [
      {
        id: variantId ? String(variantId) : undefined,
        sku: product.sku || '',
        title: 'Standard',
        priceModifierRupees: '0',
        stockQuantity: String(stock),
        attributes: '',
      },
    ],
    images: (product.images || []).map((img) => ({
      id: (img as any)._id ? String((img as any)._id) : (img.id ? String(img.id) : undefined),
      url: img.url,
      publicId: img.publicId ?? undefined,
      altText: img.altText ?? '',
      isPrimary: img.isPrimary,
    })),
    pricingTiers: [],
  };
}

export function toProductPayload(
  values: ProductEditorValues,
  _tiers: readonly PriceTier[] = [],
  id?: string,
): ProductWritePayload {
  const finalTotalRupees = values.totalPriceRupees?.trim() || values.retailPriceRupees?.trim();
  const totalPricePaise = rupeesToPaise(finalTotalRupees);
  const discountPercentNum = Math.min(99, Math.max(0, parseInt(values.discountPercent, 10) || 0));
  const retailPricePaise = rupeesToPaise(values.retailPriceRupees);
  const stockNum = Math.max(0, parseInt(values.stockQuantity, 10) || 0);

  const rawSku = values.sku?.trim() || '';
  const guaranteedSku = (
    rawSku ||
    generateSkuFromTitle(values.title) ||
    `HAAT-${Math.floor(100000 + Math.random() * 900000)}`
  ).toUpperCase();

  const existingVariantId = values.variants?.[0]?.id;
  const variants = [
    {
      ...(existingVariantId && /^[0-9a-fA-F]{24}$/.test(existingVariantId) ? { id: existingVariantId } : {}),
      sku: guaranteedSku,
      title: 'Standard',
      priceModifierPaise: 0,
      stockQuantity: stockNum,
      attributes: {},
    },
  ];

  const images = (values.images || [])
    .filter((img) => img.url && img.url.trim() !== '')
    .map((img, index) => ({
      ...(img.id && /^[0-9a-fA-F]{24}$/.test(img.id) ? { id: img.id } : {}),
      url: img.url.trim(),
      publicId: img.publicId,
      altText: img.altText?.trim() || undefined,
      displayOrder: index,
      isPrimary: img.isPrimary ?? index === 0,
    }));

  return {
    ...(id && /^[0-9a-fA-F]{24}$/.test(id) ? { id } : {}),
    title: values.title.trim(),
    description: values.description.trim(),
    sku: guaranteedSku,
    brand: values.brand?.trim() || undefined,
    categoryId: values.categoryId,
    totalPricePaise,
    discountPercent: discountPercentNum,
    retailPricePaise,
    moq: 1,
    orderMultiple: 1,
    isWholesaleActive: false,
    isActive: values.isActive ?? true,
    variants,
    images,
    pricingTiers: [],
  };
}

export function parseTierRows(): { tiers: PriceTier[]; complete: boolean } {
  return { tiers: [], complete: true };
}

export function orderableQuantities(): number[] {
  return [1];
}
