import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusLine } from '../components/StatusLine'
import { api, formatNgn, type AdminOverview, type AuthUser } from '../lib/api'
import { copy } from '../lib/copy'
import './Admin.css'

const GATES = [
  'commercial_activation',
  'checkout_enabled',
  'payment_provider_configured',
  'delivery_policy_configured',
] as const

type Tab = 'activation' | 'catalogue' | 'stock' | 'orders' | 'distributors' | 'referrals' | 'terms'

export function Admin() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<Tab>('activation')
  const [dbOff, setDbOff] = useState(false)

  const load = useCallback(async () => {
    try {
      const me = await api.me()
      if (me.user.role !== 'admin') {
        navigate('/login')
        return
      }
      setUser(me.user)
      setData(await api.adminOverview())
      setDbOff(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      setError(msg)
      if (msg.toLowerCase().includes('not configured') || msg.toLowerCase().includes('unconfigured')) {
        setDbOff(true)
      }
    }
  }, [navigate])

  useEffect(() => {
    void load()
  }, [load])

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
            <div className="table-wrap">
              <table className="data-table stack-mobile" data-testid="table-catalogue">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">SKU</th>
                    <th scope="col">Size</th>
                    <th scope="col">Status</th>
                    <th scope="col">Draft price</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((row) => (
                    <tr key={String(row.id)}>
                      <td data-label="Name">{String(row.name)}</td>
                      <td data-label="SKU" className="mono">
                        {String(row.sku)}
                      </td>
                      <td data-label="Size" className="mono">
                        {row.volume_ml != null ? `${row.volume_ml} ml` : '—'}
                      </td>
                      <td data-label="Status">{row.approved_for_sale ? 'Published' : 'Draft'}</td>
                      <td data-label="Draft price" className="mono">
                        {priceLabel(prices, String(row.id))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="meta">Historic draft prices are admin-only and never shown as live sale prices.</p>
          </section>
        ) : null}

        {tab === 'stock' ? (
          <DataTable
            testId="table-stock"
            title={copy.stock}
            rows={data.batches as Record<string, unknown>[]}
            keys={['batch_code', 'product_id', 'qty_on_hand', 'qty_reserved']}
          />
        ) : null}

        {tab === 'orders' ? (
          <DataTable
            testId="table-orders"
            title={copy.orders}
            rows={data.orders as Record<string, unknown>[]}
            keys={['id', 'channel', 'status', 'payment_status', 'total_kobo']}
          />
        ) : null}

        {tab === 'distributors' ? (
          <section aria-label={copy.distributors}>
            <p className="meta" data-testid="admin-network-inspect">
              {copy.adminNetworkInspect}
            </p>
            <DataTable
              testId="table-distributors"
              title={copy.distributors}
              rows={data.distributors as Record<string, unknown>[]}
              keys={['code', 'name', 'status', 'referral_code', 'sponsor_id']}
            />
          </section>
        ) : null}

        {tab === 'referrals' ? (
          <section aria-label={copy.referrals}>
            <p className="meta">{copy.adminNetworkInspect}</p>
            <DataTable
              testId="table-referrals"
              title={copy.referrals}
              rows={(data.referrals ?? []) as Record<string, unknown>[]}
              keys={['prospect_label', 'code', 'status', 'referrer_distributor_id', 'created_at']}
            />
          </section>
        ) : null}

        {tab === 'terms' ? (
          <DataTable
            testId="table-terms"
            title={copy.terms}
            rows={data.terms as Record<string, unknown>[]}
            keys={['kind', 'rate_bps', 'status']}
          />
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

function priceLabel(map: Map<string, Array<Record<string, unknown>>>, productId: string) {
  const list = map.get(productId) ?? []
  const draft = list.find((p) => p.status === 'draft' && p.channel === 'retail')
  const active = list.find((p) => p.status === 'active' && p.channel === 'retail')
  const price = draft ?? active
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
