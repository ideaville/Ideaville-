# epc-checker

CLI helpers for the MHCLG Energy Certificate Data API (England & Wales domestic EPCs).

## Setup

Set a bearer token from [Get energy performance of buildings data](https://get-energy-performance-data.communities.gov.uk/) → My account → **My Bearer Token**:

```bash
export EPC_API_TOKEN='…'
```

`EPC_API_TOKENS` is also accepted.

## Commands

```bash
# Sample Greenwich register rows + full certificate samples
npm run inspect-register -- 10

# Raw postcode search (optionally hydrate the first returned certificate)
npm run check -- SE18 3EU --limit 10 --full

# Address-level lookup: group by UPRN/address, show newest cert per dwelling
npm run lookup -- SE18 3EU --text
npm run lookup -- SE18 3EU --address "76 Genesta" --text
npm run lookup -- SE18 3EU --hydrate-all --text

# Retrofit + grant/scheme screening (property-side EPC signals)
npm run retrofit -- SE18 3EU --text
npm run retrofit -- SE18 3EU --min-priority high --only-matches --text

npm test
```

`lookup` lists unique addresses for a postcode. Pass `--address` (or `--hydrate` / `--hydrate-all`) to pull the newest full certificate, including SAP scores and suggested improvements resolved via `/api/codes/info`.

`retrofit` hydrates each address’s newest certificate and scores retrofit need plus possible scheme fits (Warm Homes: Local Grant, ECO4/LA Flex, Boiler Upgrade Scheme, PRS MEES). This is **property-side screening only** — income/benefits/funding queues still need confirmation.

See [`../docs/energy-method.md`](../docs/energy-method.md) for what live Greenwich records contain.
