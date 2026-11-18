import { describe, expect, it } from 'vitest';
import {
  activeTier,
  quantityViolation,
  resolveUnitPricePaise,
  validateTiers,
  type PriceTier,
} from '../pricing';

const tiers: PriceTier[] = [
  { minQuantity: 10, maxQuantity: 49, unitPricePaise: 45000 },
  { minQuantity: 50, maxQuantity: 99, unitPricePaise: 40000 },
  { minQuantity: 100, maxQuantity: null, unitPricePaise: 35000 },
];

describe('resolveUnitPricePaise', () => {
  it('falls back to retail below the first tier', () => {
    expect(resolveUnitPricePaise(50000, tiers, 1)).toBe(50000);
    expect(resolveUnitPricePaise(50000, tiers, 9)).toBe(50000);
  });

  it('applies the tier at its lower boundary', () => {
    expect(resolveUnitPricePaise(50000, tiers, 10)).toBe(45000);
    expect(resolveUnitPricePaise(50000, tiers, 50)).toBe(40000);
    expect(resolveUnitPricePaise(50000, tiers, 100)).toBe(35000);
  });

  it('applies the tier at its upper boundary', () => {
    expect(resolveUnitPricePaise(50000, tiers, 49)).toBe(45000);
    expect(resolveUnitPricePaise(50000, tiers, 99)).toBe(40000);
  });

  it('keeps the open-ended tier open', () => {
    expect(resolveUnitPricePaise(50000, tiers, 5000)).toBe(35000);
  });

  it('reports the active tier', () => {
    expect(activeTier(tiers, 75)?.unitPricePaise).toBe(40000);
    expect(activeTier(tiers, 5)).toBeNull();
  });
});

describe('validateTiers', () => {
  it('accepts a well-formed ladder', () => {
    expect(validateTiers(tiers)).toEqual([]);
  });

  it('rejects overlapping ranges', () => {
    const errors = validateTiers([
      { minQuantity: 1, maxQuantity: 10, unitPricePaise: 100 },
      { minQuantity: 10, maxQuantity: 20, unitPricePaise: 90 },
    ]);
    expect(errors.some((e) => e.includes('overlap'))).toBe(true);
  });

  it('rejects an open-ended tier that is not last', () => {
    const errors = validateTiers([
      { minQuantity: 1, maxQuantity: null, unitPricePaise: 100 },
      { minQuantity: 20, maxQuantity: 30, unitPricePaise: 90 },
    ]);
    expect(errors.some((e) => e.includes('open-ended'))).toBe(true);
  });
});

describe('quantityViolation', () => {
  const policy = { moq: 10, orderMultiple: 5 };

  it('accepts valid quantities', () => {
    expect(quantityViolation(10, policy)).toBeNull();
    expect(quantityViolation(25, policy)).toBeNull();
  });

  it('rejects below MOQ', () => {
    expect(quantityViolation(5, policy)).toContain('Minimum order quantity');
  });

  it('rejects non-multiples', () => {
    expect(quantityViolation(12, policy)).toContain('multiple of 5');
  });

  it('rejects invalid input', () => {
    expect(quantityViolation(0, policy)).not.toBeNull();
    expect(quantityViolation(10.5, policy)).not.toBeNull();
  });
});
