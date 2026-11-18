# HAAT — Build Memory

> **Purpose.** This file is the handoff record for the person (or agent) picking up the codebase.
> It states exactly what has been built, what has been verified, what has **not** been verified,
> and what the next part must do. The specification lives in `planning/PRD.md`; the visual system
> lives in `planning/Design.md`. If this file and the PRD disagree, the PRD wins and this file is
> wrong — fix it.
>
> Last updated: **2026-11-18** · Part **1** of 3 · Delivery status: **code complete, runtime acceptance pending**

---

## 1. Where the project stands

The PRD splits delivery into three parts (§16.0):

| Part | Scope | Status |
|---|---|---|
| **1** | Foundation & Commerce Core (Phases 1–3) | **Built.** Typecheck, build and shared unit tests green. Runtime walk-through not yet executed (no MongoDB on this machine — see §9). |
| **2** | Buyer Commerce & Scheduled Fulfilment (Phases 4–6) | Not started. |
| **3** | Real-Time, Payments, Admin & Hardening (Phases 7–10) | Not started. |

Part 1 delivers: monorepo, shared contracts, Express + MongoDB API, auth with refresh
rotation, seller onboarding/KYC record, category tree, the product aggregate (variants, tiers,
images), a public read-only catalogue, and the seller product console.

Part 1 deliberately contains **no** cart, checkout, orders, slots, chat, RFQ, payments or admin
screens. There are no disabled navigation placeholders for them (PRD §15.3).

---

## 2. Toolchain and the one environment quirk

- Node **v22.17.1**, npm **10.9.2**, Windows 10/11 (win32).
- pnpm **9.15.0** via the `packageManager` field, but **`corepack enable` fails with `EPERM`**
  on this machine (it tries to write `C:\Program Files\nodejs\pnpm`). Use `npx` instead:

```powershell
npx -y pnpm@9.15.0 install
npx -y pnpm@9.15.0 -r typecheck
npx -y pnpm@9.15.0 --filter @haat/shared test
npx -y pnpm@9.15.0 -r build
```

Once pnpm is available normally, the root scripts work as written:
`pnpm install`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm dev`, `pnpm seed`.

### Workspace layout

```
package.json               pnpm workspace root (scripts above)
pnpm-workspace.yaml
tsconfig.base.json         strict, moduleResolution: Bundler, @haat/shared path alias
.env.example               full environment matrix
README.md                  project overview, setup, API summary, roadmap
packages/shared            @haat/shared — enums, money, pricing, Zod contracts, API types
apps/api                   @haat/api — Express 4 + Mongoose 8, ESM, esbuild bundle
apps/web                   @haat/web — React 18 + TypeScript + Vite 6 + Tailwind 3.4
planning/PRD.md            single source of truth (v2.2.0, Amendment A-1)
planning/Design.md         anti-slop design system + screens + review gate
planning/Memory.md         this file
```

`@haat/shared` is consumed as **TypeScript source**, not a built artefact:
- `packages/shared/package.json` → `"main": "src/index.ts"`
- Vite aliases `@haat/shared` to `packages/shared/src/index.ts`
- API dev (tsx) resolves it through `tsconfig` paths
- The API **bundle** needs an explicit esbuild alias:
  `--alias:@haat/shared=../../packages/shared/src/index.ts`
  (without it, esbuild tries to bundle `main: src/index.ts` as a package and fails)

---

## 3. What is built

### 3.1 `packages/shared`

| File | Contents |
|---|---|
| `enums.ts` | `USER_ROLES`, `SELF_SIGNUP_ROLES`, `KYC_STATUSES`, `ORDER_STATUSES`, `PAYMENT_*`, sizes, etc. |
| `money.ts` | Integer-paise helpers: `rupeesToPaise`, `paiseToRupees`, `formatPaise`, `isPaise`, `assertPaise`, `mulPaise`, `sumPaise`. |
| `pricing.ts` | `PriceTier`, `validateTiers` (gaps/overlap/open-ended), `resolveUnitPricePaise`, `activeTier`, `quantityViolation`. |
| `api.ts` | Envelope types (`ApiSuccess`, `ApiErrorShape`, `PaginationMeta`), `paginationMeta()`, `ERROR_CODES`. |
| `schemas/auth.ts` | `phoneSchema`, `passwordSchema`, `emailSchema`, `registerSchema`, `loginSchema`. |
| `schemas/seller.ts` | GSTIN/PAN/IFSC/PINCODE regexes, `storeSlugSchema`, `sellerOnboardingSchema`. |
| `schemas/catalog.ts` | `productQuerySchema`, `categoryCreateSchema`, `createProductSchema`, `updateProductSchema` (+ variant/image/tier schemas, tier refinement, duplicate variant SKUs, `isActive` on update). |
| `__tests__` | 30 vitest tests: money arithmetic/parsing/formatting (9), tier validation and resolution (12), product schema rules (9). |

Rules encoded here that the rest of the repo relies on:
- **Money is an integer count of paise** (`Number`, checked with `Number.isSafeInteger`).
  No floats in the database, no `toFixed` arithmetic.
- Tier ranges are inclusive `[min, max]`; `maxQuantity: null` means open-ended and is only
  legal on the final tier.
- A product must have ≥ 1 variant, ≤ 10 images, ≤ 20 tiers, ≤ 30 variants, unique variant SKUs.

### 3.2 `apps/api`

Entry points: `src/server.ts` (boot + graceful shutdown), `src/app.ts` (middleware + `/health`),
`src/routes/index.ts` (mounts `/api/v1`).

```
src/config/env.ts        dotenv + Zod-validated environment (fails fast, exits 1)
src/config/db.ts         mongoose.connect; sanitizeFilter on; autoIndex only outside prod
src/lib/logger.ts        structured JSON logger
src/lib/AppError.ts      typed operational errors (code, message, status, details)
src/lib/http.ts          sendSuccess(res, data, status?, meta?)
src/middleware/          requestContext (X-Request-Id), accessLog, auth (Bearer), rbac,
                         validate (body/query/params), rateLimit (sliding window), error, notFound
