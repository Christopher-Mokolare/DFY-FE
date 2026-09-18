import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function UserDashboardShell() {
  const { user, logout } = useAuth()
  const type = user?.userType || ''
  const displayName = user?.firstName || user?.name || 'User'
  const isCreator = type === 'creator' || type === 'both'
  const isRunner = type === 'runner' || type === 'both'

  const navigation = [
    { label: 'Dashboard', to: '/dashboard', icon: 'fa-chart-pie', show: true },
    { label: 'My Posted Tasks', to: '/tasks/my-posted', icon: 'fa-list-check', show: isCreator },
    { label: 'My Active Tasks', to: '/tasks/my-active', icon: 'fa-running', show: isRunner },
    { label: 'Bank Accounts', to: '/user/bank-accounts', icon: 'fa-university', show: true },
    { label: 'Notifications', to: '/notifications', icon: 'fa-bell', show: true },
    { label: 'My Profile', to: '/user/profile', icon: 'fa-user', show: true },
  ].filter(item => item.show)

  return (
    <div className="user-dashboard-shell">
      <aside className="user-dashboard-sidebar">
        <div className="user-dashboard-brand">
          <img src="/DFY.png" alt="DoForYou" />
          <div>
            <strong>DoForYou<span>.</span></strong>
            <small>{isRunner && isCreator ? 'Creator & Runner' : isRunner ? 'Runner' : 'Creator'}</small>
          </div>
        </div>

        <div className="user-dashboard-sidebar-label">Workspace</div>
        <nav className="user-dashboard-nav" aria-label="Dashboard navigation">
          {navigation.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} className={({ isActive }) => `user-dashboard-nav-item ${isActive ? 'active' : ''}`}>
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="user-dashboard-sidebar-spacer" />

        <NavLink className="user-dashboard-post" to="/tasks/post">
          <i className="fas fa-plus" />
          <span>POST AN ERRAND</span>
        </NavLink>

        <div className="user-dashboard-sidebar-footer">
          <div className="user-dashboard-avatar">{displayName.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{displayName}</strong>
            <span>{isRunner && isCreator ? 'Creator & Runner' : isRunner ? 'Runner' : 'Creator'}</span>
          </div>
          <button type="button" onClick={logout} title="Logout" aria-label="Logout">
            <i className="fas fa-arrow-right-from-bracket" />
          </button>
        </div>
      </aside>

      <div className="user-dashboard-main">
        <div className="user-dashboard-topbar">
          <div>
            <span>DoForYou /</span>
            <strong>Dashboard</strong>
          </div>
          <div className="user-dashboard-topbar-actions">
            <NavLink to="/notifications" title="Notifications"><i className="fas fa-bell" /></NavLink>
            <span className="user-dashboard-live"><i /> Account active</span>
          </div>
        </div>
        <main className="user-dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
