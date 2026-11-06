import { Link } from 'react-router-dom'
import { ranks, sampleLedger } from '../data/network'
import { useClub } from '../hooks/useClub'
import './Dashboard.css'

export function Dashboard() {
  const { member, addReferral, reset } = useClub()
  const rankMeta = ranks.find((rank) => rank.id === (member?.rank ?? 'member'))

  if (!member) {
    return (
      <main className="section dashboard-page">
        <div className="shell empty-dash">
          <p className="eyebrow">Member dashboard</p>
          <h2>No active Club session.</h2>
          <p className="lede">Join the Executive Club to generate a referral code and simulate earnings.</p>
          <Link to="/club" className="btn btn-gold">
            Join now
          </Link>
        </div>
      </main>
    )
  }

  const shareUrl = `https://omega.performance/r/${member.code}`

  return (
    <main className="section dashboard-page">
      <div className="shell">
        <div className="dash-head">
          <div>
            <p className="eyebrow">Performance Network</p>
            <h2>{member.name}</h2>
            <p className="dash-rank">
              {rankMeta?.name} · {rankMeta?.headline}
            </p>
          </div>
          <div className="dash-actions">
            <button type="button" className="btn btn-volt" onClick={() => addReferral()}>
              Simulate referral sale
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Reset demo
            </button>
          </div>
        </div>

        <div className="stat-strip">
          <div>
            <p>Referral code</p>
            <strong>{member.code}</strong>
          </div>
          <div>
            <p>Referrals</p>
            <strong>{member.referrals}</strong>
          </div>
          <div>
            <p>Team volume</p>
            <strong>£{member.volume.toFixed(0)}</strong>
          </div>
          <div>
            <p>Earnings</p>
            <strong>£{member.earnings.toFixed(2)}</strong>
          </div>
        </div>

        <div className="dash-grid">
          <section className="dash-panel">
            <h3>Share link</h3>
            <p className="share-url">{shareUrl}</p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
            >
              Copy link
            </button>
          </section>

          <section className="dash-panel">
            <h3>Next rank signal</h3>
            {member.rank === 'executive' ? (
              <p>You are at the top of the demo ladder. Focus on residual quality.</p>
            ) : (
              <p>
                Keep verifying referrals and monthly volume. Partner unlocks at £2,500 team volume;
                Executive at £10,000.
              </p>
            )}
            <ul>
              {(rankMeta?.perks ?? []).map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="ledger">
          <h3>Sample ledger</h3>
          <p className="lede ledger-note">Illustrative history — separate from your live demo counters.</p>
          <div className="ledger-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Member</th>
                  <th scope="col">Event</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleLedger.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.who}</td>
                    <td>{row.event}</td>
                    <td>£{row.amount.toFixed(2)}</td>
                    <td>
                      <span className={row.status === 'Paid' ? 'pill paid' : 'pill pending'}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
