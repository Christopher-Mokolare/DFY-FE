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
      tasksApi.getRecentActivity(5).catch(() => ({ data: null })),
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
      <div className="dashboard-page">
        <div className="dashboard-header"><div className="container">
          <div className="dashboard-role-pill"><i className={'fas ' + (type === 'runner' ? 'fa-running' : type === 'both' ? 'fa-handshake' : 'fa-user-tie')} /> {type === 'both' ? 'Creator & Runner' : type ? (type === 'creator' ? 'Creator' : 'Runner') : 'Account setup'}</div>
          <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {name}</h1>
          <p>{type === 'runner' ? 'Find tasks, manage active work and track your payouts.' : type === 'both' ? 'Manage your posted tasks and the work you are completing.' : 'Manage your posted tasks, payments and activity.'}</p>
          {isProfileIncomplete() && <div className="profile-alert">
            <div><h6><i className="fas fa-user-circle" /> Profile {completion}% complete</h6><div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: completion + '%' }} /></div><p>Complete your profile before posting or accepting tasks.</p></div>
            <Link to="/user/profile" className="btn btn-secondary btn-sm">Complete Profile</Link>
          </div>}
        </div></div>

        <div className="container dashboard-body">
          {loading ? <div className="loading-state"><div className="spinner" /><p>Loading your dashboard...</p></div> : <>
            <div className="stats-grid">{statCards.map(([label, value, icon]) => <div className="stat-card" key={String(label)}><div className="stat-icon bg-primary"><i className={'fas ' + icon} /></div><div className="stat-content"><h3>{value}</h3><p>{label}</p></div></div>)}</div>

            <div className="section-card">
              <div className="section-header"><h2><i className="fas fa-bolt" /> Quick actions</h2></div>
              <div className="quick-actions">
                {canPostErrands() && !isProfileIncomplete() && <button className="btn btn-primary" onClick={handlePostErrand}><i className="fas fa-plus" /> Post a Task</button>}
                {canAcceptTasks() && <button className="btn btn-primary" onClick={() => navigate('/tasks/browse')}><i className="fas fa-search" /> Find a Task</button>}
                {(type === 'creator' || type === 'both') && <Link to="/tasks/my-posted" className="btn btn-outline"><i className="fas fa-list" /> My Posted Tasks</Link>}
                {(type === 'runner' || type === 'both') && <Link to="/tasks/my-active" className="btn btn-outline"><i className="fas fa-tasks" /> My Active Tasks</Link>}
                {(type === 'runner' || type === 'both') && <Link to="/user/profile?section=banking" className="btn btn-secondary"><i className="fas fa-university" /> Bank Account</Link>}
                <Link to="/notifications" className="btn btn-outline"><i className="fas fa-bell" /> Notifications</Link>
                <Link to="/user/profile" className="btn btn-secondary"><i className="fas fa-user" /> Profile</Link>
              </div>
            </div>

            {activity.length > 0 && <div className="section-card"><div className="section-header"><h2><i className="fas fa-history" /> Recent activity</h2></div><div className="activity-feed">
              {activity.map((a, i) => <div key={a.id || i} className="activity-item"><div className="activity-icon"><i className={'fas ' + (a.type === 'created' ? 'fa-plus-circle' : 'fa-handshake')} /></div><div className="activity-content"><p>{a.description || a.message || 'Task updated'}</p><span className="text-xs text-muted">{a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : ''} · {a.status || 'Updated'}</span></div></div>)}
            </div></div>}

            {(type === 'runner' || type === 'both') && <div className="section-card"><div className="section-header"><h2><i className="fas fa-star" /> Recent reviews</h2></div>
              {ratingsLoading ? <div className="loading-state"><div className="spinner" /></div> : ratings.length === 0 ? <p className="text-muted">No reviews yet. Complete tasks to build your reputation.</p> :
                ratings.map(r => <div className="rating-card" key={r.id}><div className="rating-card-header"><span className="rating-card-title">{r.taskName || 'Completed task'}</span><span className="rating-card-stars">{'★'.repeat(r.ratingValue)}{'☆'.repeat(5 - r.ratingValue)}</span></div>{r.review && <p className="rating-card-review">"{r.review}"</p>}</div>)}
            </div>}
          </>}
        </div>
      </div>
      {ProfileIncompleteModal}
    </>
  )
}
