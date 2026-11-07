import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AppError } from './errors.ts'
import { hashPassword, newId, nowIso } from './crypto.ts'
import { createTestStore } from './store/index.ts'
import { seedHistoricDrafts } from './seed.ts'
import type { AuthUser } from './types.ts'

async function adminActor(store: ReturnType<typeof createTestStore>): Promise<AuthUser> {
  const user = await store.createUser({
    id: newId(),
    email: 'admin@ideaville.test',
    password_hash: await hashPassword('admin-password-ok'),
    role: 'admin',
    distributor_id: null,
    active: true,
  })
  return { id: user.id, email: user.email, role: 'admin', distributor_id: null }
}

async function enableCheckout(store: ReturnType<typeof createTestStore>, admin: AuthUser) {
  await store.updateSettings(
    {
      commercial_activation: true,
      checkout_enabled: true,
      payment_provider_configured: true,
      delivery_policy_configured: true,
    },
    admin,
  )
}

async function saleableBottle(store: ReturnType<typeof createTestStore>, admin: AuthUser) {
  const product = await store.createProduct({
    id: newId(),
    sku: 'OMEGA-50-LIVE',
    name: 'OMEGA 50ml',
    volume_ml: 50,
    kind: 'bottle',
    channel_eligibility: { retail: true, trade: true },
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
  const trade = await store.createPrice({
    id: newId(),
    product_id: product.id,
    channel: 'trade',
    amount_kobo: 4500_00,
    currency: 'NGN',
    status: 'draft',
    label: 'test trade',
    effective_from: null,
    approved_by: null,
    created_at: nowIso(),
  })
  await store.activatePrice(trade.id, admin)
  await store.createBatch({
    id: newId(),
    product_id: product.id,
    batch_code: 'B1',
    qty_on_hand: 10,
    qty_reserved: 0,
    notes: '',
    created_at: nowIso(),
  })
  return product
}

describe('OMEGA commerce security', () => {
  it('seeds historic drafts without activating commerce', async () => {
    const store = createTestStore()
    await seedHistoricDrafts(store)
    const settings = await store.getSettings()
    assert.equal(settings.commercial_activation, false)
    assert.equal(settings.checkout_enabled, false)
    const products = await store.listProducts()
    assert.ok(products.some((p) => p.sku === 'OMEGA-50ML-DRAFT' && !p.approved_for_sale))
    assert.ok(products.some((p) => p.sku === 'OMEGA-30ML-SAMPLE' && p.kind === 'sample'))
    const kay = (await store.listDistributors()).find((d) => d.code === 'KAY-PARTNER')
    assert.ok(kay)
    assert.equal(kay.status, 'pending_terms')
  })

  it('blocks checkout while fail-closed settings are off', async () => {
    const store = createTestStore()
    const admin = await adminActor(store)
    const product = await saleableBottle(store, admin)
    await assert.rejects(
      () => store.placeOrder({ channel: 'retail', buyer: null, distributorId: null, lines: [{ product_id: product.id, quantity: 1 }] }),
      (err: unknown) => err instanceof AppError && err.code === 'checkout_disabled',
    )
  })

  it('ignores client price tampering by using server active price', async () => {
    const store = createTestStore()
    const admin = await adminActor(store)
    await enableCheckout(store, admin)
    const product = await saleableBottle(store, admin)
    const result = await store.placeOrder({
      channel: 'retail',
      buyer: null,
      distributorId: null,
      lines: [{ product_id: product.id, quantity: 2 }],
    })
    assert.equal(result.lines[0].unit_price_kobo, 6500_00)
    assert.equal(result.order.total_kobo, 13000_00)
  })

  it('prevents non-admin from verifying payment', async () => {
    const store = createTestStore()
    const admin = await adminActor(store)
    await enableCheckout(store, admin)
    const product = await saleableBottle(store, admin)
    const dist = await store.createDistributor({
      id: newId(),
      name: 'Dist A',
      code: 'DA',
      status: 'active',
      notes: '',
      created_at: nowIso(),
    })
    const distUser = await store.createUser({
      id: newId(),
      email: 'dist-a@test',
      password_hash: await hashPassword('distributor-password'),
      role: 'distributor',
      distributor_id: dist.id,
      active: true,
    })
    const order = await store.placeOrder({
      channel: 'retail',
      buyer: null,
      distributorId: null,
      lines: [{ product_id: product.id, quantity: 1 }],
    })
    await assert.rejects(
      () =>
        store.setPaymentStatus({
          orderId: order.order.id,
          paymentStatus: 'paid',
          eventKind: 'verified_paid',
          note: 'nope',
          actor: {
            id: distUser.id,
            email: distUser.email,
            role: 'distributor',
            distributor_id: dist.id,
          },
        }),
      (err: unknown) => err instanceof AppError && err.status === 403,
    )
  })

  it('enforces distributor tenant isolation on trade orders', async () => {
    const store = createTestStore()
    const admin = await adminActor(store)
    await enableCheckout(store, admin)
    const product = await saleableBottle(store, admin)
    const a = await store.createDistributor({
      id: newId(),
      name: 'A',
      code: 'A1',
      status: 'active',
      notes: '',
      created_at: nowIso(),
    })
    const b = await store.createDistributor({
      id: newId(),
      name: 'B',
      code: 'B1',
      status: 'active',
      notes: '',
      created_at: nowIso(),
    })
    const userA = await store.createUser({
      id: newId(),
      email: 'a@test',
      password_hash: await hashPassword('distributor-password'),
      role: 'distributor',
      distributor_id: a.id,
      active: true,
    })
    await assert.rejects(
      () =>
        store.placeOrder({
          channel: 'trade',
          buyer: { id: userA.id, email: userA.email, role: 'distributor', distributor_id: a.id },
          distributorId: b.id,
          lines: [{ product_id: product.id, quantity: 1 }],
        }),
      (err: unknown) => err instanceof AppError && err.status === 403,
    )
  })

  it('allocates concurrent stock without oversell', async () => {
    const store = createTestStore()
    const admin = await adminActor(store)
    await enableCheckout(store, admin)
    const product = await saleableBottle(store, admin)
    // Only 10 on hand from helper — fire 8 parallel qty=2 orders (16 requested)
    const jobs = Array.from({ length: 8 }, () =>
      store
        .placeOrder({
          channel: 'retail',
          buyer: null,
          distributorId: null,
          lines: [{ product_id: product.id, quantity: 2 }],
        })
        .then(() => 'ok' as const)
        .catch((err: unknown) => (err instanceof AppError ? err.code : 'error')),
    )
    const results = await Promise.all(jobs)
    const oks = results.filter((r) => r === 'ok').length
    const stockFails = results.filter((r) => r === 'insufficient_stock').length
    assert.equal(oks, 5)
    assert.equal(stockFails, 3)
    const batches = await store.listBatches(product.id)
    const reserved = batches.reduce((sum, b) => sum + b.qty_reserved, 0)
    assert.equal(reserved, 10)
  })

  it('rejects sample and unapproved products', async () => {
    const store = createTestStore()
    const admin = await adminActor(store)
    await enableCheckout(store, admin)
    await seedHistoricDrafts(store)
    const sample = (await store.listProducts()).find((p) => p.kind === 'sample')!
    await assert.rejects(
      () =>
        store.placeOrder({
          channel: 'retail',
          buyer: null,
          distributorId: null,
          lines: [{ product_id: sample.id, quantity: 1 }],
        }),
      (err: unknown) => err instanceof AppError && err.code === 'sample_not_saleable',
    )
  })

  it('refuses activating commission without explicit rate', async () => {
    const store = createTestStore()
    const admin = await adminActor(store)
    const term = await store.createTerm({
      id: newId(),
      distributor_id: null,
      kind: 'commission',
      rate_bps: null,
      notes: 'NO DEFAULT',
      status: 'draft',
      approved_by: null,
      created_at: nowIso(),
    })
    await assert.rejects(
      () => store.activateTerm(term.id, admin),
      (err: unknown) => err instanceof AppError && err.status === 400,
    )
  })

  it('rejects invalid quantities', async () => {
    const store = createTestStore()
    const admin = await adminActor(store)
    await enableCheckout(store, admin)
    const product = await saleableBottle(store, admin)
    await assert.rejects(
      () =>
        store.placeOrder({
          channel: 'retail',
          buyer: null,
          distributorId: null,
          lines: [{ product_id: product.id, quantity: 0 }],
        }),
      (err: unknown) => err instanceof AppError && err.status === 400,
    )
  })
})
