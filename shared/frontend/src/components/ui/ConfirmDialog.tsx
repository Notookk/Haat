import { useEffect, useRef } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Keep it',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="scrim fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-[440px] animate-rise rounded-xl border border-line bg-surface p-6 shadow-sheet"
      >
        <h2 id="confirm-title" className="text-title text-ink-900">
          {title}
        </h2>
        <p id="confirm-description" className="mt-2 text-body text-ink-600">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
