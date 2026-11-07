import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AppError } from './errors.ts'
import { createFailedStore, createUnconfiguredStore } from './store/postgres.ts'
import { REQUIRED_MIGRATION_MARKERS } from './store/migrate.ts'
import { createApp } from './app.ts'
import { resetStoreSingleton } from './store/index.ts'

describe('OMEGA migrate contracts', () => {
  it('requires the three staging markers before skipping owner DDL', () => {
    assert.deepEqual([...REQUIRED_MIGRATION_MARKERS], ['001_init', '002_network', '003_supabase_hardening'])
  })

  it('failed store reports persistence error, not unconfigured', async () => {
    const store = createFailedStore(
      Object.assign(new Error('permission denied for schema omega'), { code: 'persistence_permission_denied' }),
    )
    const readiness = await store.readiness()
    assert.equal(readiness.persistence, 'error')
    assert.equal(readiness.migrated, false)
    assert.equal(readiness.code, 'persistence_permission_denied')
    await assert.rejects(
      () => store.listUsers(),
      (err: unknown) => err instanceof AppError && err.code === 'persistence_permission_denied' && err.status === 503,
    )
  })

  it('unconfigured store stays distinct from error', async () => {
    const store = createUnconfiguredStore()
    const readiness = await store.readiness()
    assert.equal(readiness.persistence, 'unconfigured')
    assert.equal(readiness.code, 'persistence_unconfigured')
  })

  it('status surfaces error readiness when DATABASE_URL init fails', async () => {
    resetStoreSingleton()
    process.env.DATABASE_URL = 'postgres://omega_app:invalid@127.0.0.1:1/does_not_exist'
    delete process.env.OMEGA_ALLOW_MEMORY_STORE
    try {
      const app = createApp()
      const res = await app.request('/api/status')
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.equal(body.readiness.persistence, 'error')
      assert.equal(body.readiness.migrated, false)
      assert.notEqual(body.readiness.persistence, 'unconfigured')
    } finally {
      delete process.env.DATABASE_URL
      resetStoreSingleton()
    }
  })
})
