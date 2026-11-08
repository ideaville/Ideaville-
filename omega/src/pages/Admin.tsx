import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusLine } from '../components/StatusLine'
import { api, formatNgn, type AdminOverview, type AuthUser } from '../lib/api'
import { copy } from '../lib/copy'
import { CatalogueActions, DistributorsPanel, OrdersPanel, ProductSaleControls, StockPanel, TermsPanel, type RunAction } from './AdminActions'
import './Admin.css'

const GATES = [
  'commercial_activation',
  'checkout_enabled',
  'payment_provider_configured',
  'delivery_policy_configured',
] as const

type Tab = 'activation' | 'catalogue' | 'stock' | 'orders' | 'distributors' | 'referrals' | 'terms'

type AdminLoadResult =
  | { kind: 'ok'; user: AuthUser; data: AdminOverview }
  | { kind: 'redirect' }
  | { kind: 'error'; message: string }

function isDbOffMessage(message: string) {
  const msg = message.toLowerCase()
  return msg.includes('not configured') || msg.includes('unconfigured')
}

/** Fetches without touching React state, so effects only set state in the async callback. */
async function fetchAdminData(): Promise<AdminLoadResult> {
  try {
    const me = await api.me()
    if (me.user.role !== 'admin') return { kind: 'redirect' }
    return { kind: 'ok', user: me.user, data: await api.adminOverview() }
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : 'Error' }
  }
}

