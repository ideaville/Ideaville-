import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductImage } from '../components/ProductImage'
import { StatusLine } from '../components/StatusLine'
import { api, formatNgn, type CatalogProduct } from '../lib/api'
import { useSession } from '../hooks/useSession'
import { copy } from '../lib/copy'
import { deriveAppStatus } from '../lib/appStatus'
import { displayUnitKobo } from '../lib/previewStore'
import './Order.css'

/**
 * Order request / preview review surface. Personal-data fields omitted until persisted.
 * When commerce is off, review is client-only — no placeOrder / stock / payment writes.
 */
export function Order() {
  const [params] = useSearchParams()
  const sku = params.get('sku')
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [qty, setQty] = useState(1)
  const [canOrder, setCanOrder] = useState(false)
  const [error, setError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState<{ ref: string; total: number; preview: boolean } | null>(null)
  const { user } = useSession()
  const channel: 'retail' | 'trade' = user?.role === 'distributor' ? 'trade' : 'retail'

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
  const pricePick = product ? displayUnitKobo(product, channel, canOrder) : null
  const unitKobo = pricePick?.amount_kobo ?? null
  const previewMode = !canOrder
  const orderable =
    !!product &&
    unitKobo != null &&
    (canOrder
      ? product.saleable && product.approved_for_sale
      : product.kind !== 'sample')

  async function onRequest() {
    if (!product || unitKobo == null) return
    setError('')
    setPlaced(null)
    setPlacing(true)
    try {
      if (previewMode) {
        // Isolated demo review — no API order write.
        setPlaced({
          ref: `prev-${product.sku}`.slice(0, 12),
          total: unitKobo * qty,
          preview: true,
        })
        return
      }
      const { order } = await api.placeOrder({ channel, lines: [{ product_id: product.id, quantity: qty }] })
      setPlaced({ ref: order.id.slice(0, 8), total: Number(order.total_kobo), preview: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <main className="section order-page">
      <div className="shell order-shell">
        <h1>{previewMode ? copy.previewReview : copy.order}</h1>
        {error ? <StatusLine tone="error">{error}</StatusLine> : null}
        {previewMode ? <StatusLine tone="warn">{copy.previewStoreHelp}</StatusLine> : null}

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
            <dt>{pricePick?.preview ? copy.previewPrice : channel === 'trade' ? copy.tradePrice : 'Price'}</dt>
            <dd className="mono" data-testid="order-unit-price">{unitKobo != null ? formatNgn(unitKobo) : copy.priceTbc}</dd>
          </div>
          {unitKobo != null ? (
            <div>
              <dt>Total</dt>
              <dd className="mono" data-testid="order-total">{formatNgn(unitKobo * qty)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Payment</dt>
            <dd className="mono">{previewMode ? 'Not taken (preview)' : canOrder ? 'Recorded by admin' : 'Off'}</dd>
          </div>
        </dl>

        {placed ? (
          <StatusLine tone="neutral">
            {placed.preview
              ? `${copy.previewReviewed} ${placed.ref} · ${formatNgn(placed.total)}`
              : `${copy.orderPlaced}: ${placed.ref} · ${formatNgn(placed.total)}`}
          </StatusLine>
        ) : null}
        {orderable && channel === 'retail' && !previewMode ? <p className="meta">{copy.orderNoContact}</p> : null}

        <button
          type="button"
          className="btn btn-primary"
          data-testid="btn-request-order"
          disabled={!orderable || placing}
          onClick={onRequest}
        >
          {previewMode ? copy.previewReview : copy.requestOrder}
        </button>

        <p className="meta order-back">
          <Link to="/shop">{copy.shop}</Link>
        </p>
      </div>
    </main>
  )
}
