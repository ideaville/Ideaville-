import { NavLink } from 'react-router-dom'
import './Nav.css'

const links = [
  { to: '/', label: 'Product', end: true },
  { to: '/label', label: 'Label' },
  { to: '/shop', label: 'Shop' },
  { to: '/login', label: 'Login' },
] as const

export function Nav() {
  return (
    <header className="nav">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="shell nav-inner">
        <NavLink to="/" className="nav-brand" end>
          <span className="brand-mark">OMEGA</span>
          <span className="nav-sub">Ideaville Enterprise</span>
        </NavLink>
        <nav className="nav-links" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={'end' in link ? link.end : false}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/shop" className="btn btn-gold nav-cta">
          Open shop
        </NavLink>
      </div>
    </header>
  )
}