export function Admin() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<Tab>('activation')
  const [dbOff, setDbOff] = useState(false)

  const applyResult = useCallback(
    (result: AdminLoadResult) => {
      if (result.kind === 'redirect') {
        navigate('/login')
        return
      }
      if (result.kind === 'error') {
        setError(result.message)
        if (isDbOffMessage(result.message)) setDbOff(true)
        return
      }
      setUser(result.user)
      setData(result.data)
      setDbOff(false)
    },
    [navigate],
  )

  const load = useCallback(async () => applyResult(await fetchAdminData()), [applyResult])

  useEffect(() => {
    let active = true
    fetchAdminData().then((result) => {
      if (active) applyResult(result)
    })
    return () => {
      active = false
    }
  }, [applyResult])

  async function toggle(key: string, value: boolean) {
    setMessage('')
    setError('')
    try {
      await api.patchSettings({ [key]: value })
      setMessage(`Updated ${key}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const run: RunAction = async (action, success) => {
    setMessage('')
    setError('')
    try {
      await action()
      setMessage(success)
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
      return false
    }
  }

  if (!user || !data) {
    return (
      <main className="section">
        <div className="shell">
          {dbOff ? (
            <p role="status" data-testid="empty-admin">
              {copy.databaseOff}
            </p>
          ) : error ? (
            <StatusLine tone="error">{error}</StatusLine>
          ) : (
            <p className="meta">Loading…</p>
          )}
          <p className="meta">
            <Link to="/login">{copy.signIn}</Link>
          </p>
        </div>
      </main>
    )
  }

  const settings = data.settings as Record<string, boolean | string>
  const products = data.products as Array<Record<string, unknown>>
  const prices = flattenPrices(products)

  return (
    <main className="section admin-page">
      <div className="shell">
        <header className="page-head">
          <h1>{copy.admin}</h1>
          <p className="meta">{user.email}</p>
        </header>

        {error ? <StatusLine tone="error">{error}</StatusLine> : null}
        {message ? <StatusLine tone="neutral">{message}</StatusLine> : null}

        <div className="tabs" role="tablist" aria-label="Admin sections">
          {(
            [
              ['activation', copy.activation],
              ['catalogue', copy.catalogue],
              ['stock', copy.stock],
              ['orders', copy.orders],
              ['distributors', copy.distributors],
              ['referrals', copy.referrals],
              ['terms', copy.terms],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              className="tab"
              data-testid={`tab-${id}`}
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'activation' ? (
          <section aria-label={copy.activation}>
            <ul className="admin-toggles">
              {GATES.map((key) => (
                <li key={key}>
                  <span>{key}</span>
                  <strong>{String(settings[key])}</strong>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-testid={`btn-toggle-${key}`}
                    disabled={dbOff}
                    onClick={() => toggle(key, !settings[key])}
                  >
                    Toggle
                  </button>
                </li>
              ))}
            </ul>
            <StatusLine tone="warn">Keep payment_provider_configured off until a real provider is connected</StatusLine>
          </section>
        ) : null}

        {tab === 'catalogue' ? (
          <section aria-label={copy.catalogue}>
            <CatalogueActions products={products} run={run} />
            <div className="table-wrap">
              <table className="data-table stack-mobile" data-testid="table-catalogue">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">SKU</th>
                    <th scope="col">Size</th>
                    <th scope="col">Status</th>
                    <th scope="col">Prices</th>
                    <th scope="col">Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((row) => (
                    <tr key={String(row.id)}>
                      <td data-label="Name" className="cell-wrap">{String(row.name)}</td>
                      <td data-label="SKU" className="mono">
                        {String(row.sku)}
                      </td>
                      <td data-label="Size" className="mono">
                        {row.volume_ml != null ? `${row.volume_ml} ml` : '—'}
                      </td>
                      <td data-label="Status">{row.approved_for_sale ? 'Published' : 'Draft'}</td>
                      <td data-label="Prices" className="mono price-cell">
                        <span>Retail {priceLabel(prices, String(row.id), 'retail')}</span>
                        <span>Trade {priceLabel(prices, String(row.id), 'trade')}</span>
                      </td>
                      <td data-label="Sale">
                        <ProductSaleControls product={row} run={run} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="meta">
              Draft prices are admin-only and never shown as live sale prices. Checkout also needs all four Activation switches and stock.
            </p>
          </section>
        ) : null}

        {tab === 'stock' ? (
          <StockPanel products={products} batches={data.batches as Record<string, unknown>[]} run={run} />
        ) : null}

        {tab === 'orders' ? (
          <OrdersPanel orders={data.orders as Record<string, unknown>[]} distributors={data.distributors as Record<string, unknown>[]} run={run} />
        ) : null}

        {tab === 'distributors' ? (
          <DistributorsPanel distributors={data.distributors as Record<string, unknown>[]} run={run} />
        ) : null}

        {tab === 'referrals' ? (
          <DataTable
            testId="table-referrals"
            title={copy.referrals}
            rows={(data.referrals ?? []) as Record<string, unknown>[]}
            keys={['prospect_label', 'code', 'status', 'referrer_distributor_id', 'created_at']}
          />
        ) : null}

        {tab === 'terms' ? (
          <TermsPanel terms={data.terms as Record<string, unknown>[]} distributors={data.distributors as Record<string, unknown>[]} run={run} />
        ) : null}

        <button
          type="button"
          className="btn btn-quiet"
          data-testid="btn-sign-out"
          onClick={() => api.logout().then(() => navigate('/login'))}
        >
          {copy.signOut}
        </button>
      </div>
    </main>
  )
}

function DataTable({
  title,
  rows,
  keys,
  testId,
}: {
  title: string
  rows: Record<string, unknown>[]
  keys: string[]
  testId: string
}) {
  return (
    <section aria-label={title}>
      <h2 className="sr-only">{title}</h2>
      {rows.length === 0 ? (
        <p className="meta" role="status">
          {copy.none}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data-table stack-mobile" data-testid={testId}>
            <thead>
              <tr>
                {keys.map((k) => (
                  <th key={k} scope="col">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={String(row.id ?? i)}>
                  {keys.map((k) => (
                    <td key={k} data-label={k} className={k.includes('kobo') || k === 'id' ? 'mono' : undefined}>
                      {formatCell(row[k], k)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function flattenPrices(products: Array<Record<string, unknown>>) {
  const map = new Map<string, Array<Record<string, unknown>>>()
  for (const p of products) {
    const list = (p.prices as Array<Record<string, unknown>> | undefined) ?? []
    map.set(String(p.id), list)
  }
  return map
}

function priceLabel(map: Map<string, Array<Record<string, unknown>>>, productId: string, channel: 'retail' | 'trade') {
  const list = map.get(productId) ?? []
  const active = list.find((p) => p.status === 'active' && p.channel === channel)
  const draft = list.find((p) => p.status === 'draft' && p.channel === channel)
  const price = active ?? draft
  if (!price) return '—'
  const amount = Number(price.amount_kobo)
  const tag = String(price.status)
  return `${formatNgn(amount)} (${tag})`
}

function formatCell(value: unknown, key: string) {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (key === 'total_kobo' && typeof value === 'number') return formatNgn(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
