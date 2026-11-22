/**
 * Money utilities.
 *
 * RULE (PRD §15.5.2): every monetary value is a non-negative integer number of paise.
 * Never pass a float into the database. Never compute money with `toFixed` arithmetic.
 */

export const PAISE_PER_RUPEE = 100;

export function isPaise(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function assertPaise(value: number, field = 'amount'): number {
  if (!isPaise(value)) {
    throw new Error(`${field} must be a non-negative integer number of paise, received: ${String(value)}`);
  }
  return value;
}

/**
 * Parses a human-entered rupee value ("499", "499.5", "1,499.50") into paise.
 * String-first to avoid binary floating point drift.
 */
export function rupeesToPaise(input: string | number): number {
  const raw = typeof input === 'number' ? input.toString() : input.trim().replace(/,/g, '');
  if (raw === '' || !/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new Error(`Invalid rupee amount: ${String(input)}`);
  }
  const [whole = '0', fraction = ''] = raw.split('.');
  const paise = Number(whole) * PAISE_PER_RUPEE + Number(fraction.padEnd(2, '0'));
  return assertPaise(paise, 'rupee amount');
}

export function paiseToRupees(paise: number): number {
  return assertPaise(paise) / PAISE_PER_RUPEE;
}

export interface FormatPaiseOptions {
  /** Show the ₹ symbol. Default true. */
  symbol?: boolean;
  /** Always show two decimals (invoices, totals). Default false for browse surfaces. */
  decimals?: boolean;
}

/** Indian digit grouping: 15000000 paise -> "₹1,50,000". Displays paise when not whole rupees or decimals: true. */
export function formatPaise(paise: number, options: FormatPaiseOptions = {}): string {
  const { symbol = true, decimals = false } = options;
  const rupees = paiseToRupees(paise);
  const hasPaise = decimals || Math.abs(Math.round(paise)) % 100 !== 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(rupees);
  return symbol ? `₹${formatted}` : formatted;
}

export function sumPaise(values: readonly number[]): number {
  return values.reduce((total, value) => assertPaise(total + assertPaise(value), 'sum'), 0);
}

export function mulPaise(unitPricePaise: number, quantity: number): number {
  assertPaise(unitPricePaise, 'unitPricePaise');
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error(`quantity must be a positive integer, received: ${String(quantity)}`);
  }
  const total = unitPricePaise * quantity;
  if (!Number.isSafeInteger(total)) {
    throw new Error('Money overflow: line total exceeds safe integer range');
  }
  return total;
}
