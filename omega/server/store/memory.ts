import { badRequest, conflict, forbidden, notFound, unavailable } from '../errors.ts'
import { newId, nowIso } from '../crypto.ts'
import {
  DEFAULT_SETTINGS,
  type AuthUser,
  type CommercialTerm,
  type Distributor,
  type Order,
  type OrderLine,
  type PaymentEvent,
  type Product,
  type ProductPrice,
  type Referral,
  type Session,
  type Settings,
  type StockBatch,
  type StockMovement,
  type User,
} from '../types.ts'
import type { OmegaStore, PlaceOrderInput, PlaceOrderResult } from './types.ts'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function createMemoryStore(seed?: { settings?: Partial<Settings> }): OmegaStore {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...seed?.settings }
  const users = new Map<string, User>()
  const usersByEmail = new Map<string, string>()
  const sessions = new Map<string, Session>()
  const sessionsByHash = new Map<string, string>()
  const distributors = new Map<string, Distributor>()
  const products = new Map<string, Product>()
  const prices = new Map<string, ProductPrice>()
  const batches = new Map<string, StockBatch>()
  const movements: StockMovement[] = []
  const orders = new Map<string, Order>()
  const linesByOrder = new Map<string, OrderLine[]>()
  const terms = new Map<string, CommercialTerm>()
  const paymentEvents: PaymentEvent[] = []
  const referrals = new Map<string, Referral>()
  let ownerRecoveryClaim: { status: 'consumed'; fp: string; at: string } | null = null

  let chain: Promise<unknown> = Promise.resolve()
  function exclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = chain.then(() => fn())
    chain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  const store: OmegaStore = {
    kind: 'memory',

    async readiness() {
      return {
        persistence: 'memory',
        migrated: true,
        message:
          'In-memory store active (tests/local only). Not durable across serverless instances. Set DATABASE_URL for Postgres persistence.',
      }
    },

    async getSettings() {
      return clone(settings)
    },

    async updateSettings(patch, actor) {
      if (actor.role !== 'admin') throw forbidden()
      Object.assign(settings, patch)
      return clone(settings)
    },

    async createUser(input) {
      if (usersByEmail.has(input.email.toLowerCase())) throw conflict('Email already registered')
      const user: User = { ...input, email: input.email.toLowerCase(), created_at: input.created_at ?? nowIso() }
      users.set(user.id, user)
      usersByEmail.set(user.email, user.id)
      return clone(user)
    },

    async findUserByEmail(email) {
      const id = usersByEmail.get(email.toLowerCase())
      return id ? clone(users.get(id)!) : null
    },

    async findUserById(id) {
      const user = users.get(id)
      return user ? clone(user) : null
    },

    async listUsers() {
      return [...users.values()].map(clone)
    },

    async applyOwnerPasswordRecovery(input) {
      return exclusive(() => {
        if (ownerRecoveryClaim?.status === 'consumed' && ownerRecoveryClaim.fp === input.recoveryFingerprint) {
          return { applied: false }
        }
        const user = users.get(input.adminId)
        if (!user || user.role !== 'admin' || !user.active) {
          throw unavailable('Recovery target missing', 'persistence_init_failed')
        }
        users.set(input.adminId, { ...user, password_hash: input.passwordHash })
        for (const [sid, session] of [...sessions.entries()]) {
          if (session.user_id === input.adminId) {
            sessions.delete(sid)
            sessionsByHash.delete(session.token_hash)
          }
        }
        ownerRecoveryClaim = {
          status: 'consumed',
          fp: input.recoveryFingerprint,
          at: input.consumedAt,
        }
        return { applied: true }
      })
    },

    async createSession(session) {
      sessions.set(session.id, session)
      sessionsByHash.set(session.token_hash, session.id)
      return clone(session)
    },

    async findSessionByTokenHash(tokenHash) {
      const id = sessionsByHash.get(tokenHash)
      if (!id) return null
      const session = sessions.get(id)
      if (!session) return null
      if (new Date(session.expires_at).getTime() < Date.now()) {
        sessions.delete(id)
        sessionsByHash.delete(tokenHash)
        return null
      }
      const user = users.get(session.user_id)
      if (!user || !user.active) return null
      return { ...clone(session), user: clone(user) }
    },

    async deleteSession(id) {
      const session = sessions.get(id)
      if (!session) return
      sessions.delete(id)
      sessionsByHash.delete(session.token_hash)
    },

    async deleteSessionsForUser(userId) {
      for (const [sid, session] of [...sessions.entries()]) {
        if (session.user_id === userId) {
          sessions.delete(sid)
          sessionsByHash.delete(session.token_hash)
        }
      }
    },

    async createDistributor(d) {
      if ([...distributors.values()].some((x) => x.code === d.code)) throw conflict('Distributor code exists')
      const referralCode = d.referral_code || d.code
      if ([...distributors.values()].some((x) => x.referral_code === referralCode)) {
        throw conflict('Referral code exists')
      }
      const next = { ...d, referral_code: referralCode, sponsor_id: d.sponsor_id ?? null }
      distributors.set(d.id, next)
      return clone(next)
    },

    async listDistributors() {
      return [...distributors.values()].map(clone)
    },

    async getDistributor(id) {
      const d = distributors.get(id)
      return d ? clone(d) : null
    },

    async getDistributorByReferralCode(code) {
      const normalized = code.trim().toUpperCase()
      const found = [...distributors.values()].find(
        (d) => d.referral_code.toUpperCase() === normalized || d.code.toUpperCase() === normalized,
      )
      return found ? clone(found) : null
    },

    async updateDistributor(id, patch) {
      const current = distributors.get(id)
      if (!current) throw notFound('Distributor not found')
      const next = { ...current, ...patch, id: current.id }
      if (next.sponsor_id === next.id) throw badRequest('Distributor cannot sponsor itself')
      next.referral_code = next.referral_code || next.code
      distributors.set(id, next)
      return clone(next)
    },

    async createReferral(referral) {
      referrals.set(referral.id, referral)
      return clone(referral)
    },

    async listReferrals(filter) {
      return [...referrals.values()]
        .filter((r) => {
          if (filter?.referrerDistributorId && r.referrer_distributor_id !== filter.referrerDistributorId) return false
          return true
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(clone)
    },

    async voidReferral(id, actor) {
      if (actor.role !== 'admin') throw forbidden()
      const current = referrals.get(id)
      if (!current) throw notFound('Referral not found')
      const next = { ...current, status: 'void' as const }
      referrals.set(id, next)
      return clone(next)
    },

    async createProduct(p) {
      if ([...products.values()].some((x) => x.sku === p.sku)) throw conflict('SKU exists')
      products.set(p.id, p)
      return clone(p)
    },

    async listProducts() {
      return [...products.values()].map(clone)
    },

    async getProduct(id) {
      const p = products.get(id)
      return p ? clone(p) : null
    },

    async updateProduct(id, patch) {
      const current = products.get(id)
      if (!current) throw notFound('Product not found')
      const next = { ...current, ...patch, id: current.id }
      products.set(id, next)
      return clone(next)
    },

    async createPrice(price) {
      if (!products.has(price.product_id)) throw notFound('Product not found')
      prices.set(price.id, price)
      return clone(price)
    },

    async listPrices(productId) {
      return [...prices.values()]
        .filter((p) => (productId ? p.product_id === productId : true))
        .map(clone)
    },

    async activatePrice(priceId, actor) {
      if (actor.role !== 'admin') throw forbidden()
      const price = prices.get(priceId)
      if (!price) throw notFound('Price not found')
      for (const [id, p] of prices) {
        if (p.product_id === price.product_id && p.channel === price.channel && p.status === 'active') {
          prices.set(id, { ...p, status: 'superseded' })
        }
      }
      const next = { ...price, status: 'active' as const, approved_by: actor.id, effective_from: nowIso() }
      prices.set(priceId, next)
      return clone(next)
    },

    async createBatch(batch) {
      if (!products.has(batch.product_id)) throw notFound('Product not found')
      batches.set(batch.id, batch)
      return clone(batch)
    },

    async listBatches(productId) {
      return [...batches.values()]
        .filter((b) => (productId ? b.product_id === productId : true))
        .map(clone)
    },

    async adjustStock(input) {
      if (input.actor.role !== 'admin') throw forbidden()
      return exclusive(async () => {
        const batch = batches.get(input.batchId)
        if (!batch) throw notFound('Batch not found')
        const qty = batch.qty_on_hand + input.deltaOnHand
        if (qty < batch.qty_reserved) throw conflict('Stock would fall below reserved quantity', 'stock_conflict')
        if (qty < 0) throw badRequest('Stock cannot be negative')
        const next = { ...batch, qty_on_hand: qty }
        batches.set(batch.id, next)
        movements.push({
          id: newId(),
          batch_id: batch.id,
          delta_on_hand: input.deltaOnHand,
          delta_reserved: 0,
          reason: input.reason,
          order_id: null,
          actor_user_id: input.actor.id,
          created_at: nowIso(),
        })
        return clone(next)
      })
    },

    async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
      return exclusive(async () => {
        if (!settings.commercial_activation || !settings.checkout_enabled) {
          throw conflict('Checkout disabled until commercial activation and checkout are enabled by admin', 'checkout_disabled')
        }
        if (!settings.payment_provider_configured || !settings.delivery_policy_configured) {
          throw conflict('Payment provider / delivery policy not configured — fail closed', 'ops_unconfigured')
        }
        if (input.lines.length === 0) throw badRequest('Order needs at least one line')

        if (input.channel === 'trade') {
          if (!input.buyer || input.buyer.role !== 'distributor' || !input.distributorId) {
            throw forbidden('Trade orders require a distributor account')
          }
          if (input.buyer.distributor_id !== input.distributorId) throw forbidden('Tenant isolation violation')
          const dist = distributors.get(input.distributorId)
          if (!dist || dist.status !== 'active') throw forbidden('Distributor is not active for trade')
        }

        const builtLines: OrderLine[] = []
        let total = 0
        const reservations: Array<{ batchId: string; qty: number }> = []

        for (const line of input.lines) {
          if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw badRequest('Invalid quantity')
          const product = products.get(line.product_id)
          if (!product) throw notFound('Product not found')
          if (product.kind === 'sample') throw conflict('Samples are non-saleable', 'sample_not_saleable')
          if (!product.saleable || !product.approved_for_sale) {
            throw conflict(`Product ${product.sku} is not approved for sale`, 'product_not_saleable')
          }
          if (input.channel === 'retail' && !product.channel_eligibility.retail) {
            throw forbidden('Product not retail-eligible')
          }
          if (input.channel === 'trade' && !product.channel_eligibility.trade) {
            throw forbidden('Product not trade-eligible')
          }

          const price = [...prices.values()].find(
            (p) => p.product_id === product.id && p.channel === input.channel && p.status === 'active',
          )
          if (!price) throw conflict(`No active ${input.channel} price for ${product.sku}`, 'price_missing')

          let remaining = line.quantity
          const productBatches = [...batches.values()]
            .filter((b) => b.product_id === product.id)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
          for (const batch of productBatches) {
            const available = batch.qty_on_hand - batch.qty_reserved
            if (available <= 0) continue
            const take = Math.min(available, remaining)
            reservations.push({ batchId: batch.id, qty: take })
            remaining -= take
            if (remaining === 0) break
          }
          if (remaining > 0) throw conflict(`Insufficient stock for ${product.sku}`, 'insufficient_stock')

          const lineTotal = price.amount_kobo * line.quantity
          total += lineTotal
          builtLines.push({
            id: newId(),
            order_id: '',
            product_id: product.id,
            quantity: line.quantity,
            unit_price_kobo: price.amount_kobo,
            line_total_kobo: lineTotal,
            price_id: price.id,
            product_sku: product.sku,
            product_name: product.name,
          })
        }

        const orderId = newId()
        const stamp = nowIso()
        for (const r of reservations) {
          const batch = batches.get(r.batchId)!
          const next = { ...batch, qty_reserved: batch.qty_reserved + r.qty }
          batches.set(batch.id, next)
          movements.push({
            id: newId(),
            batch_id: batch.id,
            delta_on_hand: 0,
            delta_reserved: r.qty,
            reason: 'order_reserve',
            order_id: orderId,
            actor_user_id: input.buyer?.id ?? null,
            created_at: stamp,
          })
        }

        const order: Order = {
          id: orderId,
          channel: input.channel,
          status: 'placed',
          payment_status: 'unpaid',
          fulfillment_status: 'allocated',
          buyer_user_id: input.buyer?.id ?? null,
          distributor_id: input.distributorId,
          currency: settings.currency,
          total_kobo: total,
          notes: input.notes ?? '',
          created_at: stamp,
          updated_at: stamp,
        }
        const lines = builtLines.map((l) => ({ ...l, order_id: orderId }))
        orders.set(orderId, order)
        linesByOrder.set(orderId, lines)
        return { order: clone(order), lines: lines.map(clone) }
      })
    },

    async listOrders(filter) {
      return [...orders.values()]
        .filter((o) => {
          if (filter?.distributorId && o.distributor_id !== filter.distributorId) return false
          if (filter?.buyerUserId && o.buyer_user_id !== filter.buyerUserId) return false
          return true
        })
        .map(clone)
    },

    async getOrder(id) {
      const order = orders.get(id)
      if (!order) return null
      return { order: clone(order), lines: (linesByOrder.get(id) ?? []).map(clone) }
    },

    async setPaymentStatus(input) {
      if (input.actor.role !== 'admin') throw forbidden('Only admin may verify or change payment status')
      const order = orders.get(input.orderId)
      if (!order) throw notFound('Order not found')
      const next = {
        ...order,
        payment_status: input.paymentStatus,
        updated_at: nowIso(),
      }
      orders.set(order.id, next)
      const event: PaymentEvent = {
        id: newId(),
        order_id: order.id,
        kind: input.eventKind,
        amount_kobo: order.total_kobo,
        note: input.note,
        actor_user_id: input.actor.id,
        created_at: nowIso(),
      }
      paymentEvents.push(event)
      return { order: clone(next), event: clone(event) }
    },

    async setFulfillmentStatus(input) {
      if (input.actor.role !== 'admin') throw forbidden()
      const order = orders.get(input.orderId)
      if (!order) throw notFound('Order not found')
      const next = { ...order, fulfillment_status: input.fulfillmentStatus, updated_at: nowIso() }
      if (input.fulfillmentStatus === 'shipped' || input.fulfillmentStatus === 'delivered') {
        // Convert reservation into on-hand decrement once when first shipping.
        if (order.fulfillment_status === 'allocated') {
          for (const m of movements.filter((x) => x.order_id === order.id && x.reason === 'order_reserve')) {
            const batch = batches.get(m.batch_id)
            if (!batch) continue
            const qty = m.delta_reserved
            const updated = {
              ...batch,
              qty_on_hand: batch.qty_on_hand - qty,
              qty_reserved: batch.qty_reserved - qty,
            }
            if (updated.qty_on_hand < 0 || updated.qty_reserved < 0) {
              throw conflict('Stock integrity error on ship', 'stock_conflict')
            }
            batches.set(batch.id, updated)
            movements.push({
              id: newId(),
              batch_id: batch.id,
              delta_on_hand: -qty,
              delta_reserved: -qty,
              reason: 'order_ship',
              order_id: order.id,
              actor_user_id: input.actor.id,
              created_at: nowIso(),
            })
          }
        }
        next.status = input.fulfillmentStatus === 'delivered' ? 'fulfilled' : order.status
      }
      orders.set(order.id, next)
      return clone(next)
    },

    async createTerm(term) {
      if (term.kind === 'commission' && term.rate_bps == null && term.status === 'active') {
        throw badRequest('Active commission terms require an explicit rate_bps — no fabricated default')
      }
      terms.set(term.id, term)
      return clone(term)
    },

    async listTerms(distributorId) {
      return [...terms.values()]
        .filter((t) => {
          if (distributorId === undefined) return true
          return t.distributor_id === distributorId
        })
        .map(clone)
    },

    async activateTerm(termId, actor) {
      if (actor.role !== 'admin') throw forbidden()
      const term = terms.get(termId)
      if (!term) throw notFound('Term not found')
      if (term.kind === 'commission' && term.rate_bps == null) {
        throw badRequest('Cannot activate commission without explicit rate_bps')
      }
      const next = { ...term, status: 'active' as const, approved_by: actor.id }
      terms.set(termId, next)
      return clone(next)
    },

    async listMovements(orderId) {
      return movements.filter((m) => (orderId ? m.order_id === orderId : true)).map(clone)
    },
  }

  return store
}
