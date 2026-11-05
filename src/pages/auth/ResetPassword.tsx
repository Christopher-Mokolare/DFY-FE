import { FormEvent, useLayoutEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api'
import './Auth.css'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // The reset token is supplied in the fragment so it is never sent in the HTTP request.
  // Remove it synchronously before paint and before the user can copy/share the URL.
  useLayoutEffect(() => {
    if (token) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [token])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!token) { setError('This reset link is missing its token. Request a new one.'); return }
    if (password.length < 12 || password.length > 72 || new TextEncoder().encode(password).length > 72) {
      setError('Use a password of at least 12 characters and no more than 72 UTF-8 bytes.')
      return
    }
    if (password !== confirm) { setError('The passwords do not match.'); return }
    setLoading(true)
    try {
      const response = await authApi.resetPassword(token, password)
      if (response.data?.success) setMessage(response.data.message || 'Password reset. You can sign in now.')
      else setError(response.data?.message || 'This reset link is invalid or expired.')
    } catch (err: any) {
      setError(err.response?.data?.message || 'This reset link is invalid or expired. Request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-single">
        <div className="auth-form-side">
          <h1>Choose a new password</h1>
          <p className="auth-subtitle">Use a unique passphrase you don’t use on another site.</p>
          {message && <div className="alert alert-success" role="status">{message}</div>}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {!message && <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="new-password">New password</label>
              <input id="new-password" className="form-input" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={event => setPassword(event.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" className="form-input" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirm} onChange={event => setConfirm(event.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>{loading ? 'Updating…' : 'Reset password'}</button>
          </form>}
          <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
