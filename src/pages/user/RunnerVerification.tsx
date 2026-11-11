import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { identityVerificationApi } from '../../api'

type VerificationStatus = {
  status: string
  configured: boolean
  consentVersion: string
  attemptsRemaining: number
  canStart: boolean
  latestSubmission?: { id: number; documentType: string; status: string; submittedAt: string; reviewReason?: string | null } | null
}

export default function RunnerVerification() {
  const [status, setStatus] = useState<VerificationStatus | null>(null)
  const [documentType, setDocumentType] = useState<'south_african_id' | 'passport'>('south_african_id')
  const [frontDocument, setFrontDocument] = useState<File | null>(null)
  const [backDocument, setBackDocument] = useState<File | null>(null)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadStatus = async () => {
    try {
      const response = await identityVerificationApi.getStatus()
      const data = response.data?.data || response.data
      setStatus(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load your identity-verification status. Please sign in again.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadStatus() }, [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!status?.configured) { setError('DFY document verification is not configured yet.'); return }
    if (!consentAccepted) { setError('You must accept the identity-document notice before submitting.'); return }
    if (!frontDocument) { setError('Choose a clear photo of the front of your identity document.'); return }
    if (documentType === 'south_african_id' && !backDocument) { setError('Upload both sides of your South African ID card.'); return }

    const form = new FormData()
    form.append('consentAccepted', 'true')
    form.append('consentVersion', status.consentVersion)
    form.append('documentType', documentType)
    form.append('frontDocument', frontDocument)
    if (documentType === 'south_african_id' && backDocument) form.append('backDocument', backDocument)

    setSubmitting(true)
    try {
      const response = await identityVerificationApi.submit(form)
      const body = response.data
      if (body?.success === false) throw new Error(body?.message || 'Your documents could not be submitted.')
      setMessage(body?.message || 'Your documents were submitted for DFY review.')
      setFrontDocument(null)
      setBackDocument(null)
      setConsentAccepted(false)
      await loadStatus()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Your documents could not be submitted.')
    } finally { setSubmitting(false) }
  }

  return (
    <main className="auth-page" style={{ padding: '2rem 1rem', minHeight: '75vh' }}>
      <div className="auth-card" style={{ width: 'min(100%, 760px)', margin: '0 auto' }}>
        <div className="auth-form-side" style={{ width: '100%', padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
          <h1>Runner identity document review</h1>
          <p className="text-muted">
            Submit a South African identity card or passport for review by an authorised DoForYou administrator.
            Documents are encrypted before storage. This is a manual document review; DFY does not perform automated
            government-database checks, liveness detection or facial recognition.
          </p>
          {loading && <p role="status">Loading verification status…</p>}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {message && <div className="alert alert-success" role="status">{message}</div>}
          {!loading && status && (
            <>
              <div className="section-card" style={{ marginBottom: '1rem' }}>
                <strong>Current status: {status.status.replace(/_/g, ' ')}</strong>
                <p className="text-muted text-sm">Attempts remaining in this 24-hour period: {status.attemptsRemaining}</p>
                {status.latestSubmission?.reviewReason && <p className="text-muted text-sm">Review note: {status.latestSubmission.reviewReason}</p>}
              </div>
              {!status.configured && <div className="alert alert-warning">DFY's secure document encryption is not configured yet. Submissions are disabled.</div>}
              {status.status === 'passed' && <p>Your identity-document review has been approved. Runner eligibility is still subject to the other backend requirements.</p>}
              {status.status === 'pending' && <p>Your documents are awaiting review. You do not need to submit them again.</p>}
              {status.canStart && (
                <form onSubmit={submit} className="section-card">
                  <label className="form-label" htmlFor="documentType">Identity document</label>
                  <select id="documentType" className="form-input" value={documentType} onChange={e => { setDocumentType(e.target.value as 'south_african_id' | 'passport'); setBackDocument(null) }}>
                    <option value="south_african_id">South African ID card</option>
                    <option value="passport">Passport</option>
                  </select>
                  <label className="form-label" htmlFor="frontDocument">{documentType === 'passport' ? 'Passport photo-information page' : 'Front of ID card'}</label>
                  <input id="frontDocument" className="form-input" type="file" accept="image/jpeg,image/png" onChange={e => setFrontDocument(e.target.files?.[0] || null)} required />
                  {documentType === 'south_african_id' && (
                    <>
                      <label className="form-label" htmlFor="backDocument">Back of ID card</label>
                      <input id="backDocument" className="form-input" type="file" accept="image/jpeg,image/png" onChange={e => setBackDocument(e.target.files?.[0] || null)} required />
                    </>
                  )}
                  <p className="text-muted text-xs">JPG or PNG only. Maximum 5 MB per image. Use clear, uncropped images with all document details visible. Do not upload a selfie.</p>
                  <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', margin: '1rem 0' }}>
                    <input type="checkbox" checked={consentAccepted} onChange={e => setConsentAccepted(e.target.checked)} />
                    <span className="text-sm">I have read the <Link to="/privacy">Privacy Policy</Link> and consent to DFY securely processing my identity-document images for runner eligibility review.</span>
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={submitting || !consentAccepted}>
                    {submitting ? 'Submitting securely…' : 'Submit identity documents'}
                  </button>
                </form>
              )}
              {!status.canStart && status.status !== 'passed' && status.status !== 'pending' && (
                <p className="text-muted">You cannot submit another application at this time. Contact support if you need assistance.</p>
              )}
            </>
          )}
          <p className="text-muted text-xs" style={{ marginTop: '1rem' }}>
            Your runner task-acceptance permissions remain controlled by DFY's backend until an authorised administrator records a decision.
          </p>
        </div>
      </div>
    </main>
  )
}
