import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { copy } from '../lib/copy'
import { useAppStatus } from '../hooks/useAppStatus'
import { useSession } from '../hooks/useSession'
import { StatusChip } from './StatusChip'
import './Nav.css'

export function Nav() {
  const status = useAppStatus()
  const { user, setUser } = useSession()
  const navigate = useNavigate()

  async function signOut() {
    await api.logout().catch(() => undefined)
    setUser(null)
    navigate('/login')
  }

  return (
    <header className="nav" data-testid="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="shell nav-inner">
        <NavLink to="/" className="nav-brand brand-mark" end aria-label="OMEGA home">
          {copy.brand}
        </NavLink>
        <StatusChip status={status} />
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/shop" className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>
            {copy.shop}
          </NavLink>
          {user?.role === 'admin' ? (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>
              {copy.admin}
            </NavLink>
          ) : null}
          {user?.role === 'distributor' ? (
            <NavLink to="/distributor" className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>
              {copy.orders}
            </NavLink>
          ) : null}
          {user ? (
            <button type="button" className="nav-link nav-button" data-testid="btn-sign-out" onClick={signOut}>
              {copy.signOut}
            </button>
          ) : (
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>
              {copy.signIn}
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}
