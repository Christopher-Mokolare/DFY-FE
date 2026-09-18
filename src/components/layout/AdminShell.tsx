import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navigation = [
  { label: 'Overview', to: '/admin/dashboard', icon: 'fa-chart-pie' },
  { label: 'Tasks', to: '/admin/tasks', icon: 'fa-list-check' },
  { label: 'Users', to: '/admin/users', icon: 'fa-users' },
  { label: 'Payments', to: '/admin/payments', icon: 'fa-credit-card' },
  { label: 'Disputes', to: '/admin/disputes', icon: 'fa-gavel' },
  { label: 'Audit Log', to: '/admin/audit-log', icon: 'fa-shield-halved' },
]

export default function AdminShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <div className="admin-brand-mark" aria-hidden="true">D</div>
          <div>
            <strong>DoForYou<span>.</span></strong>
            <small>Operations</small>
          </div>
        </div>

        <div className="admin-sidebar-label">Workspace</div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {navigation.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobile}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              end={item.to === '/admin/dashboard'}
            >
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-spacer" />

        <div className="admin-sidebar-footer">
          <div className="admin-profile-mini">
            <div className="admin-avatar">{(user?.firstName || user?.name || 'A').charAt(0).toUpperCase()}</div>
            <div>
              <strong>{user?.firstName || user?.name || 'Admin User'}</strong>
              <span>Administrator</span>
            </div>
          </div>
          <button type="button" className="admin-logout" onClick={logout} title="Sign out">
            <i className="fas fa-arrow-right-from-bracket" />
          </button>
        </div>
      </aside>

      {mobileOpen && <button className="admin-sidebar-backdrop" aria-label="Close navigation" onClick={closeMobile} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button type="button" className="admin-mobile-menu" onClick={() => setMobileOpen(v => !v)} aria-label="Open navigation">
              <i className="fas fa-bars" />
            </button>
            <div>
              <span className="admin-breadcrumb">Admin /</span>
              <strong>{navigation.find(item => item.to === location.pathname)?.label || 'Operations'}</strong>
            </div>
          </div>
          <div className="admin-topbar-right">
            <NavLink to="/admin/audit-log" className="admin-icon-button" title="Audit log">
              <i className="fas fa-bell" />
            </NavLink>
            <div className="admin-live-status">
              <span />
              System operational
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
