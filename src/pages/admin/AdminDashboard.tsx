import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api'

type DashboardStats = {
  totalUsers?: number
  totalTasks?: number
  pendingTasks?: number
  activeTasks?: number
  completedTasks?: number
  platformEarnings?: number
  grossVolume?: number
  openDisputes?: number
  recentTasks?: Array<{
    taskId: string
    description: string
    userName: string
    budget: number
    status: string
    createdAt: string
  }>
}

const money = (value = 0) => `R${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function statusTone(status = '') {
  const normalized = status.toLowerCase().replace(/\s+/g, '_')
  if (['runnerpaid', 'completed', 'confirmed'].includes(normalized)) return 'success'
  if (['pendingpayment', 'pending', 'payoutpending', 'processing'].includes(normalized)) return 'warning'
  if (['cancelled', 'disputed', 'refundpending'].includes(normalized)) return 'danger'
  return 'neutral'
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getDashboard()
      .then(r => setStats(r.data?.data || r.data))
      .catch(() => setError('We could not load the operations overview.'))
      .finally(() => setLoading(false))
  }, [])

  const pending = stats?.pendingTasks ?? 0
  const active = stats?.activeTasks ?? 0
  const disputes = stats?.openDisputes ?? 0

  if (loading) {
    return <div className="admin-loading"><div className="spinner" /><span>Loading operations overview…</span></div>
  }

  if (error) {
    return <div className="admin-page"><div className="admin-error"><i className="fas fa-circle-exclamation" /><div><strong>Dashboard unavailable</strong><p>{error}</p></div></div></div>
  }

  return (
    <div className="admin-page">
      <section className="admin-welcome">
        <div>
          <div className="admin-eyebrow"><span className="admin-pulse" /> LIVE OPERATIONS</div>
          <h1>Good morning, Admin.</h1>
          <p>Monitor the marketplace, payments and task activity from one place.</p>
        </div>
        <div className="admin-date">
          <i className="far fa-calendar" />
          {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </section>

      <section className="admin-kpi-grid" aria-label="Marketplace metrics">
        <article className="admin-kpi admin-kpi-accent">
          <div className="admin-kpi-top"><span>Total users</span><i className="fas fa-users" /></div>
          <strong>{stats?.totalUsers ?? 0}</strong>
          <small>Registered accounts</small>
        </article>
        <article className="admin-kpi">
          <div className="admin-kpi-top"><span>Total tasks</span><i className="fas fa-list-check" /></div>
          <strong>{stats?.totalTasks ?? 0}</strong>
          <small>{active} active or posted</small>
        </article>
        <article className="admin-kpi">
          <div className="admin-kpi-top"><span>Gross volume</span><i className="fas fa-arrow-trend-up" /></div>
          <strong>{money(stats?.grossVolume)}</strong>
          <small>Task payment volume</small>
        </article>
        <article className="admin-kpi">
          <div className="admin-kpi-top"><span>Platform earnings</span><i className="fas fa-coins" /></div>
          <strong>{money(stats?.platformEarnings)}</strong>
          <small>Recorded platform revenue</small>
        </article>
      </section>

      <section className="admin-attention-grid">
        <Link to="/admin/tasks" className="admin-attention-card warning">
          <div className="admin-attention-icon"><i className="fas fa-clock" /></div>
          <div><span>Needs attention</span><strong>{pending} pending payments</strong><small>Review payment activity</small></div>
          <i className="fas fa-arrow-right admin-attention-arrow" />
        </Link>
        <Link to="/admin/disputes" className="admin-attention-card danger">
          <div className="admin-attention-icon"><i className="fas fa-gavel" /></div>
          <div><span>Open cases</span><strong>{disputes} open disputes</strong><small>Review and resolve cases</small></div>
          <i className="fas fa-arrow-right admin-attention-arrow" />
        </Link>
        <Link to="/admin/payments" className="admin-attention-card neutral">
          <div className="admin-attention-icon"><i className="fas fa-shield-halved" /></div>
          <div><span>Financial controls</span><strong>Payments & payouts</strong><small>Review financial activity</small></div>
          <i className="fas fa-arrow-right admin-attention-arrow" />
        </Link>
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-recent-panel">
          <div className="admin-panel-header">
            <div><span className="admin-panel-kicker">Activity</span><h2>Recent tasks</h2></div>
            <Link to="/admin/tasks">View all <i className="fas fa-arrow-right" /></Link>
          </div>

          {stats?.recentTasks?.length ? (
            <div className="admin-recent-list">
              {stats.recentTasks.map(task => (
                <div className="admin-recent-row" key={task.taskId}>
                  <div className="admin-recent-main">
                    <div className="admin-task-avatar">{(task.userName || 'U').charAt(0).toUpperCase()}</div>
                    <div>
                      <strong>{task.description}</strong>
                      <span>{task.userName} · {task.taskId}</span>
                    </div>
                  </div>
                  <div className="admin-recent-value">
                    <strong>{money(task.budget)}</strong>
                    <span className={`admin-status ${statusTone(task.status)}`}>{task.status}</span>
                  </div>
                  <time>{new Date(task.createdAt).toLocaleDateString('en-ZA')}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty"><i className="fas fa-inbox" /><p>No recent task activity.</p></div>
          )}
        </section>

        <aside className="admin-panel admin-quick-panel">
          <div className="admin-panel-header">
            <div><span className="admin-panel-kicker">Shortcuts</span><h2>Quick actions</h2></div>
          </div>
          <div className="admin-action-list">
            <Link to="/admin/tasks"><span className="admin-action-icon orange"><i className="fas fa-list-check" /></span><span><strong>Manage tasks</strong><small>Review lifecycle and payments</small></span><i className="fas fa-chevron-right" /></Link>
            <Link to="/admin/users"><span className="admin-action-icon blue"><i className="fas fa-users" /></span><span><strong>Manage users</strong><small>Accounts, roles and verification</small></span><i className="fas fa-chevron-right" /></Link>
            <Link to="/admin/payments"><span className="admin-action-icon green"><i className="fas fa-credit-card" /></span><span><strong>Payments</strong><small>Collections and payouts</small></span><i className="fas fa-chevron-right" /></Link>
            <Link to="/admin/disputes"><span className="admin-action-icon red"><i className="fas fa-gavel" /></span><span><strong>Disputes</strong><small>Cases requiring review</small></span><i className="fas fa-chevron-right" /></Link>
            <Link to="/admin/audit-log"><span className="admin-action-icon slate"><i className="fas fa-shield-halved" /></span><span><strong>Audit log</strong><small>Trace administrative activity</small></span><i className="fas fa-chevron-right" /></Link>
          </div>
        </aside>
      </div>

      <section className="admin-health-panel">
        <div>
          <span className="admin-panel-kicker">Marketplace health</span>
          <h2>Everything in one operational view</h2>
          <p>Use the sidebar to move between users, tasks, payments, disputes and the audit trail without leaving the admin workspace.</p>
        </div>
        <div className="admin-health-metrics">
          <div><strong>{stats?.completedTasks ?? 0}</strong><span>Completed</span></div>
          <div><strong>{active}</strong><span>Active / Posted</span></div>
          <div><strong>{disputes}</strong><span>Open disputes</span></div>
        </div>
      </section>
    </div>
  )
}
