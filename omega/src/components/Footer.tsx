import { Link } from 'react-router-dom'
import './Footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div>
          <p className="brand-mark footer-brand">OMEGA</p>
          <p className="footer-copy">
            Petrol-only performance additive concept. Packaging and site are prototypes — not retail
            clearance.
          </p>
        </div>
        <div className="footer-col">
          <p className="footer-label">Explore</p>
          <Link to="/label">Label prototype</Link>
          <Link to="/club">Club demo</Link>
          <Link to="/wealth">Network concept</Link>
          <Link to="/dashboard">Demo dashboard</Link>
        </div>
        <div className="footer-col">
          <p className="footer-label">Compliance</p>
          <span>Petrol engines only</span>
          <span>Nigeria first · UK deferred</span>
          <span>No live payments, accounts, or payouts</span>
          <span>Browser-local demo only — not secure production auth</span>
          <span>Not financial advice · not for production</span>
        </div>
      </div>
      <div className="shell footer-bar">
        <span>© {new Date().getFullYear()} OMEGA concept · Ideaville prototype</span>
        <span className="footer-volt">Design concept — not for production</span>
      </div>
    </footer>
  )
}
