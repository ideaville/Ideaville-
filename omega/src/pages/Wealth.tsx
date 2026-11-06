import { Link } from 'react-router-dom'
import { ranks, wealthPillars } from '../data/network'
import './Wealth.css'

export function Wealth() {
  return (
    <main className="section wealth-page">
      <div className="shell">
        <div className="section-head">
          <p className="eyebrow">Performance Network</p>
          <h2>Wealth building on product truth.</h2>
          <p className="lede">
            Income follows bottles that leave the shelf — then compounds through disciplined team
            structure. No mystery tokens. No overnight myths.
          </p>
        </div>

        <div className="pillar-row">
          {wealthPillars.map((pillar) => (
            <article key={pillar.title}>
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </article>
          ))}
        </div>

        <div className="rank-table-wrap">
          <table className="rank-table">
            <caption>Rank ladder</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Entry</th>
                <th scope="col">Direct</th>
                <th scope="col">Residual</th>
                <th scope="col">Signal perk</th>
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
                  <td>{rank.commission}</td>
                  <td>{rank.residual}</td>
                  <td>{rank.perks[0]}</td>
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
                {rank.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="wealth-cta">
          <p>Ready to claim a code and simulate growth?</p>
          <Link to="/club" className="btn btn-gold">
            Join Executive Club
          </Link>
        </div>
      </div>
    </main>
  )
}
