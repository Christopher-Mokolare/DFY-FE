import { useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../api'
import GoogleIdentityButton from '../../components/auth/GoogleIdentityButton'
import './Auth.css'

export default function Login() {
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  // An explicit logout starts a fresh session. Never reuse the protected route
  // that may have redirected to /login before logout navigation completed.
  const loggedOut = sessionStorage.getItem('dfy:loggedOut') === '1'
  const authState = location.state as any
  const from = loggedOut ? null : (authState?.from?.pathname || null)
  const returnToTaskId = loggedOut ? null : (authState?.returnToTaskId || searchParams.get('returnToTaskId'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [secondFactorCode, setSecondFactorCode] = useState('')
  const [pendingGoogleToken, setPendingGoogleToken] = useState<string | null>(null)
  const [notice, setNotice] = useState(authState?.registered ? 'Account created. Check your inbox for the verification link before signing in.' : authState?.passwordChanged ? 'Password changed successfully. Sign in with your new password.' : '')

  const finishSignIn = (loggedInUser: any) => {
    sessionStorage.removeItem('dfy:loggedOut')
    const isAdminUser = !!loggedInUser?.isAdmin || !!loggedInUser?.roles?.includes('Admin') || loggedInUser?.userType === 'Admin'
    const dest = isAdminUser
      ? '/admin/dashboard'
      : (returnToTaskId ? `/tasks/browse?taskId=${encodeURIComponent(returnToTaskId)}` : (from || '/dashboard'))
    navigate(dest, { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const loggedInUser = pendingGoogleToken
        ? await googleLogin(pendingGoogleToken, secondFactorCode.trim())
        : await login(email.trim().toLowerCase(), password, requiresTwoFactor ? secondFactorCode.trim() : undefined)
      setPendingGoogleToken(null)
      setRequiresTwoFactor(false)
      setSecondFactorCode('')
      finishSignIn(loggedInUser)
    } catch (err: any) {
      if (err.response?.data?.requiresTwoFactor) {
        setRequiresTwoFactor(true)
        setError(err.response?.data?.message || 'Enter your authenticator code to continue.')
      } else if (err.response?.data?.requiresAccountSetup && pendingGoogleToken) {
        navigate('/register', { state: { googleIdToken: pendingGoogleToken, returnToTaskId } })
      } else {
        setError(err.response?.data?.message || err.message || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (idToken: string) => {
    setLoading(true)
    setError('')
    try {
      const loggedInUser = await googleLogin(idToken)
      finishSignIn(loggedInUser)
    } catch (err: any) {
      if (err.response?.data?.requiresTwoFactor) {
        setPendingGoogleToken(idToken)
        setRequiresTwoFactor(true)
        setError(err.response?.data?.message || 'Enter your authenticator code to continue.')
      } else if (err.response?.data?.requiresAccountSetup) {
        // Keep the short-lived Google ID token in navigation state only, never in a URL or storage.
        navigate('/register', { state: { googleIdToken: idToken, returnToTaskId } })
      } else {
        setError(err.response?.data?.message || err.message || 'Google sign-in could not be completed.')
      }
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

          {notice && <div className="alert alert-success" role="status">{notice}</div>}
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
            {requiresTwoFactor && !pendingGoogleToken && (
              <div className="form-group">
                <label className="form-label" htmlFor="second-factor-code">Authenticator or recovery code</label>
                <input
                  id="second-factor-code"
                  className="form-input"
                  value={secondFactorCode}
                  onChange={e => setSecondFactorCode(e.target.value)}
                  placeholder="Six-digit code or recovery code"
                  autoComplete="one-time-code"
                  inputMode="text"
                  maxLength={20}
                  required
                />
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || (!pendingGoogleToken && (!email || !password)) || (requiresTwoFactor && !secondFactorCode.trim())}>
              {loading ? <><span className="spinner spinner-sm" /> Signing in...</> : (requiresTwoFactor ? 'Verify & Sign In' : 'Sign In')}
            </button>
          </form>

          {pendingGoogleToken && requiresTwoFactor && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="google-second-factor-code">Authenticator or recovery code</label>
              <input
                id="google-second-factor-code"
                className="form-input"
                value={secondFactorCode}
                onChange={e => setSecondFactorCode(e.target.value)}
                placeholder="Six-digit code or recovery code"
                autoComplete="one-time-code"
                maxLength={20}
              />
              <button type="button" className="btn btn-primary btn-block" disabled={loading || !secondFactorCode.trim()} onClick={() => { void handleSubmit({ preventDefault: () => {} } as React.FormEvent) }}>
                {loading ? 'Verifying…' : 'Verify Google sign-in'}
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gap: '.75rem', margin: '1.25rem 0', textAlign: 'center' }}>
            <div className="text-muted text-sm">or</div>
            <GoogleIdentityButton onCredential={handleGoogleCredential} disabled={loading} />
          </div>

          <p className="auth-switch" style={{ marginTop: '0.75rem' }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          {error.toLowerCase().includes('verify your email') && (
            <p className="auth-switch">
              <button type="button" className="auth-link-button" disabled={resendLoading} onClick={async () => {
                setResendLoading(true)
                try {
                  const response = await authApi.resendVerification(email.trim().toLowerCase())
                  setNotice(response.data?.message || 'If the account needs verification, an email will be sent shortly.')
                  setError('')
                } catch {
                  setNotice('If the account needs verification, an email will be sent shortly.')
                  setError('')
                } finally { setResendLoading(false) }
              }}>{resendLoading ? 'Sending…' : 'Resend verification email'}</button>
            </p>
          )}
          <p className="auth-switch">
            Don't have an account? <Link
              to={returnToTaskId ? `/register?returnToTaskId=${encodeURIComponent(returnToTaskId)}` : '/register'}
              state={returnToTaskId ? { returnToTaskId } : undefined}
            >Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
