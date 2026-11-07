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
