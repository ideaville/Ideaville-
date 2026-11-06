import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusLine } from '../components/StatusLine'
import { api, formatNgn, type AuthUser } from '../lib/api'
import { copy } from '../lib/copy'
import './Admin.css'

type DistOrder = {
  id: string
  channel: string
  status: string
  payment_status: string
  fulfillment_status: string
  total_kobo: number
  created_at?: string
}

type Tab = 'orders' | 'stock'

export function Distributor() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [orders, setOrders] = useState<DistOrder[]>([])
  const [error, setError] = useState('')
  const [dbOff, setDbOff] = useState(false)
  const [tab, setTab] = useState<Tab>('orders')

  useEffect(() => {
    ;(async () => {
      try {
        const me = await api.me()
        if (me.user.role !== 'distributor') {
          navigate('/login')
          return
        }
        setUser(me.user)
        const res = await fetch('/api/distributor/orders', { credentials: 'include' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load orders')
        setOrders(data.orders ?? [])
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error'
        setError(msg)
        if (msg.toLowerCase().includes('not configured') || msg.toLowerCase().includes('unconfigured')) {
          setDbOff(true)
        }
      }
    })()
  }, [navigate])

  if (!user) {
    return (
      <main className="section">
        <div className="shell">
          {dbOff ? (
            <p role="status">{copy.databaseOff}</p>
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

  return (
    <main className="section admin-page">
      <div className="shell">
        <header className="page-head">
          <h1>{copy.orders}</h1>
          <p className="meta">{user.email}</p>
        </header>

        <div className="tabs" role="tablist" aria-label="Distributor sections">
          <button type="button" role="tab" className="tab" data-testid="tab-orders" aria-selected={tab === 'orders'} onClick={() => setTab('orders')}>
            {copy.orders}
          </button>
          <button type="button" role="tab" className="tab" data-testid="tab-stock" aria-selected={tab === 'stock'} onClick={() => setTab('stock')}>
            {copy.stock}
          </button>
        </div>

        {error ? <StatusLine tone="error">{error}</StatusLine> : null}

        {tab === 'orders' ? (
          dbOff ? (
            <p role="status">{copy.databaseOff}</p>
          ) : orders.length === 0 ? (
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
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td data-label="Ref" className="mono">
                        {order.id.slice(0, 8)}
                      </td>
                      <td data-label="Date" className="mono">
                        {order.created_at ? order.created_at.slice(0, 10) : '—'}
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
          <p className="meta" role="status">
            Stock on hand is read-only for distributors and appears when inventory is assigned.
          </p>
        )}

        <button type="button" className="btn btn-quiet" data-testid="btn-sign-out" onClick={() => api.logout().then(() => navigate('/login'))}>
          {copy.signOut}
        </button>
      </div>
    </main>
  )
}
