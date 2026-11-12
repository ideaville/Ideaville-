import type postgres from 'postgres'
import { unavailable } from '../errors.ts'
import { SCHEMA_SQL_000, SCHEMA_SQL_001, SCHEMA_SQL_002, SCHEMA_SQL_003 } from './schemaSql.ts'
import { OMEGA_SEARCH_PATH } from './postgresPaths.ts'

/** Markers that must exist before runtime skips owner-only DDL. */
export const REQUIRED_MIGRATION_MARKERS = ['001_init', '002_network', '003_supabase_hardening'] as const

export type MigrateResult = {
  /** True only when this process applied DDL. Pre-applied schema → false. */
  applied: boolean
  markers: string[]
  mode: 'preapplied' | 'applied'
}

type PgErrorLike = { code?: string; message?: string }

function asPgError(err: unknown): PgErrorLike {
  if (err && typeof err === 'object') return err as PgErrorLike
  return { message: err instanceof Error ? err.message : String(err) }
}

function isUndefinedRelation(err: unknown): boolean {
  return asPgError(err).code === '42P01'
}

function isInsufficientPrivilege(err: unknown): boolean {
  const code = asPgError(err).code
  return code === '42501' || code === '42502'
}

async function readMarkerIds(sql: postgres.Sql): Promise<{ status: 'complete' | 'incomplete' | 'missing'; ids: string[] }> {
  try {
    // Fully-qualified — does not require CREATE, only USAGE + SELECT on omega.schema_migrations.
    const rows = await sql<{ id: string }>`
      SELECT id FROM omega.schema_migrations
      WHERE id IN ('001_init', '002_network', '003_supabase_hardening')
    `
    const ids = rows.map((r) => r.id)
    const have = new Set(ids)
    const complete = REQUIRED_MIGRATION_MARKERS.every((m) => have.has(m))
    return { status: complete ? 'complete' : 'incomplete', ids }
  } catch (err) {
    if (isUndefinedRelation(err)) return { status: 'missing', ids: [] }
    if (isInsufficientPrivilege(err)) {
      throw unavailable(
        'Permission denied reading omega.schema_migrations. Connect as omega_app with SELECT on omega tables (RLS policy), or fix grants. Do not treat this as unconfigured.',
        'persistence_permission_denied',
      )
    }
    const msg = asPgError(err).message ?? 'unknown'
    throw unavailable(`Schema marker check failed: ${msg}`, 'persistence_init_failed')
  }
}

async function canApplyOwnerDdl(sql: postgres.Sql): Promise<boolean> {
  const rows = await sql<{ ok: boolean }>`
    SELECT (
      current_setting('is_superuser', true) = 'on'
      OR pg_has_role(current_user, 'postgres', 'member')
      OR (
        EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'omega')
        AND has_schema_privilege(current_user, 'omega', 'CREATE')
      )
      OR (
        NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'omega')
        AND current_setting('is_superuser', true) = 'on'
      )
    ) AS ok
  `
  return Boolean(rows[0]?.ok)
}

/**
 * Marker-first migrate.
 * - If required markers exist: never run CREATE/ALTER/POLICY (owner-only); DML-only verify.
 * - If incomplete: only apply DDL when the role can own schema changes; otherwise fail closed.
 */
export async function migratePostgres(sql: postgres.Sql): Promise<MigrateResult> {
  await sql.unsafe(`SET search_path TO ${OMEGA_SEARCH_PATH}`)

  const markers = await readMarkerIds(sql)
  if (markers.status === 'complete') {
    // Prove DML path (SELECT under RLS) without owner DDL.
    await sql`SELECT 1 AS ok FROM omega.schema_migrations LIMIT 1`
    return { applied: false, markers: markers.ids, mode: 'preapplied' }
  }

  const mayDdl = await canApplyOwnerDdl(sql)
  if (!mayDdl) {
    throw unavailable(
      `OMEGA schema markers incomplete (${markers.ids.join(',') || 'none'}); role cannot apply owner DDL. Apply migrations/staging_supabase_handoff.sql as postgres on the staging project, then connect as omega_app.`,
      'persistence_schema_incomplete',
    )
  }

  await sql.begin(async (tx) => {
    await tx.unsafe(SCHEMA_SQL_000)
    await tx.unsafe(`SET LOCAL search_path TO ${OMEGA_SEARCH_PATH}`)
    await tx.unsafe(SCHEMA_SQL_001)
    await tx`INSERT INTO schema_migrations (id) VALUES ('001_init') ON CONFLICT (id) DO NOTHING`
    await tx`INSERT INTO schema_migrations (id) VALUES ('000_omega_schema') ON CONFLICT (id) DO NOTHING`
  })
  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO ${OMEGA_SEARCH_PATH}`)
    await tx.unsafe(SCHEMA_SQL_002)
    await tx`INSERT INTO schema_migrations (id) VALUES ('002_network') ON CONFLICT (id) DO NOTHING`
  })
  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO ${OMEGA_SEARCH_PATH}`)
    await tx.unsafe(SCHEMA_SQL_003)
    await tx`INSERT INTO schema_migrations (id) VALUES ('003_supabase_hardening') ON CONFLICT (id) DO NOTHING`
  })

  const after = await readMarkerIds(sql)
  if (after.status !== 'complete') {
    throw unavailable(
      'Migration finished but required markers still missing. Inspect omega.schema_migrations.',
      'persistence_init_failed',
    )
  }
  return { applied: true, markers: after.ids, mode: 'applied' }
}
