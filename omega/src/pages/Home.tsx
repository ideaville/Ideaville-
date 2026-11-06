import { Link } from 'react-router-dom'
import { benefits, brand } from '../data/product'
import './Home.css'

export function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <img
            src="/product-concept.jpg"
            alt=""
            className="hero-image"
          />
          <div className="hero-shade" />
        </div>
        <div className="shell hero-copy">
          <p className="eyebrow reveal">Fuel chemistry · Redesigned</p>
          <h1 className="hero-brand reveal reveal-delay-1 brand-mark">{brand.name}</h1>
          <p className="hero-tag reveal reveal-delay-2">{brand.tagline}</p>
          <hr className="volt-rule hero-rule reveal reveal-delay-2" />
          <p className="lede reveal reveal-delay-3">{brand.promise}</p>
          <div className="hero-actions reveal reveal-delay-3">
            <Link to="/label" className="btn btn-gold">
              View label
            </Link>
            <Link to="/club" className="btn btn-ghost">
              Enter Executive Club
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <p className="eyebrow">The formula</p>
            <h2>Three jobs. One bottle.</h2>
            <p className="lede">
              OMEGA is engineered for petrol systems that work hard — city stop-start, motorway miles,
              and engines that deserve more than a generic flush.
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
            <p className="eyebrow">At a glance</p>
            <h2>Built for the fill-up ritual.</h2>
          </div>
          <dl className="specs-list">
            <div>
              <dt>Volume</dt>
              <dd>{brand.volume}</dd>
            </div>
            <div>
              <dt>Fuel</dt>
              <dd>{brand.fuel}</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>{brand.treats}</dd>
            </div>
            <div>
              <dt>Cadence</dt>
              <dd>{brand.interval}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section">
        <div className="shell ecosystem-cta">
          <div>
            <p className="eyebrow">Beyond the bottle</p>
            <h2>Product. Network. Equity path.</h2>
            <p className="lede">
              Members buy the chemistry. Advocates share it. Partners and Executives build lasting
              residual income through the Performance Network.
            </p>
          </div>
          <div className="ecosystem-actions">
            <Link to="/wealth" className="btn btn-volt">
              See wealth model
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">
              Open dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
