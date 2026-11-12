-- Post-handoff least-privilege: omega_app is DML runtime only.
-- Apply as postgres on dedicated staging project jhgnekpjywntgctgelnz ONLY.
-- Safe after markers 001_init / 002_network / 003_supabase_hardening exist and
-- the app uses marker-first migrate (skips owner DDL when complete).
--
-- Does NOT: change table ownership, BYPASSRLS, grant anon/authenticated, or seed data.

REVOKE CREATE ON SCHEMA omega FROM omega_app;

-- Keep USAGE so omega_app can resolve objects under search_path=omega.
GRANT USAGE ON SCHEMA omega TO omega_app;

-- Confirm expected DML grants remain (idempotent).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA omega TO omega_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA omega TO omega_app;

INSERT INTO omega.schema_migrations (id) VALUES ('004_revoke_omega_app_create')
ON CONFLICT (id) DO NOTHING;
