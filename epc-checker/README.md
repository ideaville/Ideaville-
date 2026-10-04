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

# Check a postcode (optionally hydrate the newest certificate)
npm run check -- SE18 3EU --limit 10 --full

npm test
```

See [`../docs/energy-method.md`](../docs/energy-method.md) for what live Greenwich records contain.
