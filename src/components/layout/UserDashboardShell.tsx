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
  const [awaitConfirmationCount, setAwaitConfirmationCount] = useState(0)
  const [paymentRequiredCount, setPaymentRequiredCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const type = user?.userType || ''
  const displayName = user?.firstName || user?.name || 'User'
  const isCreator = type === 'creator' || type === 'both'
  const isRunner = type === 'runner' || type === 'both'
  const roleLabel = isRunner && isCreator ? 'Creator & Runner' : isRunner ? 'Runner' : 'Creator'
  const { notifications } = useNotifications()
  const unreadNotifications = notifications.filter(n => !n.isRead).length
  const unreadMessages = notifications.filter(n => !n.isRead && n.type === 'new_message').length
  useEffect(() => {
    let active = true
    if (isCreator) tasksApi.getMyPosted().then(res => {
      if (!active) return
      const raw = res.data?.data?.tasks || res.data?.data?.Tasks || []
      const normalized = raw.map((t: any) => String(t.taskStatus || '').toLowerCase())
      setAwaitConfirmationCount(normalized.filter((status: string) => status === 'completed').length)
      setPaymentRequiredCount(normalized.filter((status: string) => status === 'pendingpayment').length)
    }).catch(() => {})
    if (isRunner) tasksApi.getMyCompleted().then(res => {
      if (!active) return
      const raw = Array.isArray(res.data?.data) ? res.data.data : []
      setCompletedCount(raw.length)
    }).catch(() => {})
    return () => { active = false }
  }, [isCreator, isRunner])

  const navigation = [
    { label: 'Overview', to: '/dashboard', icon: 'fa-chart-pie', show: true, section: 'WORKSPACE' },
    { label: 'Await Confirmation', to: '/tasks/action-required?filter=confirmation', icon: 'fa-triangle-exclamation', show: isCreator && awaitConfirmationCount > 0, badge: awaitConfirmationCount, section: 'ACTION REQUIRED' },
    { label: 'Payments', to: '/tasks/action-required?filter=payments', icon: 'fa-credit-card', show: isCreator && paymentRequiredCount > 0, badge: paymentRequiredCount, section: 'ACTION REQUIRED' },
    { label: 'Browse Tasks', to: '/tasks/browse', icon: 'fa-search', show: true, section: 'TASKS' },
    { label: 'My Posted Tasks', to: '/tasks/my-posted', icon: 'fa-list-check', show: isCreator, section: 'TASKS' },
    { label: 'My Active Tasks', to: '/tasks/my-active', icon: 'fa-running', show: isRunner, section: 'TASKS' },
    { label: 'My Completed Tasks', to: '/tasks/my-completed', icon: 'fa-circle-check', show: true, section: 'TASKS' },
    { label: 'Bank Accounts', to: '/user/bank-accounts', icon: 'fa-university', show: true, section: 'ACCOUNT' },
    { label: 'Messages', to: '/messages', icon: 'fa-comments', show: true, badge: unreadMessages, section: 'COMMUNICATION' },
    { label: 'Notifications', to: '/notifications', icon: 'fa-bell', show: true, badge: unreadNotifications, section: 'COMMUNICATION' },
    { label: 'My Profile', to: '/user/profile', icon: 'fa-user', show: true, section: 'ACCOUNT' },
  ].filter(item => item.show)

  const renderNavigation = (items: typeof navigation) => items.map(item => (
    <NavLink key={item.section + item.to} to={item.to} onClick={() => setMobileOpen(false)} end={item.to === '/dashboard'} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
      <i className={`fas ${item.icon}`} />
      <span>{item.label}</span>
      {!!item.badge && <span className="admin-nav-badge">{item.badge}</span>}
    </NavLink>
  ))


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
    '/messages': 'Messages',
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
          {renderNavigation(navigation.filter(item => item.section === 'WORKSPACE'))}
          {navigation.some(item => item.section === 'ACTION REQUIRED') && <div className="admin-sidebar-section-label">ACTION REQUIRED</div>}
          {renderNavigation(navigation.filter(item => item.section === 'ACTION REQUIRED'))}
          <div className="admin-sidebar-section-label">TASKS</div>
          {renderNavigation(navigation.filter(item => item.section === 'TASKS'))}
          <div className="admin-sidebar-section-label">COMMUNICATION</div>
          {renderNavigation(navigation.filter(item => item.section === 'COMMUNICATION'))}
          <div className="admin-sidebar-section-label">ACCOUNT</div>
          {renderNavigation(navigation.filter(item => item.section === 'ACCOUNT'))}
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
