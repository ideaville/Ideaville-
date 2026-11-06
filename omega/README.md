# OMEGA Performance Additives (prototype)

Brand / packaging concept site plus a **non-transactional** club & network demo.

**Not for production, retail sale, live payments, or regulatory labelling.**

## Run

```bash
cd omega
npm install
npm test
npm run build
npm run dev
```

Default local URL: `http://localhost:5173`.

## Routes

| Area | Route | Notes |
| --- | --- | --- |
| Product story | `/` | Concept hero, constrained copy, pending facts |
| Label prototype | `/label` | Front/back SVG previews — no production downloads |
| Club demo | `/club` | Browser-local display name + demo code only |
| Network concept | `/wealth` | Rank structure without payout figures |
| Demo dashboard | `/dashboard` | Simulated counters / mock ledger |

Demo state key: `localStorage['omega-executive-club']` (schema v2). Not auth.

## Constraints baked into copy

- Petrol only
- No validated mpg / HP / emissions claims
- Dose, tank coverage, and retail volume (30 vs 50) marked pending
- Nigeria first; UK deferred; regulatory path unconfirmed
- Network commissions / residuals / equity pool **withheld** pending approval

See [`LAUNCH_REVIEW.md`](./LAUNCH_REVIEW.md) for the launch-review note.

## Brand tokens

- Ink `#070707`
- Gold `#C9A227` / bright `#E8D48A`
- Volt blue `#00A8E8`
- Type: Syne (display) + DM Sans (body)
