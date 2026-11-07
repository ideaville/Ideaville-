# OMEGA staging DB handoff (parent connector)

**Audience:** Parent / owner configuring **Preview-only** Vercel env against dedicated Supabase staging.  
**Approved project ref:** `jhgnekpjywntgctgelnz`  
**Approved pooler host (user-supplied — do not guess region):** `aws-0-eu-west-2.pooler.supabase.com`  
**Not:** production, invitations, merge, public launch, printing secrets, or direct DB IPv6 endpoints.

## Artifact paths

| File | Purpose |
| --- | --- |
| `/opt/cursor/artifacts/omega-staging-schema.sql` | Initial idempotent schema (already applied) |
| `/opt/cursor/artifacts/omega-revoke-omega-app-create.sql` | Revoke leftover `CREATE` on schema from `omega_app` |
| `/opt/cursor/artifacts/omega-staging-setup.md` | Process twin of this doc |
| `migrations/staging_supabase_handoff.sql` | Schema mirror in git |
| `migrations/004_revoke_omega_app_create.sql` | Revoke CREATE mirror in git |

## Connection (Vercel Preview — parent sets secrets)

**Do not use** Supabase “direct” host (`db.<ref>.supabase.co`) on free tier from Vercel — IPv6-only direct is unsuitable for typical Vercel egress. **Do not** connect as `postgres` from the app runtime.

| Piece | Value |
| --- | --- |
| User | `omega_app.jhgnekpjywntgctgelnz` |
| Host | `aws-0-eu-west-2.pooler.supabase.com` |
| Database | `postgres` |
| SSL | `sslmode=require` |
| `search_path` | Set by app via startup GUC `omega,public` (tables are in schema `omega`) |

### Preferred: transaction pooler `:6543`

App sets `prepare: false` on `postgres.js` (required for transaction-mode poolers without prepared-statement support).

```text
postgresql://omega_app.jhgnekpjywntgctgelnz:[PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require
```

### Alternative: session pooler `:5432`

Same user/host; use if transaction mode misbehaves. `prepare: false` remains safe.

```text
postgresql://omega_app.jhgnekpjywntgctgelnz:[PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require
```

Password stays in Vercel secret store only. Agents must not print it.

## Env names

| Name | Notes |
| --- | --- |
| `DATABASE_URL` | Pooler URL above |
| `OMEGA_BOOTSTRAP_ADMIN_EMAIL` | Verified: `femiadeoye08@outlook.com` (git) or `wisdomreignsnow@gmail.com` (Cursor owner) |
| `OMEGA_BOOTSTRAP_ADMIN_PASSWORD` | `scripts/generate-bootstrap-secret.sh` → Vercel only |
| `OMEGA_ALLOW_MEMORY_STORE` | **Never** on Vercel |

## Runtime behaviour (marker-first)

1. On boot, app reads `omega.schema_migrations` for `001_init`, `002_network`, `003_supabase_hardening`.
2. If **all present**: **skips** CREATE/ALTER/POLICY (owner-only). DML-only path for `omega_app`.
3. If incomplete and role cannot DDL: **fail closed** with `persistence_schema_incomplete` / readiness `persistence: 'error'` — never masquerades as unconfigured.
4. Permission errors → `persistence_permission_denied` / `persistence_init_failed`, not silent healthy empty.

## Parent apply next (staging only)

Schema handoff already applied. Still revoke unnecessary CREATE:

```bash
# As postgres on project jhgnekpjywntgctgelnz only:
# apply migrations/004_revoke_omega_app_create.sql
# or /opt/cursor/artifacts/omega-revoke-omega-app-create.sql
```

Expected remaining grants for `omega_app`:

- `USAGE` on schema `omega`
- `SELECT, INSERT, UPDATE, DELETE` on all `omega.*` tables
- RLS enabled; policy `omega_app_all` for `omega_app` only
- **No** `CREATE` on schema, **No** `BYPASSRLS`, **No** table ownership transfer
- `anon` / `authenticated` / `service_role`: no access to `omega`

## Owner Network inspection

Bootstrap creates **admin** with `distributor_id = null`. Inspect via Admin → Distributors / Referrals. Do not invent a distributor membership, commissions, or commercial rows.

## Local permission proof (no Supabase credentials)

```bash
cd omega
npm run test:pg-it:setup   # local Postgres only
set -a; source .omega-it.env; set +a
npm run test:pg-it
```

## Not possible without credentials

Connecting to project `jhgnekpjywntgctgelnz` / pooler from this agent (no `DATABASE_URL` secret). Parent configures Preview env after this verification.
