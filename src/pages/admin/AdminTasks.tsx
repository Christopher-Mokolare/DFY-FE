import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api'
import { exportCSV, exportPDF } from '../../utils/export'

function Stars({ value }: { value: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  )
}

export default function AdminTasks() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [searchParams] = useSearchParams()
  const highlight = searchParams.get('highlight') || ''
  const [search, setSearch] = useState(highlight)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const highlightRef = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    if (highlight && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [tasks, highlight])

  const load = (p = page, f = filter, s = search, silent = false) => {
    if (!silent) setLoading(true)
    const params: any = { page: p, pageSize: 20 }
    if (f) params.status = f
    if (s) params.search = s
    adminApi.getTasks(params)
      .then(r => {
        const inner = r.data?.data
        setTasks(inner?.tasks || inner?.Tasks || [])
        setTotalPages(inner?.totalPages || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const [deleteModal, setDeleteModal] = useState<any | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => { load() }, [page, filter])
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(1, filter, search, true) }, 400); return () => clearTimeout(t) }, [search])

  const verify = async (id: string) => {
    try {
      const r = await adminApi.verifyPayment(id)
      if (r.data?.success === false) { setActionError(r.data?.message || 'Verify failed'); return }
      setActionError(''); load()
    } catch { setActionError('Verify failed') }
  }
  const unverify = async (id: string) => {
    try {
      const r = await adminApi.unverifyPayment(id)
      if (r.data?.success === false) { setActionError(r.data?.message || 'Unverify failed'); return }
      setActionError(''); load()
    } catch { setActionError('Unverify failed') }
  }
  const bulkVerify = async () => {
    try {
      const r = await adminApi.bulkVerify(selected)
      if (r.data?.success === false) { setActionError(r.data?.message || 'Bulk verify failed'); return }
      setActionError(''); setSelected([]); load()
    } catch { setActionError('Bulk verify failed') }
  }
  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const confirmDelete = async () => {
    if (!deleteModal) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const r = await adminApi.deleteTask(deleteModal.taskId)
      if (r.data?.success === false) { setDeleteError(r.data?.message || 'Delete failed'); return }
      setDeleteModal(null)
      load()
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message || 'Delete failed')
    } finally { setDeleteLoading(false) }
  }

  const exportTasksCSV = () => exportCSV('tasks', ['Task ID', 'Description', 'Category', 'User', 'Area', 'Budget', 'Payment Status', 'Task Status', 'Runner', 'Rating', 'Created'],
    tasks.map(t => [t.taskId, t.taskDescription, t.category, t.userName, t.area, `R${t.budget}`, t.paymentStatus, t.taskStatus, t.helperName || '', t.rating ? `${t.rating.ratingValue}/5` : '', new Date(t.createdAt).toLocaleDateString('en-ZA')]))

  const exportTasksPDF = () => exportPDF('Tasks Report', ['Task ID', 'Description', 'Category', 'User', 'Area', 'Budget', 'Payment', 'Status', 'Runner', 'Rating', 'Created'],
    tasks.map(t => [t.taskId, t.taskDescription, t.category, t.userName, t.area, `R${t.budget}`, t.paymentStatus, t.taskStatus, t.helperName || '', t.rating ? `${t.rating.ratingValue}/5` : '', new Date(t.createdAt).toLocaleDateString('en-ZA')]))

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-tasks" /> Manage Tasks</h1></div></div>
      <div className="container">
        <div className="section-card">
          <div className="admin-toolbar">
            <select className="form-select" style={{ width: 180 }} value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}>
              <option value="">All Tasks</option>
              <option value="PendingPayment">Pending Payment</option>
              <option value="Posted">Posted</option>
              <option value="Claimed">Claimed</option>
              <option value="Completed">Completed / Paid</option>
              <option value="RunnerPaid">Runner Paid</option>
            </select>
            <input
              className="form-input"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load(1, filter, search)}
              style={{ flex: 1, minWidth: 160 }}
            />
            <button className="btn btn-secondary btn-sm" onClick={() => load(1, filter, search)}><i className="fas fa-search" /></button>
            {selected.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={bulkVerify}>
                <i className="fas fa-check-double" /> Bulk Verify ({selected.length})
              </button>
            )}
            <span className="text-muted text-sm admin-toolbar-spacer admin-toolbar-label">{tasks.length} tasks</span>
            <div className="admin-toolbar-actions">
              <button className="btn btn-secondary btn-sm" onClick={exportTasksCSV} disabled={tasks.length === 0}><i className="fas fa-file-csv" /><span> CSV</span></button>
              <button className="btn btn-secondary btn-sm" onClick={exportTasksPDF} disabled={tasks.length === 0}><i className="fas fa-file-pdf" /><span> PDF</span></button>
            </div>
          </div>
          {actionError && <div className="alert alert-error" style={{ margin: '0.75rem 0' }}><i className="fas fa-exclamation-circle" /> {actionError}</div>}
          {loading ? <div className="loading-state"><div className="spinner" /></div> : (
            <>
              {/* Desktop table */}
              <div className="admin-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 0.5rem', width: 32 }}>
                        <input type="checkbox" onChange={e => setSelected(e.target.checked ? tasks.map(t => t.taskId) : [])} />
                      </th>
                      {['Task ID', 'Description', 'Area', 'Budget', 'Payment', 'Status', 'Runner / Rating', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t: any) => (
                      <tr key={t.taskId || t.id} ref={t.taskId === highlight ? highlightRef : null}
                        style={{ borderBottom: '1px solid var(--border)', background: t.taskId === highlight ? 'var(--primary-light, #eff6ff)' : undefined, transition: 'background 0.3s' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <input type="checkbox" checked={selected.includes(t.taskId)} onChange={() => toggleSelect(t.taskId)} />
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t.taskId}</td>
                        <td style={{ padding: '0.75rem 0.5rem', maxWidth: 200 }}>
                          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.taskName || t.taskDescription}</div>
                          {t.taskName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.taskDescription}</div>}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.category} • {t.userName}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{t.area}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--primary)' }}>R{t.budget}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}><span className={`badge badge-${(t.paymentStatus || '').toLowerCase()}`}>{t.paymentStatus}</span></td>
                        <td style={{ padding: '0.75rem 0.5rem' }}><span className={`badge badge-${(t.taskStatus || '').toLowerCase().replace(/ /g, '_')}`}>{t.taskStatus}</span></td>
                        <td style={{ padding: '0.75rem 0.5rem', minWidth: 140 }}>
                          {t.helperName
                            ? <div>
                                <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{t.helperName}</div>
                                {t.helperContact && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.helperContact}</div>}
                                {t.rating
                                  ? <div style={{ marginTop: '0.2rem' }}>
                                      <Stars value={t.rating.ratingValue} />
                                      {t.rating.review && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                          "{t.rating.review}"
                                        </div>
                                      )}
                                    </div>
                                  : <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.15rem' }}>
                                      <i className="fas fa-star" style={{ opacity: 0.3 }} /> Not rated
                                    </div>}
                              </div>
                            : <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div className="admin-table-actions">
                            {(t.paymentStatus === 'Pending' || t.taskStatus === 'PendingPayment') && (
                              <button className="btn btn-primary btn-sm" onClick={() => verify(t.taskId)}>Verify</button>
                            )}
                            {t.paymentStatus === 'Completed' && t.taskStatus === 'Posted' && (
                              <button className="btn btn-secondary btn-sm" onClick={() => unverify(t.taskId)}>Unverify</button>
                            )}
                            <button className="btn btn-sm" style={{ color: '#EF4444', borderColor: '#EF4444', background: 'transparent' }} onClick={() => { setDeleteError(''); setDeleteModal(t) }}>
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tasks.length === 0 && <div className="empty-state"><i className="fas fa-tasks" /><p>No tasks found</p></div>}
              </div>

              {/* Mobile cards */}
              <div className="admin-cards-wrap">
                {tasks.length === 0 && <div className="empty-state"><i className="fas fa-tasks" /><p>No tasks found</p></div>}
                {tasks.map((t: any) => (
                  <div key={t.taskId || t.id} className="admin-task-card">
                    <div className="admin-task-card-header">
                      <input type="checkbox" checked={selected.includes(t.taskId)} onChange={() => toggleSelect(t.taskId)} />
                      <span className="admin-task-id">{t.taskId}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--primary)' }}>R{t.budget}</span>
                    </div>
                    <div className="admin-task-card-body">
                      <p className="admin-task-desc">{t.taskName || t.taskDescription}</p>
                      {t.taskName && <p className="admin-task-subdesc">{t.taskDescription}</p>}
                      <div className="admin-task-meta">
                        <span><i className="fas fa-tag" /> {t.category}</span>
                        <span><i className="fas fa-user" /> {t.userName}</span>
                        <span><i className="fas fa-map-marker-alt" /> {t.area}</span>
                        {t.helperName && <span><i className="fas fa-running" /> {t.helperName}</span>}
                        {t.rating && <span><Stars value={t.rating.ratingValue} /></span>}
                        {t.helperName && !t.rating && <span style={{ opacity: 0.5 }}><i className="fas fa-star" /> Not rated</span>}
                      </div>
                      {t.rating?.review && (
                        <p className="admin-task-subdesc" style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>"{t.rating.review}"</p>
                      )}
                    </div>
                    <div className="admin-task-card-footer">
                      <span className={`badge badge-${(t.paymentStatus || '').toLowerCase()}`}>{t.paymentStatus}</span>
                      <span className={`badge badge-${(t.taskStatus || '').toLowerCase().replace(/ /g, '_')}`}>{t.taskStatus}</span>
                      {(t.paymentStatus === 'Pending' || t.taskStatus === 'PendingPayment') && (
                        <button className="btn btn-primary btn-sm" onClick={() => verify(t.taskId)}>Verify</button>
                      )}
                      {t.paymentStatus === 'Completed' && t.taskStatus === 'Posted' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => unverify(t.taskId)}>Unverify</button>
                      )}
                      <button className="btn btn-sm" style={{ color: '#EF4444', borderColor: '#EF4444', background: 'transparent', marginLeft: 'auto' }} onClick={() => { setDeleteError(''); setDeleteModal(t) }}>
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><i className="fas fa-chevron-left" /></button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><i className="fas fa-chevron-right" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Task Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-trash" style={{ color: '#EF4444' }} /> Delete Task</h3>
              <button className="btn-close" onClick={() => setDeleteModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                <i className="fas fa-exclamation-triangle" /> This is a soft delete — the task will be hidden from the platform but data is preserved.
              </div>
              <p>Delete task: <strong>{deleteModal.taskDescription}</strong>?</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {deleteModal.taskId} · R{deleteModal.budget} · {deleteModal.taskStatus}
              </p>
              {deleteModal.escrowStatus === 'held' && (
                <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
                  <i className="fas fa-lock" /> This task has held escrow and cannot be deleted.
                </div>
              )}
              {deleteError && <div className="alert alert-error" style={{ marginTop: '0.75rem' }}><i className="fas fa-times-circle" /> {deleteError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="btn" style={{ background: '#EF4444', color: '#fff' }} onClick={confirmDelete} disabled={deleteLoading || deleteModal.escrowStatus === 'held'}>
                {deleteLoading ? <><span className="spinner spinner-sm" /> Deleting...</> : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
