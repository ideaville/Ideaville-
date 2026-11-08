import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AdminOverview, AuthUser, CatalogProduct, DistributorNetwork, ReferralLookup, ReferralRecord } from '../lib/api'
import { formatNgn } from '../lib/api'
import {
  DEMO_ADMIN_USER,
  DEMO_DISTRIBUTOR_USER,
  DEMO_LOOKUP_CODES,
  DEMO_PRODUCT_BOTTLE,
  DEMO_PRODUCT_SAMPLE,
  createInitialDemoAdminOverview,
  createInitialDemoNetwork,
  createInitialDemoOrders,
  type DemoOrder,
} from './fixtures'

type DemoMessage = { tone: 'ok' | 'warn'; text: string }

type DemoContextValue = {
  adminUser: AuthUser
  distributorUser: AuthUser
  catalogProducts: CatalogProduct[]
  network: DistributorNetwork
  orders: DemoOrder[]
  admin: AdminOverview
  lastMessage: DemoMessage | null
  recordReferral: (input: { prospect_label: string; notes: string }) => Promise<void>
  lookupReferral: (code: string) => Promise<ReferralLookup>
  toggleAdminSetting: (key: string) => void
  demoCreateProduct: (input: {
    sku: string
    name: string
    kind: 'bottle' | 'sample' | 'other'
    volume_ml: number | null
    description: string
  }) => Promise<void>
  demoUpdateProductSale: (
    id: string,
    patch: { saleable?: boolean; approved_for_sale?: boolean; channel_eligibility?: { retail: boolean; trade: boolean } },
  ) => Promise<void>
  demoCreatePrice: (input: {
    product_id: string
    channel: 'retail' | 'trade'
    amount_kobo: number
    label: string
    activate: boolean
  }) => Promise<void>
  demoCreateDistributor: (input: { name: string; code: string; sponsor_id: string | null; notes: string }) => Promise<void>
  demoUpdateDistributorStatus: (id: string, status: 'pending_terms' | 'active' | 'suspended') => Promise<void>
  demoCreateBatch: (input: { product_id: string; batch_code: string; qty_on_hand: number; notes: string }) => Promise<void>
  demoAdjustStock: (input: { batch_id: string; delta_on_hand: number; reason: string }) => Promise<void>
  demoSetPayment: (
    orderId: string,
    input: { payment_status: 'paid' | 'failed' | 'refunded' | 'pending_verification'; note: string },
  ) => Promise<void>
  demoSetFulfillment: (orderId: string, input: { fulfillment_status: 'shipped' | 'delivered' | 'cancelled' }) => Promise<void>
  demoCreateTerm: (input: {
    distributor_id: string | null
    kind: string
    rate_bps: number | null
    notes: string
    activate?: boolean
  }) => Promise<void>
  noteSimulated: (text: string) => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

function newDemoId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState(createInitialDemoNetwork)
  const [orders, setOrders] = useState(createInitialDemoOrders)
  const [admin, setAdmin] = useState(createInitialDemoAdminOverview)
  const [lastMessage, setLastMessage] = useState<DemoMessage | null>(null)

  const catalogProducts = useMemo(() => {
    return (admin.products as CatalogProduct[]).map((p) => ({
      ...p,
      prices: Array.isArray(p.prices) ? p.prices : [],
    }))
  }, [admin.products])

  const noteSimulated = useCallback((text: string) => {
    setLastMessage({ tone: 'warn', text })
  }, [])

  const recordReferral = useCallback(async (input: { prospect_label: string; notes: string }) => {
    const label = input.prospect_label.trim().slice(0, 80)
    if (!label) throw new Error('prospect_label required')
    const row: ReferralRecord = {
      id: newDemoId('demo-ref'),
      referrer_distributor_id: network.self.id,
      code: network.self.referral_code,
      prospect_label: label,
      status: 'recorded',
      attributed_order_id: null,
      notes: input.notes.trim().slice(0, 500),
      created_at: new Date().toISOString(),
    }
    setNetwork((prev) => ({ ...prev, referrals: [row, ...prev.referrals] }))
    setAdmin((prev) => ({
      ...prev,
      referrals: [row, ...((prev.referrals as ReferralRecord[]) ?? [])],
    }))
    setLastMessage({ tone: 'ok', text: 'Demo referral recorded in session only — not saved to the database.' })
  }, [network.self.id, network.self.referral_code])

  const lookupReferral = useCallback(async (code: string): Promise<ReferralLookup> => {
    const key = code.trim().toUpperCase()
    const hit = DEMO_LOOKUP_CODES[key]
    if (!hit) return { found: false }
    return { found: true, ...hit }
  }, [])

  const toggleAdminSetting = useCallback((key: string) => {
    setAdmin((prev) => {
      const settings = { ...(prev.settings as Record<string, unknown>) }
      settings[key] = !Boolean(settings[key])
      return { ...prev, settings }
    })
    setLastMessage({
      tone: 'warn',
      text: `Demo toggled ${key} in memory only — live activation / payment / checkout unchanged.`,
    })
  }, [])

  const demoCreateProduct = useCallback(
    async (input: {
      sku: string
      name: string
      kind: 'bottle' | 'sample' | 'other'
      volume_ml: number | null
      description: string
    }) => {
      const product = {
        id: newDemoId('demo-prod'),
        sku: input.sku.toUpperCase(),
        name: input.name,
        kind: input.kind,
        volume_ml: input.volume_ml,
        saleable: false,
        approved_for_sale: false,
        channel_eligibility: { retail: input.kind !== 'sample', trade: input.kind !== 'sample' },
        description: input.description,
        prices: [] as CatalogProduct['prices'],
      }
      setAdmin((prev) => ({ ...prev, products: [...(prev.products as unknown[]), product] }))
      setLastMessage({ tone: 'ok', text: `Demo product ${product.sku} added in session only.` })
    },
    [],
  )

  const demoUpdateProductSale = useCallback(
    async (
      id: string,
      patch: { saleable?: boolean; approved_for_sale?: boolean; channel_eligibility?: { retail: boolean; trade: boolean } },
    ) => {
      setAdmin((prev) => ({
        ...prev,
        products: (prev.products as Array<Record<string, unknown>>).map((p) =>
          p.id === id
            ? {
                ...p,
                ...patch,
                ...(p.kind === 'sample' ? { saleable: false, approved_for_sale: false } : null),
              }
            : p,
        ),
      }))
      setLastMessage({ tone: 'ok', text: 'Demo product flags updated in session only.' })
    },
    [],
  )

  const demoCreatePrice = useCallback(
    async (input: {
      product_id: string
      channel: 'retail' | 'trade'
      amount_kobo: number
      label: string
      activate: boolean
    }) => {
      const price = {
        id: newDemoId('demo-price'),
        product_id: input.product_id,
        channel: input.channel,
        amount_kobo: input.amount_kobo,
        currency: 'NGN',
        status: input.activate ? 'active' : 'draft',
        label: input.label || `Demo ${input.channel}`,
      }
      setAdmin((prev) => ({
        ...prev,
        products: (prev.products as Array<Record<string, unknown>>).map((p) => {
          if (p.id !== input.product_id) return p
          const prices = Array.isArray(p.prices) ? [...(p.prices as unknown[])] : []
          prices.push(price)
          return { ...p, prices }
        }),
      }))
      setLastMessage({
        tone: 'ok',
        text: `Demo ${input.channel} price ${formatNgn(input.amount_kobo)} stored in session only.`,
      })
    },
    [],
  )

  const demoCreateDistributor = useCallback(
    async (input: { name: string; code: string; sponsor_id: string | null; notes: string }) => {
      const row = {
        id: newDemoId('demo-dist'),
        name: input.name,
        code: input.code.toUpperCase(),
        status: 'pending_terms',
        referral_code: input.code.toUpperCase(),
        sponsor_id: input.sponsor_id,
        notes: input.notes,
      }
      setAdmin((prev) => ({ ...prev, distributors: [...(prev.distributors as unknown[]), row] }))
      setLastMessage({ tone: 'ok', text: `Demo distributor ${row.code} added in session only.` })
    },
    [],
  )

  const demoUpdateDistributorStatus = useCallback(async (id: string, status: 'pending_terms' | 'active' | 'suspended') => {
    setAdmin((prev) => ({
      ...prev,
      distributors: (prev.distributors as Array<Record<string, unknown>>).map((d) => (d.id === id ? { ...d, status } : d)),
    }))
    setNetwork((prev) =>
      prev.self.id === id ? { ...prev, self: { ...prev.self, status } } : prev,
    )
    setLastMessage({ tone: 'ok', text: `Demo distributor status → ${status} (session only).` })
  }, [])

  const demoCreateBatch = useCallback(
    async (input: { product_id: string; batch_code: string; qty_on_hand: number; notes: string }) => {
      const batch = {
        id: newDemoId('demo-batch'),
        product_id: input.product_id,
        batch_code: input.batch_code,
        qty_on_hand: input.qty_on_hand,
        qty_reserved: 0,
        notes: input.notes,
        created_at: new Date().toISOString(),
      }
      setAdmin((prev) => ({ ...prev, batches: [...(prev.batches as unknown[]), batch] }))
      setLastMessage({ tone: 'ok', text: `Demo batch ${batch.batch_code} added in session only — no live stock write.` })
    },
    [],
  )

  const demoAdjustStock = useCallback(async (input: { batch_id: string; delta_on_hand: number; reason: string }) => {
    setAdmin((prev) => ({
      ...prev,
      batches: (prev.batches as Array<Record<string, unknown>>).map((b) => {
        if (b.id !== input.batch_id) return b
        const next = Number(b.qty_on_hand) + input.delta_on_hand
        return { ...b, qty_on_hand: next, notes: `${String(b.notes ?? '')} | demo adjust ${input.reason}`.trim() }
      }),
    }))
    setLastMessage({ tone: 'warn', text: 'Demo stock adjust applied in memory only — live inventory unchanged.' })
  }, [])

  const demoSetPayment = useCallback(
    async (
      orderId: string,
      input: { payment_status: 'paid' | 'failed' | 'refunded' | 'pending_verification'; note: string },
    ) => {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, payment_status: input.payment_status } : o)))
      setAdmin((prev) => ({
        ...prev,
        orders: (prev.orders as Array<Record<string, unknown>>).map((o) =>
          o.id === orderId ? { ...o, payment_status: input.payment_status } : o,
        ),
      }))
      setLastMessage({
        tone: 'warn',
        text: `Demo payment → ${input.payment_status} (session only; no provider / email).`,
      })
    },
    [],
  )

  const demoSetFulfillment = useCallback(
    async (orderId: string, input: { fulfillment_status: 'shipped' | 'delivered' | 'cancelled' }) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                fulfillment_status: input.fulfillment_status,
                status: input.fulfillment_status === 'delivered' ? 'fulfilled' : input.fulfillment_status === 'cancelled' ? 'cancelled' : o.status,
              }
            : o,
        ),
      )
      setAdmin((prev) => ({
        ...prev,
        orders: (prev.orders as Array<Record<string, unknown>>).map((o) =>
          o.id === orderId
            ? {
                ...o,
                fulfillment_status: input.fulfillment_status,
                status:
                  input.fulfillment_status === 'delivered'
                    ? 'fulfilled'
                    : input.fulfillment_status === 'cancelled'
                      ? 'cancelled'
                      : o.status,
              }
            : o,
        ),
      }))
      setLastMessage({
        tone: 'warn',
        text: `Demo fulfillment → ${input.fulfillment_status} (session only; no stock/email write).`,
      })
    },
    [],
  )

  const demoCreateTerm = useCallback(
    async (input: {
      distributor_id: string | null
      kind: string
      rate_bps: number | null
      notes: string
      activate?: boolean
    }) => {
      const term = {
        id: newDemoId('demo-term'),
        distributor_id: input.distributor_id,
        kind: input.kind,
        rate_bps: input.rate_bps,
        notes: input.notes || 'Demo term — not a live commission commitment',
        status: input.activate ? 'active' : 'draft',
        created_at: new Date().toISOString(),
      }
      setAdmin((prev) => ({ ...prev, terms: [...(prev.terms as unknown[]), term] }))
      setLastMessage({ tone: 'warn', text: 'Demo term saved in session only — no live commission write.' })
    },
    [],
  )

  const value: DemoContextValue = {
    adminUser: DEMO_ADMIN_USER,
    distributorUser: DEMO_DISTRIBUTOR_USER,
    catalogProducts: catalogProducts.length ? catalogProducts : [DEMO_PRODUCT_BOTTLE, DEMO_PRODUCT_SAMPLE],
    network,
    orders,
    admin,
    lastMessage,
    recordReferral,
    lookupReferral,
    toggleAdminSetting,
    demoCreateProduct,
    demoUpdateProductSale,
    demoCreatePrice,
    demoCreateDistributor,
    demoUpdateDistributorStatus,
    demoCreateBatch,
    demoAdjustStock,
    demoSetPayment,
    demoSetFulfillment,
    demoCreateTerm,
    noteSimulated,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo requires DemoProvider')
  return ctx
}

export function useDemoOptional(): DemoContextValue | null {
  return useContext(DemoContext)
}
