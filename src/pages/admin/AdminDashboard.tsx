import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // GET /api/v1/admin/dashboard → { success, data: { totalUsers, totalTasks, pendingTasks, activeTasks, completedTasks, totalRevenue, recentTasks } }
    adminApi.getDashboard()
      .then(r => setStats(r.data?.data || r.data))
      .catch(() => setError('Failed to load dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  // API doesn't return pendingVerification / unclaimedTasks directly — map from what it does return
  const pendingVerification = stats?.pendingTasks ?? 0
  const unclaimedTasks = stats?.activeTasks ?? 0

  return (
    <div>
      <div className="page-header"><div className="container"><div className="dashboard-role-pill"><i className="fas fa-shield-alt" /> Admin</div><h1><i className="fas fa-tachometer-alt" /> Admin Dashboard</h1></div></div>
      <div className="container">
        {loading && <div className="loading-state"><div className="spinner" /><p>Loading...</p></div>}
        {error && <div className="alert alert-error">{error}</div>}
        {stats && (
          <>
            <div className="admin-overview-card">
              <div>
                <p className="admin-overview-label">Operations overview</p>
                <h2>Marketplace health at a glance</h2>
              </div>
              <div className="admin-overview-chips">
                <span><i className="fas fa-users" /> {stats.totalUsers ?? 0} Users</span>
                <span><i className="fas fa-tasks" /> {stats.totalTasks ?? 0} Tasks</span>
                <span><i className="fas fa-money-bill-wave" /> R{(stats.platformEarnings ?? 0).toFixed(2)}</span>
                <span><i className="fas fa-gavel" /> {stats.openDisputes ?? 0} Disputes</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon bg-secondary"><i className="fas fa-users" /></div><div className="stat-content"><h3>{stats.totalUsers ?? 0}</h3><p>Total Users</p></div></div>
              <div className="stat-card"><div className="stat-icon bg-primary"><i className="fas fa-tasks" /></div><div className="stat-content"><h3>{stats.totalTasks ?? 0}</h3><p>Total Tasks</p></div></div>
              <div className="stat-card"><div className="stat-icon bg-warning"><i className="fas fa-clock" /></div><div className="stat-content"><h3>{pendingVerification}</h3><p>Pending Payment</p></div></div>
              <div className="stat-card"><div className="stat-icon bg-info"><i className="fas fa-bullhorn" /></div><div className="stat-content"><h3>{unclaimedTasks}</h3><p>Active/Posted</p></div></div>
              <div className="stat-card"><div className="stat-icon bg-success"><i className="fas fa-check-circle" /></div><div className="stat-content"><h3>{stats.completedTasks ?? 0}</h3><p>Completed</p></div></div>
              <div className="stat-card"><div className="stat-icon bg-dark"><i className="fas fa-money-bill-wave" /></div><div className="stat-content"><h3>R{(stats.platformEarnings ?? 0).toFixed(2)}</h3><p>Platform Earnings</p></div></div>
              <div className="stat-card"><div className="stat-icon bg-info"><i className="fas fa-chart-line" /></div><div className="stat-content"><h3>R{(stats.grossVolume ?? 0).toFixed(2)}</h3><p>Gross Volume</p></div></div>
              <div className="stat-card"><div className="stat-icon bg-danger"><i className="fas fa-gavel" /></div><div className="stat-content"><h3>{stats.openDisputes ?? 0}</h3><p>Open Disputes</p></div></div>
            </div>

            {/* Recent tasks */}
            {stats.recentTasks?.length > 0 && (
              <div className="section-card">
                <div className="section-header"><h2><i className="fas fa-history" /> Recent Tasks</h2></div>

                {/* Desktop table */}
                <div className="admin-table-wrap">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                        {['Task', 'User', 'Budget', 'Status', 'Date'].map(h => (
                          <th key={h} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentTasks.map((t: any) => (
                        <tr key={t.taskId} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', maxWidth: 200 }}>
                            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.taskId}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{t.userName}</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--primary)' }}>R{t.budget}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}><span className={`badge badge-${(t.status || '').toLowerCase()}`}>{t.status}</span></td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{new Date(t.createdAt).toLocaleDateString('en-ZA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="admin-cards-wrap">
                  {stats.recentTasks.map((t: any) => (
                    <div key={t.taskId} className="admin-task-card">
                      <div className="admin-task-card-header">
                        <span className="admin-task-id">{t.taskId}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--primary)' }}>R{t.budget}</span>
                      </div>
                      <div className="admin-task-card-body">
                        <p className="admin-task-desc">{t.description}</p>
                        <div className="admin-task-meta">
                          <span><i className="fas fa-user" /> {t.userName}</span>
                          <span><i className="fas fa-calendar-alt" /> {new Date(t.createdAt).toLocaleDateString('en-ZA')}</span>
                        </div>
                      </div>
                      <div className="admin-task-card-footer">
                        <span className={`badge badge-${(t.status || '').toLowerCase()}`}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="section-card">
              <div className="section-header"><h2>Quick Actions</h2></div>
              <div className="admin-quick-actions">
                <Link to="/admin/tasks" className="btn btn-primary">
                  <i className="fas fa-check-circle" /> Verify Payments
                  {pendingVerification > 0 && <span className="badge badge-warning">{pendingVerification}</span>}
                </Link>
                <Link to="/admin/tasks" className="btn btn-primary"><i className="fas fa-list" /> Manage Tasks</Link>
                <Link to="/admin/users" className="btn btn-primary"><i className="fas fa-users" /> Manage Users</Link>
                <Link to="/admin/payments" className="btn btn-primary"><i className="fas fa-chart-bar" /> View Payments</Link>
                <Link to="/admin/disputes" className="btn btn-primary"><i className="fas fa-gavel" /> Disputes</Link>
                <Link to="/admin/audit-log" className="btn btn-primary"><i className="fas fa-clipboard-list" /> Audit Log</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
