import { Link } from 'react-router-dom'
import { benefits, brand, pendingFacts } from '../data/product'
import './Home.css'

export function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <img src="/product-concept.jpg" alt="" className="hero-image" />
          <div className="hero-shade" />
        </div>
        <div className="shell hero-copy">
          <p className="eyebrow reveal">Ideaville Enterprise · Nigeria first</p>
          <h1 className="hero-brand reveal reveal-delay-1 brand-mark">{brand.name}</h1>
          <p className="hero-tag reveal reveal-delay-2">{brand.tagline}</p>
          <hr className="volt-rule hero-rule reveal reveal-delay-2" />
          <p className="lede reveal reveal-delay-3">{brand.promise}</p>
          <div className="hero-actions reveal reveal-delay-3">
            <Link to="/shop" className="btn btn-gold">
              Nigeria shop
            </Link>
            <Link to="/label" className="btn btn-ghost">
              Label prototype
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <p className="eyebrow">Intended focus</p>
            <h2>Petrol-only product story — claims pending proof.</h2>
            <p className="lede">
              No independently validated mpg, horsepower, or emissions claims. Distributors already
              exist in the field; this system helps admin manage roster, stock, and orders once
              configured — it does not invent the business.
            </p>
          </div>
          <div className="benefit-rail">
            {benefits.map((item, index) => (
              <article key={item.title} className={`benefit benefit-${index + 1}`}>
                <span className="benefit-index">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section specs-band">
        <div className="shell specs-grid">
          <div>
            <p className="eyebrow">Known constraints</p>
            <h2>What is locked vs still open.</h2>
          </div>
          <dl className="specs-list">
            <div>
              <dt>Fuel</dt>
              <dd>{brand.fuel}</dd>
            </div>
            <div>
              <dt>Market</dt>
              <dd>{brand.market}</dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd>{brand.volume}</dd>
            </div>
            <div>
              <dt>Dose</dt>
              <dd>{brand.dose}</dd>
            </div>
          </dl>
        </div>
        <div className="shell pending-list">
          <p className="eyebrow">Still pending</p>
          <ul>
            {pendingFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="shell ecosystem-cta">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>Shop, distributors, admin — commercial activation off.</h2>
            <p className="lede">
              Server-side auth and Postgres-backed persistence when DATABASE_URL is configured. Incentive
              demo pages have been redirected to the shop. No live payments in this preview.
            </p>
          </div>
          <div className="ecosystem-actions">
            <Link to="/shop" className="btn btn-volt">
              Open shop
            </Link>
            <Link to="/login" className="btn btn-ghost">
              Staff login
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
