import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createApp } from './app.ts'
import { AppError } from './errors.ts'
import { hashPassword, newId, nowIso } from './crypto.ts'
import { createTestStore, resetStoreSingleton } from './store/index.ts'
import { tryCreatePostgresStore } from './store/postgres.ts'
import type { OmegaStore } from './store/types.ts'
import type { AuthUser } from './types.ts'

async function setup(store: OmegaStore) {
  const user = await store.createUser({
    id: newId(),
    email: `admin-${newId()}@omega.test`,
    password_hash: await hashPassword('admin-password-ok'),
    role: 'admin',
    distributor_id: null,
    active: true,
  })
  const admin: AuthUser = { id: user.id, email: user.email, role: 'admin', distributor_id: null }
  await store.updateSettings(
    { commercial_activation: true, checkout_enabled: true, payment_provider_configured: true, delivery_policy_configured: true },
    admin,
  )
  const product = await store.createProduct({
    id: newId(),
    sku: `CANCEL-${newId().slice(0, 8)}`.toUpperCase(),
    name: 'Cancel test',
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
    amount_kobo: 1000_00,
    currency: 'NGN',
    status: 'draft',
    label: '',
    effective_from: null,
    approved_by: null,
    created_at: nowIso(),
  })
  await store.activatePrice(price.id, admin)
  const batch = await store.createBatch({ id: newId(), product_id: product.id, batch_code: 'C1', qty_on_hand: 5, qty_reserved: 0, notes: '', created_at: nowIso() })
  const order = () => store.placeOrder({ channel: 'retail', buyer: null, distributorId: null, lines: [{ product_id: product.id, quantity: 2 }] })
  const batchNow = async () => (await store.listBatches(product.id)).find((b) => b.id === batch.id)!
  return { admin, order, batchNow }
}

function code(err: unknown) {
  return err instanceof AppError ? err.code : String(err)
}

/** Shared cancellation contract, run against both stores. */
function cancellationSuite(makeStore: () => Promise<OmegaStore>) {
  it('cancelling an allocated order releases its reserved stock', async () => {
    const store = await makeStore()
    const { admin, order, batchNow } = await setup(store)
    const { order: o } = await order()
    assert.equal((await batchNow()).qty_reserved, 2)
    const cancelled = await store.setFulfillmentStatus({ orderId: o.id, fulfillmentStatus: 'cancelled', actor: admin })
    assert.equal(cancelled.status, 'cancelled')
    assert.equal(cancelled.fulfillment_status, 'cancelled')
    const b = await batchNow()
    assert.equal(b.qty_reserved, 0)
    assert.equal(b.qty_on_hand, 5)
  })

  it('closed orders cannot change again', async () => {
    const store = await makeStore()
    const { admin, order } = await setup(store)
    const { order: o } = await order()
    await store.setFulfillmentStatus({ orderId: o.id, fulfillmentStatus: 'cancelled', actor: admin })
    await assert.rejects(store.setFulfillmentStatus({ orderId: o.id, fulfillmentStatus: 'shipped', actor: admin }), (e) => code(e) === 'order_closed')
  })

  it('shipped orders cannot be cancelled, and delivery consumes stock once', async () => {
    const store = await makeStore()
    const { admin, order, batchNow } = await setup(store)
    const { order: o } = await order()
    await store.setFulfillmentStatus({ orderId: o.id, fulfillmentStatus: 'shipped', actor: admin })
    await assert.rejects(store.setFulfillmentStatus({ orderId: o.id, fulfillmentStatus: 'cancelled', actor: admin }), (e) => code(e) === 'order_shipped')
    await store.setFulfillmentStatus({ orderId: o.id, fulfillmentStatus: 'delivered', actor: admin })
    const b = await batchNow()
    assert.equal(b.qty_on_hand, 3)
    assert.equal(b.qty_reserved, 0)
  })
}

describe('order cancellation (memory store)', () => {
  cancellationSuite(async () => createTestStore())
})

const testDbUrl = process.env.OMEGA_TEST_DATABASE_URL?.trim()
describe('order cancellation (live postgres)', { skip: testDbUrl ? false : 'set OMEGA_TEST_DATABASE_URL to run' }, () => {
  let store: OmegaStore | null = null
  cancellationSuite(async () => (store ??= await tryCreatePostgresStore(testDbUrl!)))
  after(async () => {
    // Leave the shared test database with commerce switched off.
    if (!store) return
    const admin = (await store.listUsers()).find((u) => u.role === 'admin')!
    await store.updateSettings(
      { commercial_activation: false, checkout_enabled: false, payment_provider_configured: false, delivery_policy_configured: false },
      { id: admin.id, email: admin.email, role: 'admin', distributor_id: null },
    )
  })
})

