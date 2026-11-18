import clsx from 'clsx';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ label, htmlFor, hint, error, optional, children, className }: FieldShellProps) {
  return (
    <div className={clsx('w-full', className)}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {optional ? <span className="ml-1 font-normal text-ink-400">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

const CONTROL_CLASS =
  'w-full rounded-sm border bg-surface px-3 py-2 text-body text-ink-900 placeholder:text-ink-300 transition-colors duration-120 ease-out';
const CONTROL_OK = 'border-line-strong hover:border-ink-300 focus:border-brand-500';
const CONTROL_BAD = 'border-danger-fg bg-danger-bg';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  prefix?: string;
  mono?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, prefix, mono, className, id, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? rest.name ?? generated;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} optional={optional}>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-caption text-ink-500">
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={clsx(
            CONTROL_CLASS,
            error ? CONTROL_BAD : CONTROL_OK,
            prefix && 'pl-9',
            mono && 'font-mono tracking-[0.01em]',
            className,
          )}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, hint, error, optional, className, id, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? rest.name ?? generated;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} optional={optional}>
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={clsx(CONTROL_CLASS, error ? CONTROL_BAD : CONTROL_OK, 'min-h-[96px] resize-y', className)}
        {...rest}
      />
    </FieldShell>
  );
});

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, optional, className, id, children, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? rest.name ?? generated;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} optional={optional}>
      <select
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={clsx(CONTROL_CLASS, error ? CONTROL_BAD : CONTROL_OK, 'appearance-none pr-8', className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});
