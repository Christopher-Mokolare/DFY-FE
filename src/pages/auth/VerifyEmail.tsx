import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api'
import './Auth.css'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error')
  const [message, setMessage] = useState(token ? 'Verifying your email address…' : 'This verification link is missing its token.')
  const verificationStarted = useRef(false)

  // Remove secret material before the browser paints or any API request is sent.
  useLayoutEffect(() => {
    if (token) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [token])

  useEffect(() => {
    if (!token || verificationStarted.current) return
    verificationStarted.current = true
    authApi.verifyEmail(token).then((response) => {
      if (response.data?.success) {
        setStatus('success')
        setMessage(response.data.message || 'Your email is verified. You can sign in.')
      } else {
        setStatus('error')
        setMessage(response.data?.message || 'This verification link is invalid or has expired.')
      }
    }).catch((error: any) => {
      setStatus('error')
      setMessage(error.response?.data?.message || 'This verification link is invalid or has expired. Request a new one.')
    })
  }, [token])

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-single">
        <div className="auth-form-side">
          <h1>{status === 'success' ? 'Email verified' : status === 'loading' ? 'Verifying email' : 'Verification needed'}</h1>
          <p className="auth-subtitle" role="status">{message}</p>
          {status === 'error' && <p className="auth-switch"><Link to="/login">Return to sign in</Link> or request another verification email.</p>}
          {status === 'success' && <Link className="btn btn-primary btn-block btn-lg" to="/login">Continue to sign in</Link>}
          {status === 'error' && <Link className="btn btn-primary btn-block btn-lg" to="/login">Go to sign in</Link>}
        </div>
      </div>
    </div>
  )
}
