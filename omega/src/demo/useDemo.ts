import { createContext, useContext } from 'react'
import type { AdminOverview, AuthUser, CatalogProduct, DistributorNetwork, ReferralLookup } from '../lib/api'
import type { DemoOrder } from './fixtures'

export type DemoMessage = { tone: 'ok' | 'warn'; text: string }

export type DemoContextValue = {
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

export const DemoContext = createContext<DemoContextValue | null>(null)

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo requires DemoProvider')
  return ctx
}

export function useDemoOptional(): DemoContextValue | null {
  return useContext(DemoContext)
}
