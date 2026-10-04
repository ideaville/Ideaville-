# Energy method: MHCLG domestic EPC register

This note records what the live England & Wales Energy Certificate Data API actually returns for Royal Borough of Greenwich domestic certificates, as inspected with:

```bash
cd epc-checker
npm run inspect-register -- 10
npm run check -- SE18 3EU --limit 10 --full
```

Inspected against `https://api.get-energy-performance-data.communities.gov.uk` using a GOV.UK One Login bearer token (`EPC_API_TOKEN` or `EPC_API_TOKENS`).

## Auth and endpoints

| Item | Value |
| --- | --- |
| Base URL | `https://api.get-energy-performance-data.communities.gov.uk` |
| Auth | `Authorization: Bearer <token>` from the service “My Bearer Token” page |
| Accept | `application/json` |
| Search | `GET /api/domestic/search` |
| Full certificate | `GET /api/certificate?certificate_number=…` |

Greenwich filter used for register inspection: `council[]=Greenwich`.

At inspection time Greenwich had **148,227** domestic search hits (paginated; `page_size` 1–5000).

> The older `epc.opendatacommunities.org` Basic-auth API redirects away from the usable search contract. Use the bearer API above.

## What search records contain

Each `/api/domestic/search` row for Greenwich is a thin index object. Across the inspected sample every record contained these 13 fields:

| Field | Role in the sample |
| --- | --- |
| `certificateNumber` | 20-digit RRN (`####-####-####-####-####`) |
| `addressLine1` … `addressLine4` | Address parts; lines 2–4 often `null` for houses, used for flats |
| `postcode` | Normalised outward/inward code (e.g. `SE7 7PR`, `SE18 3AS`) |
| `postTown` | Mostly `LONDON`, also `PLUMSTEAD`, `GREENWICH`, `WOOLWICH`, mixed case |
| `council` | Always `Greenwich` when filtered that way |
| `constituency` | `Greenwich and Woolwich`, `Erith and Thamesmead`, or `Eltham and Chislehurst` |
| `currentEnergyEfficiencyBand` | A–G current band only (no numeric SAP score in search) |
| `registrationDate` | Lodgement date (`YYYY-MM-DD`) |
| `uprn` | Numeric UPRN when present |
| `schemaType` | Lodgement schema, e.g. `RdSAP-Schema-21.0.1` |

### Sample of 10 latest Greenwich search rows

Bands in this page: **B×1, C×3, D×5, E×1**. All ten were registered **2026-10-03** and used `RdSAP-Schema-21.0.1`.

Examples:

- `21 Shieldhall Street`, `SE2 0LZ` — band **D**, Erith and Thamesmead
- `Flat 3, 3 Pilot Walk`, `SE10 0UR` — band **B**, Greenwich and Woolwich
- `400 Shooters Hill Road`, `SE18 4LP` — band **E**, Eltham and Chislehurst
- `First Floor Flat, 153 Trafalgar Road`, `SE10 9TX` — band **D**

Search does **not** return floor area, heating system, costs, CO₂, potential band, or recommendations. Those require `/api/certificate`.

## What full certificate records contain

Fetching two of the Greenwich RRNs via `/api/certificate` returned rich RdSAP payloads (**77–79 fields** in those samples; other schemas can expose a slightly different key set).

Always-useful energy fields observed in the real Greenwich certificates:

| Area | Fields present |
| --- | --- |
| Identity | `uprn`, `uprn_source`, `address_line_1`, `postcode`, `post_town`, `registration_date`, `inspection_date`, `completion_date`, `created_at`, `status` |
| Rating | `current_energy_efficiency_band`, `potential_energy_efficiency_band`, `energy_rating_current`, `energy_rating_potential`, `energy_rating_average`, `environmental_impact_current` / `_potential` |
| Demand / carbon | `energy_consumption_current` / `_potential`, `co2_emissions_current` / `_potential`, `co2_emissions_current_per_floor_area` |
| Costs (GBP objects) | `heating_cost_current` / `_potential`, `hot_water_cost_current` / `_potential`, `lighting_cost_current` / `_potential` |
| Fabric / services | `walls`, `roofs`, `floors`, `window`, `lighting`, `main_heating`, `main_heating_controls`, `secondary_heating`, `hot_water`, `mechanical_ventilation`, `air_tightness` |
| Geometry / form | `dwelling_type`, `property_type`, `built_form`, `total_floor_area`, `habitable_room_count`, `heated_room_count`, `extensions_count`, glazing/draught metrics |
| Improvements | `suggested_improvements[]` with sequence, indicative cost, typical saving, improvement type/description |
| Assessment meta | `assessment_type` (`RdSAP`), `schema_type`, `sap_version`, nested `sap_*` blocks, `tenure`, `transaction_type`, `report_type` |

### Real certificate highlights

**3036-5020-5609-0662-7206** — mid-terrace house, 81 m², band **D** (SAP 59) → potential **C** (75):

- Main heating: boiler and radiators, mains gas
- Walls: solid brick, as built, no insulation (assumed)
- Roof: pitched, 100 mm loft insulation
- Windows: fully double glazed
- Consumption 257 kWh/m²·yr, CO₂ 3.8 t/yr
- Suggested improvements present (e.g. loft/insulation-type measures with £ savings)

**0424-3967-1200-8066-0204** — mid-terrace house, 44 m², band **D** (SAP 68) → potential **C** (80):

- Same mains-gas boiler pattern
- Solid brick walls, pitched roof with 250 mm loft insulation
- Consumption 218 kWh/m²·yr, CO₂ 1.8 t/yr

Takeaway for product logic: treat search as an address/band index, then hydrate with `/api/certificate` when you need SAP scores, fabric, costs, or recommendations. Do not assume a fixed field count across schemas.

## SE postcode check (`SE18 3EU`)

`npm run check -- SE18 3EU --limit 10 --full` returned **41** domestic certificates for the postcode (Greenwich / Plumstead, constituency Erith and Thamesmead).

Newest lodgements in the first page:

| Registered | Band | Address |
| --- | --- | --- |
| 2026-05-28 | C | Flat 2, 56 Genesta Road |
| 2026-05-28 | C | Flat 4, 56 Genesta Road |
| 2026-03-27 | C | Ground Floor Flat, 90 Genesta Road |
| 2026-03-24 | C | 76 Genesta Road |
| 2025-12-07 | D | 84 Genesta Road |

The newest full certificate on that run was band **C**, SAP **71**, 40 m², mains-gas boiler and radiators — confirming the hydrate path works for a real SE postcode used in Greenwich lettings work.

## Checker commands

```bash
# Inspect N Greenwich search rows + 2 full certificate samples (JSON on stdout)
npm run inspect-register -- 10

# Look up a postcode; add --full to hydrate the newest returned RRN
npm run check -- SE18 3EU --limit 10 --full
```

Environment:

- `EPC_API_TOKEN` — preferred bearer token secret name
- `EPC_API_TOKENS` — accepted alias (current Cloud Agent secret name)
- `EPC_API_BASE_URL` — optional override
