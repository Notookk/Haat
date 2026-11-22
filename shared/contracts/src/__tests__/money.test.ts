import { describe, expect, it } from 'vitest';
import { formatPaise, mulPaise, rupeesToPaise, sumPaise } from '../money';

describe('rupeesToPaise', () => {
  it('converts whole rupees', () => {
    expect(rupeesToPaise('499')).toBe(49900);
  });

  it('converts paise with two decimals without float drift', () => {
    expect(rupeesToPaise('499.50')).toBe(49950);
    expect(rupeesToPaise('0.07')).toBe(7);
    expect(rupeesToPaise(1.1)).toBe(110);
  });

  it('accepts Indian digit grouping', () => {
    expect(rupeesToPaise('1,50,000.25')).toBe(15000025);
  });

  it('rejects malformed amounts', () => {
    expect(() => rupeesToPaise('12.345')).toThrow();
    expect(() => rupeesToPaise('abc')).toThrow();
    expect(() => rupeesToPaise('-5')).toThrow();
  });
});

describe('formatPaise', () => {
  it('uses Indian grouping', () => {
    expect(formatPaise(15000000)).toBe('₹1,50,000');
  });

  it('can force decimals for invoices', () => {
    expect(formatPaise(49950, { decimals: true })).toBe('₹499.50');
  });

  it('formats fractional paise amounts with 2 decimals automatically', () => {
    expect(formatPaise(4250)).toBe('₹42.50');
  });
});

describe('sumPaise and mulPaise', () => {
  it('sums integers', () => {
    expect(sumPaise([100, 250, 5])).toBe(355);
  });

  it('multiplies safely', () => {
    expect(mulPaise(49950, 3)).toBe(149850);
  });

  it('rejects non-integer unit prices', () => {
    expect(() => mulPaise(499.5, 2)).toThrow();
  });
});
