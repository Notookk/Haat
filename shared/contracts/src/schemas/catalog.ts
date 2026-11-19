import { z } from 'zod';
import { validateTiers, type PriceTier } from '../pricing';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const priceTierSchema = z.object({
  minQuantity: z.number().int().positive(),
  maxQuantity: z.number().int().positive().nullable(),
  unitPricePaise: z.number().int().positive('Tier price must be greater than zero'),
});

export const variantSchema = z.object({
  /** Present when editing an existing variant — preserved so carts keep pointing at it. */
  id: objectIdSchema.optional(),
  sku: z.string().trim().min(3, 'SKU must be at least 3 characters').max(64),
  title: z.string().trim().min(1, 'Variant title is required').max(120),
  priceModifierPaise: z.number().int().min(0).default(0),
  stockQuantity: z.number().int().min(0).default(0),
  attributes: z.record(z.string()).default({}),
});

export const productImageSchema = z.object({
  id: objectIdSchema.optional(),
  url: z.string().url('Image URL is required'),
  publicId: z.string().min(1).optional(),
  altText: z.string().trim().max(160).optional(),
  displayOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

const productBase = {
  id: objectIdSchema.optional(),
  title: z.string().trim().min(3, 'Product title is required').max(160),
  description: z.string().trim().min(10, 'Describe the product').max(4000),
  sku: z.string().trim().min(3, 'SKU must be at least 3 characters').max(64),
  brand: z.string().trim().max(80).optional(),
  categoryId: objectIdSchema,
  totalPricePaise: z.number().int().positive('Total price must be greater than zero').optional(),
  discountPercent: z.number().int().min(0).max(99).default(0).optional(),
  retailPricePaise: z.number().int().positive('Retail price must be greater than zero'),
  moq: z.number().int().min(1).default(1),
  orderMultiple: z.number().int().min(1).default(1),
  isWholesaleActive: z.boolean().default(false),
  variants: z.array(variantSchema).min(1, 'Add at least one variant'),
  images: z.array(productImageSchema).max(10).default([]),
  pricingTiers: z.array(priceTierSchema).max(20).default([]),
};

function refineTiers(value: { pricingTiers: PriceTier[] }, ctx: z.RefinementCtx): void {
  for (const message of validateTiers(value.pricingTiers)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pricingTiers'], message });
  }
}

function refineVariantSkus(variants: Array<{ sku: string }> | undefined, ctx: z.RefinementCtx): void {
  if (!variants) return;
  const seen = new Set<string>();
  variants.forEach((variant, index) => {
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
}

export const createProductSchema = z.object(productBase).superRefine((value, ctx) => {
  refineTiers(value, ctx);
  refineVariantSkus(value.variants, ctx);
});

export const updateProductSchema = z
  .object(productBase)
  .partial()
  .extend({
    /** Lets a seller restore an archived listing without deleting and re-creating it. */
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.pricingTiers) refineTiers({ pricingTiers: value.pricingTiers }, ctx);
    refineVariantSkus(value.variants, ctx);
  });

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  seller: z.string().trim().max(120).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).default('newest'),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens'),
  description: z.string().trim().max(400).optional(),
  imageUrl: z.string().trim().nullable().optional(),
  imagePublicId: z.string().trim().nullable().optional(),
  parentId: objectIdSchema.nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
