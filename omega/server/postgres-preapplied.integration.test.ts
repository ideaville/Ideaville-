/**
 * Real Postgres permission proof: schema owned by postgres, runtime as omega_app
 * without CREATE / BYPASSRLS. Skips unless OMEGA_IT_DATABASE_URL is set.
 *
 * Setup (local): `npm run test:pg-it:setup` then `npm run test:pg-it`
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import postgres from 'postgres'
import { AppError } from './errors.ts'
import { maybeBootstrapAdmin } from './services/auth.ts'
import { migratePostgres, REQUIRED_MIGRATION_MARKERS } from './store/migrate.ts'
import { OMEGA_SEARCH_PATH_GUC } from './store/postgresPaths.ts'
import { tryCreatePostgresStore } from './store/postgres.ts'
import { seedHistoricDrafts } from './seed.ts'

const url = process.env.OMEGA_IT_DATABASE_URL?.trim()

describe('OMEGA preapplied schema as omega_app (integration)', { skip: !url }, () => {
  it('skips owner DDL when markers exist and allows DML bootstrap', async () => {
    assert.ok(url)
    const sql = postgres(url, {
      max: 2,
      prepare: false,
      connection: { search_path: OMEGA_SEARCH_PATH_GUC },
    })
    try {
      const who = await sql<{ user: string; bypass: boolean; create_priv: boolean }>`
        SELECT
          current_user AS user,
          COALESCE(current_setting('is_superuser', true) = 'on', false) AS bypass,
          has_schema_privilege(current_user, 'omega', 'CREATE') AS create_priv
      `
      assert.equal(who[0].user, 'omega_app')
      assert.equal(who[0].bypass, false)
      assert.equal(who[0].create_priv, false)

      const before = await sql<{ id: string }>`
        SELECT id FROM omega.schema_migrations
        WHERE id IN ('001_init', '002_network', '003_supabase_hardening')
      `
      assert.equal(before.length, REQUIRED_MIGRATION_MARKERS.length)

      const result = await migratePostgres(sql)
      assert.equal(result.mode, 'preapplied')
      assert.equal(result.applied, false)

      // Owner-only DDL must not be required on second call either.
      const again = await migratePostgres(sql)
      assert.equal(again.applied, false)
    } finally {
      await sql.end({ timeout: 5 })
    }
  })

  it('store boot + admin bootstrap with distributor_id null; no commercial rows invented beyond historic seed', async () => {
    assert.ok(url)
    const prevEmail = process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL
    const prevPass = process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD
    process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL = 'femiadeoye08@outlook.com'
    process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD = 'integration-bootstrap-secret'
    try {
      const store = await tryCreatePostgresStore(url)
      const readiness = await store.readiness()
      assert.equal(readiness.persistence, 'postgres')
      assert.equal(readiness.migrated, true)

      await seedHistoricDrafts(store)
      const admin = await maybeBootstrapAdmin(store)
      assert.ok(admin)
      assert.equal(admin.role, 'admin')
      assert.equal(admin.distributor_id, null)
      assert.equal(admin.email, 'femiadeoye08@outlook.com')

      const orders = await store.listOrders()
      const referrals = await store.listReferrals()
      assert.equal(orders.length, 0)
      assert.equal(referrals.length, 0)
      const kay = (await store.listDistributors()).find((d) => d.code === 'KAY-PARTNER')
      assert.ok(kay)
      assert.equal(kay.status, 'pending_terms')
    } finally {
      if (prevEmail === undefined) delete process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL
      else process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL = prevEmail
      if (prevPass === undefined) delete process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD
      else process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD = prevPass
    }
  })

  it('fails closed when markers are missing and role cannot DDL', async () => {
    assert.ok(url)
    const adminUrl = process.env.OMEGA_IT_ADMIN_DATABASE_URL?.trim()
    if (!adminUrl) {
      // Cannot simulate drop markers without owner URL — document skip reason.
      return
    }
    const admin = postgres(adminUrl, { max: 1, prepare: false })
    const appSql = postgres(url, {
      max: 1,
      prepare: false,
      connection: { search_path: OMEGA_SEARCH_PATH_GUC },
    })
    try {
      await admin`DELETE FROM omega.schema_migrations WHERE id = '003_supabase_hardening'`
      await assert.rejects(
        () => migratePostgres(appSql),
        (err: unknown) =>
          err instanceof AppError && err.code === 'persistence_schema_incomplete' && err.status === 503,
      )
    } finally {
      await admin`INSERT INTO omega.schema_migrations (id) VALUES ('003_supabase_hardening') ON CONFLICT (id) DO NOTHING`
      await admin.end({ timeout: 5 })
      await appSql.end({ timeout: 5 })
    }
  })
})
