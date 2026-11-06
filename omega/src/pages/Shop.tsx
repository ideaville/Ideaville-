import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatNgn, type CatalogProduct } from '../lib/api'
import './Shop.css'

export function Shop() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [readiness, setReadiness] = useState<string>('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.catalog(), api.status()])
      .then(([catalog, status]) => {
        setProducts(catalog.products)
        setSettings(catalog.settings)
        setReadiness(status.readiness.message)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  const checkoutLive = Boolean(settings?.commercial_activation && settings?.checkout_enabled)

  return (
    <main className="section shop-page">
      <div className="shell">
        <div className="section-head">
          <p className="eyebrow">Nigeria shop · Ideaville Enterprise</p>
          <h2>Product catalogue</h2>
          <p className="lede">
            Petrol-only additive concept. Checkout stays off until an admin approves saleable SKU, price,
            stock, payment provider, and delivery policy. No efficacy claims. Historic Oct draft prices
            appear as <em>draft</em> only.
          </p>
        </div>

        {error ? <p className="shop-error" role="alert">{error}</p> : null}
        <p className="shop-status">{readiness || 'Checking backend…'}</p>
        <p className="shop-status">
          Checkout: {checkoutLive ? 'enabled by admin' : 'DISABLED (fail closed)'} ·{' '}
          <Link to="/login">Staff / distributor login</Link>
        </p>

        <div className="shop-grid">
          {products.map((product) => {
            const retail = product.prices.find((p) => p.channel === 'retail')
            return (
              <article key={product.id} className="shop-card">
                <p className="eyebrow">{product.sku}</p>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <ul>
                  <li>Kind: {product.kind}</li>
                  <li>Volume: {product.volume_ml == null ? 'unresolved / admin-set' : `${product.volume_ml} ml`}</li>
                  <li>
                    Sale status:{' '}
                    {product.approved_for_sale && product.saleable ? 'approved' : 'not approved for sale'}
                  </li>
                  <li>
                    Retail price:{' '}
                    {retail
                      ? `${formatNgn(retail.amount_kobo)} (${retail.status}${retail.label ? ` — ${retail.label}` : ''})`
                      : 'none'}
                  </li>
                </ul>
                <button type="button" className="btn btn-ghost" disabled>
                  {checkoutLive ? 'Checkout not wired in this UI yet' : 'Checkout disabled'}
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </main>
  )
}
