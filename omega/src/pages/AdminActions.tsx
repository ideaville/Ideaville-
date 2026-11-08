import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api, formatNgn } from '../lib/api'
import { nairaToKobo } from '../lib/money'

/** Runs an admin write, reports success/failure, and reloads the overview. Resolves true on success. */
export type RunAction = (action: () => Promise<unknown>, success: string) => Promise<boolean>

type Row = Record<string, unknown>

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

function Panel({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <details className="admin-panel" data-testid={testId}>
      <summary>{title}</summary>
      <div className="admin-panel-body">{children}</div>
    </details>
  )
}

function productLabel(products: Row[], id: unknown) {
  const p = products.find((x) => x.id === id)
  return p ? String(p.sku) : String(id ?? '—')
}

/* ---------------- Catalogue ---------------- */

export function CatalogueActions({ products, run }: { products: Row[]; run: RunAction }) {
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'bottle' | 'sample' | 'other'>('bottle')
  const [volume, setVolume] = useState('50')
  const [description, setDescription] = useState('')

  const [priceProduct, setPriceProduct] = useState('')
  const [channel, setChannel] = useState<'retail' | 'trade'>('retail')
  const [amount, setAmount] = useState('')
  const [activate, setActivate] = useState(true)
  const [priceError, setPriceError] = useState('')

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const ok = await run(
      () => api.createProduct({ sku, name, kind, volume_ml: volume ? Number(volume) : null, description }),
      `Product ${sku.toUpperCase()} created (not for sale until approved)`,
    )
    if (ok) {
      setSku('')
      setName('')
      setDescription('')
    }
  }

  async function onPrice(e: FormEvent) {
    e.preventDefault()
    const kobo = nairaToKobo(amount)
    if (kobo == null) {
      setPriceError('Enter an amount in naira, e.g. 6500 or 6,500.00')
      return
    }
    setPriceError('')
    const ok = await run(
      () => api.createPrice({ product_id: priceProduct, channel, amount_kobo: kobo, label: '', activate }),
      `${channel} price ${formatNgn(kobo)} ${activate ? 'activated' : 'saved as draft'}`,
    )
    if (ok) setAmount('')
  }

  const pricable = products.filter((p) => p.kind !== 'sample')

  return (
    <div className="admin-actions">
      <Panel title="Add product" testId="panel-add-product">
        <form className="admin-form" onSubmit={onCreate}>
          <Field label="SKU" id="p-sku">
            <input id="p-sku" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="OMEGA-50ML" />
          </Field>
          <Field label="Name" id="p-name">
            <input id="p-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Kind" id="p-kind">
            <select id="p-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="bottle">bottle</option>
              <option value="sample">sample (never saleable)</option>
              <option value="other">other</option>
            </select>
          </Field>
          <Field label="Volume (ml)" id="p-vol">
            <input id="p-vol" type="number" min={1} value={volume} onChange={(e) => setVolume(e.target.value)} />
          </Field>
          <Field label="Description" id="p-desc">
            <input id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <button type="submit" className="btn btn-primary" data-testid="btn-create-product">
            Add product
          </button>
        </form>
      </Panel>

      <Panel title="Set price" testId="panel-set-price">
        <form className="admin-form" onSubmit={onPrice}>
          <Field label="Product" id="pr-product">
            <select id="pr-product" required value={priceProduct} onChange={(e) => setPriceProduct(e.target.value)}>
              <option value="">Choose…</option>
              {pricable.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.sku)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel" id="pr-channel">
            <select id="pr-channel" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
              <option value="retail">retail</option>
              <option value="trade">trade (distributors)</option>
            </select>
          </Field>
          <Field label="Amount (₦)" id="pr-amount">
            <input id="pr-amount" required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="6500" />
          </Field>
          <label className="check">
            <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} /> Activate now (replaces the current
            active price)
          </label>
          {priceError ? <p className="field-error">{priceError}</p> : null}
          <button type="submit" className="btn btn-primary" data-testid="btn-set-price">
            Save price
          </button>
        </form>
      </Panel>
    </div>
  )
}

export function ProductSaleControls({ product, run }: { product: Row; run: RunAction }) {
  if (product.kind === 'sample') return <span className="meta">Sample — never saleable</span>
  const ce = (product.channel_eligibility as { retail: boolean; trade: boolean } | undefined) ?? { retail: false, trade: false }
  const live = Boolean(product.saleable && product.approved_for_sale)
  return <SaleControlsInner product={product} run={run} ce={ce} live={live} key={`${ce.retail}-${ce.trade}`} />
}

