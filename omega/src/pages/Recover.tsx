import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { copy } from '../lib/copy'
import './Login.css'

/**
 * Owner one-use recovery form (iPhone-friendly). Password and authorization stay in the form;
 * never placed in URLs. Success does not sign in — use /login next.
 */
export function Recover() {
  const [authorization, setAuthorization] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.ownerRecovery({ authorization, password, password_confirm: passwordConfirm })
      setDone(true)
      setAuthorization('')
      setPassword('')
      setPasswordConfirm('')
    } catch {
      setError(copy.recoveryFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="section login-page">
      <div className="shell login-shell">
        <h1>{copy.recoveryTitle}</h1>
        <p className="meta">{copy.recoveryHelp}</p>
        {done ? (
          <p role="status" data-testid="recovery-success">
            {copy.recoverySuccess}{' '}
            <Link to="/login">{copy.signIn}</Link>
          </p>
        ) : (
          <form className="login-form" onSubmit={onSubmit} name="omega-owner-recovery" data-testid="form-recovery">
            <div className="field">
              <label htmlFor="recovery-authorization">{copy.recoveryAuthorization}</label>
              <input
                id="recovery-authorization"
                name="authorization"
                type="password"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={authorization}
                onChange={(e) => setAuthorization(e.target.value)}
                required
                disabled={busy}
              />
            </div>
            <div className="field">
              <label htmlFor="recovery-password">{copy.recoveryNewPassword}</label>
              <input
                id="recovery-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                maxLength={128}
                disabled={busy}
              />
            </div>
            <div className="field">
              <label htmlFor="recovery-password-confirm">{copy.recoveryConfirmPassword}</label>
              <input
                id="recovery-password-confirm"
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={10}
                maxLength={128}
                disabled={busy}
              />
            </div>
            {error ? (
              <p className="field-error" role="alert" id="recovery-error">
                {error}
              </p>
            ) : null}
            <button type="submit" className="btn btn-primary" data-testid="btn-recovery-submit" disabled={busy}>
              {copy.recoverySubmit}
            </button>
          </form>
        )}
        <p className="meta login-back">
          <Link to="/login">{copy.signIn}</Link>
        </p>
      </div>
    </main>
  )
}
