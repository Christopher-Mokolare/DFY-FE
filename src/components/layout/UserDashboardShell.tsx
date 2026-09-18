import { ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface UserDashboardShellProps { children: ReactNode }

export default function UserDashboardShell({ children }: UserDashboardShellProps) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const type = user?.userType || ''
  const displayName = user?.firstName || user?.name || 'User'
  const isCreator = type === 'creator' || type === 'both'
  const isRunner = type === 'runner' || type === 'both'
  const roleLabel = isRunner && isCreator ? 'Creator & Runner' : isRunner ? 'Runner' : 'Creator'
  const navigation = [
    { label: 'Dashboard', to: '/dashboard', icon: 'fa-chart-pie', show: true },
    { label: 'My Posted Tasks', to: '/tasks/my-posted', icon: 'fa-list-check', show: isCreator },
    { label: 'My Active Tasks', to: '/tasks/my-active', icon: 'fa-running', show: isRunner },
    { label: 'My Completed Tasks', to: '/tasks/my-completed', icon: 'fa-circle-check', show: true },
    { label: 'Bank Accounts', to: '/user/bank-accounts', icon: 'fa-university', show: true },
    { label: 'Notifications', to: '/notifications', icon: 'fa-bell', show: true },
    { label: 'My Profile', to: '/user/profile', icon: 'fa-user', show: true },
  ].filter(item => item.show)
  const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard', '/tasks/post': 'Post an Errand', '/tasks/browse': 'Browse Errands', '/tasks/my-posted': 'My Posted Tasks',
    '/tasks/my-active': 'My Active Tasks', '/tasks/my-completed': 'My Completed Tasks',
    '/user/bank-accounts': 'Bank Accounts', '/notifications': 'Notifications', '/user/profile': 'My Profile',
  }
  const pageTitle = pageTitles[pathname] || (pathname.includes('/chat') ? 'Task Chat' : 'Dashboard')

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKeyDown) }
  }, [mobileOpen])

  return (
    <div className="user-dashboard-shell">
      {mobileOpen && <button className="user-dashboard-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`user-dashboard-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="user-dashboard-brand"><img src="/DFY.png" alt="DoForYou" /><div><strong>DoForYou<span>.</span></strong><small>{roleLabel}</small></div></div>
        <div className="user-dashboard-sidebar-label">Workspace</div>
        <nav className="user-dashboard-nav" aria-label="Dashboard navigation">
          {navigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} className={({ isActive }) => `user-dashboard-nav-item ${isActive ? 'active' : ''}`}><i className={`fas ${item.icon}`} /><span>{item.label}</span></NavLink>)}
        </nav>
        <div className="user-dashboard-sidebar-spacer" />
        <NavLink className="user-dashboard-post" to="/tasks/post"><i className="fas fa-plus" /><span>POST AN ERRAND</span></NavLink>
        <div className="user-dashboard-sidebar-footer"><div className="user-dashboard-avatar">{displayName.charAt(0).toUpperCase()}</div><div><strong>{displayName}</strong><span>{roleLabel}</span></div><button type="button" onClick={logout} title="Logout" aria-label="Logout"><i className="fas fa-arrow-right-from-bracket" /></button></div>
      </aside>
      <div className="user-dashboard-main">
        <div className="user-dashboard-topbar">
          <div className="user-dashboard-topbar-left">
            <button type="button" className="user-dashboard-mobile-menu" onClick={() => setMobileOpen(v => !v)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}><i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'}`} /></button>
            <div><span>DoForYou /</span><strong>{pageTitle}</strong></div>
          </div>
          <div className="user-dashboard-topbar-actions"><NavLink to="/notifications" title="Notifications" aria-label="Notifications"><i className="fas fa-bell" /></NavLink><span className="user-dashboard-live"><i /> Account active</span></div>
        </div>
        <main className="user-dashboard-content">{children}</main>
      </div>
    </div>
  )
}