function SaleControlsInner({ product, run, ce, live }: { product: Row; run: RunAction; ce: { retail: boolean; trade: boolean }; live: boolean }) {
  const [channels, setChannels] = useState(ce)
  return (
    <div className="row-actions row-actions-stacked">
      <button
        type="button"
        className="btn btn-secondary"
        data-testid={`btn-approve-${String(product.sku)}`}
        onClick={() =>
          run(
            () =>
              api.updateProduct(String(product.id), live ? { saleable: false, approved_for_sale: false } : { saleable: true, approved_for_sale: true }),
            live ? `${String(product.sku)} withdrawn from sale` : `${String(product.sku)} approved for sale`,
          )
        }
      >
        {live ? 'Withdraw' : 'Approve for sale'}
      </button>
      {(['retail', 'trade'] as const).map((ch) => (
        <label key={ch} className="check">
          <input
            type="checkbox"
            checked={channels[ch]}
            onChange={async (e) => {
              const previous = channels
              const next = { ...channels, [ch]: e.target.checked }
              setChannels(next) // optimistic; revert if the save fails
              const saved = await run(
                () => api.updateProduct(String(product.id), { channel_eligibility: next }),
                `${String(product.sku)} ${ch} ${e.target.checked ? 'enabled' : 'disabled'}`,
              )
              if (!saved) setChannels(previous)
            }}
          />{' '}
          {ch}
        </label>
      ))}
    </div>
  )
}

/* ---------------- Stock ---------------- */