src/utils/               password (bcryptjs), tokens (JWT + opaque refresh + cookie opts),
                         slug (slugify/uniqueSlug), pagination
src/models/              User, BuyerProfile, SellerProfile, Address, Category, Product,
                         RefreshToken, AuditLog (+ barrel)
src/modules/auth/        register, login, refresh rotation, logout, /me
src/modules/sellers/     onboarding, /me, public slug availability
src/modules/catalog/     category tree + product CRUD + public browse
src/modules/uploads/     Cloudinary signed-upload signature
src/providers/cloudinary.ts
src/seed/seed.ts         idempotent demo data (categories, admin, verified seller, 6 products)
```

#### API surface (Part 1)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | — | 200 `up` / 503 `degraded` (includes db state) |
| GET | `/api/v1/health` | — | lightweight liveness inside the API router |
| POST | `/api/v1/auth/register` | — | rate-limited; returns user + access token, sets refresh cookie |
| POST | `/api/v1/auth/login` | — | rate-limited; phone or email identifier |
| POST | `/api/v1/auth/refresh` | cookie | rotates the refresh token; replay revokes the family |
| POST | `/api/v1/auth/logout` | cookie | revokes the presented token, clears cookie |
| GET | `/api/v1/auth/me` | Bearer | `{ user, seller }` |
| GET | `/api/v1/sellers/slug-available?slug=` | — | live onboarding feedback |
| POST | `/api/v1/sellers/onboarding` | BUYER or SELLER | creates the store, upgrades `user.role` to SELLER |
| GET | `/api/v1/sellers/me` | BUYER or SELLER | owner-only profile |
| GET | `/api/v1/categories` | — | full active tree, cached 60 s |
| POST | `/api/v1/categories` | ADMIN / SUPER_ADMIN | writes an audit log entry |
| GET | `/api/v1/products` | — | public, `isActive && isApproved`, filters: `q`, `category`, `seller`, `sort`, `page`, `limit` |
| GET | `/api/v1/products/:slug` | — | public, approved only |
| GET | `/api/v1/products/mine` | SELLER | own catalogue, any status |
| GET | `/api/v1/products/mine/:id` | SELLER | own product, any status |
| POST | `/api/v1/products` | SELLER | create; `isApproved = seller.isVerified` |
| PATCH | `/api/v1/products/:id` | SELLER | partial update; accepts `isActive` to restore an archived listing |
| DELETE | `/api/v1/products/:id` | SELLER | archive (`isActive: false`), never a hard delete |
| POST | `/api/v1/uploads/signature` | SELLER | Cloudinary signed direct upload parameters |

Responses always use `{ success, data, error, meta? }`. Errors carry
`error.code` (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`DUPLICATE_KEY`, `RATE_LIMITED`, `INTERNAL_ERROR`, …) and `error.details[]`.

#### Auth mechanics (do not break these)

- Access token: JWT, 15 min, `sub = userId`, `role` embedded. Stored **in memory only** in the browser.
- Refresh token: opaque 48 random bytes (base64url); **only its SHA-256 hash** is stored.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/api/v1/auth`.
- Rotation: refresh revokes the old row and issues a new one. Presenting an already-revoked token
  revokes **every** active session for that user (theft response).
