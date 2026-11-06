# OMEGA launch review note

**PR:** https://github.com/ideaville/Ideaville-/pull/5  
**Branch:** `cursor/omega-performance-ecosystem-8beb`  
**Scope:** `omega/` only (epc-checker / give untouched)  
**Intent:** Reviewable prototype for launch review — **not** deploy, publish, merge, or live selling.

## What actually works vs mocked

| Surface | Works | Mocked / deferred |
| --- | --- | --- |
| Static marketing pages | Client-side React routes, styling, concept imagery | No CMS, no analytics backend |
| Label SVGs | Render in browser as layout prototypes | Not print-approved; no production downloads; no hazard pictograms/cert codes |
| Club “join” | Creates a local demo code in `localStorage` | Not an account, not auth, not multi-device |
| Referral simulate | Increments demo counters in-browser | No payments, no ledger write to a server, no real referrals |
| Network ranks | UX ladder labels | Commission %, residuals, equity pool **hidden** — unapproved |
| Sample ledger | Static mock rows (`Mock` status) | Disconnected from demo counters; not money |

## Security & privacy pass (this iteration)

### Fixed in-scope

- Removed sales-facing **15% / residual / equity** promises; demo uses unit **demo points**, not £ commissions.
- Join starts at **member**; Advocate requires simulated referrals (aligned with ladder).
- Display-name **sanitization** + length cap; no `autocomplete="name"`; help text forbids email/phone.
- `localStorage` payload **schema version + parse validation** (rejects corrupt shapes).
- Persistent **prototype banner**; copy marked not-for-production across home/label/club/network/dashboard/footer.
- Removed production-ready download CTAs and fabricated batch/print-release claims.
- Rewrote label SVGs (purged corrupted en-dash bytes; placeholder rear panels).
- Skip link + focus-visible outlines for basic keyboard a11y.
- XSS: still no `dangerouslySetInnerHTML` / HTML injection sinks; names rendered as text.

### Unresolved / accepted for prototype

- `localStorage` is **not** secure production auth (explicitly disclosed).
- Clipboard API may no-op without permission — demo-only.
- Supply-chain: run `npm audit` periodically; lockfile present, no secrets in repo.
- Full WCAG audit / screen-reader pass not claimed.
- No CSP headers (static Vite app; hosting config out of scope — and we are **not** publishing).

## Product / compliance blockers (owner)

1. Approve or rewrite any efficacy language after independent validation.
2. Resolve retail volume (30 vs 50) and dose/coverage; then rewrite label directions.
3. Complete mixture classification, viscosity/flash point, hazard labelling / CRC / tactile, filled-bottle compatibility.
4. Move SDS from lab-only draft to retail clearance if/when appropriate.
5. Confirm Nigeria-first regulatory path; UK remains deferred.
6. Approve any future commercial terms before showing rates, residuals, or equity.
7. Decide real auth, payments, and data residency **before** any public enrolment.

## Test commands & results

```bash
cd omega
npm test
npm run build
npm audit --omit=dev
```

Observed in this pass (Europe/London):

- `npm test` — 6/6 clubLogic tests passed
- `npm run build` — TypeScript + Vite production build succeeded
- `npm audit --omit=dev` — 0 vulnerabilities reported

## Deployment evidence

- **No Cursor publish / hosting enablement** performed in this pass (per instruction).
- Prior agent preview was local-only (`vite preview` on loopback). No production URL claimed.

## Risk

- Someone could still screenshot older PR artifacts that showed £ commissions — treat those as superseded.
- If owners later enable hosting without updating copy, compliance risk returns — keep the banner until clearance.
- Demo name in `localStorage` is still PII-lite if a user types a real name; UI instructs against it.

## How to revert

```bash
# Discard this branch’s omega work relative to master
git checkout master
git branch -D cursor/omega-performance-ecosystem-8beb   # local
# Close PR #5 without merge, or:
git revert <merge-commit>   # only if it were merged later
```

Or restore a single file from master: `git checkout master -- omega` after merge (N/A until merged).

## Visual identity alignment

Preferred concept: matte-black longneck with grip, text-only gold **OMEGA** (no Ω), **PERFORMANCE ADDITIVES**, restrained blue divider, **PETROL ONLY**, strong hierarchy. Site hero uses the attached concept still; label SVGs mirror that hierarchy and carry **DESIGN CONCEPT — NOT FOR PRODUCTION**.
