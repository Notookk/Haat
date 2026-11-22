export { formatPaise, rupeesToPaise, paiseToRupees, resolveUnitPricePaise } from '@haat/shared-contracts';

/** Prices on browse surfaces: shows 2 decimals if paise exist, no decimals if whole rupees. */
export function money(paise: number): string {
  const hasPaise = Math.abs(Math.round(paise)) % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(paise / 100);
}

/** Prices in tables and totals: two decimals. */
export function moneyExact(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function quantityRange(min: number, max: number | null): string {
  return max === null ? `${min}+` : `${min}–${max}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