- `RefreshToken.expiresAt` has a MongoDB TTL index.
- Passwords: `bcryptjs` (pure JS — chosen because `argon2` native builds were unreliable here),
  cost from `BCRYPT_COST` (default 12).

#### Catalogue decisions

- Product `sellerId` references `SellerProfile._id`, not `User._id`.
- `sellerName` / `sellerSlug` / `categoryPath` are denormalized so list surfaces never join.
- Variants and tiers are **embedded** so a future stock decrement is one atomic document update.
- `slug` and `sku` are globally unique. `variants.sku` has a unique multikey index.
- Products from unverified sellers are saved with `isApproved: false` and are invisible publicly.
- Public list filters on `isActive && isApproved`; the seller console uses `/products/mine`.
- `sanitizeFilter` is enabled globally (NoSQL-injection defence). Code-controlled operator
  filters must be wrapped in `mongoose.trusted({...})` — this is already done for `$text` and
  `$in` in `product.service.ts`. **Any new `$`-operator from application code needs the same wrap.**
- Text index: `title` (10), `sku` (8), `brand` (4), `description` (2), named `product_search`.

#### Mongoose typing trap (cost ~30 minutes; do not repeat it)

Combining `toJSON: { virtuals: true }` **with** a typed `transform` makes
`InferSchemaType` collapse every field to `unknown` (`role` becomes `unknown`, `passwordHash`
becomes `{}`). The fix used here: no custom `toJSON.transform` anywhere; DTO mappers shape
responses, and `passwordHash` is `select: false`. Keep it that way.

### 3.3 `apps/web`

React 18 + TypeScript, Vite 6, Tailwind 3.4, React Router 6.28, TanStack Query 5,
React Hook Form 7 + Zod, lucide-react icons, clsx.

```
public/brand/                 haat-banner.jpg, haat-og.jpg, haat-mark.png, haat-mark-128.png,
                              favicon-32.png, favicon-48.png, apple-touch-icon.png
index.html                    title, description, favicons, Open Graph and Twitter card meta
src/main.tsx                  QueryClient + AuthProvider + RouterProvider
src/App.tsx                   createBrowserRouter; RootLayout adds ScrollRestoration once
src/index.css                 Design.md tokens, focus ring, .tnum, .skeleton, .img-fallback, .scrim
src/lib/api-client.ts         single-flight refresh on 401, ApiError, typed helpers
src/lib/types.ts              API DTO shapes mirrored from the server
src/lib/format.ts             money/moneyExact (Intl en-IN), dates, initials
src/components/ui/            Button, TextField/TextAreaField/SelectField, Badge, Panel/Notice,
                              States (skeletons/empty/error), ConfirmDialog
src/components/catalog/       ProductCard, ProductMedia (SKU fallback, never a broken icon)
src/components/layout/        BuyerHeader/Footer, BuyerLayout, SellerLayout (240 px rail)
src/components/seller/        VariantMatrix, TierEditor, ImagePicker, ProductPreview
src/features/auth/            AuthProvider, guards (RequireAuth/RequireSeller), form schemas
src/features/catalog/         category tree, public product queries, flattenCategories
src/features/products/        seller queries/mutations, Cloudinary upload, editor form model
src/pages/                    Home, Catalogue, Product, Login, Register, SellerOnboarding,
                              SellerProducts, ProductEditor, NotFound
```

