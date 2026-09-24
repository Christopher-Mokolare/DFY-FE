import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // An explicit logout starts a fresh session. Never reuse the protected route
  // that may have redirected to /login before logout navigation completed.
  const loggedOut = sessionStorage.getItem('dfy:loggedOut') === '1'
  const authState = location.state as any
  const from = loggedOut ? null : (authState?.from?.pathname || null)
  const returnToTaskId = loggedOut ? null : authState?.returnToTaskId

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const loggedInUser = await login(email, password)
      sessionStorage.removeItem('dfy:loggedOut')
      const isAdminUser = !!loggedInUser?.isAdmin || !!loggedInUser?.roles?.includes('Admin') || loggedInUser?.userType === 'Admin'
      // Admins must never inherit a creator/runner return route such as /dashboard.
      const dest = isAdminUser
        ? '/admin/dashboard'
        : (returnToTaskId ? `/tasks/browse?taskId=${encodeURIComponent(returnToTaskId)}` : (from || '/dashboard'))
      navigate(dest, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-panel">
          <div className="auth-panel-content">
            <h1>Welcome Back!</h1>
            <p>Sign in to continue your DoForYou journey</p>
            <div className="auth-features">
              <div className="auth-feature"><i className="fas fa-shield-alt" /><span>Secure</span></div>
              <div className="auth-feature"><i className="fas fa-bolt" /><span>Fast</span></div>
            </div>
          </div>
        </div>
        <div className="auth-form-side">
          <h2>Sign In</h2>
          <p className="auth-subtitle">Enter your credentials to access your account</p>

          {error && <div className="alert alert-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-with-icon">
                <i className="fas fa-envelope" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="Email Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <div className="input-with-icon password-input">
                <i className="fas fa-lock" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  <i className={`fas fa-eye${showPassword ? '-slash' : ''}`} />
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || !email || !password}>
              {loading ? <><span className="spinner spinner-sm" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register" state={returnToTaskId ? { returnToTaskId } : undefined}>Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
