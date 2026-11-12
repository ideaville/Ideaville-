import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatNgn } from '../lib/api'
import { copy } from '../lib/copy'
import { useDemo } from './useDemo'
import '../pages/Admin.css'

type Tab = 'orders' | 'stock'

/** Fixture-backed distributor orders / stock shell — no session, no live stock writes. */
export function DemoDistributor() {
  const demo = useDemo()
  const [tab, setTab] = useState<Tab>('orders')
  const batches = (demo.admin.batches as Array<Record<string, unknown>>) ?? []

  return (
    <main className="section admin-page" data-testid="demo-distributor">
      <div className="shell">
        <header className="page-head">
          <h1>{copy.orders}</h1>
          <p className="meta">{demo.distributorUser.email} · demo fixture</p>
        </header>

        <p className="meta">
          <Link to="/demo/network" data-testid="link-network">
            {copy.network}
          </Link>
        </p>

        <div className="tabs" role="tablist" aria-label="Distributor sections">
          <button type="button" role="tab" className="tab" data-testid="tab-orders" aria-selected={tab === 'orders'} onClick={() => setTab('orders')}>
            {copy.orders}
          </button>
          <button type="button" role="tab" className="tab" data-testid="tab-stock" aria-selected={tab === 'stock'} onClick={() => setTab('stock')}>
            {copy.stock}
          </button>
        </div>

        {tab === 'orders' ? (
          demo.orders.length === 0 ? (
            <p role="status" data-testid="empty-orders">
              {copy.noOrders}
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table stack-mobile" data-testid="table-orders">
                <thead>
                  <tr>
                    <th scope="col">Ref</th>
                    <th scope="col">Date</th>
                    <th scope="col">Status</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {demo.orders.map((order) => (
                    <tr key={order.id}>
                      <td data-label="Ref" className="mono">
                        {order.id.slice(0, 8)}
                      </td>
                      <td data-label="Date" className="mono">
                        {order.created_at.slice(0, 10)}
                      </td>
                      <td data-label="Status">{order.status}</td>
                      <td data-label="Payment">{order.payment_status}</td>
                      <td data-label="Total" className="mono">
                        {formatNgn(order.total_kobo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="table-wrap">
            <table className="data-table stack-mobile" data-testid="table-demo-stock">
              <thead>
                <tr>
                  <th scope="col">Batch</th>
                  <th scope="col">On hand</th>
                  <th scope="col">Reserved</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={String(b.id)}>
                    <td data-label="Batch" className="mono">
                      {String(b.batch_code)}
                    </td>
                    <td data-label="On hand" className="mono">
                      {String(b.qty_on_hand)}
                    </td>
                    <td data-label="Reserved" className="mono">
                      {String(b.qty_reserved)}
                    </td>
                    <td data-label="Notes">{String(b.notes ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="meta" role="status">
              Demo stock is read-only here. Adjustments happen only under Demo Admin (session memory).
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
