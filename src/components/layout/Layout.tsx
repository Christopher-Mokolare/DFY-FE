import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import BackButton from '../shared/BackButton'
import BottomNav from '../shared/BottomNav'
import AdminShell from './AdminShell'
import UserDashboardShell from './UserDashboardShell'

const PUBLIC_ROUTES = ['/', '/about', '/contact', '/terms', '/payments/success', '/payments/cancelled']
const USER_WORKSPACE_ROUTES = ['/dashboard', '/tasks/post', '/tasks/browse', '/tasks/my-posted', '/tasks/my-active', '/tasks/my-completed', '/notifications', '/user/profile', '/user/bank-accounts']

export default function Layout() {
  const { pathname } = useLocation()
  const showFooter = PUBLIC_ROUTES.includes(pathname)
  const isAdminRoute = pathname.startsWith('/admin')
  const isUserWorkspaceRoute = USER_WORKSPACE_ROUTES.includes(pathname)

  if (isAdminRoute) return <div className="page-wrapper admin-page-wrapper"><AdminShell /></div>

  if (isUserWorkspaceRoute) return (
    <div className="page-wrapper user-dashboard-page-wrapper">
      <Header />
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
