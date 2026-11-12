-- Supabase / PostgREST hardening for OMEGA staging.
-- Assumes tables already exist in schema omega (001_init + 002_network).
-- Idempotent. Does not invent users, orders, referrals, or paid state.
-- App auth is scrypt sessions — do NOT map roles to auth.users metadata.

SET search_path TO omega, public;

-- Dedicated app role (no login until parent sets password from secret store).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'omega_app') THEN
    CREATE ROLE omega_app NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA omega TO omega_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA omega TO omega_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA omega TO omega_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA omega
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO omega_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA omega
  GRANT USAGE, SELECT ON SEQUENCES TO omega_app;

-- Lock down public exposure paths used by Supabase API roles.
REVOKE ALL ON SCHEMA omega FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA omega FROM anon';
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA omega FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA omega FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA omega FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA omega FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA omega FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    -- service_role bypasses RLS in Supabase; keep schema usage revoked so it is not a casual path.
    EXECUTE 'REVOKE ALL ON SCHEMA omega FROM service_role';
  END IF;
END
$$;

-- Enable RLS on application tables. No policies for anon/authenticated → deny.
-- omega_app receives explicit allow-all policies (app uses scrypt sessions, not JWT claims).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'schema_migrations',
    'settings',
    'distributors',
    'users',
    'sessions',
    'products',
    'product_prices',
    'stock_batches',
    'stock_movements',
    'orders',
    'order_lines',
    'commercial_terms',
    'payment_events',
    'referrals'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'omega' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE omega.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS omega_app_all ON omega.%I', t);
      EXECUTE format(
        'CREATE POLICY omega_app_all ON omega.%I FOR ALL TO omega_app USING (true) WITH CHECK (true)',
        t
      );
    END IF;
  END LOOP;
END
$$;

INSERT INTO omega.schema_migrations (id) VALUES ('003_supabase_hardening')
ON CONFLICT (id) DO NOTHING;
