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

npm test
```

`lookup` lists unique addresses for a postcode. Pass `--address` (or `--hydrate` / `--hydrate-all`) to pull the newest full certificate, including SAP scores and suggested improvements resolved via `/api/codes/info`.

See [`../docs/energy-method.md`](../docs/energy-method.md) for what live Greenwich records contain.
