/** Canonical schema applied on Postgres boot. Mirrors migrations/001_init.sql. */
export const SCHEMA_SQL_001 = `-- OMEGA commerce schema (Postgres). Apply only when DATABASE_URL is configured.
-- Fail closed: app refuses mutating commerce ops until migrated + settings allow.

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
`
