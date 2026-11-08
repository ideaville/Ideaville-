import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { cors } from 'hono/cors'
import { AppError, badRequest, conflict } from './errors.ts'
import { newId, nowIso } from './crypto.ts'
import { createAccount, login, logout, maybeBootstrapAdmin, requireRole, requireUser } from './services/auth.ts'
import { seedHistoricDrafts } from './seed.ts'
import { getStore } from './store/index.ts'

type Env = { Variables: { rawToken: string | null } }

const SESSION_COOKIE = 'omega_session'

export function createApp() {
  const app = new Hono<Env>()

  const allowedOrigins = (process.env.OMEGA_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return ''
        if (allowedOrigins.includes(origin)) return origin
        // Local Vite defaults when no allowlist configured
        if (
          allowedOrigins.length === 0 &&
          (origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:'))
        ) {
          return origin
        }
        return ''
      },
      credentials: true,
    }),
  )

  app.use('*', async (c, next) => {
    c.set('rawToken', getCookie(c, SESSION_COOKIE) ?? null)
    await next()
  })

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: err.message, code: err.code }, err.status as 400)
    }
    console.error('[omega] unhandled', err instanceof Error ? err.message : 'error')
    return c.json({ error: 'Internal error', code: 'internal' }, 500)
  })

  app.get('/api/health', (c) => c.json({ ok: true, service: 'omega' }))

  app.get('/api/status', async (c) => {
    const store = await getStore()
    const readiness = await store.readiness()
    let settings = null
    try {
      settings = await store.getSettings()
    } catch {
      settings = null
    }
    return c.json({
      readiness,
      settings,
      auth_note: 'Vercel platform login is not app role auth. Use /api/auth/login for admin/distributor sessions.',
      commercial_note: 'Checkout remains fail-closed until admin enables activation, checkout, payment provider, and delivery policy, and approves SKU/price/stock.',
    })
  })

  app.post('/api/auth/login', async (c) => {
    const store = await getStore()
    await maybeBootstrapAdmin(store)
    const body = await c.req.json<{ email?: string; password?: string }>()
    if (!body.email || !body.password) throw badRequest('Email and password required')
    const result = await login(store, body.email, body.password)
    setCookie(c, SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: Boolean(process.env.VERCEL),
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    })
    return c.json({ user: result.user })
  })

  app.post('/api/auth/logout', async (c) => {
    const store = await getStore()
    await logout(store, c.get('rawToken'))
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.json({ ok: true })
  })

  app.get('/api/auth/me', async (c) => {
    const store = await getStore()
    const user = await requireUser(store, c.get('rawToken'))
    return c.json({ user })
  })

  app.get('/api/catalog', async (c) => {
    const store = await getStore()
    const readiness = await store.readiness()
    if (readiness.persistence === 'unconfigured') {
      return c.json({
        settings: {
          commercial_activation: false,
          checkout_enabled: false,
          currency: 'NGN',
          entity_name: 'Ideaville Enterprise',
          petrol_only: true,
          market: 'Nigeria first; UK deferred',
        },
        products: [],
        readiness,
      })
    }
    await seedHistoricDrafts(store)
    await maybeBootstrapAdmin(store)
    const products = await store.listProducts()
    const prices = await store.listPrices()
    const settings = await store.getSettings()
    return c.json({
      settings: {
        commercial_activation: settings.commercial_activation,
        checkout_enabled: settings.checkout_enabled,
        currency: settings.currency,
        entity_name: settings.entity_name,
        petrol_only: settings.petrol_only,
        market: settings.market,
      },
      readiness,
      products: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        volume_ml: p.volume_ml,
        kind: p.kind,
        saleable: p.saleable,
        approved_for_sale: p.approved_for_sale,
        channel_eligibility: p.channel_eligibility,
        description: p.description,
        prices: prices
          .filter((price) => price.product_id === p.id)
          .map((price) => ({
            id: price.id,
            channel: price.channel,
            amount_kobo: price.amount_kobo,
            currency: price.currency,
            status: price.status,
            label: price.label,
          })),
      })),
    })
  })


  app.post('/api/orders', async (c) => {
    const store = await getStore()
    const body = await c.req.json<{
      channel?: 'retail' | 'trade'
      lines?: Array<{ product_id: string; quantity: number; unit_price_kobo?: number }>
      notes?: string
    }>()
    if (body.channel !== 'retail' && body.channel !== 'trade') throw badRequest('Invalid channel')
    if (!Array.isArray(body.lines)) throw badRequest('lines required')
    // Ignore any client-supplied unit_price_kobo — server prices only.
    const lines = body.lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity }))
    let buyer = null
    try {
      buyer = await requireUser(store, c.get('rawToken'))
    } catch {
      buyer = null
    }
    if (body.channel === 'trade') {
      buyer = await requireRole(store, c.get('rawToken'), 'distributor')
    }
    const result = await store.placeOrder({
      channel: body.channel,
      buyer,
      distributorId: buyer?.role === 'distributor' ? buyer.distributor_id : null,
      lines,
      notes: body.notes,
    })
    return c.json(result, 201)
  })

  app.get('/api/distributor/orders', async (c) => {
    const store = await getStore()
    const user = await requireRole(store, c.get('rawToken'), 'distributor')
    const orders = await store.listOrders({ distributorId: user.distributor_id ?? undefined })
    return c.json({ orders })
  })

  /** Tenant-scoped referral + network view for a signed-in distributor. */
  app.get('/api/distributor/network', async (c) => {
    const store = await getStore()
    const user = await requireRole(store, c.get('rawToken'), 'distributor')
    if (!user.distributor_id) throw badRequest('Distributor account incomplete')
    const self = await store.getDistributor(user.distributor_id)
    if (!self) throw badRequest('Distributor not found')
    const all = await store.listDistributors()
    const sponsored = all.filter((d) => d.sponsor_id === self.id)
    const referrals = await store.listReferrals({ referrerDistributorId: self.id })
    const terms = await store.listTerms(self.id)
    return c.json({
      self: {
        id: self.id,
        name: self.name,
        code: self.code,
        status: self.status,
        referral_code: self.referral_code,
        sponsor_id: self.sponsor_id,
      },
      sponsored: sponsored.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        status: d.status,
        referral_code: d.referral_code,
      })),
      referrals,
      terms: terms.map((t) => ({
        id: t.id,
        kind: t.kind,
        status: t.status,
        rate_bps: t.rate_bps,
        notes: t.notes,
      })),
      commercial_note:
        'No commission, residual, or equity figures are invented. Terms appear only when admin has recorded them.',
    })
  })

  app.post('/api/distributor/referrals', async (c) => {
    const store = await getStore()
    const user = await requireRole(store, c.get('rawToken'), 'distributor')
    if (!user.distributor_id) throw badRequest('Distributor account incomplete')
    const self = await store.getDistributor(user.distributor_id)
    if (!self) throw badRequest('Distributor not found')
    if (self.status === 'suspended') throw forbidden('Distributor suspended')
    const body = await c.req.json<{ prospect_label?: string; notes?: string }>()
    const label = (body.prospect_label ?? '').trim().slice(0, 80)
    if (!label) throw badRequest('prospect_label required (short non-PII label)')
    const referral = await store.createReferral({
      id: newId(),
      referrer_distributor_id: self.id,
      referrer_user_id: user.id,
      code: self.referral_code,
      prospect_label: label,
      status: 'recorded',
      attributed_order_id: null,
      notes: (body.notes ?? '').trim().slice(0, 500),
      created_at: nowIso(),
    })
    return c.json({ referral }, 201)
  })

  /** Resolve a referral code without inventing payout terms (public lookup). */
  app.get('/api/referrals/lookup', async (c) => {
    const store = await getStore()
    const readiness = await store.readiness()
    if (readiness.persistence === 'unconfigured') {
      return c.json({ found: false, readiness }, 503)
    }
    const code = (c.req.query('code') ?? '').trim()
    if (!code) throw badRequest('code required')
    const dist = await store.getDistributorByReferralCode(code)
    if (!dist || dist.status === 'suspended') return c.json({ found: false })
    return c.json({
      found: true,
      referral_code: dist.referral_code,
      distributor_code: dist.code,
      status: dist.status,
      // Name is a known business partner identity when seeded (e.g. Kay) — not a fabricated roster.
      name: dist.name,
    })
  })

  app.get('/api/admin/overview', async (c) => {
    const store = await getStore()
    await requireRole(store, c.get('rawToken'), 'admin')
    await seedHistoricDrafts(store)
    const [settings, rawProducts, prices, distributors, orders, batches, terms, referrals] = await Promise.all([
      store.getSettings(),
      store.listProducts(),
      store.listPrices(),
      store.listDistributors(),
      store.listOrders(),
      store.listBatches(),
      store.listTerms(),
      store.listReferrals(),
    ])
    // Admin catalogue shows draft/active prices per product (admin-only; never public sale prices).
    const products = rawProducts.map((p) => ({ ...p, prices: prices.filter((price) => price.product_id === p.id) }))
    return c.json({ settings, products, distributors, orders, batches, terms, referrals })
  })

  app.patch('/api/admin/settings', async (c) => {
    const store = await getStore()
    const admin = await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<Record<string, unknown>>()
    const allowed = [
      'commercial_activation',
      'checkout_enabled',
      'payment_provider_configured',
      'delivery_policy_configured',
    ] as const
    const patch: Record<string, boolean> = {}
    for (const key of allowed) {
      if (key in body) {
        if (typeof body[key] !== 'boolean') throw badRequest(`${key} must be boolean`)
        patch[key] = body[key] as boolean
      }
    }
    const settings = await store.updateSettings(patch, admin)
    return c.json({ settings })
  })

  app.post('/api/admin/distributors', async (c) => {
    const store = await getStore()
    await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{
      name?: string
      code?: string
      notes?: string
      sponsor_id?: string | null
      referral_code?: string
    }>()
    if (!body.name || !body.code) throw badRequest('name and code required')
    const code = body.code.trim().toUpperCase()
    const distributor = await store.createDistributor({
      id: newId(),
      name: body.name.trim(),
      code,
      status: 'pending_terms',
      notes: body.notes ?? '',
      sponsor_id: body.sponsor_id ?? null,
      referral_code: (body.referral_code ?? code).trim().toUpperCase(),
      created_at: nowIso(),
    })
    return c.json({ distributor }, 201)
  })

  app.patch('/api/admin/distributors/:id', async (c) => {
    const store = await getStore()
    await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{
      status?: 'pending_terms' | 'active' | 'suspended'
      notes?: string
      sponsor_id?: string | null
      referral_code?: string
    }>()
    const distributor = await store.updateDistributor(c.req.param('id'), body)
    return c.json({ distributor })
  })

  app.post('/api/admin/users', async (c) => {
    const store = await getStore()
    const admin = await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{
      email?: string
      password?: string
      role?: 'admin' | 'distributor'
      distributor_id?: string | null
    }>()
    if (!body.email || !body.password || !body.role) throw badRequest('email, password, role required')
    if (body.password.length < 10) throw badRequest('Password must be at least 10 characters')
    if (body.role === 'distributor' && !body.distributor_id) throw badRequest('distributor_id required')
    if (body.role === 'admin' && body.distributor_id) throw badRequest('Admin cannot attach distributor_id')
    const user = await createAccount(store, {
      email: body.email,
      password: body.password,
      role: body.role,
      distributor_id: body.role === 'distributor' ? body.distributor_id! : null,
      actor: admin,
    })
    return c.json({
      user: { id: user.id, email: user.email, role: user.role, distributor_id: user.distributor_id },
    }, 201)
  })

  app.post('/api/admin/products', async (c) => {
    const store = await getStore()
    await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{
      sku?: string
      name?: string
      volume_ml?: number | null
      kind?: 'bottle' | 'sample' | 'other'
      description?: string
    }>()
    if (!body.sku || !body.name || !body.kind) throw badRequest('sku, name, kind required')
    const product = await store.createProduct({
      id: newId(),
      sku: body.sku.trim().toUpperCase(),
      name: body.name.trim(),
      volume_ml: body.volume_ml ?? null,
      kind: body.kind,
      channel_eligibility: { retail: false, trade: false },
      saleable: false,
      approved_for_sale: false,
      description: body.description ?? '',
      created_at: nowIso(),
    })
    return c.json({ product }, 201)
  })

  app.patch('/api/admin/products/:id', async (c) => {
    const store = await getStore()
    await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<Record<string, unknown>>()
    const patch: Record<string, unknown> = {}
    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim()) throw badRequest('name must be a non-empty string')
      patch.name = body.name.trim()
    }
    if ('description' in body) {
      if (typeof body.description !== 'string') throw badRequest('description must be a string')
      patch.description = body.description
    }
    for (const key of ['saleable', 'approved_for_sale'] as const) {
      if (key in body) {
        if (typeof body[key] !== 'boolean') throw badRequest(`${key} must be boolean`)
        patch[key] = body[key]
      }
    }
    if ('volume_ml' in body) {
      const v = body.volume_ml
      if (v !== null && !(typeof v === 'number' && Number.isInteger(v) && v > 0)) throw badRequest('volume_ml must be a positive integer or null')
      patch.volume_ml = v
    }
    if ('channel_eligibility' in body) {
      const ce = body.channel_eligibility as { retail?: unknown; trade?: unknown } | null
      if (!ce || typeof ce.retail !== 'boolean' || typeof ce.trade !== 'boolean') {
        throw badRequest('channel_eligibility must be { retail: boolean, trade: boolean }')
      }
      patch.channel_eligibility = { retail: ce.retail, trade: ce.trade }
    }
    const existing = await store.getProduct(c.req.param('id'))
    if (existing?.kind === 'sample' && (patch.saleable === true || patch.approved_for_sale === true)) {
      throw badRequest('Samples are non-saleable')
    }
    const product = await store.updateProduct(c.req.param('id'), patch)
    return c.json({ product })
  })

  app.post('/api/admin/prices', async (c) => {
    const store = await getStore()
    await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{
      product_id?: string
      channel?: 'retail' | 'trade'
      amount_kobo?: number
      label?: string
      activate?: boolean
    }>()
    if (!body.product_id || !body.channel || typeof body.amount_kobo !== 'number') {
      throw badRequest('product_id, channel, amount_kobo required')
    }
    if (!Number.isInteger(body.amount_kobo) || body.amount_kobo < 0) throw badRequest('Invalid amount')
    const admin = await requireRole(store, c.get('rawToken'), 'admin')
    const price = await store.createPrice({
      id: newId(),
      product_id: body.product_id,
      channel: body.channel,
      amount_kobo: body.amount_kobo,
      currency: 'NGN',
      status: 'draft',
      label: body.label ?? '',
      effective_from: null,
      approved_by: null,
      created_at: nowIso(),
    })
    const activated = body.activate ? await store.activatePrice(price.id, admin) : price
    return c.json({ price: activated }, 201)
  })

  app.post('/api/admin/stock/batches', async (c) => {
    const store = await getStore()
    await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{ product_id?: string; batch_code?: string; qty_on_hand?: number; notes?: string }>()
    if (!body.product_id || !body.batch_code || typeof body.qty_on_hand !== 'number') {
      throw badRequest('product_id, batch_code, qty_on_hand required')
    }
    if (!Number.isInteger(body.qty_on_hand) || body.qty_on_hand < 0) throw badRequest('Invalid qty')
    const batch = await store.createBatch({
      id: newId(),
      product_id: body.product_id,
      batch_code: body.batch_code.trim(),
      qty_on_hand: body.qty_on_hand,
      qty_reserved: 0,
      notes: body.notes ?? '',
      created_at: nowIso(),
    })
    return c.json({ batch }, 201)
  })

  app.post('/api/admin/stock/adjust', async (c) => {
    const store = await getStore()
    const admin = await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{ batch_id?: string; delta_on_hand?: number; reason?: string }>()
    if (!body.batch_id || typeof body.delta_on_hand !== 'number' || !body.reason) {
      throw badRequest('batch_id, delta_on_hand, reason required')
    }
    const batch = await store.adjustStock({
      batchId: body.batch_id,
      deltaOnHand: body.delta_on_hand,
      reason: body.reason,
      actor: admin,
    })
    return c.json({ batch })
  })

  app.post('/api/admin/orders/:id/payment', async (c) => {
    const store = await getStore()
    const admin = await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{ payment_status?: 'paid' | 'failed' | 'refunded' | 'pending_verification'; note?: string }>()
    if (!body.payment_status) throw badRequest('payment_status required')
    if (!['paid', 'failed', 'refunded', 'pending_verification'].includes(body.payment_status)) throw badRequest('Invalid payment_status')
    const existing = await store.getOrder(c.req.param('id'))
    if (existing?.order.fulfillment_status === 'cancelled' && body.payment_status !== 'refunded') {
      throw conflict('Cancelled orders cannot take payment', 'order_cancelled')
    }
    const kind =
      body.payment_status === 'paid'
        ? 'verified_paid'
        : body.payment_status === 'failed'
          ? 'rejected'
          : body.payment_status === 'refunded'
            ? 'refund_noted'
            : 'submitted'
    const result = await store.setPaymentStatus({
      orderId: c.req.param('id'),
      paymentStatus: body.payment_status,
      eventKind: kind,
      note: body.note ?? '',
      actor: admin,
    })
    return c.json(result)
  })

  app.post('/api/admin/orders/:id/fulfillment', async (c) => {
    const store = await getStore()
    const admin = await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{ fulfillment_status?: 'shipped' | 'delivered' | 'cancelled' }>()
    if (!body.fulfillment_status) throw badRequest('fulfillment_status required')
    const order = await store.setFulfillmentStatus({
      orderId: c.req.param('id'),
      fulfillmentStatus: body.fulfillment_status,
      actor: admin,
    })
    return c.json({ order })
  })

  app.post('/api/admin/terms', async (c) => {
    const store = await getStore()
    const admin = await requireRole(store, c.get('rawToken'), 'admin')
    const body = await c.req.json<{
      distributor_id?: string | null
      kind?: 'wholesale_margin' | 'commission'
      rate_bps?: number | null
      notes?: string
      activate?: boolean
    }>()
    if (!body.kind) throw badRequest('kind required')
    if (body.kind === 'commission' && body.activate && (body.rate_bps == null || body.rate_bps < 0)) {
      throw badRequest('Explicit rate_bps required to activate commission — no fabricated default')
    }
    let term = await store.createTerm({
      id: newId(),
      distributor_id: body.distributor_id ?? null,
      kind: body.kind,
      rate_bps: body.rate_bps ?? null,
      notes: body.notes ?? '',
      status: 'draft',
      approved_by: null,
      created_at: nowIso(),
    })
    if (body.activate) term = await store.activateTerm(term.id, admin)
    return c.json({ term }, 201)
  })

  // Clients cannot mark paid
  app.post('/api/orders/:id/mark-paid', (c) =>
    c.json({ error: 'Clients cannot mark orders paid', code: 'forbidden' }, 403),
  )

  return app
}

export default createApp()
