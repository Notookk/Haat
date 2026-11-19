import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Tailored Tailwind Merge instance that understands HAAT's design tokens
 * (e.g. text-caption, text-label, text-micro as font-sizes, not colors).
 */
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-display-xl',
        'text-display-lg',
        'text-display-md',
        'text-title',
        'text-subtitle',
        'text-body',
        'text-label',
        'text-caption',
        'text-micro',
        'text-numeric-lg',
        'text-numeric',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return customTwMerge(clsx(inputs));
}
