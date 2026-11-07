-- OMEGA private application schema (staging / Supabase-compatible).
-- Idempotent. Application tables live in schema "omega", not public.
-- PostgREST default exposure (public / graphql_public) will not see these tables.

CREATE SCHEMA IF NOT EXISTS omega;