describe('admin product update validation', () => {
  const saved: Record<string, string | undefined> = {}
  const keys = ['DATABASE_URL', 'OMEGA_ALLOW_MEMORY_STORE', 'OMEGA_BOOTSTRAP_ADMIN_EMAIL', 'OMEGA_BOOTSTRAP_ADMIN_PASSWORD']
  let cookie = ''
  let app: ReturnType<typeof createApp>

  before(async () => {
    for (const k of keys) saved[k] = process.env[k]
    // Isolated in-process memory store for this test only; restored in after().
    delete process.env.DATABASE_URL
    process.env.OMEGA_ALLOW_MEMORY_STORE = '1'
    process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL = 'validation-admin@omega.test'
    process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD = 'validation-admin-pw'
    resetStoreSingleton()
    app = createApp()
    await app.request('/api/catalog')
    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'validation-admin@omega.test', password: 'validation-admin-pw' }),
    })
    cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
  })

  after(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
    resetStoreSingleton()
  })

  async function productBySku(sku: string) {
    const res = await app.request('/api/admin/overview', { headers: { cookie } })
    const body = (await res.json()) as { products: Array<{ id: string; sku: string }> }
    return body.products.find((p) => p.sku === sku)!
  }

  const patch = (id: string, body: unknown) =>
    app.request(`/api/admin/products/${id}`, { method: 'PATCH', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) })

  it('rejects non-boolean sale flags and malformed channel eligibility', async () => {
    const draft = await productBySku('OMEGA-50ML-DRAFT')
    assert.equal((await patch(draft.id, { saleable: 'yes' })).status, 400)
    assert.equal((await patch(draft.id, { channel_eligibility: { retail: 'true' } })).status, 400)
    assert.equal((await patch(draft.id, { volume_ml: -5 })).status, 400)
    assert.equal((await patch(draft.id, { name: '  ' })).status, 400)
  })

  it('refuses to make a sample saleable', async () => {
    const sample = await productBySku('OMEGA-30ML-SAMPLE')
    assert.equal((await patch(sample.id, { saleable: true, approved_for_sale: true })).status, 400)
  })

  it('refuses payment on a cancelled order but still allows a refund', async () => {
    const draft = await productBySku('OMEGA-50ML-DRAFT')
    const h = { cookie, 'content-type': 'application/json' }
    await app.request('/api/admin/settings', {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({ commercial_activation: true, checkout_enabled: true, payment_provider_configured: true, delivery_policy_configured: true }),
    })
    await patch(draft.id, { saleable: true, approved_for_sale: true, channel_eligibility: { retail: true, trade: true } })
    await app.request('/api/admin/prices', { method: 'POST', headers: h, body: JSON.stringify({ product_id: draft.id, channel: 'retail', amount_kobo: 1000_00, activate: true }) })
    await app.request('/api/admin/stock/batches', { method: 'POST', headers: h, body: JSON.stringify({ product_id: draft.id, batch_code: 'PAY1', qty_on_hand: 3 }) })
    const placed = await app.request('/api/orders', { method: 'POST', headers: h, body: JSON.stringify({ channel: 'retail', lines: [{ product_id: draft.id, quantity: 1 }] }) })
    assert.equal(placed.status, 201)
    const { order } = (await placed.json()) as { order: { id: string } }
    await app.request(`/api/admin/orders/${order.id}/fulfillment`, { method: 'POST', headers: h, body: JSON.stringify({ fulfillment_status: 'cancelled' }) })
    const pay = await app.request(`/api/admin/orders/${order.id}/payment`, { method: 'POST', headers: h, body: JSON.stringify({ payment_status: 'paid' }) })
    assert.equal(pay.status, 409)
    const refund = await app.request(`/api/admin/orders/${order.id}/payment`, { method: 'POST', headers: h, body: JSON.stringify({ payment_status: 'refunded' }) })
    assert.equal(refund.status, 200)
  })

  it('accepts a valid approval', async () => {
    const draft = await productBySku('OMEGA-50ML-DRAFT')
    const res = await patch(draft.id, { saleable: true, approved_for_sale: true, channel_eligibility: { retail: true, trade: true } })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { product: { saleable: boolean; channel_eligibility: { retail: boolean } } }
    assert.equal(body.product.saleable, true)
    assert.equal(body.product.channel_eligibility.retail, true)
  })
})
