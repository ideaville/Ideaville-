import { useState } from 'react'
import { StatusLine } from '../components/StatusLine'
import { formatNgn } from '../lib/api'
import { copy } from '../lib/copy'
import {
  CatalogueActions,
  DistributorsPanel,
  OrdersPanel,
  ProductSaleControls,
  StockPanel,
  TermsPanel,
  type RunAction,
} from '../pages/AdminActions'
import { useDemo } from './DemoContext'
import '../pages/Admin.css'

const GATES = [
  'commercial_activation',
  'checkout_enabled',
  'payment_provider_configured',
  'delivery_policy_configured',
] as const

type Tab = 'activation' | 'catalogue' | 'stock' | 'orders' | 'distributors' | 'referrals' | 'terms'

function flattenPrices(products: Array<Record<string, unknown>>) {
  const out: Array<Record<string, unknown>> = []
  for (const p of products) {
    const prices = Array.isArray(p.prices) ? (p.prices as Array<Record<string, unknown>>) : []
    for (const price of prices) out.push({ ...price, product_id: p.id })
  }
  return out
}

function priceLabel(prices: Array<Record<string, unknown>>, productId: string, channel: string) {
  const hit = prices.find((p) => p.product_id === productId && p.channel === channel && p.status === 'active')
  if (!hit) {
    const draft = prices.find((p) => p.product_id === productId && p.channel === channel)
    return draft ? `${formatNgn(Number(draft.amount_kobo))} (draft)` : '—'
  }
  return formatNgn(Number(hit.amount_kobo))
}

function DataTable({
  title,
  testId,
  rows,
  keys,
}: {
  title: string
  testId: string
  rows: Array<Record<string, unknown>>
  keys: string[]
}) {
  return (
    <section aria-label={title}>
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
            {rows.map((row) => (
              <tr key={String(row.id ?? JSON.stringify(row))}>
                {keys.map((k) => (
                  <td key={k} data-label={k} className={k.includes('id') || k.includes('code') || k.includes('at') ? 'mono' : undefined}>
                    {String(row[k] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Fixture-backed admin UI — uses real AdminActions with demo api client; never hits live mutators. */
export function DemoAdmin() {
  const demo = useDemo()
  const [tab, setTab] = useState<Tab>('activation')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const data = demo.admin
  const user = demo.adminUser
  const settings = data.settings as Record<string, boolean | string>
  const products = data.products as Array<Record<string, unknown>>
  const prices = flattenPrices(products)

  const run: RunAction = async (action, success) => {
    setMessage('')
    setError('')
    try {
      await action()
      setMessage(success)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
      return false
    }
  }

  return (
    <main className="section admin-page" data-testid="demo-admin">
      <div className="shell">
        <header className="page-head">
          <h1>{copy.admin}</h1>
          <p className="meta">{user.email} · demo fixture (not a live session)</p>
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
                    onClick={() => {
                      demo.toggleAdminSetting(key)
                      setMessage(`Demo toggled ${key} (session only)`)
                    }}
                  >
                    Toggle
                  </button>
                </li>
              ))}
            </ul>
            <StatusLine tone="warn">Demo toggles never enable live checkout, payment, or fulfillment.</StatusLine>
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
                      <td data-label="Name" className="cell-wrap">
                        {String(row.name)}
                      </td>
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
          </section>
        ) : null}

        {tab === 'stock' ? <StockPanel products={products} batches={data.batches as Record<string, unknown>[]} run={run} /> : null}

        {tab === 'orders' ? (
          <OrdersPanel orders={data.orders as Record<string, unknown>[]} distributors={data.distributors as Record<string, unknown>[]} run={run} />
        ) : null}

        {tab === 'distributors' ? (
          <>
            <p className="meta" data-testid="admin-network-inspect">
              {copy.adminNetworkInspect}
            </p>
            <DistributorsPanel distributors={data.distributors as Record<string, unknown>[]} run={run} />
          </>
        ) : null}

        {tab === 'referrals' ? (
          <section aria-label={copy.referrals}>
            <DataTable
              testId="table-referrals"
              title={copy.referrals}
              rows={(data.referrals ?? []) as Record<string, unknown>[]}
              keys={['prospect_label', 'code', 'status', 'referrer_distributor_id', 'created_at']}
            />
          </section>
        ) : null}

        {tab === 'terms' ? (
          <TermsPanel terms={data.terms as Record<string, unknown>[]} distributors={data.distributors as Record<string, unknown>[]} run={run} />
        ) : null}
      </div>
    </main>
  )
}
