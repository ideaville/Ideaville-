#!/usr/bin/env bash
# Local-only: postgres-owned preapplied schema + omega_app DML role (mirrors staging).
# Does not touch Supabase. Password is local disposable for IT only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB=omega_it
APP_PASS='omega_it_local_only'
ADMIN_PASS='omega_it_admin_local'
APP_URL="postgres://omega_app:${APP_PASS}@127.0.0.1:5432/${DB}"
ADMIN_URL="postgres://postgres:${ADMIN_PASS}@127.0.0.1:5432/${DB}"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${DB};
DROP ROLE IF EXISTS omega_app;
ALTER ROLE postgres PASSWORD '${ADMIN_PASS}';
CREATE ROLE omega_app LOGIN PASSWORD '${APP_PASS}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE DATABASE ${DB} OWNER postgres;
SQL

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB}" -f "${ROOT}/migrations/staging_supabase_handoff.sql"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB}" -f "${ROOT}/migrations/004_revoke_omega_app_create.sql"

# Prove grants (no CREATE)
sudo -u postgres psql -d "${DB}" -c "SELECT has_schema_privilege('omega_app', 'omega', 'CREATE') AS create_priv, has_schema_privilege('omega_app', 'omega', 'USAGE') AS usage_priv;"

ENV_OUT="${ROOT}/.omega-it.env"
umask 077
cat > "${ENV_OUT}" <<EOF
OMEGA_IT_DATABASE_URL=${APP_URL}
OMEGA_IT_ADMIN_DATABASE_URL=${ADMIN_URL}
EOF
echo "Wrote ${ENV_OUT} (local IT only — do not commit)."
echo "Run: set -a; source ${ENV_OUT}; set +a; npm run test:pg-it"
