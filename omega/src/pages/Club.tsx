import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useClub } from '../hooks/useClub'
import './Club.css'

export function Club() {
  const { member, join } = useClub()
  const [name, setName] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    join(name)
  }

  return (
    <main className="section club-page">
      <div className="shell">
        <div className="section-head">
          <p className="eyebrow">Executive Club</p>
          <h2>The referral layer, without the noise.</h2>
          <p className="lede">
            Share OMEGA with drivers you trust. Earn on verified orders. Climb when your network
            compounds — not when you shout louder.
          </p>
        </div>

        <div className="club-layout">
          <ol className="club-steps">
            <li>
              <strong>Claim your code</strong>
              <span>Join as an Advocate and receive a personal OMG link.</span>
            </li>
            <li>
              <strong>Refer with intent</strong>
              <span>Share product education, not pressure. Quality referrals stick.</span>
            </li>
            <li>
              <strong>Earn &amp; ascend</strong>
              <span>Commissions unlock residuals as you hit Partner and Executive volume.</span>
            </li>
          </ol>

          <div className="club-panel">
            {member ? (
              <div className="club-joined">
                <p className="eyebrow">Welcome back</p>
                <h3>{member.name}</h3>
                <p className="club-code">{member.code}</p>
                <p className="club-meta">
                  Rank <span>{member.rank}</span> · {member.referrals} referrals · £
                  {member.earnings.toFixed(2)} earned
                </p>
                <div className="club-actions">
                  <Link to="/dashboard" className="btn btn-gold">
                    Open dashboard
                  </Link>
                  <Link to="/wealth" className="btn btn-ghost">
                    Rank ladder
                  </Link>
                </div>
              </div>
            ) : (
              <form className="club-form" onSubmit={onSubmit}>
                <p className="eyebrow">Activate membership</p>
                <h3>Join the Executive Club</h3>
                <label htmlFor="member-name">Preferred name</label>
                <input
                  id="member-name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Rivera"
                  autoComplete="name"
                  required
                />
                <button type="submit" className="btn btn-gold">
                  Generate referral code
                </button>
                <p className="form-note">Local demo membership stored in this browser only.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
