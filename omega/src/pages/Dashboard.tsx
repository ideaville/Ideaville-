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
          <p className="eyebrow">Demo dashboard</p>
          <h2>No local demo session.</h2>
          <p className="lede">
            Start a browser-local club simulation. This is not an account, wallet, or payment surface.
          </p>
          <Link to="/club" className="btn btn-gold">
            Start club demo
          </Link>
        </div>
      </main>
    )
  }

  const shareUrl = `demo://omega-local/${member.code}`

  return (
    <main className="section dashboard-page">
      <div className="shell">
        <div className="dash-head">
          <div>
            <p className="eyebrow">Non-transactional simulation</p>
            <h2>{member.name}</h2>
            <p className="dash-rank">
              {rankMeta?.name} · {rankMeta?.headline}
            </p>
            <p className="dash-disclaimer">
              Counters are fictional demo units. They are not money, commissions, or investable equity.
            </p>
          </div>
          <div className="dash-actions">
            <button type="button" className="btn btn-volt" onClick={() => addReferral()}>
              Simulate referral (demo)
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Clear local demo
            </button>
          </div>
        </div>

        <div className="stat-strip">
          <div>
            <p>Demo code</p>
            <strong>{member.code}</strong>
          </div>
          <div>
            <p>Simulated referrals</p>
            <strong>{member.referrals}</strong>
          </div>
          <div>
            <p>Simulated volume units</p>
            <strong>{member.volume.toFixed(0)}</strong>
          </div>
          <div>
            <p>Demo points (not £)</p>
            <strong>{member.demoPoints}</strong>
          </div>
        </div>

        <div className="dash-grid">
          <section className="dash-panel">
            <h3>Local demo link</h3>
            <p className="share-url">{shareUrl}</p>
            <p>
              Placeholder only — not a live referral URL. Copying it does not enrol anyone or move
              funds.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
            >
              Copy demo string
            </button>
          </section>

          <section className="dash-panel">
            <h3>Rank concept</h3>
            <p>{rankMeta?.commercialStatus}</p>
            <ul>
              {(rankMeta?.intent ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="ledger">
          <h3>Mock ledger (disconnected)</h3>
          <p className="lede ledger-note">
            Static fiction for layout review. Not linked to your demo counters. Status is always Mock —
            never Paid.
          </p>
          <div className="ledger-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Persona</th>
                  <th scope="col">Event</th>
                  <th scope="col">Demo units</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleLedger.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.who}</td>
                    <td>{row.event}</td>
                    <td>{row.units}</td>
                    <td>
                      <span className="pill pending">{row.status}</span>
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
