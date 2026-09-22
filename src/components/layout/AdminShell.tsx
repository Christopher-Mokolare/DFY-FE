import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navigation = [
  { label: 'Overview', to: '/admin/dashboard', icon: 'fa-chart-pie', section: 'WORKSPACE' },
  { label: 'Tasks', to: '/admin/tasks', icon: 'fa-list-check', section: 'OPERATIONS' },
  { label: 'Users', to: '/admin/users', icon: 'fa-users', section: 'OPERATIONS' },
  { label: 'Disputes', to: '/admin/disputes', icon: 'fa-gavel', section: 'OPERATIONS' },
  { label: 'Payments', to: '/admin/payments', icon: 'fa-credit-card', section: 'FINANCE' },
  { label: 'Audit Log', to: '/admin/audit-log', icon: 'fa-shield-halved', section: 'SYSTEM' },
]

const sections = ['WORKSPACE', 'OPERATIONS', 'FINANCE', 'SYSTEM'] as const

export default function AdminShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)
  const currentPage = navigation.find(item => item.to === location.pathname)?.label || 'Operations'

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <img className="admin-brand-mark" src="/DFY.png" alt="DoForYou" />
          <div>
            <strong>DoForYou<span>.</span></strong>
            <small>Operations</small>
          </div>
        </div>

        <nav className="admin-nav admin-nav-sections" aria-label="Admin navigation">
          {sections.map(section => (
            <div className="admin-nav-section" key={section}>
              <div className="admin-sidebar-section-label">{section}</div>
              {navigation.filter(item => item.section === section).map(item => (
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
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-spacer" />

        <div className="admin-sidebar-footer">
          <div className="admin-profile-mini admin-profile-link">
            <div className="admin-avatar">
              {(user?.firstName || user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{user?.firstName || user?.name || 'Admin User'}</strong>
              <span>Administrator</span>
            </div>
          </div>
          <button type="button" className="admin-logout" onClick={logout} title="Sign out" aria-label="Sign out">
            <i className="fas fa-arrow-right-from-bracket" />
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button className="admin-sidebar-backdrop" aria-label="Close navigation" onClick={closeMobile} />
      )}

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-mobile-menu"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            >
              <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'}`} />
            </button>
            <div>
              <span className="admin-breadcrumb">Admin /</span>
              <strong>{currentPage}</strong>
            </div>
          </div>
          <div className="admin-topbar-right">
            <NavLink to="/admin/audit-log" className="admin-icon-button" title="Audit log" aria-label="Audit log">
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
