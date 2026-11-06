import { Link } from 'react-router-dom'
import './Footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div>
          <p className="brand-mark footer-brand">OMEGA</p>
          <p className="footer-copy">Performance additives for drivers who refuse compromise.</p>
        </div>
        <div className="footer-col">
          <p className="footer-label">Explore</p>
          <Link to="/label">Label system</Link>
          <Link to="/club">Executive Club</Link>
          <Link to="/wealth">Wealth model</Link>
          <Link to="/dashboard">Member dashboard</Link>
        </div>
        <div className="footer-col">
          <p className="footer-label">Compliance</p>
          <span>Petrol engines only</span>
          <span>Demo ecosystem — sample ledgers</span>
          <span>Not financial advice</span>
        </div>
      </div>
      <div className="shell footer-bar">
        <span>© {new Date().getFullYear()} OMEGA Performance Additives</span>
        <span className="footer-volt">Clean · Power · Longevity</span>
      </div>
    </footer>
  )
}
