import { cn } from '../../lib/cn';
import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'brand' | 'b2b' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-600 border-line',
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  b2b: 'bg-b2b-bg text-b2b-fg border-b2b-line',
  success: 'bg-success-bg text-success-fg border-success-fg',
  warning: 'bg-warning-bg text-warning-fg border-warning-fg',
  danger: 'bg-danger-bg text-danger-fg border-danger-fg',
};

interface BadgeProps {
  tone?: Tone;
  shape?: 'pill' | 'chip';
  children: ReactNode;
  className?: string;
}

/** Status pills are the only pill-shaped element in the system (§3.5). */
export function Badge({ tone = 'neutral', shape = 'pill', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border px-2 py-[2px] text-micro font-semibold uppercase tracking-[0.06em]',
        shape === 'pill' ? 'rounded-pill' : 'rounded-sm',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function toneForSellerStatus(status?: string): Tone {
  if (status === 'ACTIVE') return 'success';
  if (status === 'BLOCKED') return 'danger';
  if (status === 'PENDING_APPROVAL') return 'warning';
  return 'neutral';
}

/** Backwards-compatibility alias for cached client bundles */
export const toneForKyc = toneForSellerStatus;

export function toneForStock(state: string): Tone {
  if (state === 'SOLD_OUT' || state === 'NO_STOCK') return 'danger';
  if (state === 'LOW_STOCK') return 'warning';
  return 'success';
}
