import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import BackButton from '../shared/BackButton'
import BottomNav from '../shared/BottomNav'
import AdminShell from './AdminShell'
import UserDashboardShell from './UserDashboardShell'

const PUBLIC_ROUTES = ['/', '/about', '/contact', '/terms', '/payments/success', '/payments/cancelled']

export default function Layout() {
  const { pathname } = useLocation()
  const showFooter = PUBLIC_ROUTES.includes(pathname)
  const isAdminRoute = pathname.startsWith('/admin')

  if (isAdminRoute) {
    return (
      <div className="page-wrapper admin-page-wrapper">
        <AdminShell />
      </div>
    )
  }

  if (pathname === '/dashboard') {
    return (
      <div className="page-wrapper user-dashboard-page-wrapper">
        <Header />
        <UserDashboardShell />
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      {showFooter && <Footer />}
      <BottomNav />
      <BackButton />
    </div>
  )
}
