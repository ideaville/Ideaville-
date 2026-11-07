import { Link } from 'react-router-dom'
import { ProductImage } from '../components/ProductImage'
import { copy } from '../lib/copy'
import './Home.css'

const labelRows = [
  { term: 'Size', value: '—' },
  { term: 'Use', value: 'Petrol only' },
  { term: 'Directions', value: '—' },
  { term: 'Batch', value: '—' },
] as const

export function Home() {
  return (
    <main className="section home-page">
      <div className="shell home-grid">
        <ProductImage src="/product-concept.jpg" ratio="4-5" width={800} height={1000} />
        <div className="home-copy">
          <h1 className="home-display brand-mark">{copy.brand}</h1>
          <p className="home-line">{copy.productLine}</p>
          <p className="petrol-mark">{copy.petrolOnly}</p>

          <section className="label-block" aria-labelledby="label-heading">
            <h2 id="label-heading">{copy.label}</h2>
            <dl className="label-dl">
              {labelRows.map((row) => (
                <div key={row.term}>
                  <dt>{row.term}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="meta home-safety">{copy.safetyPetrol}</p>

          <Link to="/shop" className="btn btn-primary" data-testid="btn-shop">
            {copy.shop}
          </Link>
        </div>
      </div>
    </main>
  )
}
