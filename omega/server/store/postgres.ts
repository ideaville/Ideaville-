import postgres from 'postgres'
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
  type User,
} from '../types.ts'
import { migratePostgres } from './migrate.ts'
import { OMEGA_SEARCH_PATH_GUC } from './postgresPaths.ts'
import { OWNER_RECOVERY_SETTINGS_KEY } from '../ownerRecoveryConfig.ts'
import type { OmegaStore, PlaceOrderInput } from './types.ts'

export { OMEGA_SEARCH_PATH, OMEGA_SEARCH_PATH_GUC } from './postgresPaths.ts'
export { migratePostgres, REQUIRED_MIGRATION_MARKERS } from './migrate.ts'

function normalizeDistributor(row: Distributor): Distributor {
  return {
    ...row,
    sponsor_id: row.sponsor_id ?? null,
    referral_code: row.referral_code || row.code,
  }
}

function mapSettings(rows: Array<{ key: string; value: unknown }>): Settings {
  const out = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    const key = row.key as keyof Settings
    if (key in out) (out as Record<string, unknown>)[key] = row.value as never
  }
  return out
}

function createFailClosedStore(
  readiness: {
    persistence: 'unconfigured' | 'error'
    migrated: boolean
    message: string
    code: string
  },
  failMessage: string,
  failCode: string,
): OmegaStore {
  // Explicit object — a Proxy that traps `then` breaks `async` returns / await getStore().
  const fail = async (..._args: never[]): Promise<never> => {
    throw unavailable(failMessage, failCode)
  }
  return {
    kind: 'postgres',
    async readiness() {
      return readiness
    },
    getSettings: fail,
    updateSettings: fail,
    createUser: fail,
    findUserByEmail: fail,
    findUserById: fail,
    listUsers: fail,
    applyOwnerPasswordRecovery: fail,
    createSession: fail,
    findSessionByTokenHash: fail,
    deleteSession: fail,
    deleteSessionsForUser: fail,
    createDistributor: fail,
    listDistributors: fail,
    getDistributor: fail,
    getDistributorByReferralCode: fail,
    updateDistributor: fail,
    createReferral: fail,
    listReferrals: fail,
    voidReferral: fail,
    createProduct: fail,
    listProducts: fail,
    getProduct: fail,
    updateProduct: fail,
    createPrice: fail,
    listPrices: fail,
    activatePrice: fail,
    createBatch: fail,
    listBatches: fail,
    adjustStock: fail,
    placeOrder: fail,
    listOrders: fail,
    getOrder: fail,
    setPaymentStatus: fail,
    setFulfillmentStatus: fail,
    createTerm: fail,
    listTerms: fail,
    activateTerm: fail,
    listMovements: fail,
  }
}

export function createUnconfiguredStore(): OmegaStore {
  return createFailClosedStore(
    {
      persistence: 'unconfigured',
      migrated: false,
      message:
        'DATABASE_URL is not set. Commerce APIs fail closed. Add Postgres pooler URL to the Vercel project env (no secrets in git).',
      code: 'persistence_unconfigured',
    },
    'Persistence not configured. Set DATABASE_URL (Postgres pooler) on Vercel omega-staging, redeploy.',
    'persistence_unconfigured',
  )
}

/** DATABASE_URL was set but connect/migrate/marker checks failed — not the same as unconfigured. */
export function createFailedStore(err: unknown): OmegaStore {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
      ? (err as { code: string }).code
      : 'persistence_init_failed'
  // Never put driver/migrate text on the public readiness or AppError throw path.
  // Detail stays in the init-time console.error in getStore().
  const publicMessage = 'Persistence unavailable.'
  const failCode = code.startsWith('persistence_') ? code : 'persistence_init_failed'
  return createFailClosedStore(
    {
      persistence: 'error',
      migrated: false,
      message: publicMessage,
      code: failCode,
    },
    publicMessage,
    failCode,
  )
}

/**
 * Money columns are BIGINT (kobo). postgres.js returns BIGINT as strings by default,
 * which breaks UI formatting and makes Postgres responses differ from the memory store.
 * Parse to JS numbers — kobo amounts stay far below Number.MAX_SAFE_INTEGER.
 */
export const pgTypes = {
  bigint: {
    to: 20,
    from: [20],
    serialize: (value: number | bigint | string) => String(value),
    parse: (value: string) => {
      const n = Number(value)
      if (!Number.isSafeInteger(n)) throw new Error('BIGINT value exceeds safe integer range')
      return n
    },
  },
}

