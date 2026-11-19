import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden="true" />;
}

/** Loading state that reproduces the final geometry — never a full-screen spinner (§8). */
export function SkeletonGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-line bg-surface">
          <SkeletonBlock className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-4">
            <SkeletonBlock className="h-3 w-1/3" />
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-6 shadow-card">
      <span className="grid h-10 w-10 place-items-center rounded-md border border-line bg-surface-sunken text-ink-600 shadow-sm">
        {icon ?? <Inbox size={20} strokeWidth={1.75} aria-hidden="true" />}
      </span>
      <div>
        <p className="text-subtitle font-bold text-ink-900">{title}</p>
        <p className="mt-1 max-w-prose text-caption text-ink-500 leading-relaxed">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-fg bg-danger-bg px-6 py-8">
      <span className="flex items-center gap-2 text-label text-danger-fg">
        <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
        Couldn’t load this
      </span>
      <p className="max-w-prose text-caption text-danger-fg">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="h-8 rounded-sm border border-danger-fg px-3 text-caption text-danger-fg transition-colors duration-120 hover:bg-surface"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
