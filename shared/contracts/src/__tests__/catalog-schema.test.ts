import { describe, expect, it } from 'vitest';
import { createProductSchema, updateProductSchema } from '../schemas/catalog';

const validProduct = {
  title: 'M10 Hex Bolt, Hot-Dip Galvanised',
  description: 'IS 1367 grade 8.8 hex bolt with a hot-dip galvanised finish for outdoor structural work.',
  sku: 'HAAT-IND-0001',
  categoryId: '650000000000000000000001',
  retailPricePaise: 1850,
  moq: 100,
  orderMultiple: 50,
  isWholesaleActive: true,
  variants: [
    {
      sku: 'HAAT-IND-0001-G88',
      title: 'Grade 8.8 · 50 mm',
      priceModifierPaise: 0,
      stockQuantity: 1200,
      attributes: { grade: '8.8' },
    },
  ],
  images: [],
  pricingTiers: [
    { minQuantity: 100, maxQuantity: 499, unitPricePaise: 1650 },
    { minQuantity: 500, maxQuantity: null, unitPricePaise: 1500 },
  ],
};

describe('createProductSchema', () => {
  it('accepts a well-formed product', () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('requires at least one variant', () => {
    const result = createProductSchema.safeParse({ ...validProduct, variants: [] });
    expect(result.success).toBe(false);
  });

  it('rejects two variants that differ only by SKU case', () => {
    const duplicate = {
      ...validProduct,
      variants: [
        validProduct.variants[0],
        { ...validProduct.variants[0], sku: 'haat-ind-0001-g88', title: 'Duplicate' },
      ],
    };
    const result = createProductSchema.safeParse(duplicate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'variants.1.sku')).toBe(true);
    }
  });

  it('rejects overlapping tier ranges', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      pricingTiers: [
        { minQuantity: 100, maxQuantity: 500, unitPricePaise: 1650 },
        { minQuantity: 500, maxQuantity: null, unitPricePaise: 1500 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an open-ended tier that is not last', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      pricingTiers: [
        { minQuantity: 100, maxQuantity: null, unitPricePaise: 1650 },
        { minQuantity: 500, maxQuantity: null, unitPricePaise: 1500 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a zero retail price and a zero tier price', () => {
    expect(createProductSchema.safeParse({ ...validProduct, retailPricePaise: 0 }).success).toBe(false);
    expect(
      createProductSchema.safeParse({
        ...validProduct,
        pricingTiers: [{ minQuantity: 100, maxQuantity: null, unitPricePaise: 0 }],
      }).success,
    ).toBe(false);
  });
});

describe('updateProductSchema', () => {
  it('accepts a partial update that only toggles visibility', () => {
    const result = updateProductSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it('rejects duplicate variant SKUs inside a sent variant array', () => {
    const result = updateProductSchema.safeParse({
      variants: [
        { sku: 'ABC-1', title: 'One', priceModifierPaise: 0, stockQuantity: 1, attributes: {} },
        { sku: 'ABC-1', title: 'Two', priceModifierPaise: 0, stockQuantity: 1, attributes: {} },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('revalidates tiers when they are sent', () => {
    const result = updateProductSchema.safeParse({
      pricingTiers: [{ minQuantity: 50, maxQuantity: 10, unitPricePaise: 1000 }],
    });
    expect(result.success).toBe(false);
  });
});
