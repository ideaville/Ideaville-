import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusLine } from '../components/StatusLine'
import { api } from '../lib/api'
import { copy } from '../lib/copy'
import { useAppStatus } from '../hooks/useAppStatus'
import './Login.css'

export function Login() {
  const navigate = useNavigate()
  const status = useAppStatus()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const { user } = await api.login(email, password)
      navigate(user.role === 'admin' ? '/admin' : '/distributor')
    } catch {
      setError(copy.signInError)
    }
  }

  const disabled = !status.canSignIn

  return (
    <main className="section login-page">
      <div className="shell login-shell">
        <h1>{copy.signIn}</h1>
        <form className="login-form" onSubmit={onSubmit} name="omega-login" data-testid="form-login">
          <div className="field" data-testid="field-email">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={disabled}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          <div className="field" data-testid="field-password">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={disabled}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          {error ? (
            <p className="field-error" id="login-error" role="alert">
              {error}
            </p>
          ) : null}
          {disabled ? <StatusLine tone="warn">{copy.signInUnavailable}</StatusLine> : null}
          <button type="submit" className="btn btn-primary" name="sign-in" data-testid="btn-sign-in" disabled={disabled}>
            {copy.signIn}
          </button>
        </form>
        <p className="meta login-back">
          <Link to="/shop">{copy.shop}</Link>
        </p>
      </div>
    </main>
  )
}
