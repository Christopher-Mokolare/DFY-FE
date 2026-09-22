import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Header from './Header'
import Footer from './Footer'
import BackButton from '../shared/BackButton'
import BottomNav from '../shared/BottomNav'
import AdminShell from './AdminShell'
import UserDashboardShell from './UserDashboardShell'

const PUBLIC_ROUTES = ['/', '/about', '/contact', '/terms', '/payments/success', '/payments/cancelled']
const USER_WORKSPACE_ROUTES = ['/dashboard', '/tasks/post', '/tasks/browse', '/tasks/my-posted', '/tasks/action-required', '/tasks/my-active', '/tasks/my-completed', '/notifications', '/messages', '/user/profile', '/user/bank-accounts']

export default function Layout() {
  const { pathname } = useLocation()
  const { user, loading, loginTransitioning, isAuthenticated } = useAuth()
  const showFooter = PUBLIC_ROUTES.includes(pathname)
  const isAdminRoute = pathname.startsWith('/admin')
  const isUserWorkspaceRoute = USER_WORKSPACE_ROUTES.includes(pathname) || /^\/tasks\/[^/]+\/chat$/.test(pathname)

  if (isAdminRoute) return <div className="page-wrapper admin-page-wrapper"><AdminShell /></div>

  // During credential submission, keep the public Header completely out of the tree.
  // AuthContext keeps this flag active until the navigation to the authenticated
  // workspace has been committed, eliminating the authenticated-header flash.
  if ((pathname === '/login' || pathname === '/register') && loginTransitioning) {
    return <div className="page-wrapper user-dashboard-page-wrapper" aria-busy="true" />
  }

  // Once login has succeeded, never render the public login page/header again.
  // Auth state is updated before Login navigates, so this guard closes the tiny
  // render window where /login could otherwise show the authenticated Header.
  if ((pathname === '/login' || pathname === '/register') && !loading && isAuthenticated() && user) {
    return <Navigate to={isAdminRoute ? '/admin/dashboard' : '/dashboard'} replace />
  }

  // While auth is being restored after login/refresh, do not render the public header.
  // Rendering Header here causes a brief Home/About/Browse/Contact flash before the
  // authenticated workspace shell takes over.
  if (isUserWorkspaceRoute && loading) return <div className="page-wrapper user-dashboard-page-wrapper" aria-busy="true" />

  if (isUserWorkspaceRoute && !loading && isAuthenticated() && user) return (
    <div className="page-wrapper user-dashboard-page-wrapper">
      <UserDashboardShell><Outlet /></UserDashboardShell>
    </div>
  )

  return (
    <div className="page-wrapper">
      <Header />
      <main className="main-content"><Outlet /></main>
      {showFooter && <Footer />}
      <BottomNav />
      <BackButton />
    </div>
  )
}