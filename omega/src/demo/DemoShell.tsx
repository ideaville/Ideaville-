import { NavLink, Outlet } from 'react-router-dom'
import { copy } from '../lib/copy'
import { useDemo } from './DemoContext'
import './DemoShell.css'

export function DemoShell() {
  const demo = useDemo()

  return (
    <div className="demo-shell" data-testid="demo-shell">
      <div className="demo-banner" role="status" data-testid="demo-banner">
        <strong>DEMO</strong>
        <span>
          Password-free sample journey — fixture data only. Live shop remains at /shop. No real accounts, stock,
          orders, commissions, payments, or admin writes.
        </span>
      </div>
      {demo.lastMessage ? (
        <p className={`demo-toast demo-toast-${demo.lastMessage.tone}`} role="status" data-testid="demo-toast">
          {demo.lastMessage.text}
        </p>
      ) : null}
      <header className="demo-nav" data-testid="demo-nav">
        <nav className="shell demo-nav-inner" aria-label="Demo">
          <NavLink to="/demo/shop" className={({ isActive }) => (isActive ? 'demo-link is-active' : 'demo-link')}>
            {copy.shop}
          </NavLink>
          <NavLink to="/demo/network" className={({ isActive }) => (isActive ? 'demo-link is-active' : 'demo-link')}>
            {copy.network}
          </NavLink>
          <NavLink to="/demo/distributor" className={({ isActive }) => (isActive ? 'demo-link is-active' : 'demo-link')}>
            {copy.orders}
          </NavLink>
          <NavLink to="/demo/admin" className={({ isActive }) => (isActive ? 'demo-link is-active' : 'demo-link')}>
            {copy.admin}
          </NavLink>
          <NavLink to="/shop" className="demo-link demo-link-exit">
            Live preview shop
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
