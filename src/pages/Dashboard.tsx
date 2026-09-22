import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tasksApi, ratingsApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { usePostErrand } from '../hooks/usePostErrand'
import './Dashboard.css'

export default function Dashboard() {
  const { user, isProfileIncomplete, canPostErrands, canAcceptTasks } = useAuth()
  const navigate = useNavigate()
  const { handlePostErrand, ProfileIncompleteModal } = usePostErrand()
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [ratings, setRatings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const type = user?.userType || ''
  const name = user?.firstName || user?.name || 'there'
  const completion = user?.profileCompletion ?? 0

  useEffect(() => {
    Promise.all([
      tasksApi.getDashboardStats().catch(() => ({ data: null })),
      tasksApi.getRecentActivity(6).catch(() => ({ data: null })),
    ]).then(([s, a]) => {
      setStats(s.data?.data || null)
      const items = a.data?.data
      setActivity(Array.isArray(items) ? items : [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (type === 'runner' || type === 'both') {
      setRatingsLoading(true)
      ratingsApi.getForUser(user?.id ?? 0, 1, 3)
        .then(r => setRatings(r.data?.data?.ratings || []))
        .catch(() => setRatings([]))
        .finally(() => setRatingsLoading(false))
    }
  }, [type, user?.id])

  const statCards: Array<[string, string | number, string]> = type === 'creator'
    ? [
        ['Posted tasks', stats?.postedTasks ?? 0, 'fa-tasks'],
        ['Awaiting action', (stats?.pendingPayment ?? 0) + (stats?.awaitingConfirmation ?? 0), 'fa-clock'],
        ['Active', stats?.activeTasks ?? 0, 'fa-spinner'],
        ['Completed', stats?.completedTasks ?? 0, 'fa-check-circle'],
      ]
    : type === 'runner'
      ? [
          ['Available', stats?.availableTasks ?? 0, 'fa-search'],
          ['Active', stats?.myActiveTasks ?? 0, 'fa-running'],
          ['Pending payout', 'R' + Number(stats?.pendingPayouts ?? 0).toFixed(0), 'fa-hourglass-half'],
          ['Paid out', 'R' + Number(stats?.totalEarnings ?? 0).toFixed(0), 'fa-university'],
        ]
      : [
          ['Posted', stats?.postedTasks ?? 0, 'fa-tasks'],
          ['Active', stats?.myActiveTasks ?? 0, 'fa-running'],
          ['Awaiting action', (stats?.pendingPayment ?? 0) + (stats?.awaitingConfirmation ?? 0), 'fa-clock'],
          ['Paid out', 'R' + Number(stats?.totalEarnings ?? 0).toFixed(0), 'fa-university'],
        ]

  return (
    <>
      <div className="admin-page user-overview-page">
        <section className="admin-welcome">
          <div>
            <div className="admin-eyebrow">
              <span className="admin-pulse" /> ACCOUNT OVERVIEW
            </div>
            <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {name}.</h1>
            <p>{type === 'runner' ? 'Find tasks, manage active work and track your payouts.' : type === 'both' ? 'Manage your posted tasks and the work you are completing.' : 'Manage your posted tasks, payments and activity.'}</p>
          </div>
          <div className="admin-date">
            <i className="far fa-calendar" />
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </section>

        {isProfileIncomplete() && (
          <section className="user-overview-profile-alert">
            <div>
              <span className="admin-panel-kicker">PROFILE</span>
              <strong><i className="fas fa-user-circle" /> {completion}% complete</strong>
              <p>Complete your profile to unlock posting and payout features.</p>
            </div>
            <Link to="/user/profile" className="btn btn-secondary btn-sm">Complete profile</Link>
          </section>
        )}

        <section className="admin-kpi-grid" aria-label="Account metrics">
          {statCards.map(([label, value, icon]) => (
            <article className="admin-kpi" key={String(label)}>
              <div className="admin-kpi-top"><span>{label}</span><i className={'fas ' + icon} /></div>
              <strong>{value}</strong>
              <small>{label === 'Available' ? 'Tasks ready to claim' : label === 'Active' ? 'Tasks you are working on' : label === 'Posted tasks' || label === 'Posted' ? 'Tasks you have posted' : label === 'Pending payout' ? 'Awaiting payout' : label === 'Paid out' ? 'Total runner earnings' : label === 'Awaiting action' ? 'Tasks requiring attention' : 'Completed tasks'}</small>
            </article>
          ))}
        </section>

        <section className="admin-attention-grid user-overview-actions">
          {canPostErrands() && !isProfileIncomplete() && (
            <Link to="/tasks/post" className="admin-attention-card neutral">
              <div className="admin-attention-icon"><i className="fas fa-plus" /></div>
              <div><span>Creator</span><strong>Post a task</strong><small>Create a new errand for the marketplace</small></div>
              <i className="fas fa-arrow-right admin-attention-arrow" />
            </Link>
          )}
          {canAcceptTasks() && (
            <Link to="/tasks/browse" className="admin-attention-card warning">
              <div className="admin-attention-icon"><i className="fas fa-search" /></div>
              <div><span>Runner</span><strong>Find a task</strong><small>Browse available work and claim a task</small></div>
              <i className="fas fa-arrow-right admin-attention-arrow" />
            </Link>
          )}
          {(type === 'runner' || type === 'both') && (
            <Link to="/tasks/my-active" className="admin-attention-card danger">
              <div className="admin-attention-icon"><i className="fas fa-running" /></div>
              <div><span>In progress</span><strong>My active tasks</strong><small>Continue work and manage completion</small></div>
              <i className="fas fa-arrow-right admin-attention-arrow" />
            </Link>
          )}
        </section>

        <div className="admin-dashboard-grid user-overview-grid">
          <section className="admin-panel admin-recent-panel">
            <div className="admin-panel-header">
              <div><span className="admin-panel-kicker">Activity</span><h2>Recent activity</h2></div>
              <Link to="/activity">View all <i className="fas fa-arrow-right" /></Link>
            </div>
            {activity.length > 0 ? (
              <div className="admin-recent-list">
                {activity.slice(0, 6).map((a, i) => {
                  const title = a.taskName || a.title || a.name || a.description || a.message || 'Task updated'
                  const status = String(a.status || 'Updated').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
                  return (
                    <div key={a.id || i} className="admin-recent-row">
                      <div className="admin-recent-main">
                        <div className="admin-task-avatar">{title.charAt(0).toUpperCase()}</div>
                        <div>
                          <strong>{title}</strong>
                          <span>{status} · {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : 'Recently'}</span>
                        </div>
                      </div>
                      <div className="admin-recent-value">
                        <span className="admin-status neutral">{status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="admin-empty"><i className="fas fa-inbox" /><p>No recent activity yet.</p></div>
            )}
          </section>

          <aside className="admin-panel admin-quick-panel">
            <div className="admin-panel-header">
              <div><span className="admin-panel-kicker">Shortcuts</span><h2>Quick actions</h2></div>
            </div>
            <div className="admin-action-list">
              {canPostErrands() && !isProfileIncomplete() && <Link to="/tasks/post"><span className="admin-action-icon orange"><i className="fas fa-plus" /></span><span><strong>Post a task</strong><small>Create a new errand</small></span><i className="fas fa-chevron-right" /></Link>}
              {canAcceptTasks() && <Link to="/tasks/browse"><span className="admin-action-icon blue"><i className="fas fa-search" /></span><span><strong>Find a task</strong><small>Browse available work</small></span><i className="fas fa-chevron-right" /></Link>}
              {(type === 'creator' || type === 'both') && <Link to="/tasks/my-posted"><span className="admin-action-icon green"><i className="fas fa-list-check" /></span><span><strong>My posted tasks</strong><small>Track your errands</small></span><i className="fas fa-chevron-right" /></Link>}
              {(type === 'runner' || type === 'both') && <Link to="/tasks/my-active"><span className="admin-action-icon red"><i className="fas fa-running" /></span><span><strong>My active tasks</strong><small>Continue your work</small></span><i className="fas fa-chevron-right" /></Link>}
              {(type === 'runner' || type === 'both') && <Link to="/user/profile?section=banking"><span className="admin-action-icon slate"><i className="fas fa-university" /></span><span><strong>Bank account</strong><small>Manage payout details</small></span><i className="fas fa-chevron-right" /></Link>}
              <Link to="/notifications"><span className="admin-action-icon slate"><i className="fas fa-bell" /></span><span><strong>Notifications</strong><small>Review account updates</small></span><i className="fas fa-chevron-right" /></Link>
              <Link to="/user/profile"><span className="admin-action-icon slate"><i className="fas fa-user" /></span><span><strong>Profile</strong><small>Manage your account</small></span><i className="fas fa-chevron-right" /></Link>
            </div>
          </aside>
        </div>

        {(type === 'runner' || type === 'both') && (
          <section className="admin-health-panel user-overview-health">
            <div>
              <span className="admin-panel-kicker">Reputation</span>
              <h2>Keep building your runner profile</h2>
              <p>{ratings.length ? 'Your recent reviews are shown below.' : 'No reviews yet. Complete tasks and build your reputation with reliable work.'}</p>
            </div>
            <div className="admin-health-metrics">
              <div><strong>{stats?.myActiveTasks ?? 0}</strong><span>Active tasks</span></div>
              <div><strong>{ratings.length}</strong><span>Recent reviews</span></div>
              <div><strong>{Number(stats?.totalEarnings ?? 0) > 0 ? 'R' + Number(stats?.totalEarnings ?? 0).toFixed(0) : 'R0'}</strong><span>Paid out</span></div>
            </div>
          </section>
        )}

        {(type === 'runner' || type === 'both') && ratings.length > 0 && (
          <section className="admin-panel user-overview-reviews">
            <div className="admin-panel-header">
              <div><span className="admin-panel-kicker">Feedback</span><h2>Recent reviews</h2></div>
              <Link to="/tasks/my-completed">View completed <i className="fas fa-arrow-right" /></Link>
            </div>
            <div className="user-overview-review-list">
              {ratings.slice(0, 3).map(r => (
                <div className="user-overview-review" key={r.id}>
                  <div>
                    <strong>{r.taskName || 'Completed task'}</strong>
                    <span className="user-overview-stars" aria-label={String(r.ratingValue) + ' out of 5 stars'}>{'★'.repeat(r.ratingValue)}{'☆'.repeat(5 - r.ratingValue)}</span>
                  </div>
                  {r.review && <p>“{r.review}”</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      {ProfileIncompleteModal}
    </>
  )
}
