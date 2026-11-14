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
  const from = loggedOut ? null : (authState?.from ? `${authState.from.pathname || ''}${authState.from.search || ''}${authState.from.hash || ''}` || null : null)
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

  const getErrorPayload = (err: any) => {
    const body = err?.response?.data
    // APIs may return the challenge at the root, inside data, or inside an
    // error envelope. Keep the original body available for all known shapes.
    return body?.data ?? body?.error ?? body?.Error ?? body ?? {}
  }
  const isTwoFactorChallenge = (err: any) => {
    const body = err?.response?.data
    const candidates = [body, body?.data, body?.error, body?.Error, body?.errors]
    if (candidates.some(value =>
      value?.requiresTwoFactor === true ||
      value?.RequiresTwoFactor === true ||
      value?.requires_two_factor === true
    )) return true

    // A 401 is a challenge only when the backend explicitly says an
    // authenticator/recovery code is required; ordinary invalid credentials
    // must continue to display the normal login error.
    const message = candidates
      .map(value => value?.message || value?.Message || '')
      .join(' ')
      .toLowerCase()
    return err?.response?.status === 401 &&
      /enter the code from your authenticator|authenticator app or a recovery code|two.factor authentication required/.test(message)
  }
  const getErrorMessage = (err: any, fallback: string) => {
    const payload = getErrorPayload(err)
    return payload.message || payload.Message || err?.message || fallback
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
      const payload = getErrorPayload(err)
      if (isTwoFactorChallenge(err)) {
        setRequiresTwoFactor(true)
        setError(secondFactorCode.trim()
          ? getErrorMessage(err, 'That code was not accepted. Try the current code or a recovery code.')
          : '')
        setNotice(secondFactorCode.trim()
          ? ''
          : 'Your password was accepted. Complete the second step using your authenticator app or a one-time recovery code.')
      } else if ((payload.requiresAccountSetup === true || payload.RequiresAccountSetup === true) && pendingGoogleToken) {
        navigate('/register', { state: { googleIdToken: pendingGoogleToken, returnToTaskId } })
      } else {
        setError(getErrorMessage(err, 'Login failed. Please try again.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (idToken: string) => {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const loggedInUser = await googleLogin(idToken)
      finishSignIn(loggedInUser)
    } catch (err: any) {
      const payload = getErrorPayload(err)
      if (payload.requiresTwoFactor === true || payload.RequiresTwoFactor === true) {
        setPendingGoogleToken(idToken)
        setRequiresTwoFactor(true)
        setSecondFactorCode('')
        setNotice('Google sign-in was accepted. Complete the second step using your authenticator app or a one-time recovery code.')
      } else if (payload.requiresAccountSetup === true || payload.RequiresAccountSetup === true) {
        // Keep the short-lived Google ID token in navigation state only, never in a URL or storage.
        navigate('/register', { state: { googleIdToken: idToken, returnToTaskId } })
      } else {
        setError(getErrorMessage(err, 'Google sign-in could not be completed.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const resetTwoFactorStep = () => {
    setRequiresTwoFactor(false)
    setSecondFactorCode('')
    setPendingGoogleToken(null)
    setError('')
    setNotice('')
  }

  const twoFactorStep = requiresTwoFactor

  return (
    <div className="auth-page">
      <div className={`auth-card${twoFactorStep ? ' auth-card-single' : ''}`}>
        {!twoFactorStep && (
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
        )}
        <div className="auth-form-side">
          {twoFactorStep ? (
            <>
              <h2>Verify it's you</h2>
              <p className="auth-subtitle">Your sign-in details were accepted. Enter the current code from your authenticator app, or use one of your recovery codes.</p>
            </>
          ) : (
            <>
              <h2>Sign In</h2>
              <p className="auth-subtitle">Enter your credentials to access your account</p>
            </>
          )}

          {notice && <div className="alert alert-success" role="status">{notice}</div>}
          {error && <div className="alert alert-error" role="alert"><i className="fas fa-exclamation-circle" /> {error}</div>}

          <form onSubmit={handleSubmit}>
            {!twoFactorStep ? (
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
              </>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="second-factor-code">Authenticator or recovery code</label>
                <input
                  id="second-factor-code"
                  className="form-input"
                  type="text"
                  value={secondFactorCode}
                  onChange={e => setSecondFactorCode(e.target.value)}
                  placeholder="Enter your 6-digit code or recovery code"
                  autoComplete="one-time-code"
                  autoFocus
                  inputMode="text"
                  maxLength={20}
                  required
                  aria-describedby="second-factor-help"
                />
                <small id="second-factor-help" className="text-muted">Authenticator codes change every 30 seconds. Recovery codes can only be used once.</small>
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading || (twoFactorStep ? !secondFactorCode.trim() : (!email.trim() || !password))}
            >
              {loading
                ? <><span className="spinner spinner-sm" /> {twoFactorStep ? 'Verifying…' : 'Signing in…'}</>
                : (twoFactorStep ? 'Verify and Sign In' : 'Sign In')}
            </button>
          </form>

          {twoFactorStep && (
            <p className="auth-switch">
              <button type="button" className="auth-link-button" disabled={loading} onClick={resetTwoFactorStep}>Back to sign in</button>
            </p>
          )}

          {!twoFactorStep && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem', margin: '1.25rem 0' }}>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
