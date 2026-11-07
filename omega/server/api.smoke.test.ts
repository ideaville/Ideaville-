import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'
import { createApp } from './app.ts'
import { resetStoreSingleton } from './store/index.ts'

describe('OMEGA API smoke (unconfigured)', () => {
  before(() => {
    delete process.env.DATABASE_URL
    delete process.env.OMEGA_ALLOW_MEMORY_STORE
    resetStoreSingleton()
  })

  after(() => {
    resetStoreSingleton()
  })

  it('GET /api/health proves server process is up without persistence', async () => {
    const app = createApp()
    const res = await app.request('/api/health')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.ok, true)
    assert.equal(body.service, 'omega')
  })

  it('GET /api/status reports unconfigured persistence truthfully', async () => {
    const app = createApp()
    const res = await app.request('/api/status')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.readiness.persistence, 'unconfigured')
    assert.equal(body.readiness.migrated, false)
  })

  it('POST /api/orders fails closed with 503 when unconfigured', async () => {
    const app = createApp()
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel: 'retail', lines: [] }),
    })
    assert.equal(res.status, 503)
    const body = await res.json()
    assert.equal(body.code, 'persistence_unconfigured')
  })

  it('GET /api/catalog stays empty and honest when unconfigured', async () => {
    const app = createApp()
    const res = await app.request('/api/catalog')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.deepEqual(body.products, [])
    assert.equal(body.readiness.persistence, 'unconfigured')
    assert.equal(body.settings.commercial_activation, false)
    assert.equal(body.settings.checkout_enabled, false)
  })
})
