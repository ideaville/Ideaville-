import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type AuthUser } from '../lib/api'
import './Admin.css'

export function Distributor() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [orders, setOrders] = useState<unknown[]>([])
  const [error, setError] = useState('')

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
        setError(err instanceof Error ? err.message : 'Error')
      }
    })()
  }, [navigate])

  if (!user) {
    return (
      <main className="section">
        <div className="shell">
          <p>{error || 'Loading distributor portal…'}</p>
          <Link to="/login">Login</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="section admin-page">
      <div className="shell">
        <div className="section-head">
          <p className="eyebrow">Distributor · {user.email}</p>
          <h2>Your orders</h2>
          <p className="lede">
            Tenant-scoped to your distributor account only. You cannot mark payments paid or grant trade
            access. Trade ordering requires an active distributor status and admin-approved commerce
            settings.
          </p>
        </div>
        {error ? <p className="shop-error">{error}</p> : null}
        <section className="admin-panel">
          <h3>Orders ({orders.length})</h3>
          <pre className="admin-pre">{JSON.stringify(orders, null, 2)}</pre>
        </section>
        <button type="button" className="btn btn-ghost" onClick={() => api.logout().then(() => navigate('/login'))}>
          Sign out
        </button>
      </div>
    </main>
  )
}
