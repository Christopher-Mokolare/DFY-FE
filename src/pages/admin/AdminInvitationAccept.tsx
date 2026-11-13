import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api'

export default function AdminInvitationAccept() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const accept = async () => {
    if (!token) {
      setError('This invitation link is missing its token. Ask the inviting SuperAdmin to issue a new invitation.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await adminApi.acceptAdminInvitation(token)
      setMessage(response.data?.message || 'Administrator access activated. Sign in again to refresh your permissions.')
    } catch (err: any) {
      setError(err.response?.data?.message || 'The invitation could not be accepted. Confirm that you are signed in with the invited, verified email and have recently completed authenticator MFA.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '42rem', paddingTop: '3rem', paddingBottom: '4rem' }}>
      <div className="section-card">
        <h1><i className="fas fa-user-shield" /> Accept DoForYou Admin Invitation</h1>
        <p>Accepting this invitation grants Admin access to the DoForYou marketplace. It does not grant SuperAdmin access.</p>
        <ul>
          <li>Sign in using the email address that received the invitation.</li>
          <li>Verify that email address.</li>
          <li>Enable authenticator MFA and complete a fresh verification.</li>
          <li>Use this page to activate the invitation before it expires.</li>
        </ul>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {message && <div className="alert alert-success" role="status">{message}</div>}
        {!message && <button type="button" className="btn btn-primary" onClick={() => void accept()} disabled={busy || !token}>
          {busy ? 'Activating...' : 'Accept Admin invitation'}
        </button>}
        <p className="text-muted text-sm" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <Link to="/login">Sign in</Link> if you have not already. If the invitation has expired, contact the inviting SuperAdmin.
        </p>
      </div>
    </div>
  )
}
