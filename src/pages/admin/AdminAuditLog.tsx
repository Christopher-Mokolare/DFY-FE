import { useState, useEffect } from 'react'
import { adminApi } from '../../api'

const actionColors: Record<string, string> = {
  VerifyPayment: 'badge-success', UnverifyPayment: 'badge-warning',
  VerifyUser: 'badge-success', UnverifyUser: 'badge-warning',
  UpdateUserRole: 'badge-info', ForceReleaseEscrow: 'badge-danger',
  VerifyBankAccount: 'badge-success',
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const load = (p = page) => {
    setLoading(true)
    adminApi.getAuditLogs(p, 25)
      .then(r => {
        const d = r.data?.data
        setLogs(d?.logs || [])
        setTotalPages(d?.totalPages || 1)
        setTotalCount(d?.totalCount || d?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-clipboard-list" /> Audit Log</h1></div></div>
      <div className="container">
        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="text-muted text-sm">{totalCount} total actions logged</span>
          </div>

          {loading ? <div className="loading-state"><div className="spinner" /></div> : (
            <>
              {/* Desktop table */}
              <div className="admin-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      {['Admin', 'Action', 'Entity', 'Old Value', 'New Value', 'IP', 'Date'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l: any) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{l.adminName}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span className={`badge ${actionColors[l.action] || 'badge-info'}`}>{l.action}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                          {l.entityType} #{l.entityId}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{l.oldValues ?? '—'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}>{l.newValues ?? '—'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{l.ipAddress || '—'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(l.createdAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && <div className="empty-state"><i className="fas fa-clipboard-list" /><p>No audit logs yet</p></div>}
              </div>

              {/* Mobile cards */}
              <div className="admin-cards-wrap">
                {logs.length === 0 && <div className="empty-state"><i className="fas fa-clipboard-list" /><p>No audit logs yet</p></div>}
                {logs.map((l: any) => (
                  <div key={l.id} className="admin-task-card">
                    <div className="admin-task-card-header">
                      <span style={{ fontWeight: 600 }}>{l.adminName}</span>
                      <span className={`badge ${actionColors[l.action] || 'badge-info'}`} style={{ marginLeft: 'auto' }}>{l.action}</span>
                    </div>
                    <div className="admin-task-card-body">
                      <div className="admin-task-meta">
                        <span><i className="fas fa-tag" /> {l.entityType} #{l.entityId}</span>
                        {l.oldValues && <span><i className="fas fa-arrow-right" /> {l.oldValues} → {l.newValues}</span>}
                      </div>
                    </div>
                    <div className="admin-task-card-footer">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.ipAddress || '—'}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(l.createdAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
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
    </div>
  )
}
