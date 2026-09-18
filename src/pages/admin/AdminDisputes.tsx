import { useState, useEffect } from 'react'
import { adminApi } from '../../api'

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

  const load = () => {
    setLoading(true)
    const params: any = {}
    if (filter) params.status = filter
    adminApi.getDisputes(params)
      .then(r => setDisputes(r.data?.data?.disputes || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

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
