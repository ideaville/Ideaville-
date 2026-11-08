import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createApp } from './app.ts'
import { hashPassword, newId, nowIso } from './crypto.ts'
import { resetStoreSingleton } from './store/index.ts'
import { pgTypes, tryCreatePostgresStore } from './store/postgres.ts'
import type { AuthUser } from './types.ts'

describe('postgres BIGINT parsing', () => {
  it('parses BIGINT money columns to numbers (matches memory store)', () => {
    assert.equal(pgTypes.bigint.parse('650000'), 650000)
    assert.equal(typeof pgTypes.bigint.parse('0'), 'number')
  })

  it('refuses values beyond the safe integer range instead of losing precision', () => {
    assert.throws(() => pgTypes.bigint.parse('9007199254740993'))
  })

  it('serializes numbers for BIGINT parameters', () => {
    assert.equal(pgTypes.bigint.serialize(450000), '450000')
  })
})

describe('admin overview', () => {
  const saved: Record<string, string | undefined> = {}
  const keys = ['DATABASE_URL', 'OMEGA_ALLOW_MEMORY_STORE', 'OMEGA_BOOTSTRAP_ADMIN_EMAIL', 'OMEGA_BOOTSTRAP_ADMIN_PASSWORD']

  before(() => {
    for (const k of keys) saved[k] = process.env[k]
    // Isolated in-process memory store for this test only; restored in after().
    delete process.env.DATABASE_URL
    process.env.OMEGA_ALLOW_MEMORY_STORE = '1'
    process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL = 'overview-admin@omega.test'
    process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD = 'overview-admin-pw'
    resetStoreSingleton()
  })

  after(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
    resetStoreSingleton()
  })

  it('includes each product’s prices so the admin catalogue can show draft prices', async () => {
    const app = createApp()
    await app.request('/api/catalog') // seeds historic drafts + bootstrap admin
    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'overview-admin@omega.test', password: 'overview-admin-pw' }),
    })
    assert.equal(login.status, 200)
    const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]

    const res = await app.request('/api/admin/overview', { headers: { cookie } })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { products: Array<{ sku: string; prices?: Array<{ channel: string; status: string; amount_kobo: number }> }> }
    const draft = body.products.find((p) => p.sku === 'OMEGA-50ML-DRAFT')
    assert.ok(draft?.prices, 'overview products carry prices')
    const retail = draft.prices.find((p) => p.channel === 'retail')
    assert.equal(retail?.status, 'draft')
    assert.equal(retail?.amount_kobo, 6500_00)
  })
})

/**
 * Live Postgres check — runs only when OMEGA_TEST_DATABASE_URL points at a disposable database.
 * The memory store returns numbers, so this is the only test that catches driver-level type drift.
 */
const testDbUrl = process.env.OMEGA_TEST_DATABASE_URL?.trim()

describe('postgres store (live)', { skip: testDbUrl ? false : 'set OMEGA_TEST_DATABASE_URL to run' }, () => {
  it('returns money amounts as numbers, not strings', async () => {
    const store = await tryCreatePostgresStore(testDbUrl!)
    const adminUser = await store.createUser({
      id: newId(),
      email: `pg-admin-${newId()}@omega.test`,
      password_hash: await hashPassword('pg-admin-password'),
      role: 'admin',
      distributor_id: null,
      active: true,
    })
    const admin: AuthUser = { id: adminUser.id, email: adminUser.email, role: 'admin', distributor_id: null }
    const before = await store.getSettings()
    try {
      await store.updateSettings(
        { commercial_activation: true, checkout_enabled: true, payment_provider_configured: true, delivery_policy_configured: true },
        admin,
      )
      const product = await store.createProduct({
        id: newId(),
        sku: `PG-${newId().slice(0, 8)}`.toUpperCase(),
        name: 'PG type test',
        volume_ml: 50,
        kind: 'bottle',
        channel_eligibility: { retail: true, trade: false },
        saleable: true,
        approved_for_sale: true,
        description: 'test',
        created_at: nowIso(),
      })
      const price = await store.createPrice({
        id: newId(),
        product_id: product.id,
        channel: 'retail',
        amount_kobo: 6500_00,
        currency: 'NGN',
        status: 'draft',
        label: 'test',
        effective_from: null,
        approved_by: null,
        created_at: nowIso(),
      })
      await store.activatePrice(price.id, admin)
      await store.createBatch({ id: newId(), product_id: product.id, batch_code: 'PG1', qty_on_hand: 5, qty_reserved: 0, notes: '', created_at: nowIso() })

      const [listed] = await store.listPrices(product.id)
      assert.equal(listed.amount_kobo, 6500_00)

      const result = await store.placeOrder({ channel: 'retail', buyer: null, distributorId: null, lines: [{ product_id: product.id, quantity: 2 }] })
      assert.equal(result.order.total_kobo, 13000_00)
      const orders = await store.listOrders()
      assert.equal(typeof orders.find((o) => o.id === result.order.id)?.total_kobo, 'number')
    } finally {
      await store.updateSettings(
        {
          commercial_activation: before.commercial_activation,
          checkout_enabled: before.checkout_enabled,
          payment_provider_configured: before.payment_provider_configured,
          delivery_policy_configured: before.delivery_policy_configured,
        },
        admin,
      )
    }
  })
})
