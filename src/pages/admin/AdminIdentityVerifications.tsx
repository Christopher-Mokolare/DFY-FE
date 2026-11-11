import { useEffect, useState } from 'react'
import { adminApi } from '../../api'

type Submission = { id: number; userId: number; documentType: string; status: string; submittedAt: string; reviewDueAt: string; reviewAgeMinutes: number; isOverdue: boolean; userName: string; email: string; dateOfBirth?: string | null }

export default function AdminIdentityVerifications() {
  const [rows, setRows] = useState<Submission[]>([])
  const [selected, setSelected] = useState<Submission | null>(null)
  const [frontUrl, setFrontUrl] = useState('')
  const [backUrl, setBackUrl] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [runnerNote, setRunnerNote] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const clearUrls = () => {
    if (frontUrl) URL.revokeObjectURL(frontUrl)
    if (backUrl) URL.revokeObjectURL(backUrl)
    setFrontUrl('')
    setBackUrl('')
  }
  const load = async () => {
    setLoading(true); setError('')
    try {
      const response = await adminApi.getManualIdentityVerifications({ page: 1, pageSize: 50 })
      setRows((response.data?.data || response.data)?.submissions || [])
    } catch (err: any) {
      setError(err.response?.status === 403 ? 'Administrator access or a recent authenticator verification is required.' : err.response?.data?.message || 'Could not load pending identity applications.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load(); return () => clearUrls() }, [])

  const open = async (row: Submission) => {
    clearUrls(); setSelected(row); setReasonCode(''); setRunnerNote(''); setInternalNote(''); setMessage(''); setError('')
    try {
      const front = await adminApi.getManualIdentityDocument(row.id, 'front')
      setFrontUrl(URL.createObjectURL(front.data))
      if (row.documentType === 'south_african_id_card') {
        const back = await adminApi.getManualIdentityDocument(row.id, 'back')
        setBackUrl(URL.createObjectURL(back.data))
      }
    } catch (err: any) {
      setError(err.response?.status === 403 ? 'Complete administrator authenticator verification before viewing identity documents.' : 'The encrypted identity documents could not be opened.')
    }
  }
  const decide = async (decision: 'approve' | 'reject' | 'request_information') => {
    if (!selected) return
    if (decision !== 'approve' && !reasonCode) { setError('Choose a standard reason for this decision.'); return }
    if (decision !== 'approve' && runnerNote.trim().length < 10) { setError('Explain what the runner needs to correct in at least 10 characters.'); return }
    const actionLabel = decision === 'approve' ? 'approve' : decision === 'reject' ? 'reject' : 'request more information for'
    if (!window.confirm('Are you sure you want to ' + actionLabel + ' this runner document review? This decision will be recorded in the audit trail.')) return
    setBusy(true); setError('')
    try {
      const response = await adminApi.decideManualIdentityVerification(selected.id, decision, reasonCode, runnerNote.trim(), internalNote.trim())
      if (response.data?.success === false) throw new Error(response.data?.message || 'The review decision failed.')
      setMessage(response.data?.message || 'Review decision saved.')
      setSelected(null); clearUrls(); await load()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'The review decision failed.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-id-card" /> Runner identity review</h1></div></div>
      <div className="container">
        <div className="section-card">
          <p className="text-muted">Review submitted South African Smart ID cards, green barcoded ID books and passports. Images are encrypted at rest and are only available to administrators with a recent authenticator verification. This is manual document review, not an automated Home Affairs or biometric check.</p>
          {message && <div className="alert alert-success" role="status">{message}</div>}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {loading ? <div className="loading-state"><div className="spinner" /></div> : rows.length === 0 ? <p className="text-muted">There are no pending identity applications.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>Runner</th><th>Email</th><th>Document</th><th>Date of birth</th><th>Submitted</th><th>Review target</th><th /></tr></thead>
                <tbody>{rows.map(row => <tr key={row.id}>
                  <td>{row.userName}</td><td>{row.email}</td><td>{row.documentType === 'south_african_id_card' ? 'South African Smart ID card' : row.documentType === 'south_african_id_book' ? 'South African green barcoded ID book' : 'South African passport'}</td><td>{row.dateOfBirth ? new Date(row.dateOfBirth).toLocaleDateString('en-ZA') : 'Not provided'}</td>
                  <td>{new Date(row.submittedAt).toLocaleString('en-ZA')}</td><td><span style={{ color: row.isOverdue ? '#b91c1c' : 'inherit', fontWeight: row.isOverdue ? 700 : 400 }}>{row.isOverdue ? 'OVERDUE · ' : ''}{new Date(row.reviewDueAt).toLocaleString('en-ZA')}</span><div className="text-muted text-xs">{Math.floor(row.reviewAgeMinutes / 60)}h {row.reviewAgeMinutes % 60}m in queue</div></td><td><button className="btn btn-primary btn-sm" onClick={() => void open(row)}>Review</button></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
        {selected && <div className="section-card" style={{ marginTop: '1rem' }}>
          <div className="section-header"><h2>Review {selected.userName}</h2><button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); clearUrls() }}>Close</button></div>
          <p className="text-muted text-sm">{selected.email} · {selected.documentType === 'south_african_id_card' ? 'South African Smart ID card' : selected.documentType === 'south_african_id_book' ? 'South African green barcoded ID book' : 'South African passport'} · Submitted {new Date(selected.submittedAt).toLocaleString('en-ZA')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem' }}>
            {frontUrl && <figure><figcaption>{selected.documentType === 'south_african_id_book' ? 'ID book photo-information page' : selected.documentType === 'passport' ? 'Passport photo-information page' : 'Front of Smart ID card'}</figcaption><img src={frontUrl} alt="Identity document front" style={{ width: '100%', height: 'auto', borderRadius: 8 }} /></figure>}
            {backUrl && <figure><figcaption>Back of ID card</figcaption><img src={backUrl} alt="Identity document back" style={{ width: '100%', height: 'auto', borderRadius: 8 }} /></figure>}
          </div>
          <label className="form-label" htmlFor="reviewReasonCode">Standard reason</label>
          <select id="reviewReasonCode" className="form-input" value={reasonCode} onChange={e => setReasonCode(e.target.value)}>
            <option value="">Choose a reason (required for reject or request information)</option>
            <option value="document_unclear">Document image is unclear</option>
            <option value="back_side_missing">Required back side is missing</option>
            <option value="document_expired">Document is expired</option>
            <option value="name_mismatch">Name does not match the profile</option>
            <option value="id_number_unreadable">ID number is unreadable</option>
            <option value="suspected_tampering">Document requires additional authenticity review</option>
            <option value="other">Other</option>
          </select>
          <label className="form-label" htmlFor="reviewReasonNote">Explanation for runner</label>
          <textarea id="reviewReasonNote" className="form-input" rows={3} maxLength={850} value={runnerNote} onChange={e => setRunnerNote(e.target.value)} placeholder="Explain what was checked and, if more information is needed, exactly what the runner must correct." />
          <p className="text-muted text-xs">The selected reason and this explanation are included in the runner's review result. Do not enter confidential investigation notes here.</p>
          <label className="form-label" htmlFor="internalReviewNote">Private administrator note (not shown to runner)</label>
          <textarea id="internalReviewNote" className="form-input" rows={2} maxLength={1000} value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Optional internal context for authorised administrators only." />
          <div className="admin-table-actions" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy || !frontUrl} onClick={() => void decide('approve')}>Approve</button>
            <button className="btn btn-secondary" disabled={busy || !frontUrl} onClick={() => void decide('request_information')}>Request information</button>
            <button className="btn btn-danger" disabled={busy || !frontUrl} onClick={() => void decide('reject')}>Reject</button>
          </div>
          <p className="text-muted text-xs">Approval records DFY's manual document review. It does not represent government-database verification or automated liveness. Documents are scheduled for deletion 90 days after a decision.</p>
        </div>}
      </div>
    </div>
  )
}
