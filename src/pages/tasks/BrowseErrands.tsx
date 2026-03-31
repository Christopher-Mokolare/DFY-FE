import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tasksApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import type { Task } from '../../types'
import './BrowseErrands.css'

const CATEGORIES = ['Grocery Shopping', 'Delivery', 'Cleaning', 'Gardening', 'Moving', 'Repairs', 'Tutoring', 'Pet Care', 'Cooking', 'Other']

function getRunnerPayout(budget: number) {
  return (budget * 0.85).toFixed(0)
}

function getStatusClass(status: string) {
  return status?.toLowerCase().replace(/_/g, '-') || 'unknown'
}

export default function BrowseErrands() {
  const { isAuthenticated, canAcceptTasks, isProfileIncomplete, user } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [claimModal, setClaimModal] = useState<Task | null>(null)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [detailModal, setDetailModal] = useState<Task | null>(null)
  const pageSize = 10

  const load = useCallback(async (p = 1, s = search, cat = category, silent = false) => {
    if (!silent) setLoading(true); setError('')
    try {
      const filters: Record<string, string> = {}
      if (s) filters.search = s
      if (cat) filters.category = cat
      const res = await tasksApi.getAvailable(p, pageSize, filters)
      const data = res.data
      const taskList = data.tasks || data.data || []
      setTasks(taskList)
      setTotalPages(data.totalPages || 1)
      setTotalItems(data.count || taskList.length)
      setLastUpdated(new Date())
    } catch {
      setError('Failed to load tasks. Please try again.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page, search, category) }, [page])
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(1, search, category, true) }, 400); return () => clearTimeout(t) }, [search])

  const handleSearch = () => { setPage(1); load(1, search, category) }

  const handleClaim = async () => {
    if (!claimModal) return
    if (!isAuthenticated()) { navigate('/login'); return }
    if (isProfileIncomplete()) { navigate('/user/profile'); return }
    if (!canAcceptTasks()) { setClaimError('Your profile does not allow accepting tasks.'); return }
    setClaimLoading(true); setClaimError('')
    try {
      const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || ''
      const contact = user?.phoneNumber || user?.contact || ''
      await tasksApi.claim(claimModal.taskId, name, contact)
      setClaimModal(null)
      load(page)
    } catch (err: any) {
      setClaimError(err.response?.data?.message || 'Failed to claim task.')
    } finally { setClaimLoading(false) }
  }

  const getButtonText = (task: Task) => {
    if (!isAuthenticated()) return 'Login to Accept'
    if (isProfileIncomplete()) return 'Complete Profile'
    if (!canAcceptTasks()) return 'Not Available'
    if (task.paymentStatus?.toUpperCase().includes('PENDING')) return 'Awaiting Payment'
    return 'Accept Task'
  }

  const isButtonDisabled = (task: Task) => {
    if (!isAuthenticated()) return false
    if (!canAcceptTasks()) return true
    if (task.paymentStatus?.toUpperCase().includes('PENDING')) return true
    return false
  }

  const handleAccept = (task: Task) => {
    if (!isAuthenticated()) { navigate('/login'); return }
    if (isProfileIncomplete()) { navigate('/user/profile'); return }
    setClaimModal(task)
  }

  return (
    <div className="browse-page">
      <div className="browse-hero">
        <div className="container">
          <div className="browse-hero-inner">
            <div>
              <h1><i className="fas fa-rocket" /> Start Earning Today!</h1>
              <p>Monetize your skills • Choose flexible opportunities • Build your reputation</p>
              <div className="browse-stats">
                <div className="browse-stat"><span className="stat-num">{totalItems}</span><span>Active Tasks</span></div>
                {lastUpdated && <div className="browse-stat"><span className="stat-num">{lastUpdated.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span><span>Last Updated</span></div>}
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => load(page, search, category)} disabled={loading}>
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} /> {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {!isAuthenticated() && (
        <div className="container">
          <div className="guest-alert">
            <i className="fas fa-user-plus" />
            <div><h4>Join to Start Earning</h4><p>Create an account to accept tasks and start earning money today</p></div>
            <div className="guest-actions">
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
              <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        <div className="filters-card">
          <div className="filters-row">
            <div className="search-wrapper">
              <i className="fas fa-search" />
              <input
                type="text"
                className="form-input"
                placeholder="Search tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              {search && <button className="clear-search" onClick={() => { setSearch(''); setPage(1); load(1, '', category) }}><i className="fas fa-times" /></button>}
            </div>
            <select className="form-select" value={category} onChange={e => { setCategory(e.target.value); setPage(1); load(1, search, e.target.value) }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-primary" onClick={handleSearch}>Search</button>
            {(search || category) && <button className="btn btn-secondary" onClick={() => { setSearch(''); setCategory(''); setPage(1); load(1, '', '') }}>Clear</button>}
          </div>
        </div>

        {error && <div className="alert alert-error mb-4"><i className="fas fa-exclamation-circle" /> {error} <button className="btn btn-sm btn-outline" onClick={() => load(page)}>Retry</button></div>}

        {loading ? (
          <div className="loading-state"><div className="spinner" /><p>Loading available tasks...</p></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-search" />
            <h3>No Tasks Found</h3>
            <p>{search || category ? 'Try adjusting your filters.' : 'No tasks available at the moment. Check back later.'}</p>
          </div>
        ) : (
          <div className="tasks-grid">
            {tasks.map(task => (
              <div key={task.taskId || task.id} className="task-card">
                <div className="task-card-header">
                  <span className="task-category"><i className="fas fa-tag" /> {task.category || 'General'}</span>
                  <div className="task-budget"><span className="currency">R</span>{getRunnerPayout(task.budget || 0)}</div>
                </div>
                <div className="task-card-body">
                  <h3 className="task-title">{task.taskName || task.task_description || task.taskDescription || 'No description'}</h3>
                  {task.taskName && (
                    <p className="task-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {task.task_description || task.taskDescription}
                    </p>
                  )}
                  <div className="task-meta">
                    <div className="task-meta-item"><i className="fas fa-map-marker-alt" /><span>{task.area_suburb || task.area || 'Location not specified'}</span></div>
                    <div className="task-meta-item"><i className="fas fa-clock" /><span>{task.date_time_needed || task.dateNeeded ? new Date(task.date_time_needed || task.dateNeeded!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date flexible'}</span></div>
                    {task.notes && <div className="task-meta-item"><i className="fas fa-sticky-note" /><span>{task.notes.substring(0, 50)}</span></div>}
                  </div>
                  <div className="task-footer-meta">
                    <span className="task-time"><i className="fas fa-calendar-plus" /> {new Date(task.timestamp || task.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
                    <span className={`badge badge-${getStatusClass(task.status || task.taskStatus || '')}`}>{task.status || task.taskStatus}</span>
                  </div>
                </div>
                <div className="task-card-footer">
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}
                      onClick={() => setDetailModal(task)}
                    >
                      <i className="fas fa-eye" /><span className="btn-label"> Details</span>
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}
                      disabled={isButtonDisabled(task)}
                      onClick={() => handleAccept(task)}
                    >
                      <i className="fas fa-handshake" /><span className="btn-label"> {getButtonText(task)}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => { setPage(p => { const prev = p - 1; load(prev, search, category); return prev }) }}><i className="fas fa-chevron-left" /></button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => { setPage(p); load(p, search, category) }}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => { setPage(p => { const next = p + 1; load(next, search, category); return next }) }}><i className="fas fa-chevron-right" /></button>
          </div>
        )}
      </div>

      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-tasks" /> Task Details</h3>
              <button className="btn-close" onClick={() => setDetailModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <h4 style={{ marginBottom: '0.5rem' }}>{detailModal.taskName || detailModal.task_description || detailModal.taskDescription}</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', whiteSpace: 'pre-line' }}>{detailModal.task_description || detailModal.taskDescription}</p>
              <div className="task-meta">
                <div className="task-meta-item"><i className="fas fa-tag" /><span>{detailModal.category}</span></div>
                <div className="task-meta-item"><i className="fas fa-map-marker-alt" /><span>{detailModal.area_suburb || detailModal.area}</span></div>
                {(detailModal.date_time_needed || detailModal.dateNeeded) && <div className="task-meta-item"><i className="fas fa-calendar" /><span>{new Date(detailModal.date_time_needed || detailModal.dateNeeded!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
                <div className="task-meta-item"><i className="fas fa-money-bill-wave" /><span>You earn: <strong>R{getRunnerPayout(detailModal.budget)}</strong></span></div>
                {detailModal.notes && <div className="task-meta-item"><i className="fas fa-sticky-note" /><span>{detailModal.notes}</span></div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailModal(null)}>Close</button>
              <button
                className="btn btn-primary"
                disabled={isButtonDisabled(detailModal)}
                onClick={() => { setDetailModal(null); handleAccept(detailModal) }}
              >
                <i className="fas fa-handshake" /> {getButtonText(detailModal)}
              </button>
            </div>
          </div>
        </div>
      )}

      {claimModal && (
        <div className="modal-overlay" onClick={() => setClaimModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-handshake" /> Accept Task</h3>
              <button className="btn-close" onClick={() => setClaimModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <p className="mb-4">You are about to accept this task:</p>
              <div className="claim-task-info">
                <p><strong>{claimModal.task_description || claimModal.taskDescription}</strong></p>
                <p><i className="fas fa-map-marker-alt" /> {claimModal.area_suburb || claimModal.area}</p>
                <p><i className="fas fa-money-bill-wave" /> You earn: <strong className="text-primary">R{getRunnerPayout(claimModal.budget)}</strong></p>
              </div>
              {claimError && <div className="alert alert-error mt-3"><i className="fas fa-exclamation-circle" /> {claimError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setClaimModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleClaim} disabled={claimLoading}>
                {claimLoading ? <><span className="spinner spinner-sm" /> Accepting...</> : 'Confirm Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
