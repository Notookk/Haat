# HAAT — UI/UX, Brand System & Motion Specification

**Companion to:** `planning/PRD.md` (requirements, architecture, engineering rules, task backlog)
**Design skill:** [`apple-design`](https://aiforui.dev/skills/apple-design) by Emil Kowalski — installed under `.agents/skills/apple-design/`
**Version:** 1.0.0 — Baseline + Audit 01
**Status:** Approved for Phase 1 implementation
**Owner:** Design engineering (human) + implementing agents (Antigravity / GSD)

---

## 0. How To Read This Document

| If you are… | Read |
|---|---|
| A frontend agent starting `TSK-P1-05` | §1 → §4 → §5 → §6, then the relevant screen in §9 |
| Building any interactive surface | §6 (motion) + §7 (interaction patterns) — non-negotiable |
| Reviewing a PR | §13 (audit) + §12 (review gate) |
| A designer extending the system | §3–§8, then append to §14 change log |
| Wondering whether to animate something | §6.5 “Do not animate” list first |

**Precedence:** `PRD.md` wins on *requirements*. This document wins on *visual, spatial and motion decisions*. If they conflict, stop and raise it (PRD §15.9).

---

## 1. Design Skill Installation & Operating Instructions

### 1.1 What was installed

```bash
npx skills@latest add emilkowalski/skills --skill apple-design
```

Result on this machine:

| Item | Value |
|---|---|
| Installed location | `.agents/skills/apple-design/SKILL.md` |
| Universal target | OpenCode, Amp, Cline, Codex, Cursor + 15 more |
| Source | `https://github.com/emilkowalski/skills` |
| Security scan | Gen: Safe · Socket: 0 alerts · Snyk: Low risk |
| Skill size | ~23 KB, single file, no scripts, no network calls |

The skill is a **knowledge file**, not executable code. It encodes Apple's *Designing Fluid Interfaces* (WWDC 2018), *The Details of UI Typography* (WWDC 2020) and *Principles of Great Design* (WWDC 2026), translated to the web (CSS, Pointer Events, `requestAnimationFrame`, springs).

### 1.2 How to use it in this repo

- The `apple-design` skill is discoverable by the agent harness. **Invoke it before any motion, gesture, sheet, material or typography work** — not after the UI is already built.
- Treat §4–§8 of this document as the **project-specific projection** of that skill. The skill gives principles; this document gives HAAT's concrete values. Where they disagree, this document wins because it is HAAT-specific.
- Never invent animation values. Every timing in the codebase must trace back to a token in §6.2.

### 1.3 Companion skills (install on demand, same command shape)

Do **not** install all of them. Install when the trigger applies.

| Skill | Install when | Trigger in HAAT |
|---|---|---|
| `review-animations` | Before any PR that adds motion | Reviewing cart drawer / sheet springs |
| `improve-animations` | Once Phase 4 UI exists | Audit all motion, produce prioritized plan |
| `find-animation-opportunities` | After a screen is functionally complete | Deciding what *deserves* motion |
| `remove-animations` | Whenever motion “feels busy” | Removing fade-ins from every section |
| `choreograph` | Multi-element sequences | Checkout step transitions, order timeline reveal |
| `animation-performance` | Any dropped frames | Long product grids, chat scroll |
| `gestures` | Drag/swipe/sheet work | Cart drawer, image gallery, slot calendar |
| `mobile-native` | Buyer mobile polish | Sticky hover, tap highlight, 100vh, safe areas, input zoom |
| `break-ui` | Before sign-off on any screen | Long seller names, ₹9,99,999 prices, 400-char titles |
| `pick-ui-library` | Before adding a UI dependency | Toast, sheet, table, command menu choices |
| `learn-taste` | End of each implementation session | Writes corrections back into `DESIGN.md` |
| `ask-sonner` | Toast work only | If Sonner is adopted for feedback |

```bash
# example: install the gesture skill when starting the cart drawer
npx skills@latest add emilkowalski/skills --skill gestures
```

### 1.4 Update procedure

```bash
# re-run the same add command to refresh the skill to latest
npx skills@latest add emilkowalski/skills --skill apple-design
```

After updating: read the diff of `SKILL.md`, then update §6 (motion tokens) and §14 (change log) in this file so the project projection never drifts from the skill.

---

## 2. Design Direction — An Explicit Anti-Slop Stance

HAAT must not look like a generated template. The following are **banned**, regardless of how “clean” they look:

| Banned pattern | Why | HAAT replacement |
|---|---|---|
| Purple → blue → pink gradient hero | The default AI aesthetic; no meaning | Flat navy ink type on canvas, one structured product/price artifact as the hero |
| Gradient text on headings | Decorative, unreadable at small sizes | Solid ink, hierarchy via weight and size |
| Three equal cards in a centered row | Template rhythm, wastes the fold | Asymmetric editorial grid; one primary panel + supporting rail |
| Everything `rounded-2xl` / `rounded-3xl` | Bubbly = generic consumer toy | 8–10 px radii on surfaces, 6 px on inputs, pills only for status |
| Drop shadow on every card | Depth with no hierarchy | Hairline borders + shadow only on truly floating layers (§5.3) |
| Glassmorphism on static cards | Blur with nothing behind it = decoration | Translucency reserved for chrome over scrolling content (§5.2) |
| Emoji as icons | Inconsistent, unprofessional | Lucide React only, 1.5 px stroke, consistent optical size |
| `transition: all 300ms ease-in-out` | Disconnected, uninterruptible | Springs for interactive; named 120/180/240 ms tokens for non-gesture (§6) |
| Skeleton shimmer sweeping diagonally | Generic loading theater | Static tinted blocks + progressive content, no endless shine |
| Centered marketing copy blocks | Reads as a landing page, not a marketplace | Left-aligned, information-dense, data-forward |
| “Get Started” / “Learn More” / “Unlock” copy | Vague, non-specific | Direct labels: “Add 12 to cart”, “Schedule for Tue, 2–4 PM” |
| Decorative illustrations of groceries | Violates PRD §5.3 (no grocery bias) | Product photography + real category iconography |
| Dark mode with pure `#000` + neon accents | Cardboard “premium” | Navy-tinted ink scale, see §3.1 |

**The one-sentence direction:** *a calm, high-density commercial instrument* — the credibility of a B2B ledger with the speed of a consumer app. Navy ink, hairline structure, marigold reserved exclusively for wholesale signals, and motion that only exists where a human hand is moving something.

### 2.1 Two visual registers, one system

| Register | Where | Character |
|---|---|---|
| **Retail (B2C)** | Buyer surfaces on mobile | Generous imagery, large tap targets, one decision per screen, translucent bottom chrome, spring-feeling sheets |
| **Commercial (B2B)** | Seller + Admin on desktop, buyer bulk flows | Dense tables, tabular numerals, keyboard-first, sticky headers, side panels instead of modals |

Both reuse the same tokens. Density is a *mode*, not a second design system:

```css
[data-density="comfortable"] { --row-h: 44px; --cell-px: 12px; }
[data-density="compact"]     { --row-h: 36px; --cell-px: 10px; }
```

---

## 3. Brand & Foundations

### 3.1 Color

Canonical brand navy from the PRD: **`#1F319D`**. It is used as *ink and function*, never as a full-bleed gradient.

```css
:root {
  /* Brand navy scale */
  --brand-50:  #EEF0FC;
  --brand-100: #DCE1F8;
  --brand-200: #BBC4F0;
  --brand-300: #8E9CE4;
  --brand-400: #5B6ED0;
  --brand-500: #2B3FB8;
  --brand-600: #1F319D;  /* canonical */
  --brand-700: #182A85;
  --brand-800: #12206B;
  --brand-900: #0C1750;

  /* Ink (navy-tinted neutrals — never pure black) */
  --ink-900: #0B1020;
  --ink-800: #1A2136;
  --ink-700: #2A3142;
  --ink-600: #414A5E;
  --ink-500: #5A6273;
  --ink-400: #7C8496;
  --ink-300: #A2A9B8;
  --ink-200: #C8CDD8;
  --ink-100: #E3E6ED;

  /* Surfaces */
  --canvas:        #F7F8FA;  /* buyer page background */
  --canvas-admin:  #F4F5F8;  /* seller/admin background */
  --surface:       #FFFFFF;
  --surface-sunken:#F1F3F7;

  /* Lines — hairlines, not gray rectangles */
  --line:        rgba(11, 16, 32, 0.08);
  --line-strong: rgba(11, 16, 32, 0.16);
  --line-bright: rgba(255, 255, 255, 0.60); /* light catching a material edge */

  /* Semantic */
  --success-fg: #0E7C4A;  --success-bg: #E6F4EC;
  --warning-fg: #9A5200;  --warning-bg: #FDF1E0;
  --danger-fg:  #B3261E;  --danger-bg:  #FBEAE8;
  --info-fg:    var(--brand-700); --info-bg: var(--brand-50);

  /* WHOLESALE accent — marigold. Reserved. Never decorative. */
  --b2b-fg: #8A4B00;  --b2b-bg: #FDF0DB;  --b2b-line: #E9B769;

  /* Focus ring */
  --focus: 0 0 0 2px var(--surface), 0 0 0 4px var(--brand-400);
}
```

**Color semantics (binding):**

| Signal | Color | Never used for |
|---|---|---|
| Retail price, primary CTA, active nav | navy `--brand-600` | Decoration, gradients, large background washes |
| Wholesale tier, MOQ, RFQ, B2B badges | marigold `--b2b-*` | Retail prices, primary CTAs, success |
| Success | green `--success-*` | Wholesale signals |
| Capacity warnings, “Filling fast” | amber `--warning-*` | Generic highlights |
| Destructive, sold out, failed | red `--danger-*` | Emphasis |
| Muted metadata, timestamps | `--ink-400/500` | Body copy (fails contrast) |

Contrast: body text on canvas must be `--ink-700` or darker (≥ 7:1); `--ink-500` only for ≥ 14 px metadata at ≥ 4.5:1. Never place text on `--brand-600` below 14 px unless weight ≥ 600.

### 3.2 Typography

**Face:** Nunito Sans (brand requirement, PRD §13.2 / `TSK-P1-05`), system fallback chain, with an explicit caveat and mitigation below.

```css
--font-sans: "Nunito Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
--font-mono: ui-monospace, "SF Mono", "Cascadia Mono", monospace; /* IDs, SKUs, timestamps */
```

> **Audit note (A-15):** Nunito Sans is a rounded humanist face — pleasant, but it is the single fastest way to make HAAT read as a generic friendly-consumer app, and it ships no optical-size axis. Mitigation, mandatory:
> 1. Use **only weights 400 / 600 / 800**. No 300, no 700-in-bold-context soup.
> 2. Tighten display sizes hard (`-0.02em` to `-0.03em`); the rounded terminals already read wide.
> 3. Set all money, quantities and tabular data with `font-variant-numeric: tabular-nums`.
> 4. Use `--font-mono` for SKUs, order numbers, GSTIN, timestamps — this is what signals “commercial instrument”, not the sans.
> 5. Keep radii small (§3.5) so type and geometry don't double up on “friendly”.
>
> If the brand owner permits a change, the recommended pairing is **Inter Display / Geist for UI + Nunito Sans for the wordmark only**. Raise as a decision, do not change unilaterally.

**Scale (rem-based so Dynamic Type scales layout, per skill §15):**

| Token | Size | Line-height | Tracking | Weight | Use |
|---|---|---|---|---|---|
| `display-xl` | `clamp(2.5rem, 5vw, 3.75rem)` | 1.02 | `-0.03em` | 800 | Buyer home hero, order-confirmed moment |
| `display-lg` | `clamp(2rem, 3.5vw, 2.75rem)` | 1.06 | `-0.025em` | 800 | Section openers, storefront name |
| `display-md` | `1.75rem` | 1.1 | `-0.02em` | 700→800 | Page titles (seller/admin) |
| `title` | `1.375rem` | 1.2 | `-0.015em` | 700→800 | Card group headings, drawer titles |
| `subtitle` | `1.125rem` | 1.3 | `-0.01em` | 600 | PDP product name, panel headers |
| `body` | `1rem` | 1.55 | `0` | 400 | Default copy |
| `body-strong` | `1rem` | 1.5 | `0` | 600 | Emphasis within copy |
| `label` | `0.875rem` | 1.4 | `0.005em` | 600 | Buttons, form labels, tabs |
| `caption` | `0.8125rem` | 1.45 | `0.01em` | 500 | Helper text, seller meta |
| `micro` | `0.75rem` | 1.4 | `0.02em` | 600 | Status pills, uppercase eyebrows |
| `numeric-lg` | `1.5rem` | 1.15 | `-0.01em` | 800 | Price in PDP / totals |
| `numeric` | `0.9375rem` | 1.4 | `0` | 600 | Table prices |

Rules:
- **Tracking is size-specific** — never one global `letter-spacing` (skill §15).
- **Leading is inverse to size** — display tight, body loose.
- Money format: `₹1,50,000.00` (Indian grouping) via `Intl.NumberFormat('en-IN')`; always two decimals in invoices, no decimals on browse cards.
- Dates/slots: IST, `Tue, 18 Nov · 2:00–4:00 PM`. Never `2026-11-18T14:00:00.000Z` in UI.
- Never truncate a price. Let the container grow; `tabular-nums` prevents jitter.
- `text-wrap: balance` on display headings only; `pretty` on body paragraphs. Never on tables.

### 3.3 Spacing

4 px base, expressed in rem for text-relative scaling.

```css
--space-0: 0;      --space-1: 0.25rem;  --space-2: 0.5rem;
--space-3: 0.75rem; --space-4: 1rem;    --space-5: 1.25rem;
--space-6: 1.5rem;  --space-8: 2rem;    --space-10: 2.5rem;
--space-12: 3rem;   --space-16: 4rem;   --space-20: 5rem;
```

- Section rhythm: 24 px mobile, 40 px desktop between blocks; 16/24 inside cards.
- Tables: `--space-3` horizontal cell padding at comfortable density.
- Never use arbitrary values like `13px` or `27px`. If a value isn't on the 4 px grid, the layout is wrong.

### 3.4 Grid & Layout

| Surface | Columns | Container | Notes |
|---|---|---|---|
| Buyer mobile | 4-col, 16 px gutters | full-bleed | Hero + horizontal rails; single sticky action bar |
| Buyer desktop | 12-col, 24 px gutters | 1200 px | Content + 360 px sticky summary rail |
| PDP desktop | 7-col gallery / 5-col buy box | 1200 px | Buy box is `position: sticky; top: 88px` |
| Seller console | 240 px rail + fluid main | full | Main content max 1440 px, tables go edge-to-edge |
| Admin console | 264 px rail + fluid main | full | Split panes for review work |
| Auth | 1 column, 420 px | centered | No hero art, no split-screen Ilustration |

### 3.5 Radius, Borders, Elevation

```css
--r-sm: 6px;    /* inputs, chips, small buttons */
--r-md: 8px;    /* buttons, tags */
--r-lg: 10px;   /* cards, panels */
--r-xl: 14px;   /* sheets, dialogs */
--r-pill: 999px; /* status pills ONLY */

--shadow-1: 0 1px 2px rgba(11,16,32,.06), 0 1px 1px rgba(11,16,32,.04);
--shadow-2: 0 2px 4px rgba(11,16,32,.05), 0 8px 16px -8px rgba(11,16,32,.10);
--shadow-3: 0 8px 24px -8px rgba(11,16,32,.16), 0 24px 48px -24px rgba(11,16,32,.18);
--shadow-inset-top: inset 0 1px 0 rgba(255,255,255,.60);
```

**Elevation is a hierarchy, not a decoration budget:**

| Level | Surface | Shadow | Example |
|---|---|---|---|
| 0 | Page canvas | none | Buyer feed |
| 1 | Card / row | `--shadow-1` **or** hairline only | Product card, table row |
| 2 | Sticky/popover | `--shadow-2` | Dropdown, sticky summary |
| 3 | Floating chrome / sheet | `--shadow-3` + material | Cart drawer, command palette |

Rule: **a surface gets a shadow only if it floats over other content.** Cards sitting in a grid get a hairline, not a shadow.

### 3.6 Iconography

- Lucide React only. `stroke-width={1.5}`, sizes 16 / 20 / 24.
- Icons never stand alone for a destructive or irreversible action without a label.
- No emoji in product UI, empty states, or toasts.
- Category icons are geometric line art, never photographic illustrations.
- Optical alignment: nudge icons 0.5 px when next to text at `label` size; verify at 100% zoom.

### 3.7 Logo & Wordmark

- Wordmark: lowercase `haat`, Nunito Sans 800, `-0.04em` tracking, `--ink-900` on light / `#fff` on navy.
- The `aa` pair may be ligatured into a counter-form; **no gradients, no glow, no leaf/shopping-bag cliché**.
- Clear space = cap height on all sides. Minimum width 72 px.

---

## 4. Materials & Depth (skill §12)

Translucency is a **functional** layer for chrome that floats above scrolling content. Nothing else.

### 4.1 Tokens

```css
--material-chrome: rgba(255,255,255,0.72);
--material-chrome-blur: blur(20px) saturate(180%);

--material-chrome-dark: rgba(11,16,32,0.64);
--material-chrome-dark-blur: blur(24px) saturate(160%);

--material-sheet: rgba(255,255,255,0.86);
--material-sheet-blur: blur(28px) saturate(170%);

--scrim: rgba(11,16,32,0.32);
```

```css
.chrome {
  background: var(--material-chrome);
  backdrop-filter: var(--material-chrome-blur);
  border-top: 1px solid var(--line-bright);
  box-shadow: var(--shadow-2);
}
```

### 4.2 Where HAAT uses material (exhaustive list)

| Surface | Material | Scrim? |
|---|---|---|
| Buyer sticky search/app bar | chrome | no |
| Buyer bottom tab bar | chrome (safe-area padded) | no |
| Cart drawer (mobile) | sheet | yes (drawer is a modal task) |
| Desktop cart panel | chrome | **no** — parallel panel, flow preserved |
| Chat dock (desktop) | chrome | no |
| Chat sheet (mobile) | sheet | yes |
| Command palette (seller/admin) | sheet-dark on dark rail | yes |
| Toasts (Sonner) | `--surface` solid, `--shadow-3` | no |
| Dropdowns / popovers | `--surface` solid, `--shadow-2` | no |

### 4.3 Hard rules

1. **Never stack a light translucent surface on another** — legibility collapses. If a popover opens over a drawer, the popover is solid.
2. **Bigger surface = thicker material** — stronger blur, deeper shadow than a chip.
3. **Vibrancy text**: over material, use `--ink-800` at weight 500–600 with `+0.005em` tracking; never `--ink-400`.
4. **No hard dividers under sticky headers.** Use a 12 px fade mask where content meets chrome:
   `mask-image: linear-gradient(to bottom, transparent, #000 12px)`.
5. **Materialize, don't fade.** Blur radius + scale animate together (§6.4).

---

## 5. Motion System (skill §3–§6, §14)

### 5.1 Library

`motion` (Motion for React) for every spring and every gesture-driven animation. **CSS transitions are permitted only for non-gesture, non-interruptible properties** (color, background, opacity on hover-out).

```bash
pnpm add motion
```

### 5.2 Spring tokens (binding values)

| Token | Damping | Response | Motion equivalent | Use |
|---|---|---|---|---|
| `spring-micro` | 1.0 | 0.2 | `{ type:'spring', bounce:0, duration:0.2 }` | Press release, checkbox, chip select |
| `spring-standard` | 1.0 | 0.4 | `{ type:'spring', bounce:0, duration:0.4 }` | Panel show/hide, accordion, tab indicator |
| `spring-sheet` | 0.8 | 0.3 | `{ type:'spring', bounce:0.18, duration:0.3 }` | Drawers, sheets, chat dock |
| `spring-momentum` | 0.8 | 0.4 | `{ type:'spring', bounce:0.2, duration:0.4 }` | Post-flick snap (calendar, carousel, gallery) |
| `spring-reorder` | 1.0 | 0.35 | `{ type:'spring', bounce:0, duration:0.35 }` | List reorder, cart item removal collapse |

**Bounce is earned by momentum only.** A menu that merely appeared never overshoots. A card that was flicked does.

### 5.3 Non-gesture durations

| Token | Value | Use |
|---|---|---|
| `t-press` | 100 ms `ease-out` | `:active` scale / tint |
| `t-hover` | 120 ms `ease-out` | Hover tint, underline |
| `t-fade` | 180 ms `ease` | Opacity-only cross-fade |
| `t-materialize` | 240 ms `cubic-bezier(0.32, 0.72, 0, 1)` | Blur+scale arrival of a material |
| `t-toast` | 260 ms | Sonner default, do not override |

### 5.4 Gesture physics constants

```ts
export const DECELERATION = 0.998;      // standard scroll feel
export const DECELERATION_SNAPPY = 0.99; // calendar / gallery flicks
export const RUBBERBAND_CONSTANT = 0.55;
export const HYSTERESIS_PX = 10;         // drag-intent threshold
export const TAP_SLOP_PX = 10;           // tap hit padding

// Apple's exponential projection, not v²/2a
export const project = (v: number, d = DECELERATION) => (v / 1000) * d / (1 - d);

// Progressive resistance past a boundary
export const rubberband = (overshoot: number, dim: number, c = RUBBERBAND_CONSTANT) =>
  (overshoot * dim * c) / (dim + c * Math.abs(overshoot));
```

### 5.5 Interaction laws (non-negotiable)

1. **Respond on pointer-down.** Every button, card, row and tab shows pressed state instantly — never on release.
2. **1:1 tracking.** Dragged surfaces follow the pointer exactly, respecting the grab offset (`setPointerCapture`).
3. **Interruptible always.** No input locks during transitions. A closing sheet can be grabbed mid-close and dragged back.
4. **Animate from the presentation value**, never the target value. Read the live transform on interrupt.
5. **Carry velocity through re-targets.** A reversal must not create a brick wall.
6. **Project momentum at release**, snap to the point nearest the projected endpoint, then hand off release velocity to the spring.
7. **Symmetric paths.** In-from-right exits to the right. In-from-bottom exits to the bottom.
8. **Anchor origins.** Popovers/menus set `transform-origin` to their trigger, not their center.
9. **Rubber-band at boundaries.** No hard stops on scroll, drag, or overscroll.
10. **Decompose 2D motion** into independent X and Y springs.

### 5.6 Reduced motion & transparency (skill §14)

```css
@media (prefers-reduced-motion: reduce) {
  /* springs → 200ms opacity cross-fade; translate/scale removed */
  .sheet, .drawer { transform: none !important; transition: opacity 200ms ease; }
  .press { transition: background-color 100ms ease; }
}
@media (prefers-reduced-transparency: reduce) {
  .chrome, .material { background: #fff; backdrop-filter: none; }
}
@media (prefers-contrast: more) {
  .card, .chrome { background: #fff; border: 1px solid var(--ink-700); }
}
```

Also required in reduced-motion mode: no parallax, no full-viewport moving backgrounds, no looping oscillation near 0.2 Hz, no abrupt theme brightness jumps.

Implementation pattern — read the three signals once, expose as data attributes on `<html>`:

```ts
// useEnvironment(): sets data-motion, data-transparency, data-contrast
// Every component asks the hook, never guesses.
```

### 5.7 Frame smoothness

- Animate only `transform` and `opacity`. Never `top/left/width/height/box-shadow/filter` on a gesture path.
- `will-change` only after measuring a real shift; remove after the animation settles.
- No animation on the main thread for scroll-linked effects — prefer CSS scroll-driven animations or `useScroll` with transforms only.
- Any suspicious jank on product grids or chat: run the `animation-performance` skill before merging.

### 5.8 “Do not animate” list (skill §16 + `remove-animations`)

| Do not animate | Reason |
|---|---|
| Page-level route fade-ins | Adds latency, harms perceived speed |
| Every section entering on scroll | Attention theater; scroll-jacking risk |
| Tooltips in a group with delay | Feels laggy on the second hover |
| Keyboard-triggered actions | Users repeat them fast; motion becomes obstruction |
| Price value changes on browse cards | Distracting, implies instability |
| Sticky header height | Layout thrash |
| Focus ring appearance | Accessibility must be instant |
| Skeleton shimmer diagonals | Generic; use static tint |

**Do animate:** press feedback, sheets/drawers, expand/collapse, drag release, optimistic cart add, status transition on an order the user is *watching*, and the deliberate one-time moment after payment succeeds.

---

## 6. Interaction Patterns

### 6.1 Press & tap

```css
.press {
  transition: transform var(--t-press) ease-out, background-color var(--t-press) ease-out;
  touch-action: manipulation;          /* kills ~300ms tap delay */
  -webkit-tap-highlight-color: transparent;
}
.press:active { transform: scale(0.97); }
```
- Commit on pointer-up; cancel if the pointer leaves by > 10 px and allow drag-back.
- Minimum target **44×44 px** (PRD §9); in dense tables, 32 px visual with 44 px hit area.
- Never hover-only affordances on buyer mobile (`@media (hover: none)`).

### 6.2 Cart drawer / bottom sheet

- Spring `spring-sheet` (damping 0.8, response 0.3).
- Drag-to-dismiss with 1:1 tracking; dismiss threshold = projected endpoint crosses 40% of height.
- Rubber-band when dragged upward past full height.
- Scrim fades in parallel (200 ms); scrim is the **only** tap-to-dismiss layer.
- Content scroll is nested but never bounces the sheet; the sheet's own Y spring is independent of inner scroll.

### 6.3 Slot calendar

- Horizontal 7-day strip: 1:1 drag, momentum projection `0.99`, snap to day centers.
- Selecting a day cross-fades the slot list (180 ms), does not slide (avoids competing motion).
- Capacity updates are **not** animated on price-style values; only the availability pill state transitions.
- Sold-out slots are not draggable/clickable and expose `aria-disabled="true"` with reason text.

### 6.4 Materialize (chrome arrival)

```ts
animate(el, { opacity: 1, scale: 1, filter: 'blur(0px)' },
  { type: 'spring', bounce: 0, duration: 0.24 });
// from { opacity: 0, scale: 0.98, filter: 'blur(8px)' }
```
Under `prefers-reduced-motion`, reduce to opacity only.

### 6.5 Feedback timing (skill §13)

- Visual feedback fires on the causal frame. If haptics/sound are ever added (post-MVP), they must share the frame.
- Reserve non-visual feedback for commit, error, and snap. Over-feedback trains users to ignore it.

### 6.6 Optimistic updates

Order matters for perceived latency:

1. Press → instant `:active`.
2. Cart badge increments optimistically (`spring-micro`).
3. Line item appears with height+opacity spring (`spring-reorder`).
4. Server confirms → no visual change (silence is success).
5. Server rejects → the line retracts with the same spring and a Sonner error naming the item and the reason.

Never show a success toast for an action the user can already see succeeded in place.

---

## 7. Component Inventory

**Primitives** (Shadcn/UI, restyled to tokens — do not fork Radix behaviour):
`Button`, `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `Tabs`, `Dialog`, `Sheet`, `Popover`, `Tooltip`, `DropdownMenu`, `Table`, `Badge`, `Avatar`, `Progress`, `Skeleton`, `Toast` (Sonner), `Command`, `Calendar`, `Pagination`.

**HAAT composites** (build in `apps/web/src/components/`):

| Component | Contract | Motion | Anti-slop note |
|---|---|---|---|
| `PriceBlock` | retail price, optional tier hint, MOQ chip, per-unit qualifier | value change: none | Never a gradient “deal” badge |
| `TierTable` | quantity ladder, active tier rail, straddle warning | active rail slides `spring-standard` | Marigold rail only; no zebra striping |
| `QtyStepper` | respects `orderMultiple`, inline MOQ error, keyboard hold | `spring-micro` on value | Error text below, not a shake |
| `SlotCalendar` | 7-day strip, per-day availability dot, disabled reasons | momentum snap | No confetti on selection |
| `SlotPill` | Available / Filling fast / Sold out | opacity 180 ms | Icon + label, never colour-only |
| `CapacityMeter` | `booked/max`, amber ≥ 80% | width spring on change | No animated gradient fill |
| `SellerCard` | store name, verified mark, rating, coverage, chat action | none | Verified = hairline check, not a glow |
| `ProductCard` | image, title, price, unit, wholesale affordance, stock state | press only | One shadow level; no hover lift |
| `CartDrawer` | grouped by seller, per-group subtotal, free-delivery progress | sheet spring | Group headers are sticky inside the drawer |
| `GroupedCartSeller` | seller header, items, subtotal, slot CTA | reorder spring | Collapse keeps scroll position |
| `RfqComposer` | qty, target price, pincode, date, notes, snapshot preview | step cross-fade | Shows the snapshot it will attach, verbatim |
| `QuotationCard` | unit price, min qty, validity countdown, accept/revise | countdown is static text | Expiry is a real deadline, not a fake timer |
| `StatusTimeline` | fulfilment state machine, actor + timestamp | new step reveals once | No looping pulse on “current” |
| `DataTable` | sticky header, sort, filter chips, column visibility, inline edit | scroll edge mask | Dense by default; no card fallback on desktop |
| `KycReviewPane` | split view: submitted data / document viewer / decision bar | document zoom spring | Reviewer must see the document and the claim side-by-side |
| `AuditLogTable` | mono timestamps, actor, action, entity, IP | none | Immutable: no edit affordances at all |
| `CommandPalette` | seller/admin only, `⌘K` / `Ctrl K` | `spring-sheet`, no bounce | Keyboard-first, no animation on keystroke |
| `EmptyState` | icon, one sentence, one primary action | none | Never “Nothing here yet!” |
| `ErrorState` | what failed, why, retry | none | Never expose error codes as the headline |
| `Skeleton` | layout-matched blocks | none | No shimmer sweep |
| `AddressCard` | label, recipient, pincode, default badge | none | Uses `--font-mono` for pincode |

**Sonner adoption rule:** one toast per user intent. Errors name the entity (`“Crimson Canvas Sneaker (UK 9) is out of stock”`), never `“Something went wrong”`.

---

## 8. The Four Mandatory States

Every page, card and data view implements all four (PRD §15.3). Copy is part of the design.

| State | Requirement | Example copy |
|---|---|---|
| **Loading** | Skeleton matching final geometry; no full-screen spinner; no shimmer | — |
| **Empty** | Icon, one factual sentence, one primary action | “No scheduled deliveries for tomorrow.” → *Browse products* |
| **Error** | What failed + why (if known) + retry | “We couldn't load tomorrow's slots. Check your connection and try again.” → *Try again* |
| **Populated** | Responsive, accessible, tabular numerals | — |

Additional rule: **partial states are explicit.** If 3 of 4 sellers return slots, render the 3 and a per-seller inline notice — never blank the page.

---

## 9. Screen Specifications

### 9.0 Navigation model

| Surface | Structure |
|---|---|
| Buyer mobile | Sticky material search bar · scrollable feed · translucent tab bar (Home, Search, Orders, Chat, Account) |
| Buyer desktop | Top bar (logo, search, account) + in-page category rail; cart is a parallel panel |
| Seller | 240 px rail: Dashboard, Products, Inventory, Delivery, Orders, RFQs, Messages, Analytics, Settings |
| Admin | 264 px rail: Verification, Catalogue, Orders, Disputes, Audit, Platform |

Seller/admin rails use solid `--surface-sunken` (a sidebar is *structural*: heavier, not translucent). Only the command palette floats as a dark material.

### 9.1 Buyer — Home / Discovery `/`

**Layout:** sticky search + location strip → editorial hero (single asymmetric panel: one real product scene + a price/wholesale artifact) → category rail (line icons, horizontal scroll, snap) → “Scheduled today” rail → “Wholesale lots” rail (marigold-eyebrowed) → seller spotlight → recently viewed.

**Hierarchy:** one clear primary action above the fold — *search*. Not a carousel of promotions.

**Motion:** category and product rails use momentum snap (`0.99`); cards press only. No scroll-triggered entrances.

**Anti-slop:** no full-bleed gradient; no autoplaying hero; no “Welcome back, 👋”; no three stacked promo banners.

### 9.2 Buyer — Search / Results `/search`

**Layout:** mobile = sticky filter bar (bottom sheet for facets) + 2-col grid. Desktop = 260 px facet rail (Category, Seller, Price, In stock, Wholesale available, Delivery slot) + grid + sort.

**Key details:** active facet chips are removable, 32 px pills with an `x`; result count is `--ink-500` under the title; wholesale-eligible cards carry a marigold `MOQ 10` chip in the image corner.

**States:** zero results must suggest the nearest useful action (“No matches for *industrial* — try *hardware*”).

**Motion:** facet apply triggers a `spring-standard` cross-fade of the grid only; the facet panel does not animate on every keystroke.

### 9.3 Buyer — Product Detail `/product/:slug`

**Layout:** mobile = edge-to-edge gallery → title/price block → tier table → variant selectors → seller card → sticky bottom action bar (price + *Add to cart*). Desktop = 7/5 split, sticky buy box.

**Price block order (fixed):** current unit price (tabular) → unit qualifier (`per piece · incl. 18% GST`) → tier hint (`₹450/unit at 10+`) → MOQ note → stock state.

**Variants:** selecting a variant updates price, SKU and availability **in place** — no layout jump, no loading spinner; reserve the height.

**Dual actions:** *Add to cart* (navy, primary) and *Request quotation* (outline, marigold text, secondary). RFQ is never the same visual weight as the primary retail action.

**Chat:** *Chat with seller* sits in the seller card, not as a floating bubble over the gallery.

**Motion:** gallery swipe is 1:1 with momentum snap; pinching opens a full-screen viewer with a shared-element spring. Variant price changes are instant, unanimated.

### 9.4 Buyer — Storefront `/store/:sellerSlug`

Banner (16:6, real imagery, no overlay text), store identity row (name, verified hairline mark, rating, `Ships to 400001 · 400002 +6`), then category tabs and a product grid. 404 state for missing/inactive sellers is a designed page with a route back to search — not a raw error.

### 9.5 Buyer — Cart (drawer / panel)

**Structure:** per-seller fulfilment groups. Each group: seller header (name + slot summary), line items, group subtotal, *Schedule delivery* CTA. Global footer: item subtotal, taxes, delivery, total, *Proceed to checkout*.

**Rules:** group headers stick while their items scroll; removing the last item of a group collapses the group with `spring-reorder`; quantity edits are optimistic; MOQ violations show inline per line with the exact minimum.

**Desktop:** parallel panel (no scrim) so the catalogue stays usable; mobile: sheet with scrim.

### 9.6 Buyer — Checkout

Four steps, one screen each on mobile, one page with sections on desktop: **Address → Delivery slot (per seller group) → Review → Pay.**

- Progress is a 4-node stepper with labels, not dots.
- Slot selection is required per group; the *Pay* action stays disabled with a reason tooltip until every group has a slot.
- Review step shows immutable snapshots exactly as they will be stored (title, SKU, unit price, tax rate).
- Payment failure returns to Review with the gateway's reason mapped to plain language; the cart and slot hold are preserved.
- On success: a single deliberate moment — order number in `display-lg`, slot window, next action *Track order*. No confetti, no looping checkmark animation.

### 9.7 Buyer — Order tracking `/orders/:id`

Header: order number (`--font-mono`), placed-at, total. Body: per-seller fulfilment cards, each with `StatusTimeline`, delivery window, tracking number, invoice download, and contextual actions (chat about this order, request reschedule before dispatch, cancel when allowed, raise return after delivery).

**Motion:** only a newly arrived status step reveals (one 180 ms fade + 4 px rise). Never pulse the “current” node — it implies activity that isn't happening.

### 9.8 Buyer — RFQ & Quotations

- `RfqComposer`: quantity, target unit price (optional), delivery pincode, preferred date, notes, plus a read-only snapshot of the product/variant being referenced.
- Quotations inbox: list with seller, offered unit price, min quantity, validity countdown (static text, not a ticking animation), status.
- Quotation detail: accept / request revision / decline. Accept shows a confirmation summarising the locked terms before conversion.
- Expired quotations are visually receded (40% opacity + `Expired` pill) and not actionable.

### 9.9 Buyer — Chat

Mobile: full-height sheet from the bottom, spring `spring-sheet`, drag-to-dismiss. Desktop: 380 px parallel dock, no scrim.

Message bubbles: seller left, buyer right; max 68ch; timestamps in `--ink-400` mono at `micro`. Context header pins the referenced product/order/RFQ. Attachment chips show MIME + size before upload. Typing indicator is three dots with a **single** 1.2 s cycle, and only when the peer is actually typing.

### 9.10 Seller — Dashboard

Top row: four dense metric tiles (GMV today, orders to fulfil, low-stock SKUs, slot fill %) with `numeric-lg` values and 12-month sparkline (no gradient area fills). Then: *Today's schedule* (slot → order count), *Needs action* (pending RFQs, overdue dispatches), *Recently sold* table.

No welcome hero. No motivational copy. The first question a seller has is “what must I do today?” — answer it above the fold.

### 9.11 Seller — Products / Editor

Products: `DataTable` with search, category filter, status, stock, price, bulk actions. Editor: two-column (form / preview), variant matrix as an editable grid, image uploader with drag reorder, tier editor as rows `[min, max, price]` with overlap validation, MOQ + `orderMultiple` with a live “sold in multiples of N” preview.

### 9.12 Seller — Delivery configuration

Weekly grid: rows = days, columns = slot windows, cells = capacity. Editing a cell opens a small popover (not a modal). Blackout dates are a separate calendar with date-range selection. Cut-off and lead time sit in a settings strip above the grid, with a plain-language preview: *“Orders placed after 8:00 PM are scheduled for the day after tomorrow.”*

### 9.13 Seller — Fulfilment queue

Tabs: New · In progress · Scheduled today · Completed. Rows show slot window, buyer pincode, item count, total, and the single next valid action (`Confirm`, `Pack`, `Dispatch`, `Deliver`). Invalid transitions are absent, not disabled — the UI must not offer states the backend rejects.

### 9.14 Seller — RFQ inbox & quotation builder

Inbox: sortable by urgency (expiring, high value, new). Builder: RFQ summary on the left, quotation form on the right, validity picker with real calendar, and a “buyer will see” preview rendered as the actual quotation card.

### 9.15 Admin — Verification queue

Split pane: queue list (left) → applicant claim vs. uploaded document (right) → decision bar pinned bottom. Reviewers can zoom documents (spring zoom, not CSS `scale` transition), annotate a rejection reason from a controlled list plus free text, and approve. Approval writes `AuditLog` — the UI states that explicitly.

### 9.16 Admin — Catalogue moderation

Table with thumbnail, title, seller, category, flags, status. Row opens a side panel (not a page navigation) so the reviewer keeps their filter context. Suspend requires a reason; the row updates optimistically and the panel shows the public-visibility consequence.

### 9.17 Admin — Orders & disputes

Global order table with status, payment, seller, slot. Dispute detail: conversation log, order timeline, delivery proof, refund controls. Refund is a genuinely destructive action → typed confirmation of the amount, not a checkbox.

### 9.18 Admin — Audit log

Monospace timestamps, actor, action, entity, IP. Filters are chips. No edit or delete affordance exists anywhere in this screen — the absence is the feature.

---

## 10. Responsive & Platform Rules

| Breakpoint | Range | Behaviour |
|---|---|---|
| `sm` | < 640 px | Buyer single column, bottom tab bar, sheets |
| `md` | 640–1024 px | 2-col grids, cart becomes a side panel |
| `lg` | 1024–1280 px | Seller rail collapses to icons; tables gain columns |
| `xl` | 1280–1536 px | Full seller/admin layout |
| `2xl` | > 1536 px | Content maxes at 1440 px; never stretch tables edge-to-edge |

Mobile obligations (run the `mobile-native` skill):
- Safe-area insets on bottom bars: `padding-bottom: max(16px, env(safe-area-inset-bottom))`.
- Use `100dvh`, never `100vh` (mobile browser chrome bug).
- Inputs ≥ 16 px font-size to prevent iOS zoom.
- `touch-action: manipulation` on all controls.
- No `:hover`-only reveal on touch devices.
- Sticky hover states must reset after tap.

---

## 11. Accessibility

- WCAG 2.1 AA minimum; the four states must be accessible, not just the success path.
- Focus: `--focus` ring on every interactive element, never removed, never animated.
- Keyboard: full seller/admin operability (tables, dialogs, command palette, inline edit). Buyers must be able to complete checkout with a keyboard.
- Semantic landmarks: `header`, `nav`, `main`, `aside`, `footer`; one `h1` per page; heading levels never skip.
- Announce async changes with `aria-live="polite"` (cart count, slot updates, message arrival); use `assertive` only for payment failure.
- Colour is never the only carrier of meaning (capacity, status, wholesale tier all pair colour with text/icon).
- Forms: labels are always visible; placeholders are never labels; errors are inline and tied with `aria-describedby`.
- Motion: honour all three media queries (§5.6). Nothing may flash more than 3 times per second.
- Touch targets ≥ 44×44; text resizable to 200% without layout loss (rem-based spacing).

---

## 12. Design Review Gate

Every UI PR must pass all 20 checks. Reviewers (human or CodeRabbit) reject on any `✗`.

| # | Check |
|---|---|
| 1 | No banned pattern from §2 is present |
| 2 | Every colour, radius, shadow, duration and spring traces to a token in §3–§6 |
| 3 | Nothing animates that is on the “do not animate” list (§5.8) |
| 4 | All gestures track 1:1, respect grab offset, and can be reversed mid-flight |
| 5 | Sheets/drawers carry release velocity and project momentum |
| 6 | Every press state fires on pointer-down |
| 7 | Loading / empty / error / populated states exist and are designed |
| 8 | Skeletons match final geometry; no shimmer sweep |
| 9 | No dead buttons, no `console.log` handlers, no mock data |
| 10 | All money uses tabular numerals and Indian grouping |
| 11 | No colour-only status signalling |
| 12 | Focus visible everywhere; keyboard path works end to end |
| 13 | 44×44 targets; 16 px minimum input font |
| 14 | `prefers-reduced-motion`, `-transparency`, `-contrast` handled |
| 15 | Mobile 375/414 and desktop 1280/1440 verified with no overflow |
| 16 | `100dvh` used; safe-area insets applied |
| 17 | Translucency only where §4.2 allows; no stacked light materials |
| 18 | Typography uses size-specific tracking and inverse leading |
| 19 | Long-content stress test passed (seller names, titles, prices, counts) |
| 20 | No grocery-only iconography or illustration |

---

## 13. Audit 01 — `apple-design` Skill Review

**Scope:** the specification in this document, evaluated against the installed skill. No UI code exists yet (Phase 1 not started), so findings are **specification-level**: they identify what must change *before* implementation, not runtime defects.
**Method:** walk the skill section by section (§1–§17), map each principle to a HAAT surface, judge the specification, and assign an action.
**Verdict:** the baseline is **buildable but not yet complete** — 8 requirements pass, 8 are at risk and need action before the first UI PR, 4 are blocked by product/schema decisions.

### 13.1 Principle-by-principle findings

| ID | Skill principle | What the skill demands | HAAT status | Finding / required action | Priority |
|---|---|---|---|---|---|
| A-01 | §1 Response | Respond on pointer-down; zero latency on the input path | **Pass** | §6.1 mandates `:active` on press, `touch-action: manipulation`, tap-slop; §12 check 6 enforces it | — |
| A-02 | §2 Direct manipulation | 1:1 tracking, respect grab offset | **Pass (spec)** | §5.5 items 2, 4 specify pointer capture and offset; no component yet implements it | P0 at build |
| A-03 | §3 Interruptibility | Never lock input; animate from presentation value | **At risk** | Specified, but Radix `Sheet`/`Dialog` default to CSS transitions that cannot be grabbed. The cart drawer and chat sheet **must** be re-implemented on Motion + Pointer Events | P0 |
| A-04 | §4 Springs | Springs for anything touchable; damping 1.0 default, 0.8 for momentum | **Pass** | §5.2 token table defines five springs, bounce reserved for momentum | — |
| A-05 | §5 Velocity handoff | Continue at the finger's exact release velocity | **At risk** | No implementation contract yet. Needs a shared `useDraggableSheet` hook so velocity normalisation is written once, not per screen | P0 |
| A-06 | §6 Momentum projection | Project the resting point, snap to nearest, `d = 0.998` | **Pass** | §5.4 supplies `project()` and `DECELERATION_SNAPPY` for the calendar/gallery | — |
| A-07 | §7 Spatial consistency | Symmetric in/out paths; anchored origins | **At risk** | §5.5 items 7–8 state the rule, but no per-component origin table exists. Menus over tables (moderation panel, product row actions) will default to center origin unless specified | P1 |
| A-08 | §8 Directional hint | Intermediate frames telegraph the outcome | **At risk** | Not addressed beyond sheets. Slot-picker day transitions and stepping through checkout currently use cross-fades, which do **not** hint direction | P2 |
| A-09 | §9 Rubber-banding | Progressive resistance at boundaries | **At risk** | Constant defined (§5.4) but no surface declares a boundary. Calendar edge, drawer over-drag and gallery ends all need it explicitly | P1 |
| A-10 | §10 Gesture details | Hysteresis, cancel-by-drag-away, parallel gesture detection | **At risk** | Only `HYSTERESIS_PX` is defined. Cart line swipe-to-remove and gallery pinch need a written recogniser contract; PNG gesture recognisers that report only final state are banned | P1 |
| A-11 | §11 Frame smoothness | Compositor-only properties; stretch/blur for fast motion | **At risk** | §5.7 bans layout animation, but long product grids and chat history are untested. `animation-performance` must run before Phase 7 chat sign-off | P2 |
| A-12 | §12 Materials | Translucency = hierarchy; never stack light on light; scroll edge, not dividers | **Pass** | §4.2 is an exhaustive allow-list; §4.3 forbids stacking; §5.5 requires `mask-image` edges | — |
| A-13 | §13 Multimodal feedback | Causality, harmony, utility | **N/A (v1)** | No audio/haptics in MVP. Rule recorded so post-MVP work cannot add lagging feedback | — |
| A-14 | §14 Reduced motion | Three media queries; cross-fade instead of motion | **At risk** | §5.6 defines the CSS, but no hook contract exists and Radix/Motion defaults do not respect it. Needs `useEnvironment()` + a lint rule banning raw `transition:` outside token files | P0 |
| A-15 | §15 Typography | Size-specific tracking; inverse leading; system font by default | **At risk** | Nunito Sans is a brand mandate with no optical-size axis and no tracking table in the old docs. §3.2 now fixes weights (400/600/800), tracking and tabular numerals, but the brand-font vs. system-font tension is a **product decision** (see 13.3) | P1 |
| A-16 | §16 Purpose / restraint | Decide what not to build; no decoration | **Pass** | §2 banned-pattern table, §5.8 do-not-animate list, §13.2 slop-risk column | — |
| A-17 | §16 Familiarity / consistency | Same-looking things behave the same, in the same place | **Pass** | §9.0 fixes navigation placement per role; §7 fixes component contracts | — |
| A-18 | §16 Simplicity | Hierarchy, one primary action per screen | **Pass** | Each screen spec opens with a stated primary action (§9.1–9.18) | — |
| A-19 | §16 Craft | Nothing random; every value defensible | **At risk** | Tokens are complete, but no enforcement. Need Stylelint rules: no arbitrary px, no raw hex outside tokens, no `transition: all` | P0 |
| A-20 | §17 Process | Prototype interactively; motion and visuals designed together | **Blocked** | No app scaffold exists (Phase 1 pending). Motion cannot be reviewed until `apps/web` boots | P0 dependency |

### 13.2 Screen-level slop-risk audit

| Screen | Motion exposure | Slop risk | Specific mitigation |
|---|---|---|---|
| Buyer home | Low | **High** — most template-prone screen | Asymmetric hero, no gradient, no 3-card row, single primary action (§9.1) |
| Search results | Low | Medium | Facet rail not pill soup; removable chips only (§9.2) |
| PDP | Medium (gallery) | Medium | Reserve variant height; no price animation; dual-action weight hierarchy (§9.3) |
| Storefront | Low | Medium | Real banner imagery, no overlaid marketing text (§9.4) |
| Cart drawer | **High** (drag/spring) | Low | Rebuild on Motion; velocity handoff; grouped headers (§9.5) |
| Checkout | Medium | **High** — steppers are template gold | Labelled 4-node stepper, per-group slots, no confetti (§9.6) |
| Order tracking | Low | Medium | Reveal only new status; no pulsing current node (§9.7) |
| RFQ flows | Low | Medium | Marigold reserved, real expiry text (§9.8) |
| Chat | High (sheet + scroll) | Medium | Spring sheet, single-cycle typing dots (§9.9) |
| Seller dashboard | Low | **High** — metric tiles invite generic dashboards | Four dense tiles + “what must I do today”, no welcome hero (§9.10) |
| Seller products | Low | Medium | Real `DataTable`, no card grid on desktop (§9.11) |
| Seller delivery | Low | Medium | Weekly grid + plain-language preview (§9.12) |
| Seller fulfilment | Low | Low | Only valid next action offered (§9.13) |
| Admin verification | Medium (zoom) | Medium | Split pane, spring zoom, controlled rejection reasons (§9.15) |
| Admin moderation | Low | Low | Side panel preserves filter context (§9.16) |
| Admin disputes | Low | Medium | Typed-amount confirmation, no checkbox theatre (§9.17) |
| Admin audit | None | Low | Mono, chips, zero edit affordances (§9.18) |

### 13.3 Blocked items — require a human decision

| ID | Blocker | Why it blocks | Recommended default |
|---|---|---|---|
| `DES-01` | **Typeface** | Brand mandates Nunito Sans; the skill argues for the system font (optical sizing, tracking tables). Nunito Sans carries “friendly consumer” connotations that fight the commercial register | Keep Nunito Sans for buyer surfaces and the wordmark; use system UI for seller/admin dense tables. Decide before `TSK-P1-05` |
| `DES-02` | **Density default** | Seller/admin density (comfortable vs. compact) is a workflow preference, not a visual one | Default compact for tables, comfortable for forms; expose a toggle in settings |
| `DES-03` | **Photography** | The hero, PDP and storefront depend on real product imagery. Placeholder photography is the fastest route back to slop | No hero ships without ≥ 1 licensed product scene; until then use a structured price/tier artifact, not stock photos |
| `DES-04` | **Commission & payouts UI** (`DEC-01`, `DEC-03` in the PRD) | Seller earnings surfaces cannot be designed without knowing whether HAAT collects centrally | Ship without earnings screens; add after the decision |

### 13.4 Prioritized remediation plan

**P0 — before the first UI PR (`TSK-P1-05`)**
1. Generate token files: `tokens.css` (colour, space, radius, shadow, material), `tokens.motion.ts` (springs, durations, physics constants). No component may hard-code a value.
2. Build `useEnvironment()` for the three media queries; wire data attributes on `<html>`.
3. Build `useDraggableSheet` (pointer capture, offset, velocity history, projection, rubber-band, velocity handoff) as the **single** implementation for cart drawer, chat sheet, facet sheet and mobile checkout sheet.
4. Add Stylelint: ban raw hex, arbitrary px, `transition: all`, `!important` outside reduced-motion blocks.
5. Storybook (or a route-based gallery) with one story per component in all four states + reduced-motion variants.

**P1 — during Phase 2–4 UI work**
6. Per-component `transform-origin` table for popovers/menus anchored to triggers.
7. Explicit boundary declaration for calendar edges, gallery ends and drawer over-drag.
8. Gesture recogniser contract for swipe-to-remove (cart line) and pinch (gallery); parallel detection from first move.
9. Resolve `DES-01` typeface decision and lock the type scale.

**P2 — Phase 6–8**
10. Run `animation-performance` on product grids, slot calendar and chat history.
11. Add directional hinting to checkout step transitions (or explicitly keep cross-fade and document why).
12. Run `break-ui` on every screen with worst-case Indian commerce data (long seller names, ₹9,99,999, `MOQ 10,000`, empty pincode coverage).
13. Run `learn-taste` at the end of each session to append corrections to §14.

### 13.5 Re-audit protocol

Re-run this audit at the end of Phase 4, Phase 7 and Phase 10. Record each run as **Audit 02 / 03 / 04** at the bottom of this file with:

- Date and phase
- Skill version installed
- Findings table (same columns as §13.1)
- Counts: pass / at-risk / blocked
- Remediation owners and task IDs
- Screenshots or recordings for every motion claim

An audit without evidence (recordings, frame-by-frame captures) is not an audit.

---

## 14. Change Log & Decision Log

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0.0 | 2026-11-17 | Baseline: brand tokens, anti-slop stance, motion system from `apple-design`, component inventory, 18 screen specs, Audit 01 (8 pass / 8 at-risk / 4 blocked) | Design engineering |

**Decision log**

| ID | Decision | Rationale |
|---|---|---|
| `DSN-01` | Navy is ink and function, never a gradient wash | Removes the most common AI marketplace look; keeps contrast predictable |
| `DSN-02` | Marigold reserved exclusively for wholesale/B2B signals | Gives B2B and B2C two instantly legible registers without a second palette |
| `DSN-03` | Shadow only on floating surfaces | Hairline structure reads as a commercial instrument; shadow is hierarchy, not decoration |
| `DSN-04` | Radii capped at 14 px; pills only for status | Counters the “friendly toy” register inherent in a rounded typeface |
| `DSN-05` | All gesture surfaces built on Motion + Pointer Events, not CSS transitions | Interruptibility is non-negotiable (skill §3); Radix defaults cannot deliver it |
| `DSN-06` | No scroll-triggered entrances anywhere | Protects perceived speed and avoids attention theater |
| `DSN-07` | Seller/admin use the same tokens with a density attribute | One system, two densities — not two design systems |
| `DSN-08` | Money always tabular, mono for SKUs/IDs/timestamps | Signals commerce credibility; prevents layout jitter |

---

## 15. Agent Instructions (copy-paste safe)

When implementing any HAAT UI task, an agent must:

1. Read §2, §3 and §6 of this file **before** writing a component.
2. Invoke the `apple-design` skill before any motion, gesture, material or typography decision.
3. Use only tokens; if a value is missing, add it here first, then use it.
4. Implement all four states (§8) and the three reduced-preference variants (§5.6).
5. Never implement a gesture with CSS transitions or keyframes.
6. Run the §12 gate before opening a PR, and paste the checklist result into the PR body.
7. If a screen in §9 is ambiguous, stop and ask — do not invent layout.
8. If a `DES-*` or `CNF-*` item blocks the screen, stop and raise it (PRD §15.9).
9. After the session, append corrections to §14 so the next agent inherits the taste, not the mistake.

**Definition of Design Done:** all 20 gate checks pass, the four states exist, reduced-motion parity is demonstrated, and the screen has been reviewed at 375/414/1280/1440 with worst-case data.

---

*End of `planning/Design.md` — v1.0.0*
