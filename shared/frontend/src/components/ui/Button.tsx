import { cn } from '../../lib/cn';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  block?: boolean;
  icon?: ReactNode;
  asChild?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 !text-white border border-brand-600 hover:bg-brand-700 hover:border-brand-700 shadow-sm active:bg-brand-800 focus-visible:ring-brand-400',
  secondary:
    'bg-surface !text-ink-900 border border-line-strong hover:bg-surface-sunken hover:border-ink-400 shadow-sm active:bg-ink-100 focus-visible:ring-ink-300',
  ghost:
    'bg-transparent !text-ink-700 border border-transparent hover:bg-surface-sunken hover:!text-ink-900 active:bg-ink-100 focus-visible:ring-ink-300',
  danger:
    'bg-danger-fg !text-white border border-danger-fg hover:brightness-95 shadow-sm active:brightness-90 focus-visible:ring-danger-fg',
  outline:
    'bg-transparent !text-brand-700 border border-brand-300 hover:bg-brand-50 active:bg-brand-100 focus-visible:ring-brand-400',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-caption font-semibold rounded-sm',
  md: 'h-10 px-4 text-label font-semibold rounded-md',
  lg: 'h-12 px-6 text-label font-semibold rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    block = false,
    icon,
    asChild = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const commonClasses = cn(
    'inline-flex select-none items-center justify-center gap-2 font-sans cursor-pointer',
    'transition-[background-color,border-color,box-shadow,transform] duration-120 ease-out',
    'active:translate-y-[0.5px] disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    SIZES[size],
    VARIANTS[variant],
    block && 'w-full',
    className,
  );

  if (asChild) {
    return (
      <Slot ref={ref as any} className={commonClasses} {...rest}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={commonClasses}
      {...rest}
    >
      {icon}
      {loading ? (loadingLabel ?? 'Working…') : children}
    </button>
  );
});
