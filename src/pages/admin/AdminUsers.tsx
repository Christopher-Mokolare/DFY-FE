import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { adminApi, ratingsApi } from '../../api'
import { exportAllCSV, exportAllPDF } from '../../utils/export'

export default function AdminUsers() {
  const { isSuperAdmin } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [roleModal, setRoleModal] = useState<any | null>(null)
  const [roleValue, setRoleValue] = useState('')
  const [roleReason, setRoleReason] = useState('')
  const [historyModal, setHistoryModal] = useState<any | null>(null)
  const [historyData, setHistoryData] = useState<any | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const [totalCount, setTotalCount] = useState(0)
  const [includeArchived, setIncludeArchived] = useState(false)

  const load = (p = page, s = search, silent = false) => {
    if (!silent) setLoading(true)
    const params: any = { page: p, pageSize: 10, includeArchived }
    if (s) params.search = s
    adminApi.getUsers(params)
      .then(r => {
        const d = r.data?.data
        setUsers(d?.users || [])
        setTotalPages(d?.totalPages || 1)
        setTotalCount(d?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, includeArchived])
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(1, search, true) }, 400); return () => clearTimeout(t) }, [search, includeArchived])

  const regularUserCount = users.filter(u => !u.role?.includes('Admin')).length
  const getMarketplaceRole = (u: any) => {
    switch (String(u.userType || '').trim().toLowerCase()) {
      case 'creator': return 'Creator'
      case 'runner': return 'Runner'
      case 'both': return 'Creator & Runner'
      default: return 'Not selected'
    }
  }
  const getSystemRoles = (u: any): string[] =>
    String(u.role || '').split(',').map((role: string) => role.trim()).filter(Boolean)
  const isAdmin = (u: any) => getSystemRoles(u).some(role => role === 'Admin' || role === 'SuperAdmin')
  const getSystemAccess = (u: any) => getSystemRoles(u).filter(role => role !== 'User').join(', ') || 'Standard'

  const toggleVerify = async (id: number, current: boolean) => {
    const reason = window.prompt(`${current ? 'Unverify' : 'Verify'} admin verification — enter a reason:`)?.trim() || ''
    if (reason.length < 5) {
      setActionError('A reason of at least 5 characters is required')
      return
    }
    try {
      const r = await adminApi.updateUserStatus(id, !current, reason)
      if (r.data?.success === false) { setActionError(r.data?.message || 'Action failed'); return }
      setActionError(''); load()
    } catch { setActionError('Failed to update user status') }
  }

  const openRoleModal = (u: any) => { setRoleValue(u.role || 'User'); setRoleReason(''); setRoleModal(u); setActionError('') }

  const saveRole = async () => {
    if (!roleModal) return
    const reason = roleReason.trim()
    if (reason.length < 5) { setActionError('A reason of at least 5 characters is required'); return }
    setActionLoading(true); setActionError('')
    try {
      const r = await adminApi.updateUserRole(roleModal.id, roleValue, reason)
      if (r.data?.success === false) { setActionError(r.data?.message || 'Failed to update role'); return }
      setRoleModal(null); load()
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update role')
    } finally { setActionLoading(false) }
  }

  const openHistory = async (u: any) => {
    setHistoryModal(u); setHistoryLoading(true); setHistoryData(null)
    try {
      const [histRes, ratRes] = await Promise.all([
        adminApi.getUserTaskHistory(u.id),
        ratingsApi.getForUser(u.id),
      ])
      setHistoryData({ ...histRes.data?.data, ratings: ratRes.data?.data?.ratings || [] })
    } catch { /* ignore */ } finally { setHistoryLoading(false) }
  }

  const suspendUser = async (u: any) => {
    const next = !u.isSuspended
    const reason = window.prompt(`Reason to ${next ? 'suspend' : 'reinstate'} ${u.name} (${u.email}) (minimum 10 characters):`)?.trim() || ''
    if (reason.length < 10) { setActionError('A reason of at least 10 characters is required'); return }
    if (!window.confirm(`${next ? 'Suspend' : 'Reinstate'} ${u.email}? Active sessions will be revoked.`)) return
    setActionLoading(true); setActionError('')
    try {
      const r = await adminApi.updateUserSuspension(u.id, next, reason)
      if (r.data?.success === false) { setActionError(r.data?.message || 'Failed to update account access'); return }
      load()
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update account access')
    } finally { setActionLoading(false) }
  }

  const archiveUser = async (u: any) => {
    const reason = window.prompt(`Reason to archive ${u.name} (${u.email}) (minimum 5 characters):`)?.trim() || ''
    if (reason.length < 5) { setActionError('A reason of at least 5 characters is required'); return }
    if (!window.confirm(`Archive ${u.email}? Their audit/task history will be retained.`)) return
    setActionLoading(true); setActionError('')
    try {
      const r = await adminApi.deleteUser(u.id, reason)
      if (r.data?.success === false) { setActionError(r.data?.message || 'Failed to archive user'); return }
      load()
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to archive user')
    } finally { setActionLoading(false) }
  }

  const restoreUser = async (u: any) => {
    const reason = window.prompt(`Reason to restore ${u.name} (${u.email}) (minimum 5 characters):`)?.trim() || ''
    if (reason.length < 5) { setActionError('A reason of at least 5 characters is required'); return }
    if (!window.confirm(`Restore ${u.email}? A suspended account remains suspended until separately reinstated.`)) return
    setActionLoading(true); setActionError('')
    try {
      const r = await adminApi.restoreUser(u.id, reason)
      if (r.data?.success === false) { setActionError(r.data?.message || 'Failed to restore user'); return }
      load()
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to restore user')
    } finally { setActionLoading(false) }
  }

  const fetchAllUsers = async () => {
    const r = await adminApi.getUsers({ page: 1, pageSize: 10000, includeArchived })
    return r.data?.data?.users || []
  }
  const mapUserRow = (u: any) => [u.name, u.email, getMarketplaceRole(u), getSystemAccess(u), u.tasksPosted ?? 0, u.tasksCompleted ?? 0, u.rating?.toFixed(1) || '0.0', u.emailVerified ? 'Verified' : 'Pending', u.isVerified ? 'Verified' : 'Pending', u.isArchived ? 'Archived' : u.isSuspended ? 'Suspended' : 'Active', new Date(u.createdAt).toLocaleDateString('en-ZA')]

  const exportUsersCSV = () => exportAllCSV('users', ['Name', 'Email', 'Marketplace role', 'System access', 'Tasks Posted', 'Completed', 'Rating', 'Email verified', 'Admin verified', 'Account Status', 'Joined'], fetchAllUsers, mapUserRow)
  const exportUsersPDF = () => exportAllPDF('Users Report', ['Name', 'Email', 'Marketplace role', 'System access', 'Posted', 'Completed', 'Rating', 'Email verified', 'Admin verified', 'Account Status', 'Joined'], fetchAllUsers, mapUserRow)

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-users" /> Manage Users</h1></div></div>
      <div className="container">
        <div className="section-card">
          <div className="admin-toolbar">
            <input className="form-input" placeholder="Filter by name or email..." value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load(1, search)}
              style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-sm" onClick={() => load(1, search)}><i className="fas fa-search" /></button>
            <label className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={includeArchived} onChange={e => { setIncludeArchived(e.target.checked); setPage(1) }} />
              Include archived
            </label>
            <span className="text-muted text-sm admin-toolbar-label">{totalCount} {includeArchived ? 'users (including archived)' : 'active users'}</span>
            <div className="admin-toolbar-actions">
              <button className="btn btn-secondary btn-sm" onClick={exportUsersCSV} disabled={users.length === 0}><i className="fas fa-file-csv" /><span> CSV</span></button>
              <button className="btn btn-secondary btn-sm" onClick={exportUsersPDF} disabled={users.length === 0}><i className="fas fa-file-pdf" /><span> PDF</span></button>
            </div>
          </div>

          {loading ? <div className="loading-state"><div className="spinner" /></div> : (
            <>
              {/* Desktop table */}
              <div className="admin-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      {['Name', 'Email', 'Marketplace role', 'System access', 'Posted', 'Completed', 'Rating', 'Email verified', 'Admin verified', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: u.isArchived ? 'rgba(100,116,139,0.08)' : isAdmin(u) ? 'rgba(239,68,68,0.04)' : undefined }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>
                          {isAdmin(u) && <i className="fas fa-shield-alt" style={{ color: '#EF4444', marginRight: '0.375rem', fontSize: '0.75rem' }} />}
                          {u.name}
                          {u.isArchived && <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>Archived</span>}{!u.isArchived && u.isSuspended && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>Suspended</span>}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}><span className="badge badge-info">{getMarketplaceRole(u)}</span></td>
                        <td style={{ padding: '0.75rem 0.5rem' }}><span className={`badge ${isAdmin(u) ? 'badge-danger' : 'badge-info'}`}>{getSystemAccess(u)}</span></td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{u.tasksPosted ?? 0}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{u.tasksCompleted ?? 0}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{u.rating?.toFixed(1) || '-'}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}><span className={`badge ${u.emailVerified ? 'badge-verified' : 'badge-warning'}`}>{u.emailVerified ? 'Verified' : 'Pending'}</span></td>
                        <td style={{ padding: '0.75rem 0.5rem' }}><span className={`badge ${u.isVerified ? 'badge-verified' : 'badge-warning'}`}>{u.isVerified ? 'Verified' : 'Pending'}</span></td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div className="admin-table-actions">
                            {!u.isArchived && <>
                              <button className={`btn btn-sm ${u.isVerified ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggleVerify(u.id, u.isVerified)}>
                                {u.isVerified ? 'Unverify admin' : 'Verify admin'}
                              </button>
                              {isSuperAdmin() && !getSystemRoles(u).includes('SuperAdmin') && <button className="btn btn-sm btn-outline" onClick={() => openRoleModal(u)} title="Change system access"><i className="fas fa-user-tag" /></button>}
                              <button className="btn btn-sm btn-outline" onClick={() => openHistory(u)} title="View history"><i className="fas fa-history" /></button>
                              {!isAdmin(u) && <button className="btn btn-sm btn-outline" onClick={() => suspendUser(u)} disabled={actionLoading}>{u.isSuspended ? 'Reinstate' : 'Suspend'}</button>}
                         {!isAdmin(u) && <button className="btn btn-sm btn-outline" onClick={() => archiveUser(u)} disabled={actionLoading} title="Archive user">Archive</button>}
                            </>}
                            {u.isArchived && <>
                              <button className="btn btn-sm btn-outline" onClick={() => openHistory(u)} title="View retained history"><i className="fas fa-history" /></button>
                              <button className="btn btn-sm btn-primary" onClick={() => restoreUser(u)} disabled={actionLoading}>Restore</button>
                            </>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <div className="empty-state"><i className="fas fa-users" /><p>No users found</p></div>}
              </div>

              {/* Mobile cards */}
              <div className="admin-cards-wrap">
                {users.length === 0 && <div className="empty-state"><i className="fas fa-users" /><p>No users found</p></div>}
                {users.map((u: any) => (
                  <div key={u.id} className="admin-task-card" style={{ borderLeft: isAdmin(u) ? '3px solid #EF4444' : undefined }}>
                    <div className="admin-task-card-header" style={{ background: isAdmin(u) ? 'rgba(239,68,68,0.06)' : undefined }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {isAdmin(u) && <i className="fas fa-shield-alt" style={{ color: '#EF4444', marginRight: '0.375rem', fontSize: '0.75rem' }} />}
                          {u.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <span className="badge badge-info">{getMarketplaceRole(u)}</span>
                        <span className={`badge ${isAdmin(u) ? 'badge-danger' : 'badge-info'}`}>{getSystemAccess(u)}</span>
                      </div>
                    </div>
                    <div className="admin-task-card-body">
                      <div className="admin-task-meta">
                        <span><i className="fas fa-tasks" /> {u.tasksPosted ?? 0} posted</span>
                        <span><i className="fas fa-check" /> {u.tasksCompleted ?? 0} completed</span>
                        <span><i className="fas fa-star" /> {u.rating?.toFixed(1) || '0.0'} rating</span>
                        <span><i className="fas fa-calendar-alt" /> {new Date(u.createdAt).toLocaleDateString('en-ZA')}</span>
                      </div>
                    </div>
                    <div className="admin-task-card-footer">
                      <span className={`badge ${u.emailVerified ? 'badge-verified' : 'badge-warning'}`}>
                        <i className={`fas fa-${u.emailVerified ? 'check-circle' : 'clock'}`} /> Email {u.emailVerified ? 'verified' : 'pending'}
                      </span>
                      <span className={`badge ${u.isArchived ? 'badge-warning' : u.isSuspended ? 'badge-danger' : u.isVerified ? 'badge-verified' : 'badge-warning'}`}>
                        <i className={`fas fa-${u.isArchived ? 'box-archive' : u.isSuspended ? 'ban' : u.isVerified ? 'check-circle' : 'clock'}`} /> {u.isArchived ? 'Archived' : u.isSuspended ? 'Suspended' : `Admin ${u.isVerified ? 'verified' : 'pending'}`}
                      </span>
                      <div style={{ marginLeft: 'auto' }} className="admin-table-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => openHistory(u)} title="View history"><i className="fas fa-history" /></button>
                        {!u.isArchived && <>
                          {isSuperAdmin() && <button className="btn btn-sm btn-outline" onClick={() => openRoleModal(u)} title="Change system access"><i className="fas fa-user-tag" /></button>}
                          <button className={`btn btn-sm ${u.isVerified ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggleVerify(u.id, u.isVerified)}>
                            {u.isVerified ? 'Unverify admin' : 'Verify admin'}
                          </button>
                          {!isAdmin(u) && <button className="btn btn-sm btn-outline" onClick={() => suspendUser(u)} disabled={actionLoading}>{u.isSuspended ? 'Reinstate' : 'Suspend'}</button>}
                          {!isAdmin(u) && <button className="btn btn-sm btn-outline" onClick={() => archiveUser(u)} disabled={actionLoading}>Archive</button>
                        </>}
                        {u.isArchived && <button className="btn btn-sm btn-primary" onClick={() => restoreUser(u)} disabled={actionLoading}>Restore</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(totalPages > 1 || totalCount > 0) && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><i className="fas fa-chevron-left" /></button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><i className="fas fa-chevron-right" /></button>
              <span className="text-muted text-sm" style={{ marginLeft: '0.5rem', alignSelf: 'center' }}>
                {((page - 1) * 10) + 1}–{Math.min(page * 10, totalCount)} of {totalCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Role Change Modal */}
      {roleModal && (
        <div className="modal-overlay" onClick={() => setRoleModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-user-tag" /> Change system access — {roleModal.name}</h3>
              <button className="btn-close" onClick={() => setRoleModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">System access role</label>
                <select className="form-select" value={roleValue} onChange={e => setRoleValue(e.target.value)}>
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="Admin,User">Admin + User</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-input" rows={3} value={roleReason} onChange={e => setRoleReason(e.target.value)} placeholder="Why is this role changing?" maxLength={500} />
              </div>
            </div>
            {actionError && <div className="alert alert-error" style={{ margin: '0.75rem 0' }}><i className="fas fa-exclamation-circle" /> {actionError}</div>}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRoleModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveRole} disabled={actionLoading}>
                {actionLoading ? <><span className="spinner spinner-sm" /> Saving...</> : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task History Modal */}
      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="modal-box" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-history" /> Task History — {historyModal.name}</h3>
              <button className="btn-close" onClick={() => setHistoryModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              {historyLoading && <div className="loading-state"><div className="spinner" /></div>}
              {historyData && (
                <>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>

                    <div className="stat-card" style={{ flex: 1 }}>
                      <div className="stat-icon bg-warning"><i className="fas fa-star" /></div>
                      <div className="stat-content"><h3>{historyData.user.rating?.toFixed(1) || '0.0'}</h3><p>Rating</p></div>
                    </div>
                  </div>

                  {historyData.postedTasks?.length > 0 && (
                    <>
                      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Posted Tasks ({historyData.postedTasks.length})</p>
                      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '1rem' }}>
                        {historyData.postedTasks.map((t: any) => (
                          <div key={t.taskId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '1rem' }}>R{t.budget}</span>
                            <span className={`badge badge-${t.taskStatus?.toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>{t.taskStatus}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {historyData.acceptedTasks?.length > 0 && (
                    <>
                      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Accepted Tasks ({historyData.acceptedTasks.length})</p>
                      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '1rem' }}>
                        {historyData.acceptedTasks.map((t: any) => (
                          <div key={t.taskId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</span>
                            <span style={{ color: '#22C55E', fontWeight: 600, marginLeft: '1rem' }}>R{t.payout} earned</span>
                            <span className={`badge badge-${t.taskStatus?.toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>{t.taskStatus}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {historyData.postedTasks?.length === 0 && historyData.acceptedTasks?.length === 0 && (
                    <div className="empty-state"><i className="fas fa-tasks" /><p>No task history</p></div>
                  )}

                  {historyData.ratings?.length > 0 && (
                    <>
                      <p style={{ fontWeight: 600, marginBottom: '0.5rem', marginTop: '1rem' }}>Received Ratings ({historyData.ratings.length})</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
                        {historyData.ratings.map((r: any) => (
                          <div key={r.id} style={{ background: 'var(--bg-secondary)', borderRadius: '6px', padding: '0.625rem 0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.taskDescription || 'Task'}</span>
                              <span style={{ color: '#f59e0b', fontWeight: 700 }}>{'★'.repeat(r.ratingValue)}{'☆'.repeat(5 - r.ratingValue)}</span>
                            </div>
                            {r.review && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>"{r.review}"</p>}
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>by {r.ratedBy} · {new Date(r.createdAt).toLocaleDateString('en-ZA')}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setHistoryModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