/** Idempotent migrations (IF NOT EXISTS) emit "already exists, skipping" notices on every boot. */
const IDEMPOTENT_NOTICE_CODES = new Set(['42P06', '42P07', '42701', '42710'])

export function logNotice(notice: { code?: string; message?: string }) {
  if (notice.code && IDEMPOTENT_NOTICE_CODES.has(notice.code)) return
  console.log('[omega] postgres notice:', notice.code ?? '', notice.message ?? '')
}

export async function tryCreatePostgresStore(databaseUrl: string): Promise<OmegaStore> {
  // prepare:false is required for Supabase transaction pooler (:6543). Harmless on session (:5432).
  const sql = postgres(databaseUrl, {
    max: 5,
    idle_timeout: 20,
    prepare: false,
    connection: { search_path: OMEGA_SEARCH_PATH_GUC },
    types: pgTypes,
    onnotice: logNotice,
  })
  try {
    await migratePostgres(sql)
  } catch (err) {
    await sql.end({ timeout: 5 }).catch(() => undefined)
    throw err
  }

  async function requireAdmin(actor: AuthUser) {
    if (actor.role !== 'admin') throw forbidden()
  }

  const store: OmegaStore = {
    kind: 'postgres',

    async readiness() {
      const rows = await sql`SELECT id FROM omega.schema_migrations WHERE id = '001_init'`
      return {
        persistence: 'postgres',
        migrated: rows.length > 0,
        message:
          'Postgres connected; required schema markers present. Commerce enabled only after admin activation settings.',
      }
    },

    async getSettings() {
      const rows = await sql<{ key: string; value: unknown }>`SELECT key, value FROM settings`
      return mapSettings(rows)
    },

    async updateSettings(patch, actor) {
      await requireAdmin(actor)
      for (const [key, value] of Object.entries(patch)) {
        // Never allow API/settings writes to touch internal recovery markers.
        if (key.startsWith('__')) throw forbidden('Invalid settings key')
        await sql`
          INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${sql.json(value as never)}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `
      }
      return store.getSettings()
    },

    async createUser(input) {
      try {
        const rows = await sql<User>`
          INSERT INTO users (id, email, password_hash, role, distributor_id, active, created_at)
          VALUES (${input.id}, ${input.email.toLowerCase()}, ${input.password_hash}, ${input.role}, ${input.distributor_id}, ${input.active}, ${input.created_at ?? nowIso()})
          RETURNING *`
        return rows[0]
      } catch {
        throw conflict('Email already registered')
      }
    },

    async findUserByEmail(email) {
      const rows = await sql<User>`SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`
      return rows[0] ?? null
    },

    async findUserById(id) {
      const rows = await sql<User>`SELECT * FROM users WHERE id = ${id} LIMIT 1`
      return rows[0] ?? null
    },

    async listUsers() {
      return sql<User>`SELECT * FROM users ORDER BY created_at`
    },

    async applyOwnerPasswordRecovery(input) {
      const claimValue = {
        status: 'consumed',
        fp: input.recoveryFingerprint,
        at: input.consumedAt,
      }
      const applied = await sql.begin(async (tx) => {
        // Durable one-use: once status=consumed, secret rotation alone cannot reopen.
        // Re-enable only if owner explicitly deletes this settings row (separate approval).
        const claimed = await tx<{ key: string }>`
          INSERT INTO settings (key, value, updated_at)
          VALUES (${OWNER_RECOVERY_SETTINGS_KEY}, ${tx.json(claimValue as never)}, NOW())
          ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, updated_at = NOW()
            WHERE (settings.value->>'status') IS DISTINCT FROM 'consumed'
          RETURNING key`
        if (!claimed[0]) return false

        const locked = await tx<{ id: string }>`
          SELECT id FROM users
          WHERE id = ${input.adminId}::uuid AND role = 'admin' AND active = TRUE
          FOR UPDATE`
        if (!locked[0]) {
          // Roll back claim — do not leave consumed marker without a password change.
          throw unavailable('Recovery target missing', 'persistence_init_failed')
        }

        const updated = await tx<{ id: string }>`
          UPDATE users
          SET password_hash = ${input.passwordHash}
          WHERE id = ${input.adminId}::uuid AND role = 'admin' AND active = TRUE
          RETURNING id`
        if (updated.length !== 1) {
          throw unavailable('Recovery target missing', 'persistence_init_failed')
        }

        await tx`DELETE FROM sessions WHERE user_id = ${input.adminId}::uuid`
        return true
      })
      return { applied: Boolean(applied) }
    },

    async createSession(session) {
      const rows = await sql<Session>`
        INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
        VALUES (${session.id}, ${session.user_id}, ${session.token_hash}, ${session.expires_at}, ${session.created_at})
        RETURNING *`
      return rows[0]
    },

    async findSessionByTokenHash(tokenHash) {
      const rows = await sql<Session & User>`
        SELECT s.*, u.id AS uid, u.email, u.password_hash, u.role, u.distributor_id, u.active, u.created_at AS user_created_at
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW() AND u.active = TRUE
        LIMIT 1`
      const row = rows[0] as (Session & Record<string, unknown>) | undefined
      if (!row) return null
      return {
        id: row.id,
        user_id: row.user_id,
        token_hash: row.token_hash,
        expires_at: String(row.expires_at),
        created_at: String(row.created_at),
        user: {
          id: String(row.uid),
          email: String(row.email),
          password_hash: String(row.password_hash),
          role: row.role as User['role'],
          distributor_id: (row.distributor_id as string | null) ?? null,
          active: Boolean(row.active),
          created_at: String(row.user_created_at),
        },
      }
    },

    async deleteSession(id) {
      await sql`DELETE FROM sessions WHERE id = ${id}`
    },

    async deleteSessionsForUser(userId) {
      await sql`DELETE FROM sessions WHERE user_id = ${userId}::uuid`
    },

    async createDistributor(d) {
      const referralCode = d.referral_code || d.code
      try {
        const rows = await sql<Distributor>`
          INSERT INTO distributors (id, name, code, status, notes, sponsor_id, referral_code, created_at)
          VALUES (${d.id}, ${d.name}, ${d.code}, ${d.status}, ${d.notes}, ${d.sponsor_id}, ${referralCode}, ${d.created_at})
          RETURNING *`
        return normalizeDistributor(rows[0])
      } catch {
        throw conflict('Distributor code or referral code exists')
      }
    },

    async listDistributors() {
      const rows = await sql<Distributor>`SELECT * FROM distributors ORDER BY created_at`
      return rows.map(normalizeDistributor)
    },

    async getDistributor(id) {
      const rows = await sql<Distributor>`SELECT * FROM distributors WHERE id = ${id} LIMIT 1`
      return rows[0] ? normalizeDistributor(rows[0]) : null
    },

    async getDistributorByReferralCode(code) {
      const normalized = code.trim().toUpperCase()
      const rows = await sql<Distributor>`
        SELECT * FROM distributors
        WHERE upper(referral_code) = ${normalized} OR upper(code) = ${normalized}
        LIMIT 1`
      return rows[0] ? normalizeDistributor(rows[0]) : null
    },

    async updateDistributor(id, patch) {
      const current = await store.getDistributor(id)
      if (!current) throw notFound('Distributor not found')
      const next = { ...current, ...patch, id: current.id }
      if (next.sponsor_id === next.id) throw badRequest('Distributor cannot sponsor itself')
      const rows = await sql<Distributor>`
        UPDATE distributors SET
          name=${next.name},
          code=${next.code},
          status=${next.status},
          notes=${next.notes},
          sponsor_id=${next.sponsor_id},
          referral_code=${next.referral_code || next.code}
        WHERE id=${id} RETURNING *`
      return normalizeDistributor(rows[0])
    },

    async createReferral(referral) {
      const rows = await sql<Referral>`
        INSERT INTO referrals (
          id, referrer_distributor_id, referrer_user_id, code, prospect_label, status, attributed_order_id, notes, created_at
        ) VALUES (
          ${referral.id}, ${referral.referrer_distributor_id}, ${referral.referrer_user_id}, ${referral.code},
          ${referral.prospect_label}, ${referral.status}, ${referral.attributed_order_id}, ${referral.notes}, ${referral.created_at}
        ) RETURNING *`
      return rows[0]
    },

    async listReferrals(filter) {
      if (filter?.referrerDistributorId) {
        return sql<Referral>`
          SELECT * FROM referrals
          WHERE referrer_distributor_id = ${filter.referrerDistributorId}
          ORDER BY created_at DESC`
      }
      return sql<Referral>`SELECT * FROM referrals ORDER BY created_at DESC`
    },

    async voidReferral(id, actor) {
      await requireAdmin(actor)
      const rows = await sql<Referral>`
        UPDATE referrals SET status = 'void' WHERE id = ${id} RETURNING *`
      if (!rows[0]) throw notFound('Referral not found')
      return rows[0]
    },

    async createProduct(p) {
      try {
        const rows = await sql<Product>`
          INSERT INTO products (id, sku, name, volume_ml, kind, channel_eligibility, saleable, approved_for_sale, description, created_at)
          VALUES (${p.id}, ${p.sku}, ${p.name}, ${p.volume_ml}, ${p.kind}, ${sql.json(p.channel_eligibility)}, ${p.saleable}, ${p.approved_for_sale}, ${p.description}, ${p.created_at})
          RETURNING *`
        return {
          ...rows[0],
          channel_eligibility:
            typeof rows[0].channel_eligibility === 'string'
              ? JSON.parse(rows[0].channel_eligibility as unknown as string)
              : rows[0].channel_eligibility,
        }
      } catch {
        throw conflict('SKU exists')
      }
    },

    async listProducts() {
      const rows = await sql<Product>`SELECT * FROM products ORDER BY created_at`
      return rows.map((p) => ({
        ...p,
        channel_eligibility:
          typeof p.channel_eligibility === 'string'
            ? JSON.parse(p.channel_eligibility as unknown as string)
            : p.channel_eligibility,
      }))
    },

    async getProduct(id) {
      const rows = await sql<Product>`SELECT * FROM products WHERE id = ${id} LIMIT 1`
      if (!rows[0]) return null
      const p = rows[0]
      return {
        ...p,
        channel_eligibility:
          typeof p.channel_eligibility === 'string'
            ? JSON.parse(p.channel_eligibility as unknown as string)
            : p.channel_eligibility,
      }
    },

    async updateProduct(id, patch) {
      const current = await store.getProduct(id)
      if (!current) throw notFound('Product not found')
      const next = { ...current, ...patch, id: current.id }
      const rows = await sql<Product>`
        UPDATE products SET
          sku=${next.sku}, name=${next.name}, volume_ml=${next.volume_ml}, kind=${next.kind},
          channel_eligibility=${sql.json(next.channel_eligibility)}, saleable=${next.saleable},
          approved_for_sale=${next.approved_for_sale}, description=${next.description}
        WHERE id=${id} RETURNING *`
      return store.getProduct(rows[0].id) as Promise<Product>
    },

    async createPrice(price) {
      const rows = await sql<ProductPrice>`
        INSERT INTO product_prices (id, product_id, channel, amount_kobo, currency, status, label, effective_from, approved_by, created_at)
        VALUES (${price.id}, ${price.product_id}, ${price.channel}, ${price.amount_kobo}, ${price.currency}, ${price.status}, ${price.label}, ${price.effective_from}, ${price.approved_by}, ${price.created_at})
        RETURNING *`
      return rows[0]
    },

    async listPrices(productId) {
      if (productId) return sql<ProductPrice>`SELECT * FROM product_prices WHERE product_id=${productId} ORDER BY created_at`
      return sql<ProductPrice>`SELECT * FROM product_prices ORDER BY created_at`
    },

    async activatePrice(priceId, actor) {
      await requireAdmin(actor)
      return sql.begin(async (tx) => {
        const found = await tx<ProductPrice>`SELECT * FROM product_prices WHERE id=${priceId}`
        if (!found[0]) throw notFound('Price not found')
        const price = found[0]
        await tx`
          UPDATE product_prices SET status='superseded'
          WHERE product_id=${price.product_id} AND channel=${price.channel} AND status='active'`
        const rows = await tx<ProductPrice>`
          UPDATE product_prices SET status='active', approved_by=${actor.id}, effective_from=NOW()
          WHERE id=${priceId} RETURNING *`
        return rows[0]
      })
    },

    async createBatch(batch) {
      const rows = await sql<StockBatch>`
        INSERT INTO stock_batches (id, product_id, batch_code, qty_on_hand, qty_reserved, notes, created_at)
        VALUES (${batch.id}, ${batch.product_id}, ${batch.batch_code}, ${batch.qty_on_hand}, ${batch.qty_reserved}, ${batch.notes}, ${batch.created_at})
        RETURNING *`
      return rows[0]
    },

    async listBatches(productId) {
      if (productId) return sql<StockBatch>`SELECT * FROM stock_batches WHERE product_id=${productId} ORDER BY created_at`
      return sql<StockBatch>`SELECT * FROM stock_batches ORDER BY created_at`
    },

    async adjustStock(input) {
      await requireAdmin(input.actor)
      return sql.begin(async (tx) => {
        const rows = await tx<StockBatch>`SELECT * FROM stock_batches WHERE id=${input.batchId} FOR UPDATE`
        if (!rows[0]) throw notFound('Batch not found')
        const batch = rows[0]
        const qty = batch.qty_on_hand + input.deltaOnHand
        if (qty < batch.qty_reserved) throw conflict('Stock would fall below reserved quantity', 'stock_conflict')
        if (qty < 0) throw badRequest('Stock cannot be negative')
        const updated = await tx<StockBatch>`
          UPDATE stock_batches SET qty_on_hand=${qty} WHERE id=${batch.id} RETURNING *`
        await tx`
          INSERT INTO stock_movements (id, batch_id, delta_on_hand, delta_reserved, reason, order_id, actor_user_id, created_at)
          VALUES (${newId()}, ${batch.id}, ${input.deltaOnHand}, 0, ${input.reason}, NULL, ${input.actor.id}, ${nowIso()})`
        return updated[0]
      })
    },

    async placeOrder(input: PlaceOrderInput) {
      return sql.begin(async (tx) => {
        const settingRows = await tx<{ key: string; value: unknown }>`SELECT key, value FROM settings`
        const settings = mapSettings(settingRows)
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
          const dist = await tx<Distributor>`SELECT * FROM distributors WHERE id=${input.distributorId} FOR UPDATE`
          if (!dist[0] || dist[0].status !== 'active') throw forbidden('Distributor is not active for trade')
        }

        const orderId = newId()
        const stamp = nowIso()
        const builtLines: OrderLine[] = []
        let total = 0

        for (const line of input.lines) {
          if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw badRequest('Invalid quantity')
          const products = await tx<Product>`SELECT * FROM products WHERE id=${line.product_id} FOR UPDATE`
          const product = products[0]
          if (!product) throw notFound('Product not found')
          const eligibility =
            typeof product.channel_eligibility === 'string'
              ? JSON.parse(product.channel_eligibility as unknown as string)
              : product.channel_eligibility
          if (product.kind === 'sample') throw conflict('Samples are non-saleable', 'sample_not_saleable')
          if (!product.saleable || !product.approved_for_sale) {
            throw conflict(`Product ${product.sku} is not approved for sale`, 'product_not_saleable')
          }
          if (input.channel === 'retail' && !eligibility.retail) throw forbidden('Product not retail-eligible')
          if (input.channel === 'trade' && !eligibility.trade) throw forbidden('Product not trade-eligible')

          const priceRows = await tx<ProductPrice>`
            SELECT * FROM product_prices
            WHERE product_id=${product.id} AND channel=${input.channel} AND status='active'
            LIMIT 1`
          const price = priceRows[0]
          if (!price) throw conflict(`No active ${input.channel} price for ${product.sku}`, 'price_missing')

          let remaining = line.quantity
          const batchRows = await tx<StockBatch>`
            SELECT * FROM stock_batches WHERE product_id=${product.id} ORDER BY created_at FOR UPDATE`
          for (const batch of batchRows) {
            const available = batch.qty_on_hand - batch.qty_reserved
            if (available <= 0) continue
            const take = Math.min(available, remaining)
            await tx`UPDATE stock_batches SET qty_reserved = qty_reserved + ${take} WHERE id=${batch.id}`
            await tx`
              INSERT INTO stock_movements (id, batch_id, delta_on_hand, delta_reserved, reason, order_id, actor_user_id, created_at)
              VALUES (${newId()}, ${batch.id}, 0, ${take}, 'order_reserve', ${orderId}, ${input.buyer?.id ?? null}, ${stamp})`
            remaining -= take
            if (remaining === 0) break
          }
          if (remaining > 0) throw conflict(`Insufficient stock for ${product.sku}`, 'insufficient_stock')

          const lineTotal = Number(price.amount_kobo) * line.quantity
          total += lineTotal
          builtLines.push({
            id: newId(),
            order_id: orderId,
            product_id: product.id,
            quantity: line.quantity,
            unit_price_kobo: Number(price.amount_kobo),
            line_total_kobo: lineTotal,
            price_id: price.id,
            product_sku: product.sku,
            product_name: product.name,
          })
        }

        const orderRows = await tx<Order>`
          INSERT INTO orders (id, channel, status, payment_status, fulfillment_status, buyer_user_id, distributor_id, currency, total_kobo, notes, created_at, updated_at)
          VALUES (${orderId}, ${input.channel}, 'placed', 'unpaid', 'allocated', ${input.buyer?.id ?? null}, ${input.distributorId}, ${settings.currency}, ${total}, ${input.notes ?? ''}, ${stamp}, ${stamp})
          RETURNING *`
        for (const line of builtLines) {
          await tx`
            INSERT INTO order_lines (id, order_id, product_id, quantity, unit_price_kobo, line_total_kobo, price_id, product_sku, product_name)
            VALUES (${line.id}, ${line.order_id}, ${line.product_id}, ${line.quantity}, ${line.unit_price_kobo}, ${line.line_total_kobo}, ${line.price_id}, ${line.product_sku}, ${line.product_name})`
        }
        return { order: orderRows[0], lines: builtLines }
      })
    },

    async listOrders(filter) {
      if (filter?.distributorId) {
        return sql<Order>`SELECT * FROM orders WHERE distributor_id=${filter.distributorId} ORDER BY created_at DESC`
      }
      if (filter?.buyerUserId) {
        return sql<Order>`SELECT * FROM orders WHERE buyer_user_id=${filter.buyerUserId} ORDER BY created_at DESC`
      }
      return sql<Order>`SELECT * FROM orders ORDER BY created_at DESC`
    },

    async getOrder(id) {
      const orderRows = await sql<Order>`SELECT * FROM orders WHERE id=${id} LIMIT 1`
      if (!orderRows[0]) return null
      const lines = await sql<OrderLine>`SELECT * FROM order_lines WHERE order_id=${id}`
      return { order: orderRows[0], lines }
    },

    async setPaymentStatus(input) {
      await requireAdmin(input.actor)
      return sql.begin(async (tx) => {
        const orderRows = await tx<Order>`SELECT * FROM orders WHERE id=${input.orderId} FOR UPDATE`
        if (!orderRows[0]) throw notFound('Order not found')
        const updated = await tx<Order>`
          UPDATE orders SET payment_status=${input.paymentStatus}, updated_at=NOW()
          WHERE id=${input.orderId} RETURNING *`
        const eventRows = await tx<PaymentEvent>`
          INSERT INTO payment_events (id, order_id, kind, amount_kobo, note, actor_user_id, created_at)
          VALUES (${newId()}, ${input.orderId}, ${input.eventKind}, ${orderRows[0].total_kobo}, ${input.note}, ${input.actor.id}, ${nowIso()})
          RETURNING *`
        return { order: updated[0], event: eventRows[0] }
      })
    },

    async setFulfillmentStatus(input) {
      await requireAdmin(input.actor)
      return sql.begin(async (tx) => {
        const orderRows = await tx<Order>`SELECT * FROM orders WHERE id=${input.orderId} FOR UPDATE`
        if (!orderRows[0]) throw notFound('Order not found')
        const order = orderRows[0]
        if (order.fulfillment_status === 'delivered' || order.fulfillment_status === 'cancelled') {
          throw conflict('Order is already closed', 'order_closed')
        }
        if (input.fulfillmentStatus === 'cancelled' && order.fulfillment_status === 'shipped') {
          throw conflict('Shipped orders cannot be cancelled', 'order_shipped')
        }
        if (input.fulfillmentStatus === 'cancelled' && order.fulfillment_status === 'allocated') {
          // Release any stock still reserved for this order.
          const reserves = await tx<{ batch_id: string; delta_reserved: number }>`
            SELECT batch_id, delta_reserved FROM stock_movements
            WHERE order_id=${order.id} AND reason='order_reserve' FOR UPDATE`
          for (const r of reserves) {
            const batches = await tx<StockBatch>`SELECT * FROM stock_batches WHERE id=${r.batch_id} FOR UPDATE`
            const batch = batches[0]
            if (!batch) continue
            const qty = Number(r.delta_reserved)
            const reserved = batch.qty_reserved - qty
            if (reserved < 0) throw conflict('Stock integrity error on cancel', 'stock_conflict')
            await tx`UPDATE stock_batches SET qty_reserved=${reserved} WHERE id=${batch.id}`
            await tx`
              INSERT INTO stock_movements (id, batch_id, delta_on_hand, delta_reserved, reason, order_id, actor_user_id, created_at)
              VALUES (${newId()}, ${batch.id}, 0, ${-qty}, 'order_cancel_release', ${order.id}, ${input.actor.id}, ${nowIso()})`
          }
        }
        if (
          (input.fulfillmentStatus === 'shipped' || input.fulfillmentStatus === 'delivered') &&
          order.fulfillment_status === 'allocated'
        ) {
          const reserves = await tx<{ batch_id: string; delta_reserved: number }>`
            SELECT batch_id, delta_reserved FROM stock_movements
            WHERE order_id=${order.id} AND reason='order_reserve' FOR UPDATE`
          for (const r of reserves) {
            const batches = await tx<StockBatch>`SELECT * FROM stock_batches WHERE id=${r.batch_id} FOR UPDATE`
            const batch = batches[0]
            if (!batch) continue
            const qty = Number(r.delta_reserved)
            const onHand = batch.qty_on_hand - qty
            const reserved = batch.qty_reserved - qty
            if (onHand < 0 || reserved < 0) throw conflict('Stock integrity error on ship', 'stock_conflict')
            await tx`UPDATE stock_batches SET qty_on_hand=${onHand}, qty_reserved=${reserved} WHERE id=${batch.id}`
            await tx`
              INSERT INTO stock_movements (id, batch_id, delta_on_hand, delta_reserved, reason, order_id, actor_user_id, created_at)
              VALUES (${newId()}, ${batch.id}, ${-qty}, ${-qty}, 'order_ship', ${order.id}, ${input.actor.id}, ${nowIso()})`
          }
        }
        const status =
          input.fulfillmentStatus === 'delivered' ? 'fulfilled' : input.fulfillmentStatus === 'cancelled' ? 'cancelled' : order.status
        const updated = await tx<Order>`
          UPDATE orders SET fulfillment_status=${input.fulfillmentStatus}, status=${status}, updated_at=NOW()
          WHERE id=${order.id} RETURNING *`
        return updated[0]
      })
    },

    async createTerm(term) {
      if (term.kind === 'commission' && term.rate_bps == null && term.status === 'active') {
        throw badRequest('Active commission terms require an explicit rate_bps — no fabricated default')
      }
      const rows = await sql<CommercialTerm>`
        INSERT INTO commercial_terms (id, distributor_id, kind, rate_bps, notes, status, approved_by, created_at)
        VALUES (${term.id}, ${term.distributor_id}, ${term.kind}, ${term.rate_bps}, ${term.notes}, ${term.status}, ${term.approved_by}, ${term.created_at})
        RETURNING *`
      return rows[0]
    },

    async listTerms(distributorId) {
      if (distributorId === undefined) return sql<CommercialTerm>`SELECT * FROM commercial_terms ORDER BY created_at`
      return sql<CommercialTerm>`SELECT * FROM commercial_terms WHERE distributor_id IS NOT DISTINCT FROM ${distributorId} ORDER BY created_at`
    },

    async activateTerm(termId, actor) {
      await requireAdmin(actor)
      const found = await sql<CommercialTerm>`SELECT * FROM commercial_terms WHERE id=${termId}`
      if (!found[0]) throw notFound('Term not found')
      if (found[0].kind === 'commission' && found[0].rate_bps == null) {
        throw badRequest('Cannot activate commission without explicit rate_bps')
      }
      const rows = await sql<CommercialTerm>`
        UPDATE commercial_terms SET status='active', approved_by=${actor.id} WHERE id=${termId} RETURNING *`
      return rows[0]
    },

    async listMovements(orderId) {
      if (orderId) {
        return sql`SELECT * FROM stock_movements WHERE order_id=${orderId} ORDER BY created_at`
      }
      return sql`SELECT * FROM stock_movements ORDER BY created_at`
    },
  }

  // Seed default settings keys if empty
  const existing = await sql`SELECT key FROM settings LIMIT 1`
  if (existing.length === 0) {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await sql`
        INSERT INTO settings (key, value) VALUES (${key}, ${sql.json(value as never)})
        ON CONFLICT (key) DO NOTHING`
    }
  }

  return store
}
