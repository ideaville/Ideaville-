-- =============================================================================
-- OMEGA staging schema handoff (Supabase free / direct Postgres)
-- Target: NEW dedicated staging project ONLY — not production.
-- Idempotent. Compatible with Postgres 15+ (Supabase default).
--
-- Contains: private schema omega + 001_init + 002_network + 003 hardening.
-- Does NOT: seed fake orders/referrals/paid state, create admin passwords,
--           enable Supabase Auth roles as editable app roles, or expose tables
--           to anon/authenticated PostgREST.
--
-- Parent connector: apply this file once after project creation, then set
-- Vercel env DATABASE_URL + OMEGA_BOOTSTRAP_* (see omega-staging-setup.md).
-- App also auto-migrates on boot when DATABASE_URL is set (search_path=omega).
-- =============================================================================

-- OMEGA private application schema (staging / Supabase-compatible).
-- Idempotent. Application tables live in schema "omega", not public.
-- PostgREST default exposure (public / graphql_public) will not see these tables.

CREATE SCHEMA IF NOT EXISTS omega;

SET search_path TO omega, public;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distributors (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending_terms', 'active', 'suspended')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'distributor')),
  distributor_id UUID REFERENCES distributors(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_distributor_role CHECK (
    (role = 'admin' AND distributor_id IS NULL)
    OR (role = 'distributor' AND distributor_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  volume_ml INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('bottle', 'sample', 'other')),
  channel_eligibility JSONB NOT NULL DEFAULT '{"retail":false,"trade":false}',
  saleable BOOLEAN NOT NULL DEFAULT FALSE,
  approved_for_sale BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_prices (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  channel TEXT NOT NULL CHECK (channel IN ('retail', 'trade')),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'superseded')),
  label TEXT NOT NULL DEFAULT '',
  effective_from TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_prices_one_active
  ON product_prices (product_id, channel)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS stock_batches (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  batch_code TEXT NOT NULL,
  qty_on_hand INTEGER NOT NULL CHECK (qty_on_hand >= 0),
  qty_reserved INTEGER NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, batch_code),
  CONSTRAINT stock_reserve_lte_on_hand CHECK (qty_reserved <= qty_on_hand)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES stock_batches(id),
  delta_on_hand INTEGER NOT NULL,
  delta_reserved INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  order_id UUID,
  actor_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('retail', 'trade')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'placed', 'cancelled', 'fulfilled', 'closed')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid', 'failed', 'refunded')),
  fulfillment_status TEXT NOT NULL CHECK (fulfillment_status IN ('unfulfilled', 'allocated', 'shipped', 'delivered', 'cancelled')),
  buyer_user_id UUID REFERENCES users(id),
  distributor_id UUID REFERENCES distributors(id),
  currency TEXT NOT NULL DEFAULT 'NGN',
  total_kobo BIGINT NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_lines (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_kobo BIGINT NOT NULL CHECK (unit_price_kobo >= 0),
  line_total_kobo BIGINT NOT NULL CHECK (line_total_kobo >= 0),
  price_id UUID REFERENCES product_prices(id),
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commercial_terms (
  id UUID PRIMARY KEY,
  distributor_id UUID REFERENCES distributors(id),
  kind TEXT NOT NULL CHECK (kind IN ('wholesale_margin', 'commission')),
  rate_bps INTEGER CHECK (rate_bps IS NULL OR (rate_bps >= 0 AND rate_bps <= 10000)),
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'retired')),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('submitted', 'verified_paid', 'rejected', 'refund_noted')),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  note TEXT NOT NULL DEFAULT '',
  actor_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (id) VALUES ('001_init') ON CONFLICT (id) DO NOTHING;

-- Referral attribution + optional distributor sponsor links.
-- No commission rates, ranks, or payouts invented here.

ALTER TABLE distributors
  ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES distributors(id),
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

UPDATE distributors SET referral_code = code WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS distributors_referral_code_uq
  ON distributors (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY,
  referrer_distributor_id UUID NOT NULL REFERENCES distributors(id),
  referrer_user_id UUID REFERENCES users(id),
  code TEXT NOT NULL,
  prospect_label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('recorded', 'attributed', 'void')),
  attributed_order_id UUID REFERENCES orders(id),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_distributor_id, created_at DESC);


INSERT INTO schema_migrations (id) VALUES ('002_network') ON CONFLICT (id) DO NOTHING;

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