#### Routes

| Path | Access | Page |
|---|---|---|
| `/` | public | Home (search, categories, newest listings, seller CTA) |
| `/catalogue` | public | Catalogue (search, category, sort, pagination, clear filters) |
| `/product/:slug` | public | Read-only PDP (gallery, tiers, variants, stock) |
| `/login`, `/register` | public | Auth (register can preselect SELLER) |
| `/seller/onboarding` | any signed-in user | Store creation (still under the buyer chrome) |
| `/seller` | onboarded seller | redirects to `/seller/products` |
| `/seller/products` | onboarded seller | Product table: search, stock, status, archive |
| `/seller/products/new` | onboarded seller | Product editor (create) |
| `/seller/products/:id/edit` | onboarded seller | Product editor (edit/restore) |
| `*` | public | 404 |

#### Frontend behaviour worth knowing

- **Session boot:** `AuthProvider` calls `POST /auth/refresh` once on mount, then `/auth/me`.
  Routes wait in a skeleton instead of flashing signed-out content.
- **Role upgrade:** onboarding calls `refreshSession()` before navigating, because the old
  access token still says `BUYER`.
- **401 handling:** one shared refresh promise; requests retry once after rotation. Auth calls
  pass `skipRefresh` so they cannot recurse.
- **Editor form:** rupees are strings in the form and converted **once** at submit via
  `rupeesToPaise`. `validateTiers` runs on submit and live in `TierEditor`. The right column is
  a live buyer preview built from the same form state.
- **Restoring an archived product:** the editor exposes “Listed in the catalogue”. The table's
  Archive action is the quick path; the checkbox is the undo.
- **Uploads:** browser → `POST /uploads/signature` → direct `POST` to Cloudinary with
  `file, api_key, timestamp, folder, signature` (+ optional preset). The API secret never
  leaves the server. Manual URL entry exists as a fallback when Cloudinary is unconfigured.

---

## 4. Design system implementation

`planning/Design.md` is normative. Two registers share one token set:
buyer surfaces (`--canvas`, generous spacing) and seller surfaces (`--canvas-admin`, denser).

Implemented tokens: navy `--brand-*` (canonical `#1F319D`), navy-tinted `--ink-*` neutrals,
`--line` hairlines, semantic fg/bg pairs, marigold `--b2b-*` **only** for MOQ/wholesale,
Nunito Sans (Google Fonts) + system fallback, 6/8/10/14 px radii + pill, three shadows
(`card` for rails, `float` for overlays, `sheet` for dialogs).

Rules actively followed in code:
- No gradient heroes, no glassmorphism, no `rounded-3xl`, no shadow on every card.
- No emoji icons; icons are `lucide-react` at 1.75–2 px stroke.
- No shimmer skeletons; static blocks matching final geometry (`.skeleton`).
- No `transition: all`; transitions name the property and use the motion tokens.
- Empty/error/loading/populated states on every data surface; copy states what failed.
- All money and quantities carry `tabular-nums` (`.tnum` / `font-variant-numeric`).
- Missing product imagery renders a hairline texture + SKU, never a broken-image glyph.

**Do not use opacity modifiers on CSS-variable colours** (`bg-brand-600/20` produces invalid
CSS because the token is a `var()` without a channel split). Use the explicit `--brand-*` steps
or the semantic `*-bg` tokens instead.

### 4.1 Brand assets

The supplied masters live at the repository root (`HAAT India's Marketplace Branding.png`,
1536×1024, and `haat_logo_transparent.png`, 1294×1216). Web-ready derivatives are committed in
`apps/web/public/brand/` and served from `/brand/…` in development and production:

| File | Size | Use |
|---|---|---|
| `haat-banner.jpg` | 1400×707, 84 kB | README hero only. Cropped from the banner to remove dead paper and rescaled. |
| `haat-og.jpg` | 1200×630, 53 kB | `og:image` and Twitter card |
| `haat-mark-128.png` | 128×128, 32 kB | Header (28 px), footer (22 px), seller rail (24 px) |
| `favicon-32.png`, `favicon-48.png`, `apple-touch-icon.png` | 32/48/180 | Browser and iOS icons, composited on the banner paper colour |

