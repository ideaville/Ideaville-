export type ApiError = { error: string; code?: string }

/** Fired after login/logout so every useSession() (e.g. the header) refetches. */
export const SESSION_CHANGED_EVENT = 'omega:session-changed'

function notifySessionChanged() {
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT))
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  })
  const data = (await res.json().catch(() => ({}))) as T & ApiError
  if (!res.ok) {
    throw Object.assign(new Error(data.error || res.statusText), { status: res.status, code: data.code })
  }
  return data
}

function send(method: 'POST' | 'PATCH', path: string, body: unknown) {
  return request<Record<string, unknown>>(path, { method, body: JSON.stringify(body) })
}

export const api = {
  status: () => request<{ readiness: { persistence: string; migrated: boolean; message: string }; settings: unknown }>('/api/status'),
  catalog: () => request<{ settings: Record<string, unknown>; products: CatalogProduct[] }>('/api/catalog'),
  login: (email: string, password: string) =>
    request<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then(
      (res) => {
        notifySessionChanged()
        return res
      },
    ),
  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: '{}' }).finally(notifySessionChanged),
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
  adminOverview: () => request<AdminOverview>('/api/admin/overview'),
  patchSettings: (patch: Record<string, boolean>) =>
    request<{ settings: Record<string, unknown> }>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  createProduct: (input: { sku: string; name: string; kind: 'bottle' | 'sample' | 'other'; volume_ml: number | null; description: string }) =>
    send('POST', '/api/admin/products', input),
  updateProduct: (id: string, patch: { saleable?: boolean; approved_for_sale?: boolean; channel_eligibility?: { retail: boolean; trade: boolean } }) =>
    send('PATCH', `/api/admin/products/${encodeURIComponent(id)}`, patch),
  createPrice: (input: { product_id: string; channel: 'retail' | 'trade'; amount_kobo: number; label: string; activate: boolean }) =>
    send('POST', '/api/admin/prices', input),
  createBatch: (input: { product_id: string; batch_code: string; qty_on_hand: number; notes: string }) =>
    send('POST', '/api/admin/stock/batches', input),
  adjustStock: (input: { batch_id: string; delta_on_hand: number; reason: string }) => send('POST', '/api/admin/stock/adjust', input),
  setPayment: (orderId: string, input: { payment_status: 'paid' | 'failed' | 'refunded' | 'pending_verification'; note: string }) =>
    send('POST', `/api/admin/orders/${encodeURIComponent(orderId)}/payment`, input),
  setFulfillment: (orderId: string, input: { fulfillment_status: 'shipped' | 'delivered' | 'cancelled' }) =>
    send('POST', `/api/admin/orders/${encodeURIComponent(orderId)}/fulfillment`, input),
  createDistributor: (input: { name: string; code: string; sponsor_id: string | null; notes: string }) =>
    send('POST', '/api/admin/distributors', input),
  updateDistributor: (id: string, patch: { status: 'pending_terms' | 'active' | 'suspended' }) =>
    send('PATCH', `/api/admin/distributors/${encodeURIComponent(id)}`, patch),
  createUser: (input: { email: string; password: string; role: 'distributor'; distributor_id: string }) =>
    send('POST', '/api/admin/users', input),
  createTerm: (input: { kind: 'wholesale_margin' | 'commission'; distributor_id: string | null; rate_bps: number | null; notes: string; activate: boolean }) =>
    send('POST', '/api/admin/terms', input),
  placeOrder: (input: { channel: 'retail' | 'trade'; lines: Array<{ product_id: string; quantity: number }> }) =>
    request<{ order: { id: string; total_kobo: number; channel: string } }>('/api/orders', { method: 'POST', body: JSON.stringify(input) }),
  distributorNetwork: () => request<DistributorNetwork>('/api/distributor/network'),
  createReferral: (input: { prospect_label: string; notes?: string }) =>
    request<{ referral: ReferralRecord }>('/api/distributor/referrals', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  lookupReferral: (code: string) =>
    request<ReferralLookup>(`/api/referrals/lookup?code=${encodeURIComponent(code)}`),
}

export type AuthUser = {
  id: string
  email: string
  role: 'admin' | 'distributor'
  distributor_id: string | null
}

export type CatalogProduct = {
  id: string
  sku: string
  name: string
  volume_ml: number | null
  kind: string
  saleable: boolean
  approved_for_sale: boolean
  channel_eligibility: { retail: boolean; trade: boolean }
  description: string
  prices: Array<{ id: string; channel: string; amount_kobo: number; currency: string; status: string; label: string }>
}

export type AdminOverview = {
  settings: Record<string, unknown>
  products: unknown[]
  distributors: unknown[]
  orders: unknown[]
  batches: unknown[]
  terms: unknown[]
  referrals?: unknown[]
}

export type ReferralRecord = {
  id: string
  referrer_distributor_id: string
  code: string
  prospect_label: string
  status: string
  attributed_order_id: string | null
  notes: string
  created_at: string
}

export type DistributorNetwork = {
  self: {
    id: string
    name: string
    code: string
    status: string
    referral_code: string
    sponsor_id: string | null
  }
  sponsored: Array<{ id: string; name: string; code: string; status: string; referral_code: string }>
  referrals: ReferralRecord[]
  terms: Array<{ id: string; kind: string; status: string; rate_bps: number | null; notes: string }>
  commercial_note: string
}

export type ReferralLookup = {
  found: boolean
  referral_code?: string
  distributor_code?: string
  status?: string
  name?: string
  readiness?: { persistence: string }
}

export function formatNgn(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}
