export type Role = 'admin' | 'distributor'
export type DistributorStatus = 'pending_terms' | 'active' | 'suspended'
export type ProductKind = 'bottle' | 'sample' | 'other'
export type Channel = 'retail' | 'trade'
export type PriceStatus = 'draft' | 'active' | 'superseded'
export type OrderStatus = 'draft' | 'placed' | 'cancelled' | 'fulfilled' | 'closed'
export type PaymentStatus = 'unpaid' | 'pending_verification' | 'paid' | 'failed' | 'refunded'
export type FulfillmentStatus = 'unfulfilled' | 'allocated' | 'shipped' | 'delivered' | 'cancelled'
export type TermKind = 'wholesale_margin' | 'commission'
export type TermStatus = 'draft' | 'active' | 'retired'

export type ChannelEligibility = { retail: boolean; trade: boolean }

export type Settings = {
  commercial_activation: boolean
  currency: 'NGN'
  entity_name: string
  market: string
  petrol_only: boolean
  checkout_enabled: boolean
  payment_provider_configured: boolean
  delivery_policy_configured: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  commercial_activation: false,
  currency: 'NGN',
  entity_name: 'Ideaville Enterprise',
  market: 'Nigeria first; UK deferred',
  petrol_only: true,
  checkout_enabled: false,
  payment_provider_configured: false,
  delivery_policy_configured: false,
}

export type Distributor = {
  id: string
  name: string
  code: string
  status: DistributorStatus
  notes: string
  created_at: string
}

export type User = {
  id: string
  email: string
  password_hash: string
  role: Role
  distributor_id: string | null
  active: boolean
  created_at: string
}

export type Session = {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  created_at: string
}

export type Product = {
  id: string
  sku: string
  name: string
  volume_ml: number | null
  kind: ProductKind
  channel_eligibility: ChannelEligibility
  saleable: boolean
  approved_for_sale: boolean
  description: string
  created_at: string
}

export type ProductPrice = {
  id: string
  product_id: string
  channel: Channel
  amount_kobo: number
  currency: string
  status: PriceStatus
  label: string
  effective_from: string | null
  approved_by: string | null
  created_at: string
}

export type StockBatch = {
  id: string
  product_id: string
  batch_code: string
  qty_on_hand: number
  qty_reserved: number
  notes: string
  created_at: string
}

export type StockMovement = {
  id: string
  batch_id: string
  delta_on_hand: number
  delta_reserved: number
  reason: string
  order_id: string | null
  actor_user_id: string | null
  created_at: string
}

export type Order = {
  id: string
  channel: Channel
  status: OrderStatus
  payment_status: PaymentStatus
  fulfillment_status: FulfillmentStatus
  buyer_user_id: string | null
  distributor_id: string | null
  currency: string
  total_kobo: number
  notes: string
  created_at: string
  updated_at: string
}

export type OrderLine = {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price_kobo: number
  line_total_kobo: number
  price_id: string | null
  product_sku: string
  product_name: string
}

export type CommercialTerm = {
  id: string
  distributor_id: string | null
  kind: TermKind
  rate_bps: number | null
  notes: string
  status: TermStatus
  approved_by: string | null
  created_at: string
}

export type PaymentEvent = {
  id: string
  order_id: string
  kind: 'submitted' | 'verified_paid' | 'rejected' | 'refund_noted'
  amount_kobo: number
  note: string
  actor_user_id: string | null
  created_at: string
}

export type AuthUser = {
  id: string
  email: string
  role: Role
  distributor_id: string | null
}
