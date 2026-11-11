import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { identityVerificationApi } from '../../api'

export default function RunnerVerification() {
  const [handoffCode, setHandoffCode] = useState('')
  const [documentType, setDocumentType] = useState<'south_african_id_card' | 'south_african_id_book' | 'passport'>('south_african_id_card')
  const [frontDocument, setFrontDocument] = useState<File | null>(null)
  const [backDocument, setBackDocument] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    const code = new URLSearchParams(rawHash).get('handoff')
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search)
    if (code && code.length >= 20 && code.length <= 200) setHandoffCode(code)
    else setError('This secure document-submission link is missing or expired. Return to your DoForYou profile and start again.')
  }, [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!handoffCode) { setError('The secure submission link is invalid.'); return }
    if (!frontDocument) { setError('Choose a clear photo of the front of your identity document.'); return }
    if (documentType === 'south_african_id_card' && !backDocument) { setError('Upload both sides of your South African ID card.'); return }

    const form = new FormData()
    form.append('handoffCode', handoffCode)
    form.append('documentType', documentType)
    form.append('frontDocument', frontDocument)
    if (documentType === 'south_african_id_card' && backDocument) form.append('backDocument', backDocument)

    setSubmitting(true)
    try {
      const response = await identityVerificationApi.submitHandoff(form)
      if (response.data?.success === false) throw new Error(response.data?.message || 'Your documents could not be submitted.')
      setSubmitted(true)
      setHandoffCode('')
      setFrontDocument(null)
      setBackDocument(null)
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
            Submit a South African Smart ID card, green barcoded ID book or passport for review by an authorised DoForYou administrator.
            Documents are encrypted before storage. This is a manual document review; DFY does not perform automated
            government-database checks, liveness detection or facial recognition.
          </p>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {submitted ? (
            <div className="alert alert-success" role="status">
              Your documents were securely submitted. Runner task acceptance remains locked until DFY completes its manual review. You may close this window and return to the app.
            </div>
          ) : handoffCode ? (
            <form onSubmit={submit} className="section-card">
              <p className="text-muted text-sm">Your secure submission link expires in five minutes and can only be used once.</p>
              <label className="form-label" htmlFor="documentType">Identity document</label>
              <select id="documentType" className="form-input" value={documentType} onChange={e => { setDocumentType(e.target.value as 'south_african_id_card' | 'passport'); setBackDocument(null) }}>
                <option value="south_african_id_card">South African Smart ID card (front and back)</option>
                <option value="south_african_id_book">South African green barcoded ID book (photo-information page)</option>
                <option value="passport">Passport</option>
              </select>
              <label className="form-label" htmlFor="frontDocument">{documentType === 'passport' ? 'Passport photo-information page' : documentType === 'south_african_id_book' ? 'ID book photo-information page' : 'Front of Smart ID card'}</label>
              <input id="frontDocument" className="form-input" type="file" accept="image/jpeg,image/png" onChange={e => setFrontDocument(e.target.files?.[0] || null)} required />
              {documentType === 'south_african_id_card' && <>
                <label className="form-label" htmlFor="backDocument">Back of Smart ID card</label>
                <input id="backDocument" className="form-input" type="file" accept="image/jpeg,image/png" onChange={e => setBackDocument(e.target.files?.[0] || null)} required />
              </>}
              <p className="text-muted text-xs">JPG or PNG only. Maximum 5 MB per image. Use clear, uncropped images with all document details visible. Do not upload a selfie.</p>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Encrypting and submitting…' : 'Submit identity documents'}
              </button>
            </form>
          ) : (
            <div className="section-card">
              <p>This page requires a secure one-time link from your signed-in DoForYou profile.</p>
              <Link to="/login" className="btn btn-primary">Sign in to DoForYou</Link>
            </div>
          )}
          <p className="text-muted text-xs" style={{ marginTop: '1rem' }}>
            DFY administrators review the documents manually. Approval is not a government-database verification or automated biometric result.
          </p>
        </div>
      </div>
    </main>
  )
}
