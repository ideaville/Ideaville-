import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../components/ProductImage'
import { StatusLine } from '../components/StatusLine'
import { api, formatNgn, type CatalogProduct } from '../lib/api'
import { copy } from '../lib/copy'
import { deriveAppStatus } from '../lib/appStatus'
import { canPreviewBrowse, displayUnitKobo } from '../lib/previewStore'
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
        setProducts(catalog.products)
      })
      .catch((err: Error) => {
        setError(err.message)
        setUnavailable(true)
      })
  }, [])

  const previewMode = !canOrder

  return (
    <main className="section shop-page">
      <div className="shell">
        <h1>{copy.shop}</h1>
        <p className="meta">
          Full password-free journey (network, distributor, admin fixtures): <Link to="/demo/shop">{copy.demo}</Link>
        </p>
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

        {!unavailable && previewMode && products.length > 0 ? (
          <StatusLine tone="warn">{copy.previewStoreHelp}</StatusLine>
        ) : null}

        {!unavailable && products.length > 0 ? (
          <ul className="product-grid">
            {products.map((product) => {
              const price = displayUnitKobo(product, 'retail', canOrder)
              const browseable = canPreviewBrowse(product, canOrder)
              return (
                <li key={product.id}>
                  <article className="product-card" data-testid={`product-card-${product.sku}`}>
                    <ProductImage src="/product-concept.jpg" ratio="1-1" width={480} height={480} lazy />
                    <h2>{product.name}</h2>
                    <p className="mono meta">{product.volume_ml != null ? `${product.volume_ml} ml` : '—'}</p>
                    <p className="mono meta" data-testid={`price-${product.sku}`}>
                      {price != null ? formatNgn(price.amount_kobo) : copy.priceTbc}
                    </p>
                    {price?.preview ? <p className="meta">{copy.previewPrice}</p> : null}
                    <Link
                      to={`/order?sku=${encodeURIComponent(product.sku)}`}
                      className={`btn btn-secondary${browseable ? '' : ' is-disabled'}`}
                      data-testid={`btn-order-${product.sku}`}
                      aria-disabled={!browseable}
                      onClick={(e) => {
                        if (!browseable) e.preventDefault()
                      }}
                    >
                      {previewMode && browseable ? copy.previewReview : copy.order}
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
