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
      const responseData = err?.response?.data ?? err?.data ?? err
      const authResponse = responseData?.data ?? responseData
      if (authResponse?.requiresTwoFactor === true || authResponse?.RequiresTwoFactor === true) {
        setRequiresTwoFactor(true)
        setError(authResponse?.message || authResponse?.Message || responseData?.message || responseData?.Message || 'Enter your authenticator code to continue.')
      } else if ((responseData?.requiresAccountSetup === true || responseData?.RequiresAccountSetup === true) && pendingGoogleToken) {
        navigate('/register', { state: { googleIdToken: pendingGoogleToken, returnToTaskId } })
      } else {
        setError(responseData?.message || responseData?.Message || err.message || 'Login failed. Please try again.')
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
      const responseData = err?.response?.data ?? err?.data ?? err
      const authResponse = responseData?.data ?? responseData
      if (authResponse?.requiresTwoFactor === true || authResponse?.RequiresTwoFactor === true) {
        setPendingGoogleToken(idToken)
        setRequiresTwoFactor(true)
        setError(authResponse?.message || authResponse?.Message || responseData?.message || responseData?.Message || 'Enter your authenticator code to continue.')
      } else if (responseData?.requiresAccountSetup === true || responseData?.RequiresAccountSetup === true) {
        // Keep the short-lived Google ID token in navigation state only, never in a URL or storage.
        navigate('/register', { state: { googleIdToken: idToken, returnToTaskId } })
      } else {
        setError(responseData?.message || responseData?.Message || err.message || 'Google sign-in could not be completed.')
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
          {error && <div className="alert alert-error" role="alert" aria-live="assertive"><i className="fas fa-exclamation-circle" /> {error}</div>}

          <form onSubmit={handleSubmit} noValidate={requiresTwoFactor}>
            {!requiresTwoFactor ? (
              <>
                <div className="form-group">
                  <div className="input-with-icon">
                    <i className="fas fa-envelope" />
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Email Address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="username"
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
                      autoComplete="current-password"
                      required
                      minLength={6}
                    />
                    <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      <i className={`fas fa-eye${showPassword ? '-slash' : ''}`} />
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || !email.trim() || !password}>
                  {loading ? <><span className="spinner spinner-sm" /> Signing in...</> : 'Sign In'}
                </button>
              </>
            ) : (
              <section className="auth-two-factor-step" aria-labelledby="two-factor-heading">
                <div className="auth-two-factor-heading">
                  <h3 id="two-factor-heading">Two-factor authentication</h3>
                  <p>
                    {pendingGoogleToken
                      ? 'Verify your Google sign-in with the code from your authenticator app.'
                      : 'Your password was accepted. Enter the code from your authenticator app or use one of your recovery codes.'}
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="second-factor-code">Authenticator code or recovery code</label>
                  <input
                    id="second-factor-code"
                    name="secondFactorCode"
                    type="text"
                    className="form-input"
                    value={secondFactorCode}
                    onChange={e => setSecondFactorCode(e.target.value)}
                    placeholder="Enter your 6-digit code or recovery code"
                    autoComplete="one-time-code"
                    autoFocus
                    inputMode="text"
                    maxLength={32}
                    required
                  />
                  <small className="text-muted">Authenticator codes change every 30 seconds. Recovery codes can only be used once.</small>
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || !secondFactorCode.trim()}>
                  {loading ? <><span className="spinner spinner-sm" /> Verifying...</> : 'Verify and sign in'}
                </button>
                <button
                  type="button"
                  className="auth-link-button"
                  style={{ display: 'block', margin: '1rem auto 0' }}
                  disabled={loading}
                  onClick={() => {
                    setRequiresTwoFactor(false)
                    setSecondFactorCode('')
                    setPendingGoogleToken(null)
                    setError('')
                  }}
                >
                  Back to sign in
                </button>
              </section>
            )}
          </form>

          {!requiresTwoFactor && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem', margin: '1.25rem 0' }}>
              <div className="text-muted text-sm">or</div>
              <GoogleIdentityButton onCredential={handleGoogleCredential} disabled={loading} />
            </div>
          )}

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
