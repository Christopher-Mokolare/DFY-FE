import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { usePostErrand } from '../../hooks/usePostErrand'
import './Header.css'

export default function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const { handlePostErrand, ProfileIncompleteModal } = usePostErrand()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLLIElement>(null)
  const drawerDropdownRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const inDesktop = dropdownRef.current?.contains(e.target as Node)
      const inDrawer = drawerDropdownRef.current?.contains(e.target as Node)
      if (!inDesktop && !inDrawer) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const close = () => { setDropdownOpen(false); setMenuOpen(false) }
  const handleLogout = () => { logout(); navigate('/'); close() }

  const displayName = user
    ? (user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.name ?? '')
    : ''

  const UserMenuItems = ({ onClose }: { onClose: () => void }) => (
    <>
      {!isAdmin() ? (
        <>
          <li><Link to="/dashboard" onClick={onClose}><i className="fas fa-home" /> Dashboard</Link></li>
          <li><Link to="/tasks/my-posted" onClick={onClose}><i className="fas fa-list" /> My Posted Tasks</Link></li>
          <li><Link to="/tasks/my-active" onClick={onClose}><i className="fas fa-running" /> My Active Tasks</Link></li>
          <li><Link to="/user/profile" onClick={onClose}><i className="fas fa-user" /> My Profile</Link></li>
          <li><Link to="/wallet" onClick={onClose}><i className="fas fa-wallet" /> Wallet</Link></li>
          <li className="divider" />
        </>
      ) : (
        <>
          <li className="dropdown-header">Admin Panel</li>
          <li><Link to="/admin/dashboard" onClick={onClose}><i className="fas fa-tachometer-alt" /> Dashboard</Link></li>
          <li><Link to="/admin/users" onClick={onClose}><i className="fas fa-users" /> Users</Link></li>
          <li><Link to="/admin/tasks" onClick={onClose}><i className="fas fa-tasks" /> Tasks</Link></li>
          <li><Link to="/admin/payments" onClick={onClose}><i className="fas fa-credit-card" /> Payments</Link></li>
          <li className="divider" />
        </>
      )}
      <li>
        <button onClick={handleLogout} className="dropdown-logout">
          <i className="fas fa-sign-out-alt" /> Logout
        </button>
      </li>
    </>
  )

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">

          {/* Logo */}
          <Link to="/" className="navbar-brand" onClick={close}>
            <img src="/DFY.png" alt="DoForYou" className="navbar-logo" />
            <span className="brand-text">DoForYou</span>
            <span className="dot"><b>.</b></span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="nav-menu">
            <ul className="nav-links">
              <li><NavLink to="/" end onClick={close}>Home</NavLink></li>
              <li><NavLink to="/about" onClick={close}>About</NavLink></li>
              <li><NavLink to="/tasks/browse" onClick={close}>Browse</NavLink></li>
              <li><NavLink to="/contact" onClick={close}>Contact</NavLink></li>

              {!isAuthenticated() ? (
                <>
                  <li><NavLink to="/login" onClick={close}>Login</NavLink></li>
                  <li><NavLink to="/register" onClick={close}>Register</NavLink></li>
                </>
              ) : (
                <>
                  <li>
                    <NavLink to="/notifications" className="nav-bell-link" onClick={close} aria-label="Notifications">
                      <i className="fas fa-bell" />
                      {unreadCount > 0 && <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </NavLink>
                  </li>
                  <li className="nav-dropdown" ref={dropdownRef}>
                    <button className="dropdown-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
                      <span className="user-avatar-sm">{displayName.charAt(0).toUpperCase()}</span>
                      {displayName}
                      <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`} />
                    </button>
                    {dropdownOpen && (
                      <ul className="dropdown-menu">
                        <UserMenuItems onClose={close} />
                      </ul>
                    )}
                  </li>
                </>
              )}
            </ul>

            {isAuthenticated() && !isAdmin() && (
              <button className="btn-post-errand" onClick={handlePostErrand}>
                POST AN ERRAND <span className="pulse-dot" />
              </button>
            )}
          </div>

          {/* ── Mobile topbar: bell + hamburger ── */}
          <div className="navbar-actions">
            {isAuthenticated() && (
              <NavLink to="/notifications" className="nav-bell-link" aria-label="Notifications">
                <i className="fas fa-bell" />
                {unreadCount > 0 && <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </NavLink>
            )}
            <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </div>

        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      <div className={`nav-backdrop ${menuOpen ? 'open' : ''}`} onClick={close} />

      <div className={`nav-drawer ${menuOpen ? 'open' : ''}`}>
        <ul className="nav-links">
          <li><NavLink to="/" end onClick={close}>Home</NavLink></li>
          <li><NavLink to="/about" onClick={close}>About</NavLink></li>
          <li><NavLink to="/tasks/browse" onClick={close}>Browse Errands</NavLink></li>
          <li><NavLink to="/contact" onClick={close}>Contact</NavLink></li>

          {!isAuthenticated() ? (
            <>
              <li><NavLink to="/login" onClick={close}>Login</NavLink></li>
              <li><NavLink to="/register" onClick={close}>Register</NavLink></li>
            </>
          ) : (
            <li className="nav-dropdown" ref={drawerDropdownRef}>
              <button className="dropdown-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
                <span className="user-avatar-sm">{displayName.charAt(0).toUpperCase()}</span>
                {displayName}
                <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`} />
              </button>
              {dropdownOpen && (
                <ul className="dropdown-menu">
                  <UserMenuItems onClose={close} />
                </ul>
              )}
            </li>
          )}
        </ul>

        {isAuthenticated() && !isAdmin() && (
          <button className="btn-post-errand" onClick={() => { handlePostErrand(); close() }}>
            POST AN ERRAND <span className="pulse-dot" />
          </button>
        )}
      </div>

      {ProfileIncompleteModal}
    </>
  )
}
