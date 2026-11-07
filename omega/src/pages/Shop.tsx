import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../components/ProductImage'
import { StatusLine } from '../components/StatusLine'
import { api, type CatalogProduct } from '../lib/api'
import { copy } from '../lib/copy'
import { deriveAppStatus } from '../lib/appStatus'
import './Shop.css'

export function Shop() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState('')
  const [canOrder, setCanOrder] = useState(false)

  useEffect(() => {
    Promise.all([api.catalog(), api.status()])
      .then(([catalog, status]) => {
        const app = deriveAppStatus(status, catalog)
        setUnavailable(app.database === 'not_connected')
        setCanOrder(app.canOrder)
        // Public catalogue lists products but never shows unapproved sale figures — Price TBC only.
        setProducts(catalog.products)
      })
      .catch((err: Error) => {
        setError(err.message)
        setUnavailable(true)
      })
  }, [])

  return (
    <main className="section shop-page">
      <div className="shell">
        <h1>{copy.shop}</h1>
        {error ? <StatusLine tone="error">{error}</StatusLine> : null}

        {unavailable ? (
          <p className="empty" role="status" data-testid="empty-catalogue">
            {copy.catalogueUnavailable}
          </p>
        ) : null}

        {!unavailable && products.length === 0 ? (
          <p className="empty" role="status" data-testid="empty-products">
            {copy.noProducts}
          </p>
        ) : null}

        {!unavailable && !canOrder && products.length > 0 ? (
          <StatusLine tone="warn">{copy.ordersOff}</StatusLine>
        ) : null}

        {!unavailable && products.length > 0 ? (
          <ul className="product-grid">
            {products.map((product) => {
              const orderable = canOrder && product.saleable && product.approved_for_sale
              return (
                <li key={product.id}>
                  <article className="product-card" data-testid={`product-card-${product.sku}`}>
                    <ProductImage src="/product-concept.jpg" ratio="1-1" width={480} height={480} lazy />
                    <h2>{product.name}</h2>
                    <p className="mono meta">{product.volume_ml != null ? `${product.volume_ml} ml` : '—'}</p>
                    <p className="mono meta">{copy.priceTbc}</p>
                    <Link
                      to={`/order?sku=${encodeURIComponent(product.sku)}`}
                      className={`btn btn-secondary${orderable ? '' : ' is-disabled'}`}
                      data-testid={`btn-order-${product.sku}`}
                      aria-disabled={!orderable}
                      onClick={(e) => {
                        if (!orderable) e.preventDefault()
                      }}
                    >
                      {copy.order}
                    </Link>
                  </article>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </main>
  )
}