export function StockPanel({ products, batches, run }: { products: Row[]; batches: Row[]; run: RunAction }) {
  const [product, setProduct] = useState('')
  const [code, setCode] = useState('')
  const [qty, setQty] = useState('')
  const [batch, setBatch] = useState('')
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    const ok = await run(
      () => api.createBatch({ product_id: product, batch_code: code, qty_on_hand: Number(qty), notes: '' }),
      `Batch ${code} added (${qty} units)`,
    )
    if (ok) {
      setCode('')
      setQty('')
    }
  }

  async function onAdjust(e: FormEvent) {
    e.preventDefault()
    const ok = await run(
      () => api.adjustStock({ batch_id: batch, delta_on_hand: Number(delta), reason }),
      `Stock adjusted by ${delta}`,
    )
    if (ok) {
      setDelta('')
      setReason('')
    }
  }

  return (
    <section aria-label="Stock">
      <div className="admin-actions">
        <Panel title="Add stock batch" testId="panel-add-batch">
          <form className="admin-form" onSubmit={onAdd}>
            <Field label="Product" id="b-product">
              <select id="b-product" required value={product} onChange={(e) => setProduct(e.target.value)}>
                <option value="">Choose…</option>
                {products.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {String(p.sku)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Batch code" id="b-code">
              <input id="b-code" required value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            <Field label="Quantity on hand" id="b-qty">
              <input id="b-qty" required type="number" min={0} step={1} value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <button type="submit" className="btn btn-primary" data-testid="btn-add-batch">
              Add batch
            </button>
          </form>
        </Panel>
        <Panel title="Adjust stock" testId="panel-adjust-stock">
          <form className="admin-form" onSubmit={onAdjust}>
            <Field label="Batch" id="a-batch">
              <select id="a-batch" required value={batch} onChange={(e) => setBatch(e.target.value)}>
                <option value="">Choose…</option>
                {batches.map((b) => (
                  <option key={String(b.id)} value={String(b.id)}>
                    {String(b.batch_code)} · {productLabel(products, b.product_id)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Change (+/− units)" id="a-delta">
              <input id="a-delta" required type="number" step={1} value={delta} onChange={(e) => setDelta(e.target.value)} />
            </Field>
            <Field label="Reason" id="a-reason">
              <input id="a-reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Recount, damage, restock…" />
            </Field>
            <button type="submit" className="btn btn-primary" data-testid="btn-adjust-stock">
              Adjust
            </button>
          </form>
        </Panel>
      </div>
      {batches.length === 0 ? (
        <p className="meta">No stock batches yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table stack-mobile" data-testid="table-stock">
            <thead>
              <tr>
                <th scope="col">Batch</th>
                <th scope="col">Product</th>
                <th scope="col">On hand</th>
                <th scope="col">Reserved</th>
                <th scope="col">Available</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={String(b.id)}>
                  <td data-label="Batch" className="mono">{String(b.batch_code)}</td>
                  <td data-label="Product" className="mono">{productLabel(products, b.product_id)}</td>
                  <td data-label="On hand">{String(b.qty_on_hand)}</td>
                  <td data-label="Reserved">{String(b.qty_reserved)}</td>
                  <td data-label="Available">{Number(b.qty_on_hand) - Number(b.qty_reserved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ---------------- Orders ---------------- */

export function OrdersPanel({ orders, distributors, run }: { orders: Row[]; distributors: Row[]; run: RunAction }) {
  if (orders.length === 0) return <p className="meta">No orders yet.</p>
  const distCode = (id: unknown) => (id ? String(distributors.find((d) => d.id === id)?.code ?? id) : 'retail customer')
  return (
    <section aria-label="Orders">
      <div className="table-wrap">
        <table className="data-table stack-mobile" data-testid="table-orders">
          <thead>
            <tr>
              <th scope="col">Ref</th>
              <th scope="col">Channel</th>
              <th scope="col">Buyer</th>
              <th scope="col">Total</th>
              <th scope="col">Payment</th>
              <th scope="col">Fulfilment</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const id = String(o.id)
              const ref = id.slice(0, 8)
              const closed = o.fulfillment_status === 'delivered' || o.fulfillment_status === 'cancelled'
              return (
                <tr key={id} data-testid={`order-${ref}`}>
                  <td data-label="Ref" className="mono">{ref}</td>
                  <td data-label="Channel">{String(o.channel)}</td>
                  <td data-label="Buyer">{distCode(o.distributor_id)}</td>
                  <td data-label="Total" className="mono">{formatNgn(Number(o.total_kobo))}</td>
                  <td data-label="Payment">{String(o.payment_status)}</td>
                  <td data-label="Fulfilment">{String(o.fulfillment_status)}</td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      {o.payment_status !== 'paid' && o.payment_status !== 'refunded' && o.fulfillment_status !== 'cancelled' ? (
                        <button type="button" className="btn btn-secondary" onClick={() => run(() => api.setPayment(id, { payment_status: 'paid', note: 'Recorded in admin' }), `Order ${ref} marked paid`)}>
                          Record payment
                        </button>
                      ) : null}
                      {o.payment_status === 'paid' ? (
                        <button type="button" className="btn btn-secondary" onClick={() => run(() => api.setPayment(id, { payment_status: 'refunded', note: 'Refund recorded in admin' }), `Order ${ref} refund recorded`)}>
                          Record refund
                        </button>
                      ) : null}
                      {!closed && o.fulfillment_status !== 'shipped' ? (
                        <button type="button" className="btn btn-secondary" onClick={() => run(() => api.setFulfillment(id, { fulfillment_status: 'shipped' }), `Order ${ref} shipped`)}>
                          Ship
                        </button>
                      ) : null}
                      {o.fulfillment_status === 'shipped' ? (
                        <button type="button" className="btn btn-secondary" onClick={() => run(() => api.setFulfillment(id, { fulfillment_status: 'delivered' }), `Order ${ref} delivered`)}>
                          Mark delivered
                        </button>
                      ) : null}
                      {!closed ? (
                        <button
                          type="button"
                          className="btn btn-quiet"
                          onClick={() => {
                            if (window.confirm(`Cancel order ${ref}? Reserved stock is released.`)) {
                              void run(() => api.setFulfillment(id, { fulfillment_status: 'cancelled' }), `Order ${ref} cancelled`)
                            }
                          }}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ---------------- Distributors ---------------- */

export function DistributorsPanel({ distributors, run }: { distributors: Row[]; run: RunAction }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [sponsor, setSponsor] = useState('')
  const [notes, setNotes] = useState('')
  const [loginFor, setLoginFor] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const ok = await run(
      () => api.createDistributor({ name, code, sponsor_id: sponsor || null, notes }),
      `Distributor ${code.toUpperCase()} added (pending terms)`,
    )
    if (ok) {
      setName('')
      setCode('')
      setSponsor('')
      setNotes('')
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault()
    const ok = await run(
      () => api.createUser({ email, password, role: 'distributor', distributor_id: loginFor }),
      `Login created for ${email}. Share the password out-of-band.`,
    )
    if (ok) {
      setEmail('')
      setPassword('')
    }
  }

  const sponsorCode = (id: unknown) => (id ? String(distributors.find((d) => d.id === id)?.code ?? '—') : '—')

  return (
    <section aria-label="Distributors">
      <div className="admin-actions">
        <Panel title="Add distributor" testId="panel-add-distributor">
          <form className="admin-form" onSubmit={onCreate}>
            <Field label="Name" id="d-name">
              <input id="d-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Code" id="d-code">
              <input id="d-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAGOS-01" />
            </Field>
            <Field label="Sponsor (optional)" id="d-sponsor">
              <select id="d-sponsor" value={sponsor} onChange={(e) => setSponsor(e.target.value)}>
                <option value="">None</option>
                {distributors.map((d) => (
                  <option key={String(d.id)} value={String(d.id)}>
                    {String(d.code)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes" id="d-notes">
              <input id="d-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <button type="submit" className="btn btn-primary" data-testid="btn-create-distributor">
              Add distributor
            </button>
          </form>
        </Panel>
        <Panel title="Create distributor login" testId="panel-create-login">
          <form className="admin-form" onSubmit={onLogin}>
            <Field label="Distributor" id="u-dist">
              <select id="u-dist" required value={loginFor} onChange={(e) => setLoginFor(e.target.value)}>
                <option value="">Choose…</option>
                {distributors.map((d) => (
                  <option key={String(d.id)} value={String(d.id)}>
                    {String(d.code)} · {String(d.name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Email" id="u-email">
              <input id="u-email" required type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password (min 10 characters)" id="u-pw">
              <input id="u-pw" required type="password" minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <button type="submit" className="btn btn-primary" data-testid="btn-create-login">
              Create login
            </button>
          </form>
        </Panel>
      </div>
      <div className="table-wrap">
        <table className="data-table stack-mobile" data-testid="table-distributors">
          <thead>
            <tr>
              <th scope="col">Code</th>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col">Sponsor</th>
              <th scope="col">Change status</th>
            </tr>
          </thead>
          <tbody>
            {distributors.map((d) => (
              <tr key={String(d.id)}>
                <td data-label="Code" className="mono">{String(d.code)}</td>
                <td data-label="Name">{String(d.name)}</td>
                <td data-label="Status">{String(d.status)}</td>
                <td data-label="Sponsor" className="mono">{sponsorCode(d.sponsor_id)}</td>
                <td data-label="Change status">
                  <select
                    aria-label={`Status for ${String(d.code)}`}
                    value={String(d.status)}
                    onChange={(e) =>
                      run(
                        () => api.updateDistributor(String(d.id), { status: e.target.value as 'pending_terms' | 'active' | 'suspended' }),
                        `${String(d.code)} set to ${e.target.value}`,
                      )
                    }
                  >
                    <option value="pending_terms">pending_terms</option>
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ---------------- Terms ---------------- */

export function TermsPanel({ terms, distributors, run }: { terms: Row[]; distributors: Row[]; run: RunAction }) {
  const [kind, setKind] = useState<'wholesale_margin' | 'commission'>('commission')
  const [dist, setDist] = useState('')
  const [rate, setRate] = useState('')
  const [notes, setNotes] = useState('')
  const [activate, setActivate] = useState(false)
  const [rateError, setRateError] = useState('')

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    let rate_bps: number | null = null
    if (rate.trim()) {
      const pct = Number(rate)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        setRateError('Rate must be a percentage between 0 and 100')
        return
      }
      rate_bps = Math.round(pct * 100)
    }
    setRateError('')
    const ok = await run(
      () => api.createTerm({ kind, distributor_id: dist || null, rate_bps, notes, activate }),
      `${kind} term ${activate ? 'activated' : 'saved as draft'}`,
    )
    if (ok) {
      setRate('')
      setNotes('')
    }
  }

  const distCode = (id: unknown) => (id ? String(distributors.find((d) => d.id === id)?.code ?? id) : 'All distributors')

  return (
    <section aria-label="Terms">
      <div className="admin-actions">
        <Panel title="Record commercial terms" testId="panel-add-term">
          <form className="admin-form" onSubmit={onCreate}>
            <Field label="Kind" id="t-kind">
              <select id="t-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                <option value="commission">commission</option>
                <option value="wholesale_margin">wholesale margin</option>
              </select>
            </Field>
            <Field label="Distributor" id="t-dist">
              <select id="t-dist" value={dist} onChange={(e) => setDist(e.target.value)}>
                <option value="">All distributors</option>
                {distributors.map((d) => (
                  <option key={String(d.id)} value={String(d.id)}>
                    {String(d.code)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rate (%)" id="t-rate">
              <input id="t-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Required to activate commission" />
            </Field>
            <Field label="Notes" id="t-notes">
              <input id="t-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <label className="check">
              <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} /> Activate now
            </label>
            {rateError ? <p className="field-error">{rateError}</p> : null}
            <button type="submit" className="btn btn-primary" data-testid="btn-create-term">
              Save terms
            </button>
          </form>
        </Panel>
      </div>
      {terms.length === 0 ? (
        <p className="meta">No terms recorded. Nothing is invented: terms appear only when recorded here.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table stack-mobile" data-testid="table-terms">
            <thead>
              <tr>
                <th scope="col">Kind</th>
                <th scope="col">Distributor</th>
                <th scope="col">Rate</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr key={String(t.id)}>
                  <td data-label="Kind">{String(t.kind)}</td>
                  <td data-label="Distributor" className="mono">{distCode(t.distributor_id)}</td>
                  <td data-label="Rate" className="mono">{t.rate_bps == null ? '—' : `${(Number(t.rate_bps) / 100).toFixed(2)}%`}</td>
                  <td data-label="Status">{String(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
