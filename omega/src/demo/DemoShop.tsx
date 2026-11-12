import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../components/ProductImage'
import { StatusLine } from '../components/StatusLine'
import { formatNgn } from '../lib/api'
import { copy } from '../lib/copy'
import { canPreviewBrowse, displayUnitKobo } from '../lib/previewStore'
import { useDemo } from './useDemo'

/**
 * Demo storefront — same browse/review UX as live preview shop, fixture catalogue only.
 * Never calls placeOrder.
 */
export function DemoShop() {
  const demo = useDemo()
  const products = demo.catalogProducts
  const [sku, setSku] = useState(products.find((p) => p.kind === 'bottle')?.sku ?? products[0]?.sku ?? '')
  const product = useMemo(() => products.find((p) => p.sku === sku) ?? products[0] ?? null, [products, sku])
  const [qty, setQty] = useState(1)
  const [reviewed, setReviewed] = useState<{ total: number; ref: string } | null>(null)

  const price = product ? displayUnitKobo(product, 'retail', false) : null
  const unit = price?.amount_kobo ?? null
  const browseable = product ? canPreviewBrowse(product, false) : false

  return (
    <main className="section shop-page" data-testid="demo-shop">
      <div className="shell">
        <h1>{copy.shop}</h1>
        <StatusLine tone="warn">{copy.previewStoreHelp}</StatusLine>

        <ul className="product-grid">
          {products.map((p) => {
            const pick = displayUnitKobo(p, 'retail', false)
            const ok = canPreviewBrowse(p, false)
            return (
              <li key={p.id}>
                <article className="product-card" data-testid={`product-card-${p.sku}`}>
                  <ProductImage src="/product-concept.jpg" ratio="1-1" width={480} height={480} lazy />
                  <h2>{p.name}</h2>
                  <p className="mono meta">{p.volume_ml != null ? `${p.volume_ml} ml` : '—'}</p>
                  <p className="mono meta" data-testid={`price-${p.sku}`}>
                    {pick != null ? formatNgn(pick.amount_kobo) : copy.priceTbc}
                  </p>
                  {pick?.preview ? <p className="meta">{copy.previewPrice}</p> : null}
                  <button
                    type="button"
                    className={`btn btn-secondary${ok ? '' : ' is-disabled'}`}
                    data-testid={`btn-order-${p.sku}`}
                    disabled={!ok}
                    onClick={() => {
                      setSku(p.sku)
                      setReviewed(null)
                      setQty(1)
                    }}
                  >
                    {copy.previewReview}
                  </button>
                </article>
              </li>
            )
          })}
        </ul>

        {product && browseable && unit != null ? (
          <section className="order-shell" style={{ marginTop: '2rem' }} aria-label={copy.previewReview}>
            <h2>{copy.previewReview}</h2>
            <div className="order-item">
              <ProductImage src="/product-concept.jpg" ratio="thumb" width={56} height={56} />
              <div>
                <p>{product.name}</p>
                <p className="mono meta">{product.sku}</p>
              </div>
              <div className="qty" data-testid="qty">
                <button type="button" className="btn btn-secondary qty-btn" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  aria-label="Quantity"
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                />
                <button type="button" className="btn btn-secondary qty-btn" aria-label="Increase" onClick={() => setQty((q) => q + 1)}>
                  +
                </button>
              </div>
            </div>
            <dl className="order-summary">
              <div>
                <dt>{copy.previewPrice}</dt>
                <dd className="mono" data-testid="order-unit-price">
                  {formatNgn(unit)}
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd className="mono" data-testid="order-total">
                  {formatNgn(unit * qty)}
                </dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd className="mono">Not taken (demo)</dd>
              </div>
            </dl>
            {reviewed ? (
              <StatusLine tone="neutral">{`${copy.previewReviewed} ${reviewed.ref} · ${formatNgn(reviewed.total)}`}</StatusLine>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              data-testid="btn-request-order"
              onClick={() => {
                setReviewed({ ref: `demo-${product.sku}`.slice(0, 16), total: unit * qty })
                demo.noteSimulated('Demo preview review complete — no live order or stock write.')
              }}
            >
              {copy.previewReview}
            </button>
          </section>
        ) : null}

        <p className="meta" style={{ marginTop: '1.5rem' }}>
          <Link to="/demo/network">{copy.network}</Link>
          {' · '}
          <Link to="/shop">Live preview shop</Link>
        </p>
      </div>
    </main>
  )
}
