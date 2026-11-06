import { Link } from 'react-router-dom'
import './Footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div>
          <p className="brand-mark footer-brand">OMEGA</p>
          <p className="footer-copy">
            Ideaville Enterprise — petrol-only performance additive prototype for Nigeria. Not retail
            clearance.
          </p>
        </div>
        <div className="footer-col">
          <p className="footer-label">Explore</p>
          <Link to="/shop">Shop</Link>
          <Link to="/label">Label prototype</Link>
          <Link to="/login">Staff login</Link>
        </div>
        <div className="footer-col">
          <p className="footer-label">Compliance</p>
          <span>Petrol engines only</span>
          <span>Nigeria first · UK deferred</span>
          <span>No live payments or public launch</span>
          <span>App roles ≠ Vercel SSO</span>
        </div>
      </div>
      <div className="shell footer-bar">
        <span>© {new Date().getFullYear()} Ideaville Enterprise · OMEGA prototype</span>
        <span className="footer-volt">Design / ops prototype — not for production</span>
      </div>
    </footer>
  )
}
