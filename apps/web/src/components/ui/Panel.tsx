import clsx from 'clsx';
import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
  /** Only floating layers get elevation (§3.5). */
  floating?: boolean;
}

export function Panel({ children, className, as = 'section', floating = false }: PanelProps) {
  const Tag = as;
  return (
    <Tag
      className={clsx(
        'rounded-lg border border-line bg-surface',
        floating && 'shadow-float',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface NoticeProps {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

const NOTICE_TONES = {
  info: 'bg-info-bg text-info-fg border-brand-100',
  success: 'bg-success-bg text-success-fg border-success-fg',
  warning: 'bg-warning-bg text-warning-fg border-warning-fg',
  danger: 'bg-danger-bg text-danger-fg border-danger-fg',
} as const;

export function Notice({ tone = 'info', title, children, action, className }: NoticeProps) {
  return (
    <div className={clsx('flex flex-wrap items-start gap-3 rounded-md border px-4 py-3', NOTICE_TONES[tone], className)}>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-label">{title}</p> : null}
        <p className="text-caption">{children}</p>
      </div>
      {action}
    </div>
  );
}
