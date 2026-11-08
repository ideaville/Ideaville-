import type { AdminOverview, AuthUser, CatalogProduct, DistributorNetwork, ReferralRecord } from '../lib/api'

/** Isolated demo identities — not real accounts; never used for server sessions. */
export const DEMO_ADMIN_USER: AuthUser = {
  id: 'demo-admin',
  email: 'demo.admin@example.invalid',
  role: 'admin',
  distributor_id: null,
}

export const DEMO_DISTRIBUTOR_USER: AuthUser = {
  id: 'demo-dist-user',
  email: 'demo.distributor@example.invalid',
  role: 'distributor',
  distributor_id: 'demo-dist-1',
}

export const DEMO_PRODUCT_BOTTLE: CatalogProduct = {
  id: 'demo-prod-50',
  sku: 'OMEGA-50ML-DEMO',
  name: 'OMEGA Performance Additive 50ml (demo)',
  volume_ml: 50,
  kind: 'bottle',
  saleable: true,
  approved_for_sale: true,
  channel_eligibility: { retail: true, trade: true },
  description: 'Demo catalogue SKU for password-free storefront testing. Not live inventory.',
  prices: [
    {
      id: 'demo-price-retail',
      channel: 'retail',
      amount_kobo: 6500_00,
      currency: 'NGN',
      status: 'active',
      label: 'Demo retail',
    },
    {
      id: 'demo-price-trade',
      channel: 'trade',
      amount_kobo: 4500_00,
      currency: 'NGN',
      status: 'active',
      label: 'Demo trade',
    },
  ],
}

export const DEMO_PRODUCT_SAMPLE: CatalogProduct = {
  id: 'demo-prod-30',
  sku: 'OMEGA-30ML-SAMPLE-DEMO',
  name: 'OMEGA 30ml sample (demo, non-saleable)',
  volume_ml: 30,
  kind: 'sample',
  saleable: false,
  approved_for_sale: false,
  channel_eligibility: { retail: false, trade: false },
  description: 'Demo sample — never saleable.',
  prices: [],
}

export function createInitialDemoNetwork(): DistributorNetwork {
  return {
    self: {
      id: 'demo-dist-1',
      name: 'Demo Lagos Partner',
      code: 'DEMO-LAGOS',
      status: 'active',
      referral_code: 'DEMO-LAGOS',
      sponsor_id: 'demo-dist-sponsor',
    },
    sponsored: [
      {
        id: 'demo-dist-2',
        name: 'Demo Abuja Partner',
        code: 'DEMO-ABJ',
        status: 'pending_terms',
        referral_code: 'DEMO-ABJ',
      },
    ],
    referrals: [
      {
        id: 'demo-ref-1',
        referrer_distributor_id: 'demo-dist-1',
        code: 'DEMO-LAGOS',
        prospect_label: 'Workshop lead (demo)',
        status: 'recorded',
        attributed_order_id: null,
        notes: 'Fixture referral — not a live prospect',
        created_at: '2026-11-01T10:00:00.000Z',
      },
    ],
    terms: [
      {
        id: 'demo-term-1',
        kind: 'commission',
        status: 'draft',
        rate_bps: null,
        notes: 'NO DEFAULT RATE (demo). Commission unset — no invented payout.',
      },
    ],
    commercial_note:
      'Demo network: no commission, residual, or equity figures are invented. Terms appear only as fixtures.',
  }
}

export type DemoOrder = {
  id: string
  channel: string
  status: string
  payment_status: string
  fulfillment_status: string
  total_kobo: number
  created_at: string
}

export function createInitialDemoOrders(): DemoOrder[] {
  return [
    {
      id: 'demo-ord-10000001',
      channel: 'trade',
      status: 'open',
      payment_status: 'pending_verification',
      fulfillment_status: 'allocated',
      total_kobo: 4500_00 * 2,
      created_at: '2026-11-05T12:00:00.000Z',
    },
    {
      id: 'demo-ord-10000002',
      channel: 'retail',
      status: 'fulfilled',
      payment_status: 'paid',
      fulfillment_status: 'delivered',
      total_kobo: 6500_00,
      created_at: '2026-11-03T09:30:00.000Z',
    },
  ]
}

export function createInitialDemoAdminOverview(): AdminOverview {
  return {
    settings: {
      commercial_activation: false,
      checkout_enabled: false,
      payment_provider_configured: false,
      delivery_policy_configured: false,
      currency: 'NGN',
      entity_name: 'Ideaville Enterprise (demo)',
      petrol_only: true,
      market: 'Nigeria first; UK deferred',
    },
    products: [
      {
        ...DEMO_PRODUCT_BOTTLE,
        prices: DEMO_PRODUCT_BOTTLE.prices,
      },
      {
        ...DEMO_PRODUCT_SAMPLE,
        prices: [],
      },
    ],
    distributors: [
      {
        id: 'demo-dist-1',
        name: 'Demo Lagos Partner',
        code: 'DEMO-LAGOS',
        status: 'active',
        referral_code: 'DEMO-LAGOS',
        sponsor_id: 'demo-dist-sponsor',
        notes: 'Demo distributor',
      },
      {
        id: 'demo-dist-2',
        name: 'Demo Abuja Partner',
        code: 'DEMO-ABJ',
        status: 'pending_terms',
        referral_code: 'DEMO-ABJ',
        sponsor_id: 'demo-dist-1',
        notes: 'Demo sponsored',
      },
    ],
    orders: createInitialDemoOrders().map((o) => ({ ...o })),
    batches: [
      {
        id: 'demo-batch-1',
        product_id: 'demo-prod-50',
        batch_code: 'DEMO-B1',
        qty_on_hand: 120,
        qty_reserved: 4,
        notes: 'Demo stock batch',
        created_at: '2026-10-20T08:00:00.000Z',
      },
    ],
    terms: [
      {
        id: 'demo-term-1',
        kind: 'commission',
        status: 'draft',
        rate_bps: null,
        notes: 'NO DEFAULT RATE (demo)',
        distributor_id: null,
      },
    ],
    referrals: createInitialDemoNetwork().referrals as ReferralRecord[],
  }
}

export const DEMO_LOOKUP_CODES: Record<string, { name: string; referral_code: string; status: string; distributor_code: string }> =
  {
    'DEMO-LAGOS': {
      name: 'Demo Lagos Partner',
      referral_code: 'DEMO-LAGOS',
      status: 'active',
      distributor_code: 'DEMO-LAGOS',
    },
    'DEMO-ABJ': {
      name: 'Demo Abuja Partner',
      referral_code: 'DEMO-ABJ',
      status: 'pending_terms',
      distributor_code: 'DEMO-ABJ',
    },
  }
