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
| Persistence | Postgres via `DATABASE_URL` — private schema **`omega`** (not `public`); DDL in `migrations/` + `server/store/schemaSql.ts`. Staging handoff: `migrations/staging_supabase_handoff.sql`. Memory store for **tests only** (`OMEGA_ALLOW_MEMORY_STORE=1` local) |
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

## Referral & distributor network

Recovered from original ecosystem intent + launch-review constraints:

| Capability | Implementation | Not included |
| --- | --- | --- |
| Distributor roster | Admin-managed; Kay seeded as `KAY-PARTNER` (`pending_terms`) | Invented partner names |
| Referral codes | Per-distributor `referral_code` (defaults to code) | Public signup funnels |
| Referral records | Server `referrals` rows with prospect label + status; tenant-scoped list/create | Demo points, £ earnings, mock ledger |
| Network view | Sponsored distributors via optional `sponsor_id`; own referrals + terms | Rank ladder, residuals, equity promises |
| Commission | Only via admin `commercial_terms` with explicit `rate_bps` | Auto payouts or default % |

APIs: `GET/POST /api/distributor/network|referrals`, `GET /api/referrals/lookup`, admin overview includes referrals.

## Historic draft data (not live)

Oct 17 notes: retail **₦6,500** / trade **₦4,500** per **50ml** stored as **draft** prices on `OMEGA-50ML-DRAFT` (not approved for sale). 30ml sample SKU non-saleable. 30 vs 50 volume unresolved.

## Smallest owner setup (no secrets in git)

Full staging connector process: [`docs/STAGING_DB_HANDOFF.md`](./docs/STAGING_DB_HANDOFF.md) (artifact twin: `/opt/cursor/artifacts/omega-staging-setup.md`).

1. Dedicated staging project `jhgnekpjywntgctgelnz` — schema already applied via connector. Parent applies `004_revoke_omega_app_create.sql` to drop leftover `CREATE` on schema for `omega_app`.
2. Set **Preview** env on Vercel `omega-staging` (pooler only — not direct IPv6 `db.*`):
   - `DATABASE_URL` — `omega_app.jhgnekpjywntgctgelnz` @ `aws-0-eu-west-2.pooler.supabase.com:6543` (`prepare:false`) or `:5432` session; `sslmode=require`
   - `OMEGA_BOOTSTRAP_ADMIN_EMAIL` — verified (`femiadeoye08@outlook.com` or Cursor-linked `wisdomreignsnow@gmail.com`)
   - `OMEGA_BOOTSTRAP_ADMIN_PASSWORD` — `scripts/generate-bootstrap-secret.sh`; never commit/chat-paste
3. Redeploy preview. Boot is **marker-first**: if `001`/`002`/`003` exist, skips owner DDL. Init failures → readiness `error` (not silent unconfigured).
4. Sign in as **admin** (`distributor_id` null). Inspect network via Admin → Distributors / Referrals.
5. Keep activation **off**. No invites from this app.

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
