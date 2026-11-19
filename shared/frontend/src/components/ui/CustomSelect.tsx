import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useId,
  forwardRef,
  Children,
  isValidElement,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { FieldShell } from './TextField';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  icon?: ReactNode;
  badge?: string;
}

export interface CustomSelectProps {
  id?: string;
  name?: string;
  'aria-label'?: string;
  label?: ReactNode;
  hint?: string;
  error?: string;
  optional?: boolean;
  options?: SelectOption[];
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  clearable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  align?: 'left' | 'right';
  noFieldShell?: boolean;
}

export const CustomSelect = forwardRef<HTMLDivElement, CustomSelectProps>(function CustomSelect(
  {
    id,
    name,
    'aria-label': ariaLabel,
    label,
    hint,
    error,
    optional,
    options,
    children,
    value,
    defaultValue,
    onChange,
    onBlur,
    placeholder = 'Select option...',
    disabled = false,
    className,
    triggerClassName,
    menuClassName,
    size = 'md',
    icon,
    clearable = false,
    searchable,
    searchPlaceholder = 'Search...',
    align = 'left',
    noFieldShell = false,
  },
  forwardedRef,
) {
  const generatedId = useId();
  const selectId = id ?? name ?? generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Controlled vs Uncontrolled value
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const selectedValue = isControlled ? value : internalValue;

  // Parse options either from options prop or <option> children
  const parsedOptions = useMemo<SelectOption[]>(() => {
    if (options && options.length > 0) return options;
    if (!children) return [];

    const items: SelectOption[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child)) {
        const props = child.props as {
          value?: string | number;
          disabled?: boolean;
          children?: ReactNode;
        };
        items.push({
          value: String(props.value ?? ''),
          label:
            typeof props.children === 'string'
              ? props.children
              : String(props.children ?? props.value ?? ''),
          disabled: Boolean(props.disabled),
        });
      }
    });
    return items;
  }, [options, children]);

  // Find currently selected option object
  const currentOption = useMemo(
    () => parsedOptions.find((opt) => opt.value === selectedValue),
    [parsedOptions, selectedValue],
  );

  // Auto-enable search if there are more than 8 options and searchable is not explicitly false
  const isSearchable = searchable ?? parsedOptions.length > 8;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return parsedOptions;
    const q = searchQuery.toLowerCase().trim();
    return parsedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)),
    );
  }, [parsedOptions, searchQuery]);

  // Click outside listener to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        onBlur?.();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, onBlur]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && isSearchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isSearchable]);

  const handleSelect = (val: string) => {
    if (!isControlled) {
      setInternalValue(val);
    }
    onChange?.(val);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelect('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
        return next;
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const opt = filteredOptions[highlightedIndex];
        if (!opt.disabled) {
          handleSelect(opt.value);
        }
      }
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      const item = items[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Size styling
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-caption',
    md: 'min-h-[40px] px-3 py-2 text-body',
    lg: 'min-h-[46px] px-3.5 py-2.5 text-subtitle',
  }[size];

  const content = (
    <div
      ref={containerRef}
      className={cn('relative w-full text-left select-none', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for native form serialization */}
      {name && <input type="hidden" name={name} value={selectedValue} />}

      {/* Custom Dropdown Trigger Button */}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setHighlightedIndex(-1);
          }
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-md border bg-surface transition-all duration-150 cursor-pointer text-left',
          sizeClasses,
          error
            ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
            : isOpen
              ? 'border-brand-500 ring-2 ring-brand-500/15'
              : 'border-line-strong hover:border-ink-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
          disabled && 'opacity-60 cursor-not-allowed bg-surface-sunken hover:border-line-strong',
          triggerClassName,
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {icon && <span className="text-ink-400 shrink-0">{icon}</span>}
          {currentOption?.icon && <span className="shrink-0">{currentOption.icon}</span>}
          {currentOption ? (
            <span className="truncate font-semibold text-ink-900">
              {currentOption.label}
            </span>
          ) : (
            <span className="truncate text-ink-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
          {clearable && selectedValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded text-ink-400 hover:text-ink-700 hover:bg-surface-sunken cursor-pointer"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-ink-400 transition-transform duration-200 shrink-0',
              isOpen && 'rotate-180 text-brand-600',
            )}
          />
        </div>
      </button>

      {/* Custom Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-1.5 w-full min-w-[200px] z-50 rounded-xl border border-line bg-surface shadow-modal overflow-hidden animate-in fade-in zoom-in-95 duration-100',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {/* Optional In-Menu Search Input */}
          {isSearchable && (
            <div className="p-2 border-b border-line bg-surface-sunken/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-7 text-caption rounded-lg border border-line bg-surface text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setIsOpen(false);
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={
              highlightedIndex >= 0 ? `${selectId}-opt-${highlightedIndex}` : undefined
            }
            className="max-h-60 overflow-y-auto py-1 divide-y divide-line/30 focus:outline-none"
          >
            {filteredOptions.length === 0 ? (
              <li className="p-3 text-center text-caption text-ink-400">
                No matching options found
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === selectedValue;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt.value}
                    id={`${selectId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        handleSelect(opt.value);
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2 text-label cursor-pointer transition-colors',
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed bg-surface-sunken/40'
                        : isSelected
                          ? 'bg-brand-50/90 text-brand-900 font-bold'
                          : isHighlighted
                            ? 'bg-surface-sunken text-ink-900'
                            : 'text-ink-800 hover:bg-surface-sunken hover:text-ink-900',
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <span className="block truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="block text-micro font-normal text-ink-400 truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {opt.badge && (
                        <span className="text-micro font-bold px-1.5 py-0.5 rounded-full bg-surface-sunken border border-line text-ink-600">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-4 w-4 text-brand-600 shrink-0" />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );

  if (label && !noFieldShell) {
    return (
      <FieldShell
        label={label}
        htmlFor={selectId}
        hint={hint}
        error={error}
        optional={optional}
        className={className}
      >
        <div ref={forwardedRef}>{content}</div>
      </FieldShell>
    );
  }

  return <div ref={forwardedRef}>{content}</div>;
});
