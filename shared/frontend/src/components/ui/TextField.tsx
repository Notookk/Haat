import { cn } from '../../lib/cn';
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { CustomSelect, type SelectOption } from './CustomSelect';

interface FieldShellProps {
  label: ReactNode;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ label, htmlFor, hint, error, optional, children, className }: FieldShellProps) {
  let renderedLabel: ReactNode = label;
  if (typeof label === 'string' && label.includes('*')) {
    const textWithoutStar = label.replace(/\s*\*+$/, '');
    renderedLabel = (
      <>
        {textWithoutStar} <span className="text-red-500 font-bold">*</span>
      </>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <label className="field-label" htmlFor={htmlFor}>
        {renderedLabel}
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
  'w-full rounded-sm border bg-surface px-3 py-2 text-body text-ink-900 placeholder:text-xs placeholder:text-ink-400 transition-colors duration-120 ease-out';
const CONTROL_OK = 'border-line-strong hover:border-ink-300 focus:border-brand-500';
const CONTROL_BAD = 'border-danger-fg bg-danger-bg';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: string;
  error?: string;
  optional?: boolean;
  prefix?: string;
  suffix?: ReactNode;
  showPasswordToggle?: boolean;
  mono?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, prefix, suffix, showPasswordToggle, mono, className, id, type, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? rest.name ?? generated;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const shouldShowToggle = showPasswordToggle ?? isPassword;
  const resolvedType = shouldShowToggle ? (revealed ? 'text' : 'password') : type;

  const resolvedSuffix = suffix ?? (shouldShowToggle ? (
    <button
      type="button"
      onClick={() => setRevealed((prev) => !prev)}
      className="text-ink-400 hover:text-ink-700 transition-colors p-1 -mr-1 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
      aria-label={revealed ? 'Hide password' : 'Show password'}
      title={revealed ? 'Hide password' : 'Show password'}
    >
      {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  ) : null);

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
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          className={cn(
            CONTROL_CLASS,
            error ? CONTROL_BAD : CONTROL_OK,
            prefix && 'pl-9',
            resolvedSuffix && 'pr-10',
            mono && 'font-mono tracking-[0.01em]',
            className,
          )}
          {...rest}
        />
        {resolvedSuffix ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {resolvedSuffix}
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
});

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
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
        className={cn(CONTROL_CLASS, error ? CONTROL_BAD : CONTROL_OK, 'min-h-[96px] resize-y', className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: ReactNode;
  hint?: string;
  error?: string;
  optional?: boolean;
  children?: ReactNode;
  options?: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
}

export const SelectField = forwardRef<HTMLDivElement, SelectFieldProps>(function SelectField(
  { label, hint, error, optional, className, id, children, options, value, defaultValue, onChange, ...rest },
  ref,
) {
  return (
    <CustomSelect
      ref={ref}
      id={id}
      name={rest.name}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
      value={value !== undefined ? String(value) : undefined}
      defaultValue={defaultValue !== undefined ? String(defaultValue) : undefined}
      onChange={(val) => {
        if (onChange) {
          const syntheticEvent = {
            target: { value: val, name: rest.name || '' },
            currentTarget: { value: val, name: rest.name || '' },
          } as unknown as React.ChangeEvent<HTMLSelectElement>;
          onChange(syntheticEvent);
        }
      }}
      options={options}
    >
      {children}
    </CustomSelect>
  );
});
