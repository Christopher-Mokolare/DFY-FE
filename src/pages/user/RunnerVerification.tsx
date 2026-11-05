import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SumsubVerificationWidget from '../../components/identity/SumsubVerificationWidget'

export default function RunnerVerification() {
  const [handoffCode, setHandoffCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // The one-time handoff is delivered in the URL fragment so browsers do not send
    // it in the HTTP request or referrer header. Remove it before any API call.
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const parameters = new URLSearchParams(rawHash)
    const code = parameters.get('handoff')
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search)

    if (code && code.length >= 20 && code.length <= 200) {
      setHandoffCode(code)
    } else {
      setError('This verification link is missing or has expired. Return to your DoForYou profile and start a new verification session.')
    }
  }, [])

  return (
    <main className="auth-page" style={{ padding: '2rem 1rem', minHeight: '75vh' }}>
      <div className="auth-card" style={{ width: 'min(100%, 900px)', margin: '0 auto' }}>
        <div className="auth-form-side" style={{ width: '100%', padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
          <h1>Runner identity verification</h1>
          <p className="text-muted">
            DoForYou uses a specialist identity provider for ID-document checks and liveness. Your runner permissions stay locked until the backend validates the provider's final result.
          </p>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}{' '}<Link to="/login">Sign in</Link>
            </div>
          )}
          {handoffCode && <SumsubVerificationWidget handoffCode={handoffCode} />}
          <p className="text-muted text-xs" style={{ marginTop: '1rem' }}>
            Keep this window open while completing the check. Do not send ID images, selfie captures or provider tokens to DoForYou support.
          </p>
        </div>
      </div>
    </main>
  )
}
