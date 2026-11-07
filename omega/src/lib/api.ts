export type ApiError = { error: string; code?: string }

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

export const api = {
  status: () => request<{ readiness: { persistence: string; migrated: boolean; message: string }; settings: unknown }>('/api/status'),
  catalog: () => request<{ settings: Record<string, unknown>; products: CatalogProduct[] }>('/api/catalog'),
  login: (email: string, password: string) =>
    request<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: '{}' }),
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
  adminOverview: () => request<AdminOverview>('/api/admin/overview'),
  patchSettings: (patch: Record<string, boolean>) =>
    request<{ settings: Record<string, unknown> }>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
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
}

export function formatNgn(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}
