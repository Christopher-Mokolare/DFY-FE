import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import './Header.css'

export default function Header() {
  const { user, isAuthenticated, isAdmin, logout, canPostErrands, isProfileIncomplete } = useAuth()
  const { unreadCount } = useNotifications()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
    setDropdownOpen(false)
  }

  const handlePostErrand = () => {
    if (!isAuthenticated()) { navigate('/login'); return }
    if (isProfileIncomplete()) { navigate('/user/profile'); return }
    navigate('/tasks/post')
    setMenuOpen(false)
  }

  const close = () => { setDropdownOpen(false); setMenuOpen(false) }

  const displayName = user
    ? (user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.name)
    : ''

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
          <img src="/DFY.png" alt="DoForYou" className="navbar-logo" />
          <span className="brand-text">DoForYou</span>
          <span className="dot"><b>.</b></span>
        </Link>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
        </button>

        <div className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <ul className="nav-links">
            <li><NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink></li>
            <li><NavLink to="/about" onClick={() => setMenuOpen(false)}>About</NavLink></li>
            <li><NavLink to="/tasks/browse" onClick={() => setMenuOpen(false)}>Browse Errands</NavLink></li>
            <li><NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink></li>

            {!isAuthenticated() ? (
              <>
                <li><NavLink to="/login" onClick={() => setMenuOpen(false)}>Login</NavLink></li>
                <li><NavLink to="/register" onClick={() => setMenuOpen(false)}>Register</NavLink></li>
              </>
            ) : (
              <>
                {/* Bell icon */}
                <li>
                  <NavLink to="/notifications" className="nav-bell-link" onClick={() => setMenuOpen(false)} aria-label="Notifications">
                    <i className="fas fa-bell" />
                    {unreadCount > 0 && (
                      <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </NavLink>
                </li>

                {/* User dropdown */}
                <li className="nav-dropdown" ref={dropdownRef}>
                  <button className="dropdown-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
                    <span className="user-avatar-sm">{displayName.charAt(0).toUpperCase()}</span>
                    {displayName}
                    <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`} />
                  </button>
                  {dropdownOpen && (
                    <ul className="dropdown-menu">
                      {!isAdmin() ? (
                        <>
                          <li><Link to="/dashboard" onClick={close}>Dashboard</Link></li>
                          {canPostErrands() && !isProfileIncomplete() && (
                            <li><Link to="/tasks/post" onClick={close}>Post Errand</Link></li>
                          )}
                          <li><Link to="/tasks/my-posted" onClick={close}>My Posted Tasks</Link></li>
                          <li><Link to="/tasks/my-active" onClick={close}>My Active Tasks</Link></li>
                          <li><Link to="/user/profile" onClick={close}>My Profile</Link></li>
                          <li><Link to="/wallet" onClick={close}>Wallet</Link></li>
                          <li>
                            <Link to="/notifications" onClick={close} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span><i className="fas fa-bell" /> Notifications</span>
                              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
                            </Link>
                          </li>
                          <li className="divider" />
                        </>
                      ) : (
                        <>
                          <li className="dropdown-header">Admin Panel</li>
                          <li><Link to="/admin/dashboard" onClick={close}><i className="fas fa-tachometer-alt" /> Dashboard</Link></li>
                          <li><Link to="/admin/users" onClick={close}><i className="fas fa-users" /> Manage Users</Link></li>
                          <li><Link to="/admin/tasks" onClick={close}><i className="fas fa-tasks" /> Manage Tasks</Link></li>
                          <li><Link to="/admin/payments" onClick={close}><i className="fas fa-credit-card" /> Payments</Link></li>
                          <li className="divider" />
                        </>
                      )}
                      <li>
                        <button onClick={handleLogout} className="dropdown-logout">
                          <i className="fas fa-sign-out-alt" /> Logout
                        </button>
                      </li>
                    </ul>
                  )}
                </li>
              </>
            )}
          </ul>

          {isAuthenticated() && !isAdmin() && canPostErrands() && (
            <button className="btn-post-errand" onClick={handlePostErrand}>
              POST AN ERRAND <span className="pulse-dot" />
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
