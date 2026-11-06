import { Link } from 'react-router-dom'
import { benefits, brand, pendingFacts } from '../data/product'
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
          <p className="eyebrow reveal">Design concept · Not for production</p>
          <h1 className="hero-brand reveal reveal-delay-1 brand-mark">{brand.name}</h1>
          <p className="hero-tag reveal reveal-delay-2">{brand.tagline}</p>
          <hr className="volt-rule hero-rule reveal reveal-delay-2" />
          <p className="lede reveal reveal-delay-3">{brand.promise}</p>
          <div className="hero-actions reveal reveal-delay-3">
            <Link to="/label" className="btn btn-gold">
              View label prototype
            </Link>
            <Link to="/club" className="btn btn-ghost">
              Open club demo
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <p className="eyebrow">Intended focus</p>
            <h2>Brand direction — claims pending proof.</h2>
            <p className="lede">
              OMEGA is framed for petrol systems only. No independently validated mpg, horsepower, or
              emissions efficacy claims are made here.
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
            <p className="eyebrow">Ecosystem prototype</p>
            <h2>Product story plus a non-transactional club demo.</h2>
            <p className="lede">
              Network ranks exist as UX structure only. Commission rates, residuals, and equity-pool
              ideas from earlier drafts are withheld pending commercial approval — nothing here accepts
              payments or personal account signup.
            </p>
          </div>
          <div className="ecosystem-actions">
            <Link to="/wealth" className="btn btn-volt">
              Network concept
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">
              Demo dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
