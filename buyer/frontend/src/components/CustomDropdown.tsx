import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

export interface CustomDropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface CustomDropdownProps {
  label: string; // Header inside popover menu (e.g., "ALL CATEGORIES", "SORT BY")
  value: string;
  options: CustomDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  variant?: 'brand' | 'outline';
  className?: string;
  menuWidth?: string;
  menuAlign?: 'left' | 'right';
}

export function CustomDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select option',
  icon,
  variant = 'outline',
  className = '',
  menuWidth = 'w-60',
  menuAlign = 'left',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          variant === 'brand'
            ? `inline-flex h-10 items-center gap-2 rounded-xl bg-[#16135c] px-4 text-sm font-semibold text-white shadow-xs transition-all cursor-pointer ${
                isOpen ? 'ring-2 ring-[#16135c] ring-offset-2' : 'hover:bg-[#12104b]'
              }`
            : `inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                isOpen
                  ? 'border-[#16135c] text-[#16135c] ring-2 ring-[#16135c] ring-offset-2'
                  : 'border-[#dfe2e1] text-[#21313c] hover:border-[#16135c] hover:bg-[#f8f9fa]'
              }`
        }
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <span className="truncate max-w-[160px]">{displayLabel}</span>
        {isOpen ? (
          <ChevronUp size={14} className={variant === 'brand' ? 'text-white' : 'text-[#16135c]'} />
        ) : (
          <ChevronDown size={14} className={variant === 'brand' ? 'text-white/80' : 'text-[#889397]'} />
        )}
      </button>

      {/* Custom Build Popover Dropdown Menu */}
      {isOpen ? (
        <div
          role="listbox"
          className={`absolute ${
            menuAlign === 'right' ? 'right-0' : 'left-0'
          } top-full mt-2 ${menuWidth} rounded-2xl border border-gray-100 bg-white p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] z-50 animate-in fade-in-50 zoom-in-95 duration-100`}
        >
          {/* Header Title in Uppercase */}
          <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#889397]">
            {label}
          </div>

          {/* Options List */}
          <div className="mt-0.5 space-y-0.5 max-h-64 overflow-y-auto admin-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-sm transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#f0f4ff] font-semibold text-[#16135c]'
                      : 'font-medium text-[#21313c] hover:bg-[#f0f4ff] hover:text-[#16135c]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
                    <span className="truncate">{option.label}</span>
                  </div>
                  <ChevronRight
                    size={14}
                    className={`shrink-0 transition-colors ${
                      isSelected ? 'text-[#16135c]/70' : 'text-gray-300 group-hover:text-[#16135c]'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
