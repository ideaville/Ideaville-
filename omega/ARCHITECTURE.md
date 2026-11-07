# OMEGA architecture & readiness

## Entity

- **Ideaville Enterprise** (Nigeria-first; UK deferred)
- Distribution/validation partner **Olusegun Kay** is recorded as a distributor (`KAY-PARTNER`, `pending_terms`) — **not** an automatic app admin
- Other distributors exist in the field; roster/terms not fully available → admin-managed, start pending

## Stack

| Layer | Choice |
| --- | --- |
| UI | Vite + React (existing), shop / login / admin / distributor |
| API | Hono on Vercel Node (`api/index.ts`), packaged via Build Output API (`npm run build:vercel` → `.vercel/output/functions/api.func`) — **Vite SPA build alone does not ship `/api`** |
| Auth | App sessions (HttpOnly cookie + scrypt password hashes). **Vercel SSO ≠ app roles** |
| Persistence | Postgres via `DATABASE_URL` (schema in `migrations/001_init.sql` / `server/store/schemaSql.ts`). Memory store for **tests only** (`OMEGA_ALLOW_MEMORY_STORE=1` local) |
| Hosting | Existing protected `omega-staging` Vercel project — do not widen protection |

## Vercel packaging (required)

Preview must emit **both** static SPA and a Node serverless function:

1. `vercel.json` sets `framework: null` and `buildCommand: npm run build:vercel` (do not rely on Vite preset alone).
2. `scripts/build-vercel.mjs` writes Build Output API v3 under `.vercel/output/`:
   - `static/` — Vite `dist`
   - `functions/api.func/` — bundled Hono handler (`shouldAddHelpers: false`)
   - `config.json` — `/api/*` → function; SPA filesystem + `index.html` fallback
3. Prove locally: `npm run build:vercel && npm run verify:vercel-output`
4. `/api/health` returns `{ ok: true }` with **no** `DATABASE_URL`. Commerce routes stay **503 / empty catalog** until Postgres is configured (parent owns DB setup; this repo does not provision).

## Fail closed

Checkout requires **all** of:

1. `commercial_activation`
2. `checkout_enabled`
3. `payment_provider_configured`
4. `delivery_policy_configured`
5. Product `saleable` + `approved_for_sale` (samples never saleable)
6. Active server-side price for channel
7. Available stock (reserved atomically)

No client-supplied prices. No client mark-paid. No fabricated commission defaults. Wholesale margin ≠ commission.

## Historic draft data (not live)

Oct 17 notes: retail **₦6,500** / trade **₦4,500** per **50ml** stored as **draft** prices on `OMEGA-50ML-DRAFT` (not approved for sale). 30ml sample SKU non-saleable. 30 vs 50 volume unresolved.

## Smallest owner setup (no secrets in git)

1. Attach Postgres to Vercel project `omega-staging` (Neon/Vercel Postgres already available to the account — do not invent new paid plans if free tier exists).
2. Set env on the preview project:
   - `DATABASE_URL` — Postgres connection string
   - `OMEGA_BOOTSTRAP_ADMIN_EMAIL` / `OMEGA_BOOTSTRAP_ADMIN_PASSWORD` — first admin only (min 10 chars). Share out-of-band with Femi; never commit.
3. Redeploy the PR preview (Git push or Vercel redeploy). Migration `001_init` runs on boot.
4. Sign in at `/login`, review distributors/products, keep activation **off** until SKU/price/stock/payment/delivery are real.
5. Create distributor user accounts in admin API; do not email invites from this app.

## Readiness matrix

| Capability | Implemented in code | Tested locally | Externally connected on preview | Operational |
| --- | --- | --- | --- | --- |
| Schema + migrations | Yes | Yes (SQL present; PG migrate on boot) | Needs `DATABASE_URL` | Blocked until env set |
| Memory commerce rules | Yes | Yes (`server/commerce.test.ts`) | N/A (not for multi-instance preview) | Tests only |
| Postgres commerce adapter | Yes | Not against live PG in CI (no DB in agent) | Needs `DATABASE_URL` | Blocked until env set |
| App login/sessions | Yes | Via store tests + API routes | Needs persistence | Blocked until env set |
| Catalog UI | Yes | Build | Works degraded (empty) without DB | Browse message when unconfigured |
| Checkout / payments | Gated off | Fail-closed tests | No provider | Off |
| Commissions / payouts | Terms draft only, no auto payout | Rate required to activate | — | Off |
| Vercel SSO protection | Unchanged | — | Enabled on project | Host gate only |

## Local commands

```bash
cd omega
npm test
npm run build
npm run build:vercel && npm run verify:vercel-output
OMEGA_ALLOW_MEMORY_STORE=1 npm run dev:api   # terminal 1
npm run dev                                  # terminal 2
```