The full-resolution logo master stays at the repository root; only the sizes the product
actually uses are served.

Rules:
- The banner is a README and social-preview asset. It is **not** repeated inside the buyer
  hero; the logo mark plus the typographic wordmark carry the brand in product chrome.
- The mark is decorative next to live text, so `alt=""` is correct and the link keeps its
  `aria-label`. Do not drop the text instead of the image.
- The transparent mark sits on light surfaces. It is a navy tile, so it disappears against a
  dark background; there is no dark-mode variant yet.
- `og:image` is currently a relative path (`/brand/haat-og.jpg`). Set an absolute origin
  before launch, because most social crawlers do not resolve relative URLs.
- To regenerate, crop the banner to the lockup (content bounds x 78–1448, y 266–878) and
  resize with a high-quality filter. The source paper colour is `#FDF7F3`.

---

## 5. Environment setup (fresh machine)

1. **Install and build**
   ```powershell
   npx -y pnpm@9.15.0 install
   npx -y pnpm@9.15.0 -r typecheck
   npx -y pnpm@9.15.0 -r build   # or: --filter @haat/api build / --filter @haat/web build
   ```
2. **Create `.env` at the repo root** from `.env.example`. Recommended for Part 1:
   `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_ACCESS_SECRET` (≥32 chars) and
   `JWT_REFRESH_SECRET` (≥32 chars). The API reads `apps/api/.env` first, then the root
   `.env`. `VITE_API_URL` belongs in `apps/web/.env` because Vite reads its own project
   directory; the client falls back to `http://localhost:5000/api/v1`.
   Cloudinary values are optional at boot; uploads return 503 until they are set.
3. **MongoDB must be a replica set** if/when transactions are used (Part 2 slot reservation).
   Local single node:
   ```powershell
   mongod --replSet rs0 --dbpath C:\data\haat --port 27017
   mongosh --eval "rs.initiate()"
   ```
   Atlas satisfies this automatically. The URI in `.env.example` includes `?replicaSet=rs0`.
4. **Seed** (idempotent):
   ```powershell
   npx -y pnpm@9.15.0 --filter @haat/api seed
   ```
   Demo credentials:
   - admin — `9000000001` / `Admin@12345`
   - seller — `9876543210` / `Seller@12345` (store `menon-industrial`, verified, 6 products)
5. **Run**
   ```powershell
   npx -y pnpm@9.15.0 dev        # API :5000 + web :5173
   ```
   `FRONTEND_URL` must match the Vite origin because CORS is credentialed and origin-locked.
   Vite is configured with `strictPort: false`; if 5173 is taken, CORS will reject the page —
   pin the port or update `FRONTEND_URL`.

---

## 6. Verified in this environment

| Command | Result |
|---|---|
| `pnpm install` | OK (418 packages; 1 deprecated transitive `q@1.5.1`) |
| `--filter @haat/shared typecheck` | clean |
| `--filter @haat/api typecheck` | clean |
| `--filter @haat/web typecheck` | clean |
| `--filter @haat/shared test` | **30 / 30 passing** (3 files) |
| `--filter @haat/api build` | `dist/server.js` **68.1 kB**, esbuild, ESM, external packages |
| `--filter @haat/web build` | `dist/index.html` 2.19 kB, CSS 24.38 kB (gzip 5.97), JS 446.22 kB (gzip 134.20) |

---

## 7. Not verified (read this before claiming Part 1 is done)

1. **No end-to-end run against MongoDB.** `mongod` is not installed, Docker Desktop's engine is
   not running, and `mongodb-memory-server` stalled downloading a binary for >15 minutes — that
   dependency was removed again rather than left half-installed. So the following are
   type-correct and code-reviewed but **never executed**:
   - register → login → refresh → logout
   - seller onboarding and the BUYER → SELLER role upgrade
   - product create/update/archive/restore, public visibility rules
   - the seed script
   - any Mongoose index creation, unique-index error mapping or TTL behaviour
2. **Cloudinary upload never executed** (no credentials). Signature construction follows
   Cloudinary's documented rule (sorted params, sha1, secret appended) but has not been tested
   against the live API.
3. **No API/integration tests exist yet.** Only shared money/pricing/product-schema unit tests.
   Part 2 should add a Mongo-backed integration harness *before* cart/checkout work.
