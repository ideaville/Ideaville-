import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductImage } from '../components/ProductImage'
import { StatusLine } from '../components/StatusLine'
import { api, type CatalogProduct } from '../lib/api'
import { copy } from '../lib/copy'
import { deriveAppStatus } from '../lib/appStatus'
import './Order.css'

/**
 * Order request surface. Personal-data fields (name/phone/address) are omitted
 * until the order model persists them — do not collect PII prematurely.
 */
export function Order() {
  const [params] = useSearchParams()
  const sku = params.get('sku')
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [qty, setQty] = useState(1)
  const [canOrder, setCanOrder] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.catalog(), api.status()])
      .then(([catalog, status]) => {
        const app = deriveAppStatus(status, catalog)
        setCanOrder(app.canOrder)
        setProduct(catalog.products.find((p) => p.sku === sku) ?? catalog.products[0] ?? null)
      })
      .catch((err: Error) => setError(err.message))
  }, [sku])

  const size = useMemo(() => (product?.volume_ml != null ? `${product.volume_ml} ml` : '—'), [product])

  return (
    <main className="section order-page">
      <div className="shell order-shell">
        <h1>{copy.order}</h1>
        {error ? <StatusLine tone="error">{error}</StatusLine> : null}

        {product ? (
          <div className="order-item">
            <ProductImage src="/product-concept.jpg" ratio="thumb" width={56} height={56} />
            <div>
              <p>{product.name}</p>
              <p className="mono meta">{size}</p>
            </div>
            <div className="qty" data-testid="qty">
              <button
                type="button"
                className="btn btn-secondary qty-btn"
                aria-label="Decrease"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={qty}
                aria-label="Quantity"
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              />
              <button
                type="button"
                className="btn btn-secondary qty-btn"
                aria-label="Increase"
                onClick={() => setQty((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <p className="meta" role="status">
            {copy.noProducts}
          </p>
        )}

        <dl className="order-summary">
          <div>
            <dt>Price</dt>
            <dd className="mono">{copy.priceTbc}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd className="mono">Off</dd>
          </div>
        </dl>

        {!canOrder ? <StatusLine tone="warn">{copy.ordersOff}</StatusLine> : null}

        <button type="button" className="btn btn-primary" data-testid="btn-request-order" disabled={!canOrder || !product}>
          {copy.requestOrder}
        </button>

        <p className="meta order-back">
          <Link to="/shop">{copy.shop}</Link>
        </p>
      </div>
    </main>
  )
}
