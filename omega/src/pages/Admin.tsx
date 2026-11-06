import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type AdminOverview, type AuthUser } from '../lib/api'
import './Admin.css'

export function Admin() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const me = await api.me()
    if (me.user.role !== 'admin') {
      navigate('/login')
      return
    }
    setUser(me.user)
    setData(await api.adminOverview())
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message))
  }, [])

  async function toggle(key: string, value: boolean) {
    setMessage('')
    try {
      await api.patchSettings({ [key]: value })
      setMessage(`Updated ${key}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  if (!user || !data) {
    return (
      <main className="section">
        <div className="shell">
          <p>{error || 'Loading admin…'}</p>
          <Link to="/login">Login</Link>
        </div>
      </main>
    )
  }

  const settings = data.settings as Record<string, boolean | string>

  return (
    <main className="section admin-page">
      <div className="shell">
        <div className="section-head">
          <p className="eyebrow">Admin · {user.email}</p>
          <h2>Operations console</h2>
          <p className="lede">
            Manage distributors, SKUs, stock, and activation flags. Payment verification is admin-only.
            Commercial activation remains off until you deliberately enable it. No automatic commissions.
          </p>
        </div>

        {error ? <p className="shop-error">{error}</p> : null}
        {message ? <p className="admin-ok">{message}</p> : null}

        <section className="admin-panel">
          <h3>Fail-closed switches</h3>
          <ul className="admin-toggles">
            {(
              [
                'commercial_activation',
                'checkout_enabled',
                'payment_provider_configured',
                'delivery_policy_configured',
              ] as const
            ).map((key) => (
              <li key={key}>
                <span>{key}</span>
                <strong>{String(settings[key])}</strong>
                <button type="button" className="btn btn-ghost" onClick={() => toggle(key, !settings[key])}>
                  Toggle
                </button>
              </li>
            ))}
          </ul>
          <p className="form-note">
            Do not enable payment_provider_configured until a real provider is connected. No bank details are
            stored in this app.
          </p>
        </section>

        <section className="admin-panel">
          <h3>Distributors ({data.distributors.length})</h3>
          <pre className="admin-pre">{JSON.stringify(data.distributors, null, 2)}</pre>
        </section>

        <section className="admin-panel">
          <h3>Products ({data.products.length})</h3>
          <pre className="admin-pre">{JSON.stringify(data.products, null, 2)}</pre>
        </section>

        <section className="admin-panel">
          <h3>Stock batches ({data.batches.length})</h3>
          <pre className="admin-pre">{JSON.stringify(data.batches, null, 2)}</pre>
        </section>

        <section className="admin-panel">
          <h3>Orders ({data.orders.length})</h3>
          <pre className="admin-pre">{JSON.stringify(data.orders, null, 2)}</pre>
        </section>

        <section className="admin-panel">
          <h3>Commercial terms ({data.terms.length})</h3>
          <p className="form-note">Wholesale margin and commission are separate. No default 15% / equity / residual.</p>
          <pre className="admin-pre">{JSON.stringify(data.terms, null, 2)}</pre>
        </section>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => api.logout().then(() => navigate('/login'))}
        >
          Sign out
        </button>
      </div>
    </main>
  )
}
