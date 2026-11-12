import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deriveAppStatus } from '../src/lib/appStatus.ts'
import { createApp } from './app.ts'
import { seedHistoricDrafts } from './seed.ts'
import { createTestStore, resetStoreSingleton } from './store/index.ts'

describe('OMEGA app status / login gate', () => {
  it('keeps canSignIn when status is postgres even if catalog payload is missing', () => {
    const status = {
      readiness: {
        persistence: 'postgres',
        migrated: true,
        message: 'Postgres connected; required schema markers present. Commerce enabled only after admin activation settings.',
      },
      settings: {
        commercial_activation: false,
        currency: 'NGN',
        entity_name: 'Ideaville Enterprise',
        market: 'Nigeria first; UK deferred',
        petrol_only: true,
        checkout_enabled: false,
        payment_provider_configured: false,
        delivery_policy_configured: false,
      },
    }
    const derived = deriveAppStatus(status, null)
    assert.equal(derived.database, 'connected')
    assert.equal(derived.canSignIn, true)
    assert.equal(derived.canOrder, false)
  })

  it('disables canSignIn for unconfigured/error without fail-opening', () => {
    assert.equal(deriveAppStatus({ readiness: { persistence: 'unconfigured' } }, null).canSignIn, false)
    assert.equal(deriveAppStatus({ readiness: { persistence: 'error' } }, null).canSignIn, false)
    assert.equal(deriveAppStatus(null, null).canSignIn, false)
  })

  it('parallel historic seeds do not 500 under unique races', async () => {
    const store = createTestStore()
    await Promise.all([seedHistoricDrafts(store), seedHistoricDrafts(store), seedHistoricDrafts(store)])
    const distributors = await store.listDistributors()
    assert.equal(distributors.filter((d) => d.code === 'KAY-PARTNER').length, 1)
    const products = await store.listProducts()
    assert.ok(products.some((p) => p.sku === 'OMEGA-50ML-DRAFT'))
  })

  it('concurrent catalog requests stay 200 while status reports postgres (memory)', async () => {
    resetStoreSingleton()
    process.env.OMEGA_ALLOW_MEMORY_STORE = '1'
    delete process.env.DATABASE_URL
    try {
      const app = createApp()
      const [status, catalogA, catalogB] = await Promise.all([
        app.request('/api/status'),
        app.request('/api/catalog'),
        app.request('/api/catalog'),
      ])
      assert.equal(status.status, 200)
      assert.equal(catalogA.status, 200)
      assert.equal(catalogB.status, 200)
      const statusBody = await status.json()
      assert.equal(statusBody.readiness.persistence, 'memory')
      const derived = deriveAppStatus(statusBody, await catalogA.json())
      assert.equal(derived.canSignIn, true)
    } finally {
      delete process.env.OMEGA_ALLOW_MEMORY_STORE
      resetStoreSingleton()
    }
  })
})
