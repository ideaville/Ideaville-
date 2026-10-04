# Ideaville EPC Checker — Project Status

**Date:** 4 October 2026  
**Repository:** [ideaville/Ideaville-](https://github.com/ideaville/Ideaville-)  
**Pull request:** [#1 — Add EPC checker and document live Greenwich register fields](https://github.com/ideaville/Ideaville-/pull/1)  
**Branch:** `cursor/epc-checker-real-data-d63a`  
**Shareable Google Doc:** [Ideaville EPC Checker — Project Status (4 Oct 2026)](https://docs.google.com/document/d/1ILmX4nGcq5xrQTqYCOO5wD2lrjBCS-07HrBMoNnfGjU/edit?usp=drivesdk)

This document summarises everything delivered so far: the problem, what was built, what live Greenwich data showed, how to run the tools, and what remains open.

---

## 1. Purpose

Build practical tooling for Ideaville / Alpha Performance Solutions work in Greenwich and SE London that can:

1. Talk to the live MHCLG domestic EPC register
2. Inspect what real Greenwich records contain
3. Look up certificates by postcode and address
4. Flag homes that need retrofit
5. Screen which government grants / schemes a property *might* fit (property-side only)

---

## 2. Starting point

The GitHub repo was effectively empty (README only). The older Open Data Communities Basic-auth API (`epc.opendatacommunities.org`) has been replaced by:

| Item | Value |
| --- | --- |
| Base URL | `https://api.get-energy-performance-data.communities.gov.uk` |
| Auth | `Authorization: Bearer <token>` from GOV.UK One Login → **My Bearer Token** |
| Search | `GET /api/domestic/search` |
| Full certificate | `GET /api/certificate?certificate_number=…` |
| Code labels | `GET /api/codes/info` |

Cloud Agent secret currently injected as `EPC_API_TOKENS` (alias `EPC_API_TOKEN` also accepted).

---

## 3. What was built

### Package: `epc-checker/`

| Command | What it does |
| --- | --- |
| `npm run inspect-register -- 10` | Sample N Greenwich search rows + 2 full certificate payloads |
| `npm run check -- <postcode>` | Raw postcode search (`--full` hydrates newest row) |
| `npm run lookup -- <postcode>` | Group by UPRN/address; optional hydrate + improvement labels |
| `npm run retrofit -- <postcode>` | Retrofit need + grant/scheme screening |
| `npm test` | Unit tests for client, address grouping, scheme rules |

### Source layout

```
epc-checker/
  src/
    client.js            API client (Bearer auth)
    search.js            Paginated postcode fetch
    address.js           Address grouping + certificate summary
    inspect-register.js  Greenwich register inspector
    check.js             Raw postcode checker
    lookup.js            Address-level lookup CLI
    retrofit.js          Retrofit / scheme screening CLI
    schemes.js           Grant/scheme rules engine
  test/
    client.test.js
    address.test.js
    schemes.test.js
  README.md
docs/
  energy-method.md       Live field notes from Greenwich register
  project-status.md      This document
```

### Commits on the PR branch

1. **Add epc-checker CLI for MHCLG domestic EPC API**
2. **Document real Greenwich EPC register fields**
3. **Add address-level EPC lookup with improvement labels**
4. **Add retrofit and grant-scheme screening from EPC fields**

---

## 4. Live findings — Greenwich register

From `npm run inspect-register -- 10` and related calls:

- Greenwich has **~148,227** domestic search hits
- Search rows are a **13-field index** only:
  - `certificateNumber`, `addressLine1–4`, `postcode`, `postTown`
  - `council`, `constituency`, `currentEnergyEfficiencyBand`
  - `registrationDate`, `uprn`, `schemaType`
- Full `/api/certificate` payloads expose **~77–90 fields**, including:
  - SAP current/potential scores and bands
  - Floor area, dwelling type, tenure, property type
  - Heating / hot water / walls / roofs / windows
  - GBP running costs, CO₂, `suggested_improvements`
- Suggested improvements only carry an `improvement_number`; human labels are resolved via `/api/codes/info` (`improvement_summary` / `improvement_description`)
- Constituencies seen: Greenwich and Woolwich, Erith and Thamesmead, Eltham and Chislehurst
- Common schema in recent stock: `RdSAP-Schema-21.0.1`

Detailed field notes: [`docs/energy-method.md`](./energy-method.md)

---

## 5. Live findings — SE18 3EU (Genesta Road area)

### Lookup

- **41** certificates across **21** addresses
- Example hydrated address: **76 Genesta Road**
  - Newest RRN lodged 2026-03-24
  - Band **C**, SAP **72** → potential **78**
  - 63 m² ground-floor flat, mains gas boiler
  - Improvements include solid-wall and floor insulation with cost/saving ranges

### Retrofit / scheme screen (medium+ priority)

| Metric | Result |
| --- | --- |
| Addresses needing retrofit | **16** (14× band D, 2× band E) |
| With scheme leads | **16** |
| High priority (band E) | **2** — 88 Genesta Road; Flat 1, 56 Genesta Road |
| Tenure mix (assessed) | 8 owner-occupied · 2 private rented · 2 social · 4 unknown |

Example strong private lead: **Flat 1, 56 Genesta Road** — band E, owner-occupied, SAP 54 → 74 → property-side match for Warm Homes: Local Grant, ECO4, and Boiler Upgrade Scheme.

---

## 6. Grant / scheme screening (what it covers)

`npm run retrofit` scores **property-side** fit only. It cannot see income, benefits, or whether a local funding queue is open.

| Scheme | Gate used from EPC | Offline check still required |
| --- | --- | --- |
| Warm Homes: Local Grant | Private tenure + EPC **D–G** | Income ≤ £36k / benefits / eligible postcode; LA/GLA queue |
| Warm Homes: Social Housing Fund | Social rented + typically **D–G** | Landlord / council programme |
| ECO4 / LA Flex | Owner-occupied **D–G**, or PRS **E–G** (common Flex pairing) | Household eligibility / referral |
| Boiler Upgrade Scheme | Not social housing; replaceable fossil/electric heat | MCS installer quote |
| PRS MEES pressure | Private rented **F–G** (watch D/E) | Exemptions / future standards |
| Great British Insulation Scheme | Marked **closed** (31 Mar 2026) | — |

**Greenwich note:** the borough is in the **GLA Warm Homes: Local Grant consortium** for private low-income homes, and also has Warm Homes: Social Housing Fund activity for council/HA stock.

---

## 7. How to run

```bash
cd epc-checker
export EPC_API_TOKEN=…    # or EPC_API_TOKENS

# Inspect live Greenwich register sample
npm run inspect-register -- 10

# Raw postcode search
npm run check -- SE18 3EU --limit 10 --full

# Address-level view
npm run lookup -- SE18 3EU --text
npm run lookup -- SE18 3EU --address "76 Genesta" --text

# Retrofit + scheme leads
npm run retrofit -- SE18 3EU --text
npm run retrofit -- SE18 3EU --min-priority high --only-matches --text

npm test
```

---

## 8. Evidence captured during development

Artifacts from the Cloud Agent run (examples):

- Inspect Greenwich sample JSON
- SE18 3EU check / lookup / retrofit outputs
- Unit test logs
- Verification summaries for lookup and retrofit

PR evidence links are attached on [#1](https://github.com/ideaville/Ideaville-/pull/1).

---

## 9. Important caveats

1. Outputs are **leads for verification**, not grant approvals.
2. Income, benefits, council-tax band, and live funding availability are **not** on the EPC register.
3. Scheme rules change; GBIS is closed; BUS no longer requires a valid EPC (from 28 Apr 2026) but RRNs still help applications.
4. Tenure is taken from the certificate when present; older certificates may leave it unknown.
5. Address matching uses UPRN when available, otherwise normalised address text.

---

## 10. Suggested next steps

1. **CSV export** from `retrofit` for Sheets/CRM lead lists  
2. **Batch multiple SE postcodes** into one ranked file  
3. **Needs-new-EPC filter** (≥10 years / missing) alongside retrofit leads  
4. **Simple web UI** over lookup + retrofit  
5. **Merge PR #1** when the CLI is accepted as the baseline  

---

## 11. One-line summary

We connected Ideaville to the live MHCLG EPC API, documented real Greenwich record contents, and shipped CLI tools to look up SE properties and screen retrofit / grant opportunities — verified on Genesta Road (`SE18 3EU`).
