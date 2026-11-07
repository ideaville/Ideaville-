# OMEGA staging DB handoff (parent connector)

**Audience:** Parent agent / owner applying SQL to a **new dedicated free Supabase staging** project only.  
**Not:** production, invitations, merge, public launch, or unapproved DB URLs.

## Artifact paths

| File | Purpose |
| --- | --- |
| `/opt/cursor/artifacts/omega-staging-schema.sql` | Exact idempotent SQL for connector apply |
| `/opt/cursor/artifacts/omega-staging-setup.md` | This process |
| Repo mirror: `omega/migrations/staging_supabase_handoff.sql` | Same SQL, versioned in git |

## Verified owner identity (do not guess)

Use one of these **sourced** emails for `OMEGA_BOOTSTRAP_ADMIN_EMAIL` (pick the inbox Femi will sign in with):

| Email | Source |
| --- | --- |
| `femiadeoye08@outlook.com` | Git author for `ideaville` commits in this repository |
| `wisdomreignsnow@gmail.com` | Cursor Cloud run owner (`Femi Adeoye`) for this agent |

**Recommended default:** `femiadeoye08@outlook.com` (repo identity). Parent may override to the Cursor-linked Gmail if that is the preferred sign-in inbox — still an existing verified source, not invented.

## Configuration names (Vercel project `omega-staging`)

Set these env vars on the preview/staging project only. **Never commit values.**

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Supabase **direct** Postgres URI (prefer session mode / port `5432`). After role setup, prefer `omega_app` user; `postgres` works for first boot (superuser bypasses RLS). |
| `OMEGA_BOOTSTRAP_ADMIN_EMAIL` | Yes (first boot) | Verified owner email above |
| `OMEGA_BOOTSTRAP_ADMIN_PASSWORD` | Yes (first boot) | Generate locally; min 10 chars; store only in Vercel secrets |
| `OMEGA_ALLOWED_ORIGINS` | Optional | Preview origin(s) for CORS |
| `OMEGA_ALLOW_MEMORY_STORE` | **Never on Vercel** | Tests/local only |

### Generate password (parent / owner machine — do not paste into chat)

```bash
openssl rand -base64 32 | tr -d '\n'
```

Put the result only into the Vercel env UI / secret store. Agents must not echo it.

### Optional: enable `omega_app` login (after SQL applied)

In Supabase SQL as `postgres` (password from your secret store, not from this doc):

```sql
ALTER ROLE omega_app WITH LOGIN PASSWORD '<value-from-secret-store>';
```

Then rebuild `DATABASE_URL` with user `omega_app` and that password. Schema search_path is set by the app (`omega,public`); tables are **not** in `public`.

## Safe process (order)

1. Parent provisions **new** free Supabase staging project (connectors). Do not reuse production.
2. Wait for project ref from parent; do not connect unapproved URLs.
3. Apply `/opt/cursor/artifacts/omega-staging-schema.sql` once via Supabase SQL editor / connector (as `postgres`).
4. Confirm: `\dn` shows schema `omega`; tables under `omega.*`; roles include `omega_app`; `anon`/`authenticated` have no grants on `omega`.
5. Set Vercel env: `DATABASE_URL`, `OMEGA_BOOTSTRAP_ADMIN_EMAIL`, `OMEGA_BOOTSTRAP_ADMIN_PASSWORD`.
6. Redeploy PR preview (Git push or Vercel redeploy). App boot runs the same migrations idempotently + `maybeBootstrapAdmin`.
7. Owner signs in at `/login` with bootstrap email/password → **Admin** role.
8. Inspect network without fabricating membership: **Admin → Distributors** and **Admin → Referrals** (Kay `KAY-PARTNER` appears after historic seed; no fake paid orders).
9. Keep `commercial_activation`, `checkout_enabled`, `payment_provider_configured` **false** until real SKU/price/stock/payment/delivery.

## What the SQL does / does not do

**Does**

- Private schema `omega` (PostgREST defaults expose `public` / `graphql_public` only)
- Full commerce + network tables (`001` + `002`)
- Role `omega_app` + RLS enabled; allow policy only for `omega_app`
- Revoke schema/table access from `PUBLIC`, `anon`, `authenticated` (and `service_role` schema usage)

**Does not**

- Create admin password hashes in SQL
- Seed fake distributors beyond what the **app** seed does on boot (Kay partner record only)
- Create orders, referrals, paid events, or commission rates
- Enable Supabase Auth as app auth (app uses scrypt sessions)
- Grant user-editable JWT metadata roles

## Owner Network access (no fabricated distributor seat)

Bootstrap creates **admin only** (`distributor_id` null). That is enough: Admin Distributors/Referrals tabs are the owner network inspection surface. Do **not** invent a distributor row for Femi unless he is recorded as a business distributor in source data.

## Compatibility notes

- Supabase Postgres 15+: `CREATE … IF NOT EXISTS`, partial unique indexes, RLS — supported.
- App auto-migrate on boot mirrors this handoff (`SCHEMA_SQL_000..003` + `search_path`).
- If parent applies SQL first, boot is a no-op for DDL (idempotent markers in `omega.schema_migrations`).

## Blocked until parent sends project ref

Do not open `DATABASE_URL` against an unapproved host. This handoff is ready to apply when the staging project ref arrives.
