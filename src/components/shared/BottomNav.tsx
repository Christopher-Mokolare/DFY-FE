import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './BottomNav.css'

export default function BottomNav() {
  const { isAuthenticated, isAdmin, canPostErrands } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (!isAuthenticated()) return null

  if (isAdmin()) {
    return (
      <nav className="bottom-nav">
        <NavLink to="/admin/dashboard" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-tachometer-alt" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/admin/tasks" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-tasks" />
          <span>Tasks</span>
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-users" />
          <span>Users</span>
        </NavLink>
        <NavLink to="/admin/payments" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-credit-card" />
          <span>Payments</span>
        </NavLink>
      </nav>
    )
  }

  const canPost = canPostErrands()

  return (
    <nav className="bottom-nav">
      <NavLink to="/dashboard" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
        <i className="fas fa-home" />
        <span>Home</span>
      </NavLink>
      <NavLink to="/tasks/browse" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
        <i className="fas fa-search" />
        <span>Browse</span>
      </NavLink>

      {canPost ? (
        <NavLink to="/tasks/post" className={() => `bnav-item bnav-post ${pathname === '/tasks/post' ? 'active' : ''}`}>
          <div className="bnav-post-btn">
            <i className="fas fa-plus" />
          </div>
          <span>Post</span>
        </NavLink>
      ) : (
        <NavLink to="/tasks/my-active" className={({ isActive }) => `bnav-item bnav-post ${isActive ? 'active' : ''}`}>
          <div className="bnav-post-btn bnav-post-btn--runner">
            <i className="fas fa-tasks" />
          </div>
          <span>My Tasks</span>
        </NavLink>
      )}

      <NavLink to="/wallet" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
        <i className="fas fa-wallet" />
        <span>Wallet</span>
      </NavLink>
      <NavLink to="/user/profile" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
        <i className="fas fa-user" />
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}
