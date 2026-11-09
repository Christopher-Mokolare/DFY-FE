import { useState, useEffect } from 'react'
import { adminApi, incidentsApi } from '../../api'

function parseEvidenceIds(value?: string | null): number[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(id => Number.isInteger(Number(id))).map(Number) : []
  } catch { return [] }
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [resolveModal, setResolveModal] = useState<any | null>(null)
  const [resolution, setResolution] = useState('')
  const [reason, setReason] = useState('')
  const [action, setAction] = useState('none')
  const [actionLoading, setActionLoading] = useState(false)
  const [resolveError, setResolveError] = useState('')
  const [incidents, setIncidents] = useState<any[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const [incidentFilter, setIncidentFilter] = useState('')
  const [incidentReview, setIncidentReview] = useState<any | null>(null)
  const [incidentStatus, setIncidentStatus] = useState('UnderReview')
  const [incidentNotes, setIncidentNotes] = useState('')
  const [incidentError, setIncidentError] = useState('')
  const [incidentSaving, setIncidentSaving] = useState(false)
  const [holdModal, setHoldModal] = useState<any | null>(null)
  const [holdAction, setHoldAction] = useState<'place' | 'release'>('place')
  const [holdReason, setHoldReason] = useState('')
  const [holdError, setHoldError] = useState('')
  const [holdSaving, setHoldSaving] = useState(false)
  const [evidenceModal, setEvidenceModal] = useState<any | null>(null)
  const [evidenceMessages, setEvidenceMessages] = useState<any[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState('')

  const load = () => {
    setLoading(true)
    const params: any = {}
    if (filter) params.status = filter
    adminApi.getDisputes(params)
      .then(r => setDisputes(r.data?.data?.disputes || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadIncidents = () => {
    setIncidentsLoading(true)
    incidentsApi.getAdmin({ status: incidentFilter || undefined, page: 1, pageSize: 50 })
      .then(r => setIncidents(r.data?.data?.incidents || []))
      .catch(() => setIncidents([]))
      .finally(() => setIncidentsLoading(false))
  }

  useEffect(() => { load() }, [filter])
  useEffect(() => { loadIncidents() }, [incidentFilter])

  const openIncidentEvidence = async (incident: any) => {
    const ids = parseEvidenceIds(incident.evidenceMessageIdsJson)
    if (!ids.length) return
    setEvidenceModal(incident)
    setEvidenceMessages([])
    setEvidenceLoading(true)
    setEvidenceError('')
    try {
      const response = await adminApi.getTaskMessages(String(incident.taskReference))
      if (response.data?.success === false) throw new Error(response.data.message || 'Unable to load task chat')
      const messages = response.data?.data || []
      setEvidenceMessages(messages.filter((message: any) => ids.includes(Number(message.id))))
    } catch (error: any) {
      setEvidenceError(error?.response?.data?.message || error?.message || 'Unable to load task chat evidence')
    } finally {
      setEvidenceLoading(false)
    }
  }

  const saveEscrowHold = async () => {
    if (!holdModal || holdReason.trim().length < 10) {
      setHoldError('Provide a reason of at least 10 characters.')
      return
    }
    setHoldSaving(true)
    setHoldError('')
    try {
      const action = holdAction === 'place' ? incidentsApi.placeEscrowHold : incidentsApi.releaseEscrowHold
      const res = await action(holdModal.id, holdReason.trim())
      if (res.data?.success === false) throw new Error(res.data.message || 'Escrow hold action failed')
      setHoldModal(null)
      setHoldReason('')
      loadIncidents()
    } catch (error: any) {
      setHoldError(error?.response?.data?.message || error?.message || 'Escrow hold action failed')
    } finally {
      setHoldSaving(false)
    }
  }

  const saveIncidentReview = async () => {
    if (!incidentReview || incidentNotes.trim().length < 5) {
      setIncidentError('Add review notes of at least 5 characters.')
      return
    }
    setIncidentSaving(true)
    setIncidentError('')
    try {
      const res = await incidentsApi.review(incidentReview.id, incidentStatus, incidentNotes.trim())
      if (res.data?.success === false) throw new Error(res.data.message || 'Unable to update incident')
      setIncidentReview(null)
      setIncidentNotes('')
      loadIncidents()
    } catch (error: any) {
      setIncidentError(error?.response?.data?.message || error?.message || 'Unable to update incident')
    } finally {
      setIncidentSaving(false)
    }
  }

  const resolve = async () => {
    if (!resolveModal || !resolution.trim() || reason.trim().length < 5 || action === 'none') {
      setResolveError('Select a financial action, enter resolution notes, and provide a reason of at least 5 characters.')
      return
    }
    setActionLoading(true); setResolveError('')
    try {
      const res = await adminApi.resolveDispute(resolveModal.id, resolution, action, reason.trim())
      if (res.data?.success === false) { setResolveError(res.data?.message || 'Failed to resolve dispute'); return }
      setResolveModal(null)
      setResolution('')
      setReason('')
      setAction('none')
      load()
    } catch (err: any) {
      setResolveError(err.response?.data?.message || 'Failed to resolve dispute')
    } finally { setActionLoading(false) }
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-gavel" /> Manage Disputes</h1></div></div>
      <div className="container">
        <div className="section-card">
          <div className="admin-toolbar">
            <select className="form-select" style={{ maxWidth: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Disputes</option>
              <option value="Open">Open</option>
              <option value="Resolved">Resolved</option>
            </select>
            <span className="text-muted text-sm admin-toolbar-spacer admin-toolbar-label">{disputes.length} disputes</span>
          </div>

          {loading ? <div className="loading-state"><div className="spinner" /></div> : (
            <>
              {/* Desktop table */}
              <div className="admin-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      {['Task', 'Reported By', 'Category', 'Issue', 'Status', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {disputes.map((d: any) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', maxWidth: 180 }}>
                          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.taskDescription}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.taskId}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{d.reportedBy}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}><span className="badge badge-info">{d.category}</span></td>
                        <td style={{ padding: '0.75rem 0.5rem', maxWidth: 260 }}>
                          <div style={{ fontSize: '0.85rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.issue}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span className={`badge ${d.status === 'Open' ? 'badge-danger' : 'badge-success'}`}>{d.status}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(d.createdAt).toLocaleDateString('en-ZA')}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          {d.status === 'Open' && (
                            <button className="btn btn-primary btn-sm" onClick={() => { setResolveModal(d); setResolution(''); setReason(''); setAction('release_to_runner'); setResolveError('') }}>Resolve</button>
                          )}
                          {d.status === 'Resolved' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.resolution?.substring(0, 40)}...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {disputes.length === 0 && <div className="empty-state"><i className="fas fa-gavel" /><p>No disputes found</p></div>}
              </div>

              {/* Mobile cards */}
              <div className="admin-cards-wrap">
                {disputes.length === 0 && <div className="empty-state"><i className="fas fa-gavel" /><p>No disputes found</p></div>}
                {disputes.map((d: any) => (
                  <div key={d.id} className="admin-task-card" style={{ borderLeft: d.status === 'Open' ? '3px solid #EF4444' : '3px solid #22C55E' }}>
                    <div className="admin-task-card-header">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.taskDescription}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reported by {d.reportedBy}</div>
                      </div>
                      <span className={`badge ${d.status === 'Open' ? 'badge-danger' : 'badge-success'}`}>{d.status}</span>
                    </div>
                    <div className="admin-task-card-body">
                      <p className="admin-task-subdesc">{d.issue}</p>
                      <div className="admin-task-meta">
                        <span><i className="fas fa-tag" /> {d.category}</span>
                        <span><i className="fas fa-money-bill" /> R{d.taskBudget}</span>
                        <span><i className="fas fa-calendar-alt" /> {new Date(d.createdAt).toLocaleDateString('en-ZA')}</span>
                      </div>
                    </div>
                    <div className="admin-task-card-footer">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(d.createdAt).toLocaleDateString('en-ZA')}</span>
                      {d.status === 'Open' && (
                        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setResolveModal(d)}>Resolve</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="container" style={{ marginTop: '1.5rem' }}>
        <div className="section-card">
          <div className="admin-toolbar">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}><i className="fas fa-flag" /> Task Incidents</h2>
              <p className="text-muted text-sm" style={{ margin: '.25rem 0 0' }}>Operational reports are reviewed separately from formal payment disputes.</p>
            </div>
            <select className="form-select" style={{ maxWidth: 200 }} value={incidentFilter} onChange={e => setIncidentFilter(e.target.value)}>
              <option value="">All incidents</option>
              <option value="Open">Open</option>
              <option value="UnderReview">Under review</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          </div>
          {incidentsLoading ? <div className="loading-state"><div className="spinner" /></div> : incidents.length === 0 ? (
            <div className="empty-state"><i className="fas fa-flag" /><p>No task incidents found</p></div>
          ) : (
            <div style={{ display: 'grid', gap: '.8rem' }}>
              {incidents.map((incident: any) => (
                <article key={incident.id} className="admin-task-card">
                  <div className="admin-task-card-header">
                    <div style={{ flex: 1 }}>
                      <strong>Task {incident.taskReference}</strong>
                      <div className="text-muted text-sm">Incident #{incident.id} · Reporter user #{incident.reporterUserId}</div>
                    </div>
                    <span className={`badge ${incident.status === 'Open' ? 'badge-danger' : incident.status === 'Resolved' ? 'badge-success' : 'badge-info'}`}>{incident.status}</span>
                  </div>
                  <div className="admin-task-card-body">
                    <span className="badge badge-info">{incident.category}</span>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{incident.description}</p>
                    {parseEvidenceIds(incident.evidenceMessageIdsJson).length > 0 && (
                      <button className="btn btn-outline btn-sm" onClick={() => openIncidentEvidence(incident)}>
                        <i className="fas fa-paperclip" /> View {parseEvidenceIds(incident.evidenceMessageIdsJson).length} chat evidence message(s)
                      </button>
                    )}
                    {incident.adminNotes && <p className="text-muted text-sm">Review notes: {incident.adminNotes}</p>}
                    <div className="text-muted text-sm">Reported {new Date(incident.createdAt).toLocaleString('en-ZA')}</div>
                  </div>
                  <div className="admin-task-card-footer" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    {!['Resolved','Dismissed'].includes(incident.status) && (
                      <button className="btn btn-primary btn-sm" onClick={() => { setIncidentReview(incident); setIncidentStatus('UnderReview'); setIncidentNotes(incident.adminNotes || ''); setIncidentError('') }}>Review incident</button>
                    )}
                    {!incident.escrowHoldPlacedAt && incident.escrowHoldReleasedAt == null && incident.status !== 'Resolved' && incident.status !== 'Dismissed' && (
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => { setHoldModal(incident); setHoldAction('place'); setHoldReason(''); setHoldError('') }}>Place escrow hold</button>
                    )}
                    {incident.escrowHoldPlacedAt && !incident.escrowHoldReleasedAt && (
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => { setHoldModal(incident); setHoldAction('release'); setHoldReason(''); setHoldError('') }}>Release escrow hold</button>
                    )}
                  </div>
                  {incident.escrowHoldPlacedAt && (
                    <p className="text-muted text-sm">Escrow hold placed {new Date(incident.escrowHoldPlacedAt).toLocaleString('en-ZA')}. Reason: {incident.escrowHoldReason}</p>
                  )}
                  {incident.escrowHoldReleasedAt && (
                    <p className="text-muted text-sm">Incident hold ended {new Date(incident.escrowHoldReleasedAt).toLocaleString('en-ZA')}. Reason: {incident.escrowHoldReleaseReason}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {evidenceModal && (
        <div className="modal-overlay" onClick={() => setEvidenceModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-comments" /> Chat Hub evidence · {evidenceModal.taskReference}</h3>
              <button className="btn-close" onClick={() => setEvidenceModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {evidenceLoading ? <div className="loading-state"><div className="spinner" /></div> : evidenceError ? (
                <p style={{ color: 'var(--danger)' }}>{evidenceError}</p>
              ) : evidenceMessages.length === 0 ? (
                <div className="empty-state"><p>No referenced messages were returned by the task chat API.</p></div>
              ) : (
                <div style={{ display: 'grid', gap: '.75rem' }}>
                  {evidenceMessages.map((message: any) => (
                    <article key={message.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '.75rem', background: 'var(--background)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
                        <strong>{message.senderName || `User #${message.senderId}`}</strong>
                        <span>{new Date(message.timestamp).toLocaleString('en-ZA')}</span>
                      </div>
                      <p style={{ whiteSpace: 'pre-wrap', margin: '.5rem 0 0', lineHeight: 1.5 }}>{message.content}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setEvidenceModal(null)}>Close</button></div>
          </div>
        </div>
      )}

      {holdModal && (
        <div className="modal-overlay" onClick={() => !holdSaving && setHoldModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-lock" /> {holdAction === 'place' ? 'Place escrow hold' : 'Release escrow hold'}</h3>
              <button className="btn-close" onClick={() => setHoldModal(null)} disabled={holdSaving}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <p>Incident #{holdModal.id} · Task {holdModal.taskReference}</p>
              <div className="alert alert-warning">
                {holdAction === 'place'
                  ? 'This action blocks the automatic escrow release while the task is awaiting confirmation. Payment status remains unchanged.'
                  : 'This restores held escrow and extends the creator confirmation deadline by the exact time spent on hold. Normal backend release rules then resume.'}
              </div>
              <div className="form-group">
                <label className="form-label">Admin reason (10–500 characters)</label>
                <textarea className="form-textarea" rows={4} maxLength={500} value={holdReason} onChange={e => setHoldReason(e.target.value)} placeholder="Record the evidence reviewed and why this action is necessary." />
              </div>
            </div>
            {holdError && <p style={{ color: 'var(--danger)', padding: '0 1.5rem' }}>{holdError}</p>}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setHoldModal(null)} disabled={holdSaving}>Cancel</button>
              <button className={holdAction === 'place' ? 'btn btn-danger' : 'btn btn-primary'} onClick={saveEscrowHold} disabled={holdSaving || holdReason.trim().length < 10}>{holdSaving ? 'Processing…' : holdAction === 'place' ? 'Place hold' : 'Release hold'}</button>
            </div>
          </div>
        </div>
      )}

      {incidentReview && (
        <div className="modal-overlay" onClick={() => !incidentSaving && setIncidentReview(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-flag" /> Review task incident #{incidentReview.id}</h3>
              <button className="btn-close" onClick={() => setIncidentReview(null)} disabled={incidentSaving}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <p><strong>Task:</strong> {incidentReview.taskReference}</p>
              <p><strong>Category:</strong> {incidentReview.category}</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{incidentReview.description}</p>
              {incidentReview.evidenceMessageIdsJson && <p className="text-muted text-sm">Chat evidence IDs: {JSON.parse(incidentReview.evidenceMessageIdsJson).join(', ')}</p>}
              <div className="form-group">
                <label className="form-label">Review status</label>
                <select className="form-select" value={incidentStatus} onChange={e => setIncidentStatus(e.target.value)}>
                  <option value="UnderReview">Under review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Admin notes (required)</label>
                <textarea className="form-textarea" rows={4} maxLength={1000} value={incidentNotes} onChange={e => setIncidentNotes(e.target.value)} placeholder="Record what was reviewed and any support action taken." />
              </div>
            </div>
            {incidentError && <p style={{ color: 'var(--danger)', padding: '0 1.5rem' }}>{incidentError}</p>}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIncidentReview(null)} disabled={incidentSaving}>Cancel</button>
              <button className="btn btn-primary" onClick={saveIncidentReview} disabled={incidentSaving || incidentNotes.trim().length < 5}>{incidentSaving ? 'Saving…' : 'Save review'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="modal-overlay" onClick={() => setResolveModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-gavel" /> Resolve Dispute</h3>
              <button className="btn-close" onClick={() => setResolveModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem', padding: '0.875rem', background: 'var(--background)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--danger)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{resolveModal.taskDescription}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span className="badge badge-info" style={{ marginRight: '0.5rem' }}>{resolveModal.category}</span>
                  Reported by <strong>{resolveModal.reportedBy}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue</div>
                <div style={{ fontSize: '0.875rem', lineHeight: 1.6, background: 'var(--surface)', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>{resolveModal.issue}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Financial Action</label>
                <select className="form-select" value={action} onChange={e => setAction(e.target.value)}>
                  <option value="release_to_runner">Release escrow to runner</option>
                  <option value="refund_creator">Refund creator (cancel task)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Resolution Notes *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe the resolution..."
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Reason *</label>
                <textarea className="form-textarea" placeholder="Why is this financial resolution being applied?" value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={500} />
              </div>
            </div>
            {resolveError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '0 1.5rem 0.5rem' }}>{resolveError}</p>}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setResolveModal(null); setResolveError('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={resolve} disabled={actionLoading || !resolution.trim() || reason.trim().length < 5 || action === 'none'}>
                {actionLoading ? <><span className="spinner spinner-sm" /> Resolving...</> : 'Resolve Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