4. **No visual browser QA pass.** The UI builds and is typed. One headless DOM smoke check of the
   production preview confirmed that the brand assets resolve (28 px header mark, 22 px footer
   mark, favicon link present) and that no asset URL 404s, but the pages have not been inspected
   at real breakpoints, and a screenshot was not possible in this session. Run the Design.md §13
   review gate the first time the app is opened.

**First action for the next person:** stand up MongoDB, run the seed, and walk the four Part 1
flows. Fix whatever surfaces, then mark Part 1 accepted in PRD §16.0.

---

## 8. Known gaps and deliberate deferrals

| Item | Why it is deferred | Where it lands |
|---|---|---|
| Cart, checkout, orders, slots | Outside Part 1 by design | Part 2 |
| Search facets (price/rating/pincode) | Needs query/index work + UI | Part 2 |
| Storefront page (`/store/:slug`) | Public browse in Part 1 is intentionally minimal | Part 2 |
| RFQ / quotation lifecycle | Part 2 | Part 2 |
| Chat (Socket.IO + Redis adapter) | Part 3 | Part 3 |
| Razorpay, webhooks, invoices, payouts | Part 3 | Part 3 |
| Admin console / KYC approval UI | Part 3 (seed sets a verified seller so Part 1 is demonstrable) | Part 3 |
| Redis-backed rate limiting | In-memory sliding window is single-node only | Part 3 (`TSK-P10-02`) |
| CSRF enforcement | Client sends `X-Requested-With`; server does not verify it yet | Part 3 |
| Cloudinary asset cleanup on delete | Archive is soft-delete; images remain | Part 3 |
| Category `productCount` accuracy | Incremented on create, not decremented on archive; counts include unapproved products | Part 2/3 reconciliation job |
| True drag-and-drop reorder library | HTML5 drag on a grip + explicit move buttons (keyboard accessible) | Revisit only if usability demands |
| Store logo/banner upload UI | API accepts URLs; no editor surface yet | Part 2 seller settings |
| Password reset / phone OTP | Not in Part 1 scope | Later amendment |
| Open design decisions `DES-01` (font), `DES-02` (density), `DES-03` (photography), `DES-04` (payout UI) | Documented in Design.md; not blocking Part 1 | Before Part 2 UI work |

---

## 9. Conventions the next contributor must keep

- **Specs before code.** PRD for behaviour, Design.md for UI. Do not invent endpoints or tokens.
- **Money in paise, always.** Convert at the boundary (forms → API, API → DB). Never store rupees.
- **No cross-part forward references.** Do not stub navigation for Part 2/3 screens.
- **One DTO layer per module.** Mongoose documents never leave the service layer.
- **Object-level authorisation.** Every seller mutation re-resolves the seller profile and
  compares `product.sellerId`; never trust the id in the URL.
- **Validation at the edge.** Every route body/query goes through `validate(...)` with a schema
  from `@haat/shared`; the client reuses the same primitives.
- **Errors are operational.** Throw `AppError.*`; the middleware maps Mongoose duplicate keys
  and Zod issues into the standard envelope.
- **`mongoose.trusted()` for code-owned operators.** See §3.2.
- **Nothing is `console.log`ged in request paths** — use `logger`.
- Comments explain *why*, and cite the PRD clause when a decision is non-obvious.

---

## 10. Suggested next moves (Part 2 kickoff)

1. Add a Mongo-backed API test harness (Vitest + a real `mongod` or Atlas test database),
   covering the Part 1 flows listed in §7 and the refresh-replay behaviour.
2. Reconcile category counters (or replace `productCount` with an aggregation at read time).
3. Build the buyer storefront and search facets against the existing `productQuerySchema`
   (extend it with price range/rating/pincode rather than adding a parallel schema).
4. Cart: server-side cart document grouped by seller, with `quantityViolation` applied per line
   at add/update time; reuse `resolveUnitPricePaise` rather than re-implementing tier maths.
5. Slots: `slotcounters` with atomic `$inc` and `session.withTransaction` (PRD §14.8) — the
   replica-set requirement already documented in §5.
6. Run the Design.md §13 audit gate on every new screen; append findings as `Audit 02`, `03`, …