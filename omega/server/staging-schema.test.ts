import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hashPassword, newId } from './crypto.ts'
import { maybeBootstrapAdmin } from './services/auth.ts'
import { createTestStore } from './store/index.ts'
import { SCHEMA_SQL_000, SCHEMA_SQL_001, SCHEMA_SQL_002, SCHEMA_SQL_003 } from './store/schemaSql.ts'
import { seedHistoricDrafts } from './seed.ts'

describe('OMEGA staging schema + bootstrap', () => {
  it('ships private omega schema DDL and Supabase hardening without public grants', () => {
    assert.match(SCHEMA_SQL_000, /CREATE SCHEMA IF NOT EXISTS omega/)
    assert.match(SCHEMA_SQL_001, /CREATE TABLE IF NOT EXISTS users/)
    assert.match(SCHEMA_SQL_002, /CREATE TABLE IF NOT EXISTS referrals/)
    assert.match(SCHEMA_SQL_003, /omega_app/)
    assert.match(SCHEMA_SQL_003, /REVOKE ALL ON SCHEMA omega FROM PUBLIC/)
    assert.match(SCHEMA_SQL_003, /anon/)
    assert.match(SCHEMA_SQL_003, /authenticated/)
    assert.match(SCHEMA_SQL_003, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(SCHEMA_SQL_003, /GRANT .+ TO anon/i)
    assert.doesNotMatch(SCHEMA_SQL_003, /GRANT .+ TO authenticated/i)
    assert.doesNotMatch(SCHEMA_SQL_003, /auth\.users/)
  })

  it('bootstraps first admin only; never attaches distributor membership', async () => {
    const store = createTestStore()
    const prevEmail = process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL
    const prevPass = process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD
    process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL = 'femiadeoye08@outlook.com'
    process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD = 'staging-bootstrap-secret'
    try {
      const created = await maybeBootstrapAdmin(store)
      assert.ok(created)
      assert.equal(created.role, 'admin')
      assert.equal(created.distributor_id, null)
      assert.equal(created.email, 'femiadeoye08@outlook.com')

      const second = await maybeBootstrapAdmin(store)
      assert.equal(second?.id, created.id)

      process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL = 'other@example.com'
      process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD = 'another-secret-ok'
      const blocked = await maybeBootstrapAdmin(store)
      assert.equal(blocked, null)
    } finally {
      if (prevEmail === undefined) delete process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL
      else process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL = prevEmail
      if (prevPass === undefined) delete process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD
      else process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD = prevPass
    }
  })

  it('rejects short bootstrap passwords without creating a user', async () => {
    const store = createTestStore()
    const prevEmail = process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL
    const prevPass = process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD
    process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL = 'femiadeoye08@outlook.com'
    process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD = 'short'
    try {
      const created = await maybeBootstrapAdmin(store)
      assert.equal(created, null)
      assert.equal((await store.listUsers()).length, 0)
    } finally {
      if (prevEmail === undefined) delete process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL
      else process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL = prevEmail
      if (prevPass === undefined) delete process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD
      else process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD = prevPass
    }
  })

  it('lets admin inspect network roster without distributor role', async () => {
    const store = createTestStore()
    await seedHistoricDrafts(store)
    const admin = await store.createUser({
      id: newId(),
      email: 'femiadeoye08@outlook.com',
      password_hash: await hashPassword('owner-password-ok'),
      role: 'admin',
      distributor_id: null,
      active: true,
    })
    assert.equal(admin.role, 'admin')
    assert.equal(admin.distributor_id, null)

    const distributors = await store.listDistributors()
    const referrals = await store.listReferrals()
    assert.ok(distributors.some((d) => d.code === 'KAY-PARTNER' && d.referral_code === 'KAY-PARTNER'))
    assert.equal(referrals.length, 0)
    // No fabricated referral/order/paid rows for owner inspection.
    assert.equal((await store.listOrders()).length, 0)
  })
})
