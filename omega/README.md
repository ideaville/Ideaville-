# OMEGA Performance Additives

Premium brand site, print-ready label system, Executive Club referrals, and Performance Network wealth ladder.

## Run

```bash
cd omega
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## What’s included

| Area | Route | Notes |
| --- | --- | --- |
| Product story | `/` | Full-bleed hero from the design concept, benefits, specs |
| Label system | `/label` | Front/back SVG labels + directions / storage / warnings + print specs |
| Executive Club | `/club` | Join flow that mints a local referral code |
| Wealth model | `/wealth` | Rank ladder (Member → Advocate → Partner → Executive) |
| Dashboard | `/dashboard` | Demo counters, share link, sample ledger |

Membership state is stored in `localStorage` under `omega-executive-club` for browser demos only.

## Brand tokens

- Ink `#070707`
- Gold `#C9A227` / bright `#E8D48A`
- Volt blue `#00A8E8`
- Type: Syne (display) + DM Sans (body)

## Assets

- `public/product-concept.jpg` — packaging concept
- `public/labels/front-label.svg` — front face
- `public/labels/back-label.svg` — information panel
