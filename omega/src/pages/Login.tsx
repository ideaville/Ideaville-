import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import './Login.css'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const { user } = await api.login(email, password)
      navigate(user.role === 'admin' ? '/admin' : '/distributor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <main className="section login-page">
      <div className="shell login-shell">
        <p className="eyebrow">App authentication</p>
        <h2>Staff / distributor login</h2>
        <p className="lede">
          Vercel SSO protects the preview host; it is not an OMEGA role. Distributor and admin roles use
          this server-side session. No public signup.
        </p>
        <form className="login-form" onSubmit={onSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-gold">
            Sign in
          </button>
        </form>
        <p className="form-note">
          Bootstrap admin only via server env <code>OMEGA_BOOTSTRAP_ADMIN_EMAIL</code> /{' '}
          <code>OMEGA_BOOTSTRAP_ADMIN_PASSWORD</code> when persistence is configured. <Link to="/shop">Back to shop</Link>
        </p>
      </div>
    </main>
  )
}
