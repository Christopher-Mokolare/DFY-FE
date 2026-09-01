import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tasksApi, ratingsApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { usePostErrand } from '../hooks/usePostErrand'
import './Dashboard.css'

export default function Dashboard() {
  const { user, isProfileIncomplete, isAdmin, canPostErrands, canAcceptTasks } = useAuth()
  const navigate = useNavigate()
  const { handlePostErrand, ProfileIncompleteModal } = usePostErrand()
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [myRatings, setMyRatings] = useState<any[]>([])
  const [ratingsPage, setRatingsPage] = useState(1)
  const [ratingsTotalPages, setRatingsTotalPages] = useState(1)
  const [ratingsTotalCount, setRatingsTotalCount] = useState(0)
  const [ratingsBreakdown, setRatingsBreakdown] = useState<Record<number,number>>({})
  const [ratingsAvg, setRatingsAvg] = useState(0)
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const userType = user?.userType || ''

  const loadRatings = async (p: number) => {
    if (!user?.id) return
    setRatingsLoading(true)
    try {
      const res = await ratingsApi.getForUser(user.id, p, 5)
      const d = res.data?.data
      setMyRatings(d?.ratings || [])
      setRatingsTotalPages(d?.totalPages || 1)
      setRatingsTotalCount(d?.count || 0)
      setRatingsBreakdown(d?.starBreakdown || {})
      setRatingsAvg(d?.average || 0)
    } catch { /* ignore */ } finally { setRatingsLoading(false) }
  }

  useEffect(() => {
    Promise.all([
      tasksApi.getDashboardStats().catch(() => ({ data: null })),
      tasksApi.getRecentActivity(5).catch(() => ({ data: null })),
    ]).then(([statsRes, actRes]) => {
      if (statsRes.data?.data) setStats(statsRes.data.data)
      const acts = actRes.data?.data
      setActivity(Array.isArray(acts) ? acts : [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if ((userType === 'runner' || userType === 'both') && user?.id) loadRatings(ratingsPage)
  }, [ratingsPage, userType, user?.id])

  const displayName = user
    ? (user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.name)
    : ''
  const profileCompletion = user?.profileCompletion ?? 0

  return (
    <>
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="container">
          {userType === 'creator' && (
            <>
              <div className="dashboard-role-pill"><i className="fas fa-user-tie" /> Creator</div>
              <h1><i className="fas fa-user-tie" /> Task Creator Dashboard</h1>
              <p>Manage and track your posted tasks</p>
            </>
          )}
          {userType === 'runner' && (
            <>
              <div className="dashboard-role-pill"><i className="fas fa-running" /> Runner</div>
              <h1><i className="fas fa-running" /> Task Runner Dashboard</h1>
              <p>Find tasks and track your earnings</p>
            </>
          )}
          {userType === 'both' && (
            <>
              <div className="dashboard-role-pill"><i className="fas fa-shield-alt" /> Creator & Runner</div>
              <h1><i className="fas fa-tachometer-alt" /> My Dashboard</h1>
              <p>Manage your tasks as both creator and runner</p>
            </>
          )}
          {!userType && (
            <>
              <div className="dashboard-role-pill"><i className="fas fa-home" /> Welcome</div>
              <h1><i className="fas fa-home" /> Welcome, {displayName}!</h1>
              <p>Set up your profile to get started</p>
            </>
          )}

          {isProfileIncomplete() && (
            <div className="profile-alert">
              <div>
                <h6><i className="fas fa-user-circle" /> Profile Completion: {profileCompletion}%</h6>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${profileCompletion}%` }} />
                </div>
                <p>Complete your profile to unlock all features</p>
              </div>
              <Link to="/user/profile" className="btn btn-secondary btn-sm">Complete Profile</Link>
            </div>
          )}
        </div>
      </div>

      <div className="container dashboard-body">
        {loading ? (
          <div className="loading-state"><div className="spinner" /><p>Loading dashboard...</p></div>
        ) : (
          <>
            {/* Creator stats */}
            {(userType === 'creator' || userType === 'both') && stats && (
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon bg-primary"><i className="fas fa-tasks" /></div><div className="stat-content"><h3>{stats.postedTasks ?? 0}</h3><p>Posted Tasks</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-danger"><i className="fas fa-exclamation-circle" /></div><div className="stat-content"><h3>{stats.pendingPayment ?? 0}</h3><p>Pending Payment</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-warning"><i className="fas fa-spinner" /></div><div className="stat-content"><h3>{stats.activeTasks ?? 0}</h3><p>Active Tasks</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-info"><i className="fas fa-clock" /></div><div className="stat-content"><h3>{stats.awaitingConfirmation ?? 0}</h3><p>Awaiting Confirmation</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-success"><i className="fas fa-check-circle" /></div><div className="stat-content"><h3>{stats.completedPostedTasks ?? 0}</h3><p>Completed</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-dark"><i className="fas fa-money-bill-wave" /></div><div className="stat-content"><h3>R{(stats.totalSpent ?? 0).toFixed(0)}</h3><p>Total Spent</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-secondary"><i className="fas fa-calendar" /></div><div className="stat-content"><h3>R{(stats.thisMonthSpending ?? 0).toFixed(0)}</h3><p>This Month</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-primary"><i className="fas fa-chart-line" /></div><div className="stat-content"><h3>R{(stats.averageTaskCost ?? 0).toFixed(0)}</h3><p>Avg Task Cost</p></div></div>
              </div>
            )}

            {/* Runner stats */}
            {(userType === 'runner' || userType === 'both') && stats && (
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon bg-info"><i className="fas fa-search" /></div><div className="stat-content"><h3>{stats.availableTasks ?? 0}</h3><p>Available Tasks</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-warning"><i className="fas fa-hand-paper" /></div><div className="stat-content"><h3>{stats.myActiveTasks ?? 0}</h3><p>My Active Tasks</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-success"><i className="fas fa-trophy" /></div><div className="stat-content"><h3>{stats.runnerCompletedTasks ?? 0}</h3><p>Completed</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-primary"><i className="fas fa-coins" /></div><div className="stat-content"><h3>R{(stats.totalEarnings ?? 0).toFixed(0)}</h3><p>Total Earnings</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-success"><i className="fas fa-wallet" /></div><div className="stat-content"><h3>R{(stats.availableBalance ?? 0).toFixed(0)}</h3><p>Available Balance</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-warning"><i className="fas fa-hourglass-half" /></div><div className="stat-content"><h3>R{(stats.pendingPayouts ?? 0).toFixed(0)}</h3><p>Pending Payouts</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-info"><i className="fas fa-calendar" /></div><div className="stat-content"><h3>R{(stats.thisMonthEarnings ?? 0).toFixed(0)}</h3><p>This Month</p></div></div>
                <div className="stat-card"><div className="stat-icon bg-dark"><i className="fas fa-percentage" /></div><div className="stat-content"><h3>{(stats.completionRate ?? 0).toFixed(0)}%</h3><p>Completion Rate</p></div></div>
              </div>
            )}

            {/* Recent activity */}
            {activity.length > 0 && (
              <div className="section-card">
                <div className="section-header"><h2><i className="fas fa-history" /> Recent Activity</h2></div>
                <div className="activity-feed">
                  {activity.map((a, i) => (
                    <div key={i} className="activity-item">
                      <div className="activity-icon"><i className={`fas fa-${a.type === 'created' ? 'plus-circle' : 'handshake'}`} /></div>
                      <div className="activity-content">
                        <p>{(a.description || a.message || '').substring(0, 80)}</p>
                        <span className="text-xs text-muted">
                          {new Date(a.updatedAt || a.timestamp).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          <span className={`badge badge-${(a.status || '').toLowerCase()}`}>{a.status}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Ratings - runner/both only */}
            {(userType === 'runner' || userType === 'both') && (
              <div className="section-card">
                <div className="section-header">
                  <h2><i className="fas fa-star" /> My Ratings</h2>
                </div>
                {ratingsTotalCount > 0 && (
                  <div className="ratings-stats">
                    <div className="ratings-score">
                      <div className="ratings-score-num">{ratingsAvg.toFixed(1)}</div>
                      <div className="ratings-score-stars">{'★'.repeat(Math.round(ratingsAvg))}{'☆'.repeat(5 - Math.round(ratingsAvg))}</div>
                      <div className="ratings-score-count">{ratingsTotalCount} review{ratingsTotalCount !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="ratings-bars">
                      {[5,4,3,2,1].map(star => {
                        const cnt = ratingsBreakdown[star] || 0
                        const pct = ratingsTotalCount > 0 ? Math.round((cnt / ratingsTotalCount) * 100) : 0
                        return (
                          <div key={star} className="ratings-bar-row">
                            <span className="ratings-bar-label">{star}</span>
                            <span className="ratings-bar-star">★</span>
                            <div className="ratings-bar-track">
                              <div className="ratings-bar-fill" style={{ width: pct + '%' }} />
                            </div>
                            <span className="ratings-bar-count">{cnt}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {ratingsLoading ? (
                  <div className="loading-state"><div className="spinner" /></div>
                ) : ratingsTotalCount === 0 ? (
                  <p style={{ color: 'var(--text-muted)', padding: '1rem 0', fontSize: '0.9rem' }}>No ratings yet. Complete tasks to receive reviews.</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {myRatings.map((r: any) => (
                        <div key={r.id} className="rating-card">
                          <div className="rating-card-header">
                            <span className="rating-card-title">{r.taskName || r.taskDescription || 'Task'}</span>
                            <span className="rating-card-stars">{'★'.repeat(r.ratingValue)}{'☆'.repeat(5 - r.ratingValue)}</span>
                          </div>
                          {r.review && <p className="rating-card-review">"{r.review}"</p>}
                          <p className="rating-card-meta">by {r.ratedBy} · {new Date(r.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      ))}
                    </div>
                    {ratingsTotalPages > 1 && (
                      <div className="ratings-pagination">
                        <button className="ratings-page-btn" disabled={ratingsPage === 1} onClick={() => setRatingsPage(p => p - 1)}>← Prev</button>
                        <span className="ratings-page-info">Page {ratingsPage} of {ratingsTotalPages}</span>
                        <button className="ratings-page-btn" disabled={ratingsPage === ratingsTotalPages} onClick={() => setRatingsPage(p => p + 1)}>Next →</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div className="section-card">
              <div className="section-header"><h2><i className="fas fa-bolt" /> Quick Actions</h2></div>
              <div className="quick-actions">
                {canPostErrands() && !isProfileIncomplete() && (
                  <button className="btn btn-primary" onClick={handlePostErrand}><i className="fas fa-plus" /> Post New Task</button>
                )}
                {canAcceptTasks() && !isProfileIncomplete() && (
                  <button className="btn btn-primary" onClick={() => navigate('/tasks/browse')}><i className="fas fa-search" /> Find Tasks</button>
                )}
                {(userType === 'creator' || userType === 'both') && (
                  <Link to="/tasks/my-posted" className="btn btn-outline"><i className="fas fa-list" /> My Posted Tasks</Link>
                )}
                {(userType === 'runner' || userType === 'both') && (
                  <Link to="/tasks/my-active" className="btn btn-outline"><i className="fas fa-tasks" /> My Active Tasks</Link>
                )}
                <Link to="/user/profile" className="btn btn-secondary"><i className="fas fa-user" /> My Profile</Link>
                <Link to="/wallet" className="btn btn-secondary"><i className="fas fa-wallet" /> Wallet</Link>
                {isProfileIncomplete() && (
                  <Link to="/user/profile" className="btn btn-primary"><i className="fas fa-cog" /> Complete Profile</Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    {ProfileIncompleteModal}
    </>
  )
}
