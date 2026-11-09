import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api'

type Incident = {
  id: number
  taskReference: string
  taskId: number
  reporterUserId: number
  creatorUserId: number
  runnerUserId: number
  category: string
  description: string
  status: string
  adminNotes?: string | null
  createdAt: string
  reviewedAt?: string | null
  escrowHoldPlacedAt?: string | null
  escrowHoldReleasedAt?: string | null
  escrowHoldReason?: string | null
  escrowHoldReleaseReason?: string | null
}

const statuses = ['Open', 'UnderReview', 'Resolved', 'Dismissed']

export default function AdminIncidents() {
  const [rows, setRows] = useState<Incident[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Incident | null>(null)
  const [evidence, setEvidence] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [reviewStatus, setReviewStatus] = useState('UnderReview')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getTaskIncidents({ status: filter || undefined, page: 1, pageSize: 100 })
      if (res.data?.success === false) throw new Error(res.data?.message || 'Unable to load incidents')
      setRows(res.data?.data?.incidents || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Unable to load incidents')
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { void load() }, [load])

  const selectIncident = async (incident: Incident) => {
    setSelected(incident)
    setNotes(incident.adminNotes || '')
    setReason('')
    setReviewStatus(incident.status === 'Open' ? 'UnderReview' : incident.status)
    setEvidence([])
    setEvidenceLoading(true)
    setError('')
    try {
      const res = await adminApi.getTaskIncidentEvidence(incident.id)
      setEvidence(res.data?.data || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Unable to load evidence')
    } finally { setEvidenceLoading(false) }
  }

  const runAction = async (action: 'hold' | 'release' | 'review') => {
    if (!selected || saving) return
    const cleanReason = reason.trim()
    if (action !== 'review' && cleanReason.length < 10) {
      setError('Provide an operational reason of at least 10 characters.')
      return
    }
    if (action === 'review' && notes.trim().length < 5) {
      setError('Admin review notes must be at least 5 characters.')
      return
    }
    setSaving(true); setError(''); setNotice('')
    try {
      const res = action === 'hold'
        ? await adminApi.placeTaskIncidentEscrowHold(selected.id, cleanReason)
        : action === 'release'
          ? await adminApi.releaseTaskIncidentEscrowHold(selected.id, cleanReason)
          : await adminApi.reviewTaskIncident(selected.id, reviewStatus, notes.trim())
      if (res.data?.success === false) throw new Error(res.data?.message || 'Action was not completed')
      setNotice(res.data?.message || 'Incident updated.')
      setReason('')
      const refreshed = await adminApi.getTaskIncidents({ status: filter || undefined, page: 1, pageSize: 100 })
      const freshRows: Incident[] = refreshed.data?.data?.incidents || []
      setRows(freshRows)
      const freshSelected = freshRows.find(row => row.id === selected.id)
      if (freshSelected) {
        setSelected(freshSelected)
        setNotes(freshSelected.adminNotes || '')
        setReviewStatus(freshSelected.status === 'Open' ? 'UnderReview' : freshSelected.status)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Action failed')
    } finally { setSaving(false) }
  }

  const hasActiveHold = !!selected?.escrowHoldPlacedAt && !selected?.escrowHoldReleasedAt
  const closed = selected?.status === 'Resolved' || selected?.status === 'Dismissed'

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-flag" /> Task Incidents</h1><p>Review participant reports and manage any exceptional escrow holds.</p></div></div>
      <div className="container">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {notice && <div className="alert alert-success" role="status">{notice}</div>}
        <div className="section-card">
          <div className="admin-toolbar">
            <select className="form-select" style={{ maxWidth: 220 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All incidents</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-muted text-sm admin-toolbar-spacer">{rows.length} incidents</span>
            <button className="btn btn-outline btn-sm" onClick={() => void load()} disabled={loading}>Refresh</button>
          </div>
          {loading ? <div className="loading-state"><div className="spinner" /></div> : rows.length === 0 ? (
            <div className="empty-state"><i className="fas fa-flag" /><p>No incidents found</p></div>
          ) : (
            <div className="admin-task-grid">
              {rows.map(row => (
                <button type="button" key={row.id} className="admin-task-card" onClick={() => void selectIncident(row)} style={{ textAlign: 'left', cursor: 'pointer', border: selected?.id === row.id ? '2px solid var(--primary)' : undefined }}>
                  <div className="admin-task-card-header">
                    <div><strong>{row.taskReference}</strong><div className="text-muted text-sm">{row.category}</div></div>
                    <span className={`badge ${row.status === 'Open' ? 'badge-danger' : row.status === 'Resolved' ? 'badge-success' : 'badge-info'}`}>{row.status}</span>
                  </div>
                  <p className="admin-task-subdesc">{row.description}</p>
                  <div className="admin-task-meta"><span>{new Date(row.createdAt).toLocaleString('en-ZA')}</span><span>{row.escrowHoldPlacedAt && !row.escrowHoldReleasedAt ? 'Escrow hold active' : 'No active hold'}</span></div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="section-card" style={{ marginTop: '1.25rem' }}>
            <div className="admin-toolbar"><h2 style={{ margin: 0 }}>Incident #{selected.id} · {selected.taskReference}</h2><span className="badge badge-info">{selected.status}</span></div>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selected.description}</p>
            <div className="admin-task-meta"><span>Reporter user ID: {selected.reporterUserId}</span><span>Creator ID: {selected.creatorUserId}</span><span>Runner ID: {selected.runnerUserId}</span><span>Category: {selected.category}</span></div>
            <h3 style={{ marginTop: '1.25rem' }}>Chat evidence</h3>
            {evidenceLoading ? <p>Loading evidence…</p> : evidence.length === 0 ? <p className="text-muted">No chat messages were attached to this report.</p> : evidence.map(message => (
              <div key={message.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '.7rem', marginBottom: '.5rem' }}>
                <strong>{message.senderName}</strong><span className="text-muted text-sm"> · {new Date(message.timestamp).toLocaleString('en-ZA')}</span>
                <p style={{ margin: '.35rem 0 0', whiteSpace: 'pre-wrap' }}>{message.content}</p>
              </div>
            ))}
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: 12 }}>
              <h3>Escrow controls</h3>
              <p className="text-muted text-sm">Incident submission does not pause payout. Use a hold only when the evidence and risk justify intervention. Every action is audited.</p>
              {hasActiveHold ? (
                <>
                  <p><strong>Active hold:</strong> {selected.escrowHoldReason}</p>
                  <textarea className="form-textarea" rows={2} maxLength={500} placeholder="Reason for releasing the hold (10–500 characters)" value={reason} onChange={e => setReason(e.target.value)} />
                  <button className="btn btn-primary btn-sm" style={{ marginTop: '.6rem' }} disabled={saving || reason.trim().length < 10} onClick={() => void runAction('release')}>{saving ? 'Processing…' : 'Release escrow hold'}</button>
                </>
              ) : selected.escrowHoldPlacedAt ? (
                <p className="text-muted text-sm">Hold released: {selected.escrowHoldReleaseReason || 'No release reason recorded'}</p>
              ) : !closed ? (
                <>
                  <textarea className="form-textarea" rows={2} maxLength={500} placeholder="Reason for placing an escrow hold (10–500 characters)" value={reason} onChange={e => setReason(e.target.value)} />
                  <button className="btn btn-danger btn-sm" style={{ marginTop: '.6rem' }} disabled={saving || reason.trim().length < 10} onClick={() => void runAction('hold')}>{saving ? 'Processing…' : 'Place escrow hold'}</button>
                </>
              ) : <p className="text-muted text-sm">Incident is closed. No further escrow action is available.</p>}
            </div>
            {!closed && (
              <div style={{ marginTop: '1rem' }}>
                <h3>Review decision</h3>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}>
                    <option value="UnderReview">Under review</option><option value="Resolved">Resolved</option><option value="Dismissed">Dismissed</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Admin notes</label><textarea className="form-textarea" rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Record findings, contact attempts and outcome." /></div>
                <button className="btn btn-primary btn-sm" disabled={saving || notes.trim().length < 5} onClick={() => void runAction('review')}>{saving ? 'Saving…' : 'Save review'}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
