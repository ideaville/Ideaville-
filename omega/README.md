# OMEGA — Ideaville Enterprise (Nigeria)

Petrol-only performance additive **prototype**: product story, label concept, Nigeria shop catalogue, and admin/distributor operations.

**Not for production / public launch.** Commercial activation is **off** by default.

## Docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — stack, fail-closed rules, owner setup, readiness matrix  
- [`docs/STAGING_DB_HANDOFF.md`](./docs/STAGING_DB_HANDOFF.md) — Supabase staging SQL + bootstrap env names  

- [`STAGING_PREVIEW.md`](./STAGING_PREVIEW.md) — protected Vercel preview process  
- [`LAUNCH_REVIEW.md`](./LAUNCH_REVIEW.md) — earlier compliance notes  

## Run

```bash
npm install
npm test
npm run build
```

Local API + UI (memory store for local only):

```bash
OMEGA_ALLOW_MEMORY_STORE=1 npm run dev:api
npm run dev
```

Protected Vercel preview requires `DATABASE_URL` (and optional bootstrap admin env). Without it, APIs fail closed and the shop shows an empty catalogue with readiness messaging.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Product story |
| `/label` | Packaging prototype |
| `/shop` | Catalogue (checkout gated) |
| `/login` | App role login (≠ Vercel SSO) |
| `/admin` | Admin operations |
| `/distributor` | Distributor orders + link to network |
| `/network` | Distributor referral code, recorded referrals, sponsored distributors, terms (unset until admin records rates) |

`/club` and `/referrals` redirect to `/network`. Client-only demo wealth/earnings UI was removed; referral attribution is server-side and tenant-scoped.
