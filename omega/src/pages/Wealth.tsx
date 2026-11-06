import { Link } from 'react-router-dom'
import { networkPillars, ranks } from '../data/network'
import './Wealth.css'

export function Wealth() {
  return (
    <main className="section wealth-page">
      <div className="shell">
        <div className="section-head">
          <p className="eyebrow">Performance Network · Draft concept</p>
          <h2>Structure without payout promises.</h2>
          <p className="lede">
            Rank names are retained for UX continuity. Commission percentages, residuals, and equity-pool
            language from earlier drafts are <strong>not verified commercial terms</strong> and are
            withheld here pending owner approval. This page cannot accept money or enrol partners.
          </p>
        </div>

        <div className="pillar-row">
          {networkPillars.map((pillar) => (
            <article key={pillar.title}>
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </article>
          ))}
        </div>

        <div className="rank-table-wrap">
          <table className="rank-table">
            <caption>Draft rank ladder (commercial columns pending)</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Entry concept</th>
                <th scope="col">Commercial status</th>
                <th scope="col">Intent</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((rank) => (
                <tr key={rank.id}>
                  <th scope="row">
                    <span className="rank-name">{rank.name}</span>
                    <span className="rank-head">{rank.headline}</span>
                  </th>
                  <td>{rank.entry}</td>
                  <td>{rank.commercialStatus}</td>
                  <td>{rank.intent[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="wealth-detail">
          {ranks.map((rank) => (
            <article key={rank.id} className={`rank-detail rank-${rank.id}`}>
              <p className="eyebrow">{rank.name}</p>
              <h3>{rank.headline}</h3>
              <ul>
                {rank.intent.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="wealth-cta">
          <p>Explore the browser-local simulation — no real earnings.</p>
          <Link to="/club" className="btn btn-gold">
            Open club demo
          </Link>
        </div>
      </div>
    </main>
  )
}
