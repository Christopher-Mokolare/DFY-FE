import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import BackButton from '../shared/BackButton'
import BottomNav from '../shared/BottomNav'

const PUBLIC_ROUTES = ['/', '/about', '/contact', '/terms', '/payments/success', '/payments/cancelled']

export default function Layout() {
  const { pathname } = useLocation()
  const showFooter = PUBLIC_ROUTES.includes(pathname)

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
