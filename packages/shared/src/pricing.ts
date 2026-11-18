import { assertPaise } from './money';

/**
 * Quantity pricing tiers (PRD §5.3).
 * Tiers are half-open `[minQuantity, maxQuantity]` ranges; `maxQuantity: null` means infinity.
 */

export interface PriceTier {
  minQuantity: number;
  maxQuantity: number | null;
  unitPricePaise: number;
}

export function validateTiers(tiers: readonly PriceTier[]): string[] {
  const errors: string[] = [];
  if (tiers.length === 0) return errors;

  let previousMax: number | null = 0;
  tiers.forEach((tier, index) => {
    const label = `Tier ${index + 1}`;
    if (!Number.isInteger(tier.minQuantity) || tier.minQuantity < 1) {
      errors.push(`${label}: minQuantity must be a positive integer`);
    }
    if (tier.maxQuantity !== null) {
      if (!Number.isInteger(tier.maxQuantity) || tier.maxQuantity < tier.minQuantity) {
        errors.push(`${label}: maxQuantity must be >= minQuantity`);
      }
    } else if (index !== tiers.length - 1) {
      errors.push(`${label}: only the last tier may be open-ended (maxQuantity = null)`);
    }
    if (previousMax !== null && tier.minQuantity <= previousMax) {
      errors.push(`${label}: ranges overlap or are out of order`);
    }
    previousMax = tier.maxQuantity;
    if (!Number.isSafeInteger(tier.unitPricePaise) || tier.unitPricePaise <= 0) {
      errors.push(`${label}: unitPricePaise must be a positive integer`);
    }
  });

  return errors;
}

/** Returns the unit price for a quantity, falling back to the base retail price. */
export function resolveUnitPricePaise(
  basePricePaise: number,
  tiers: readonly PriceTier[],
  quantity: number,
): number {
  assertPaise(basePricePaise, 'basePricePaise');
  const match = tiers.find(
    (tier) => quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity),
  );
  return match ? match.unitPricePaise : basePricePaise;
}

/** The tier a quantity sits in, or null when it falls back to retail. */
export function activeTier(
  tiers: readonly PriceTier[],
  quantity: number,
): PriceTier | null {
  return (
    tiers.find(
      (tier) => quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity),
    ) ?? null
  );
}

export interface QuantityPolicy {
  moq: number;
  orderMultiple: number;
}

/** Returns a human-readable violation, or null when the quantity is orderable. */
export function quantityViolation(quantity: number, policy: QuantityPolicy): string | null {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return 'Quantity must be a whole number of at least 1';
  }
  if (quantity < policy.moq) {
    return `Minimum order quantity is ${policy.moq}`;
  }
  if (policy.orderMultiple > 1 && quantity % policy.orderMultiple !== 0) {
    return `Quantity must be a multiple of ${policy.orderMultiple}`;
  }
  return null;
}
