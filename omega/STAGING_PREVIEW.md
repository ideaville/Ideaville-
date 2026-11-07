# OMEGA private staging preview — status

**Updated:** 6 November 2026 (Europe/London)  
**PR:** https://github.com/ideaville/Ideaville-/pull/5  
**Branch:** `cursor/omega-performance-ecosystem-8beb` (Git-triggered Vercel **preview** only)  
**Vercel project:** `omega-staging` (`prj_RYEXlnn26lyonNWSNlcQAei3PwaL`) — linked `ideaville/Ideaville-`, root `omega`, Vite  
**Audience:** Femi + Kay phone testing behind platform authentication

## Access control (required)

- **Mechanism:** Vercel Authentication / SSO protection (`ssoProtection`) with `deploymentType: all` — real platform gate, not an obscure URL, `robots.txt`, or client-side password.
- Unauthenticated browsers must be denied by Vercel before any prototype HTML is served.
- Authorised viewers sign in through Vercel’s protection flow, then use the PR **preview** deployment on phones.

## How this branch triggers staging

1. Push a meaningful commit to `cursor/omega-performance-ecosystem-8beb`.
2. Vercel Git integration builds a **non-master preview** for project `omega-staging` (root `omega`).
3. An ignore-build / production guard cancels incorrect **production** targeting; **preview** builds on this branch are allowed.
4. Parent / connected Vercel MCP owns live deployment status and access verification. Agents must **not** deploy via local Vercel CLI or request/store deploy tokens in chat or the repo.

## API packaging on the protected preview

The Vite framework preset only emits SPA assets. This branch builds with **Build Output API** (`npm run build:vercel`) so `/api/*` is a real Node serverless function (`api.func`). Parent should confirm the next preview build lists a serverless function — not static files alone. `/api/health` is the proof endpoint once the function is deployed (still behind Vercel SSO).

## Commerce backend on the protected preview

Shop/admin/distributor APIs require **Postgres** on the Vercel project (parent configures separately — agents do not create DB/projects or paid services):

- Set `DATABASE_URL` on `omega-staging` when ready.
- Staging DB handoff (parent Supabase connector): [`docs/STAGING_DB_HANDOFF.md`](./docs/STAGING_DB_HANDOFF.md) — apply `migrations/staging_supabase_handoff.sql` to the **new staging** project only, then set `DATABASE_URL` + `OMEGA_BOOTSTRAP_ADMIN_EMAIL` / `OMEGA_BOOTSTRAP_ADMIN_PASSWORD` (verified owner email; password from `scripts/generate-bootstrap-secret.sh`; never in git).
- Owner inspects distributor Network as **admin** (Admin → Distributors / Referrals); do not invent a distributor seat for the owner.
- Without `DATABASE_URL`, `/api/health` still works; mutating commerce returns **503**; catalog stays empty with truthful readiness.
- Do **not** set `OMEGA_ALLOW_MEMORY_STORE` on Vercel (not durable across instances).

See [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Prototype-only limits (unchanged)

This staging surface remains a **design / UX prototype**:

- Keep sticky **NOT FOR PRODUCTION** labelling.
- Demo points and mock ledger only — **no** real payments, orders, or commissions.
- **No** independently validated mpg / HP / emissions efficacy claims.
- **No** collection of customer personal data beyond ephemeral browser-local demo display names.
- Dose, retail volume, hazard labelling, and commercial network terms remain pending owner approval.
- Nigeria-first framing; UK deferred. Do not treat staging as retail clearance.

## Earlier investigation (superseded for hosting path)

Cursor `publish-app` was unavailable in a prior agent session; public tunnels were refused. Hosting path is now the protected **Vercel Git preview** above. Do not widen protection settings or edit Vercel project/guard config from this repo unless the owner explicitly asks.

## Local app verification (unchanged commands)

```bash
cd omega && npm test && npm run build:vercel && npm run verify:vercel-output && npm audit --omit=dev
```

Doc-only updates do not require re-running those unless `omega` app/build files change.

## What this agent must not do

- Merge to `master` / touch production  
- Change Vercel protection, ignore-build guard, or project settings  
- Commit tokens/secrets or deploy via CLI  
- Enable public release, payments, or marketing outreach  
