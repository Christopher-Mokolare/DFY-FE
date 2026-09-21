import { ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { tasksApi } from '../../api'
import '../../styles/user-workspace.css'

interface UserDashboardShellProps { children: ReactNode }

export default function UserDashboardShell({ children }: UserDashboardShellProps) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [actionRequiredCount, setActionRequiredCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const type = user?.userType || ''
  const displayName = user?.firstName || user?.name || 'User'
  const isCreator = type === 'creator' || type === 'both'
  const isRunner = type === 'runner' || type === 'both'
  const roleLabel = isRunner && isCreator ? 'Creator & Runner' : isRunner ? 'Runner' : 'Creator'
  const { notifications } = useNotifications()
  const unreadNotifications = notifications.filter(n => !n.isRead).length
  useEffect(() => {
    let active = true
    if (isCreator) tasksApi.getMyPosted().then(res => {
      if (!active) return
      const raw = res.data?.data?.tasks || res.data?.data?.Tasks || []
      setActionRequiredCount(raw.filter((t: any) => ['completed', 'pendingpayment'].includes(String(t.taskStatus || '').toLowerCase())).length)
    }).catch(() => {})
    if (isRunner) tasksApi.getMyCompleted().then(res => {
      if (!active) return
      const raw = Array.isArray(res.data?.data) ? res.data.data : []
      setCompletedCount(raw.length)
    }).catch(() => {})
    return () => { active = false }
  }, [isCreator, isRunner])

  const navigation = [
    { label: 'Overview', to: '/dashboard', icon: 'fa-chart-pie', show: true },
    { label: 'Browse Tasks', to: '/tasks/browse', icon: 'fa-search', show: true },
    { label: 'My Posted Tasks', to: '/tasks/my-posted', icon: 'fa-list-check', show: isCreator },
    { label: 'Action Required', to: '/tasks/action-required', icon: 'fa-triangle-exclamation', show: isCreator, badge: actionRequiredCount },
    { label: 'My Active Tasks', to: '/tasks/my-active', icon: 'fa-running', show: isRunner },
    { label: 'My Completed Tasks', to: '/tasks/my-completed', icon: 'fa-circle-check', show: true, badge: isRunner ? completedCount : 0 },
    { label: 'Bank Accounts', to: '/user/bank-accounts', icon: 'fa-university', show: true },
    { label: 'Notifications', to: '/notifications', icon: 'fa-bell', show: true, badge: unreadNotifications },
    { label: 'My Profile', to: '/user/profile', icon: 'fa-user', show: true },
  ].filter(item => item.show)

  const pageTitles: Record<string, string> = {
    '/dashboard': 'Overview',
    '/tasks/post': 'Post an Errand',
    '/tasks/browse': 'Browse Errands',
    '/tasks/my-posted': 'My Posted Tasks',
    '/tasks/action-required': 'Action Required',
    '/tasks/my-active': 'My Active Tasks',
    '/tasks/my-completed': 'My Completed Tasks',
    '/user/bank-accounts': 'Bank Accounts',
    '/notifications': 'Notifications',
    '/user/profile': 'My Profile',
  }

  const pageTitle = pageTitles[pathname] || (pathname.includes('/chat') ? 'Task Chat' : 'Overview')

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileOpen])

  return (
    <div className="admin-shell user-workspace-shell">
      <aside className={`admin-sidebar user-workspace-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <img className="admin-brand-mark" src="/DFY.png" alt="DoForYou" />
          <div>
            <strong>DoForYou<span>.</span></strong>
            <small>{roleLabel}</small>
          </div>
        </div>

        <div className="admin-sidebar-label">Workspace</div>
        <nav className="admin-nav" aria-label="User navigation">
          {navigation.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              end={item.to === '/dashboard'}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-spacer" />

        {isCreator && (
          <NavLink className="user-workspace-post admin-nav-item" to="/tasks/post" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-plus" />
            <span>POST AN ERRAND</span>
          </NavLink>
        )}

        <div className="admin-sidebar-footer">
          <div className="admin-profile-mini">
            <div className="admin-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{displayName}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button type="button" className="admin-logout" onClick={logout} title="Sign out" aria-label="Sign out">
            <i className="fas fa-arrow-right-from-bracket" />
          </button>
        </div>
      </aside>

      {mobileOpen && <button className="admin-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <div className="admin-main user-workspace-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button type="button" className="admin-mobile-menu" onClick={() => setMobileOpen(v => !v)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}>
              <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'}`} />
            </button>
            <div>
              <span className="admin-breadcrumb">DoForYou /</span>
              <strong>{pageTitle}</strong>
            </div>
          </div>
          <div className="admin-topbar-right">
            <NavLink to="/notifications" className="admin-icon-button" title="Notifications" aria-label="Notifications">
              <i className="fas fa-bell" />
            </NavLink>
            <div className="admin-live-status">
              <span />
              Account active
            </div>
          </div>
        </header>

        <main className="admin-content user-dashboard-content">{children}</main>
      </div>
    </div>
  )
}
