/**
 * HAAT Design System — Motion System & Physics Tokens (Design.md §5)
 */

export const SPRINGS = {
  /** Press release, checkbox, chip select */
  micro: { type: 'spring' as const, bounce: 0, duration: 0.2 },
  /** Panel show/hide, accordion, tab indicator */
  standard: { type: 'spring' as const, bounce: 0, duration: 0.4 },
  /** Drawers, sheets, chat dock */
  sheet: { type: 'spring' as const, bounce: 0.18, duration: 0.3 },
  /** Post-flick snap (calendar, carousel, gallery) */
  momentum: { type: 'spring' as const, bounce: 0.2, duration: 0.4 },
  /** List reorder, cart item removal collapse */
  reorder: { type: 'spring' as const, bounce: 0, duration: 0.35 },
} as const;

export const DURATIONS = {
  press: '100ms ease-out',
  hover: '120ms ease-out',
  fade: '180ms ease',
  materialize: '240ms cubic-bezier(0.32, 0.72, 0, 1)',
  toast: 260,
} as const;

// Gesture physics constants (Design.md §5.4)
export const DECELERATION = 0.998;
export const DECELERATION_SNAPPY = 0.99;
export const RUBBERBAND_CONSTANT = 0.55;
export const HYSTERESIS_PX = 10;
export const TAP_SLOP_PX = 10;

// Apple's exponential projection, not v²/2a
export const project = (v: number, d = DECELERATION): number => ((v / 1000) * d) / (1 - d);

// Progressive resistance past a boundary
export const rubberband = (overshoot: number, dim: number, c = RUBBERBAND_CONSTANT): number =>
  (overshoot * dim * c) / (dim + c * Math.abs(overshoot));
