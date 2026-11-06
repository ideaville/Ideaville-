import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MAX_DISPLAY_NAME } from '../hooks/clubLogic'
import { useClub } from '../hooks/useClub'
import './Club.css'

export function Club() {
  const { member, join } = useClub()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const result = join(name)
    if (!result) {
      setError('Enter a short demo display name (letters/numbers only, no email or phone).')
      return
    }
    setError('')
  }

  return (
    <main className="section club-page">
      <div className="shell">
        <div className="section-head">
          <p className="eyebrow">Executive Club · Demo only</p>
          <h2>Non-transactional referral concept.</h2>
          <p className="lede">
            This screen explores UX for a future club. It does not create accounts, collect identity
            documents, take payments, or pay commissions. Anything stored stays in this browser’s
            localStorage and is not production authentication.
          </p>
        </div>

        <div className="club-layout">
          <ol className="club-steps">
            <li>
              <strong>Start a local demo</strong>
              <span>Pick a display name for this browser session only — not a signup.</span>
            </li>
            <li>
              <strong>Simulate referrals</strong>
              <span>Dashboard buttons invent demo activity. No money moves.</span>
            </li>
            <li>
              <strong>Commercial terms later</strong>
              <span>Rates, residuals, and equity ideas remain unapproved and hidden from sales copy.</span>
            </li>
          </ol>

          <div className="club-panel">
            {member ? (
              <div className="club-joined">
                <p className="eyebrow">Local demo session</p>
                <h3>{member.name}</h3>
                <p className="club-code">{member.code}</p>
                <p className="club-meta">
                  Demo rank <span>{member.rank}</span> · {member.referrals} simulated referrals ·{' '}
                  {member.demoPoints} demo points (not currency)
                </p>
                <div className="club-actions">
                  <Link to="/dashboard" className="btn btn-gold">
                    Open demo dashboard
                  </Link>
                  <Link to="/wealth" className="btn btn-ghost">
                    Network concept
                  </Link>
                </div>
              </div>
            ) : (
              <form className="club-form" onSubmit={onSubmit} noValidate>
                <p className="eyebrow">Browser-local demo</p>
                <h3>Start club simulation</h3>
                <label htmlFor="member-name">Demo display name</label>
                <input
                  id="member-name"
                  name="demoDisplayName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Demo Driver"
                  autoComplete="off"
                  maxLength={MAX_DISPLAY_NAME}
                  required
                  aria-describedby="name-help"
                />
                <p id="name-help" className="form-note">
                  Max {MAX_DISPLAY_NAME} characters. Do not enter email, phone, or other personal data —
                  this is not a secure account system.
                </p>
                {error ? (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <button type="submit" className="btn btn-gold">
                  Create local demo code
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
