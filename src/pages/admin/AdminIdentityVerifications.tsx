import { useEffect, useState } from 'react'
import { adminApi } from '../../api'

type Submission = { id: number; userId: number; documentType: string; status: string; submittedAt: string; reviewDueAt: string; reviewAgeMinutes: number; isOverdue: boolean; isNearDeadline: boolean; isResubmission: boolean; isClaimed: boolean; isClaimedByMe: boolean; claimedByName?: string | null; claimExpiresAt?: string | null; duplicateIdDetected?: boolean; userName: string; email: string }
type QueueCounts = { total: number; nearDeadline: number; overdue: number; claimedByMe: number; unclaimed: number; resubmission: number }
const queueFilters = [
  { value: 'all', label: 'All pending' },
  { value: 'near-deadline', label: 'Near deadline' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'claimed-by-me', label: 'Claimed by me' },
  { value: 'unclaimed', label: 'Unclaimed' },
  { value: 'resubmission', label: 'Resubmissions' },
] as const
type QueueFilter = typeof queueFilters[number]['value']

export default function AdminIdentityVerifications() {
  const [rows, setRows] = useState<Submission[]>([])
  const [selected, setSelected] = useState<Submission | null>(null)
  const [frontUrl, setFrontUrl] = useState('')
  const [backUrl, setBackUrl] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [runnerNote, setRunnerNote] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [verifiedDateOfBirth, setVerifiedDateOfBirth] = useState('')
  const [southAfricanIdNumber, setSouthAfricanIdNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [queueCounts, setQueueCounts] = useState<QueueCounts | null>(null)
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
      const response = await adminApi.getManualIdentityVerifications({ page: 1, pageSize: 50, filter })
      const data = response.data?.data || response.data
      setRows(data?.submissions || [])
      setQueueCounts(data?.queueCounts || null)
    } catch (err: any) {
      setError(err.response?.status === 403 ? 'Administrator access or a recent authenticator verification is required.' : err.response?.data?.message || 'Could not load pending identity applications.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [filter])
  useEffect(() => () => clearUrls(), [])

  useEffect(() => {
    if (!selected) return
    const claimId = selected.id
    const heartbeat = window.setInterval(() => {
      void adminApi.heartbeatManualIdentityReview(claimId).catch(() => {
        setError('Your review claim expired or was reassigned. Close this case and claim it again before continuing.')
      })
    }, 2 * 60 * 1000)
    return () => window.clearInterval(heartbeat)
  }, [selected?.id])

  const open = async (row: Submission) => {
    clearUrls(); setReasonCode(''); setRunnerNote(''); setInternalNote(''); setVerifiedDateOfBirth(''); setSouthAfricanIdNumber(''); setMessage(''); setError('')
    try {
      await adminApi.claimManualIdentityReview(row.id)
      setSelected(row)
      const front = await adminApi.getManualIdentityDocument(row.id, 'front')
      setFrontUrl(URL.createObjectURL(front.data))
      if (row.documentType === 'south_african_id_card') {
        const back = await adminApi.getManualIdentityDocument(row.id, 'back')
        setBackUrl(URL.createObjectURL(back.data))
      }
    } catch (err: any) {
      await adminApi.releaseManualIdentityReview(row.id).catch(() => undefined)
      setSelected(null)
      setError(err.response?.data?.message || (err.response?.status === 403 ? 'Complete administrator authenticator verification before viewing identity documents.' : 'The encrypted identity documents could not be opened.'))
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
      if (decision === 'approve' && !verifiedDateOfBirth) { setError('Enter the date of birth exactly as shown on the document.'); return }
      const isSouthAfricanId = selected.documentType === 'south_african_id_card' || selected.documentType === 'south_african_id_book'
      if (decision === 'approve' && isSouthAfricanId && !/^\d{13}$/.test(southAfricanIdNumber)) { setError('Enter the 13-digit South African ID number shown on the document.'); return }
      const response = await adminApi.decideManualIdentityVerification(selected.id, decision, reasonCode, runnerNote.trim(), internalNote.trim(), verifiedDateOfBirth || undefined, southAfricanIdNumber || undefined)
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
          {queueCounts && <div className="admin-table-actions" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span className="badge badge-info">Queue {queueCounts.total}</span>
            <span className="badge badge-warning">Near deadline {queueCounts.nearDeadline}</span>
            <span className="badge badge-danger">Overdue {queueCounts.overdue}</span>
            <span className="badge badge-info">Claimed by me {queueCounts.claimedByMe}</span>
            <span className="badge badge-info">Unclaimed {queueCounts.unclaimed}</span>
            <span className="badge badge-info">Resubmissions {queueCounts.resubmission}</span>
          </div>}
          <label className="form-label" htmlFor="identity-review-filter">Review queue</label>
          <select id="identity-review-filter" className="form-select" value={filter} onChange={event => {
            const selectedFilter = queueFilters.find(option => option.value === event.target.value)?.value
            if (selectedFilter) setFilter(selectedFilter)
          }} style={{ maxWidth: 320, marginBottom: '1rem' }}>
            {queueFilters.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {loading ? <div className="loading-state"><div className="spinner" /></div> : rows.length === 0 ? <p className="text-muted">There are no pending identity applications in this queue.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>Runner</th><th>Email</th><th>Document</th><th>Submitted</th><th>Review target</th><th>Reviewer</th><th /></tr></thead>
                <tbody>{rows.map(row => <tr key={row.id}>
                  <td>{row.userName}</td><td>{row.email}</td><td>{row.documentType === 'south_african_id_card' ? 'South African Smart ID card' : row.documentType === 'south_african_id_book' ? 'South African green barcoded ID book' : 'South African passport'}{row.duplicateIdDetected && <div className="text-danger text-xs"><strong>Potential duplicate ID — investigation required</strong></div>}</td>
                  <td>{new Date(row.submittedAt).toLocaleString('en-ZA')}</td><td><span style={{ color: row.isOverdue ? '#b91c1c' : 'inherit', fontWeight: row.isOverdue ? 700 : 400 }}>{row.isOverdue ? 'OVERDUE · ' : row.isNearDeadline ? 'NEAR DEADLINE · ' : ''}{new Date(row.reviewDueAt).toLocaleString('en-ZA')}</span><div className="text-muted text-xs">{Math.floor(row.reviewAgeMinutes / 60)}h {row.reviewAgeMinutes % 60}m in queue{row.isResubmission ? ' · resubmission' : ''}</div></td><td>{row.isClaimed ? `${row.claimedByName || 'Another reviewer'}${row.isClaimedByMe ? ' (you)' : ''}` : 'Unclaimed'}{row.claimExpiresAt && <div className="text-muted text-xs">Claim expires {new Date(row.claimExpiresAt).toLocaleTimeString('en-ZA')}</div>}</td><td><button className="btn btn-primary btn-sm" onClick={() => void open(row)} disabled={row.isClaimed && !row.isClaimedByMe}>{row.isClaimed && !row.isClaimedByMe ? 'In review' : 'Review'}</button></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
        {selected && <div className="section-card" style={{ marginTop: '1rem' }}>
          <div className="section-header"><h2>Review {selected.userName}</h2><button className="btn btn-secondary btn-sm" onClick={() => { void adminApi.releaseManualIdentityReview(selected.id).catch(() => undefined); setSelected(null); clearUrls() }}>Close</button></div>
          <p className="text-muted text-sm">{selected.email} · {selected.documentType === 'south_african_id_card' ? 'South African Smart ID card' : selected.documentType === 'south_african_id_book' ? 'South African green barcoded ID book' : 'South African passport'} · Submitted {new Date(selected.submittedAt).toLocaleString('en-ZA')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem' }}>
            {frontUrl && <figure><figcaption>{selected.documentType === 'south_african_id_book' ? 'ID book photo-information page' : selected.documentType === 'passport' ? 'Passport photo-information page' : 'Front of Smart ID card'}</figcaption><div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}><img src={frontUrl} alt="Identity document front" style={{ display: 'block', width: '100%', height: 'auto' }} /><div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', overflow: 'hidden', color: 'rgba(127,29,29,.48)', fontSize: 'clamp(1rem,3vw,2rem)', fontWeight: 800, letterSpacing: '.12em', textAlign: 'center', transform: 'rotate(-24deg)', textShadow: '0 1px 2px rgba(255,255,255,.8)' }}>DFY CONFIDENTIAL · REVIEW ONLY · CASE {selected.id}</div></div></figure>}
            {backUrl && <figure><figcaption>Back of ID card</figcaption><div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}><img src={backUrl} alt="Identity document back" style={{ display: 'block', width: '100%', height: 'auto' }} /><div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', overflow: 'hidden', color: 'rgba(127,29,29,.48)', fontSize: 'clamp(1rem,3vw,2rem)', fontWeight: 800, letterSpacing: '.12em', textAlign: 'center', transform: 'rotate(-24deg)', textShadow: '0 1px 2px rgba(255,255,255,.8)' }}>DFY CONFIDENTIAL · REVIEW ONLY · CASE {selected.id}</div></div></figure>}
          </div>
          {(selected.documentType === 'south_african_id_card' || selected.documentType === 'south_african_id_book') && <>
            <label className="form-label" htmlFor="southAfricanIdNumber">13-digit South African ID number (required for approval)</label>
            <input id="southAfricanIdNumber" className="form-input" type="password" inputMode="numeric" autoComplete="off" maxLength={13} value={southAfricanIdNumber} onChange={e => setSouthAfricanIdNumber(e.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="Enter the number from the document" />
            <p className="text-muted text-xs">The backend validates the ID checksum and compares a keyed fingerprint for possible duplicate accounts. The raw ID number is not stored in the review record.</p>
          </>}
          {selected.duplicateIdDetected && <div className="alert alert-error" role="alert">A possible duplicate ID number has been detected. Do not approve this case; it requires a separate identity investigation.</div>}
          <label className="form-label" htmlFor="verifiedDateOfBirth">Date of birth shown on identity document (required for approval)</label>
          <input id="verifiedDateOfBirth" className="form-input" type="date" value={verifiedDateOfBirth} onChange={e => setVerifiedDateOfBirth(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          <p className="text-muted text-xs">Enter the date printed on the document after checking it. The backend will reject approval if the date shows the runner is under 18.</p>
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
