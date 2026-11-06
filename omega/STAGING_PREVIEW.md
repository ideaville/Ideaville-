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

## Commerce backend on the protected preview

Shop/admin/distributor APIs require **Postgres** on the Vercel project:

- Set `DATABASE_URL` on `omega-staging` (existing Postgres/Neon — do not invent new paid accounts if free tier already available).
- Optionally set `OMEGA_BOOTSTRAP_ADMIN_EMAIL` + `OMEGA_BOOTSTRAP_ADMIN_PASSWORD` for the first admin (out-of-band; never in git).
- Without `DATABASE_URL`, APIs **fail closed** and the shop catalogue stays empty with a readiness message.
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
cd omega && npm test && npm run build && npm audit --omit=dev
```

Doc-only updates do not require re-running those unless `omega` app/build files change.

## What this agent must not do

- Merge to `master` / touch production  
- Change Vercel protection, ignore-build guard, or project settings  
- Commit tokens/secrets or deploy via CLI  
- Enable public release, payments, or marketing outreach  
