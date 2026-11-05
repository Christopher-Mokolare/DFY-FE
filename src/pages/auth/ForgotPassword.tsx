import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api'
import './Auth.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)
    try {
      const response = await authApi.forgotPassword(email.trim().toLowerCase())
      setMessage(response.data?.message || 'If an account matches that email, instructions will be sent shortly.')
    } catch {
      setMessage('If an account matches that email, instructions will be sent shortly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-single">
        <div className="auth-form-side">
          <h1>Reset your password</h1>
          <p className="auth-subtitle">Enter the email address for your DoForYou account. If it matches an account, we’ll send a reset link.</p>
          {message && <div className="alert alert-success" role="status">{message}</div>}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="reset-email">Email address</label>
              <input id="reset-email" className="form-input" type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || !email.trim()}>{loading ? 'Sending…' : 'Send reset link'}</button>
          </form>
          <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
