import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { tasksApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import type { Task } from '../../types'
import Pagination from '../../components/Pagination'
import { usePageMetadata } from '../../hooks/usePageMetadata'
import './BrowseErrands.css'
import TaskCard from '../../components/workspace/TaskCard'

const heroImage = new URL('../../assets/images/image2.jpeg', import.meta.url).href

const CATEGORIES = ['Grocery Shopping', 'Delivery', 'Cleaning', 'Gardening', 'Moving', 'Repairs', 'Tutoring', 'Pet Care', 'Cooking', 'Other']
const PAGE_SIZE = 10

export default function BrowseErrands() {
  usePageMetadata('Find Tasks Near You | DoForYou', 'Explore local tasks on DoForYou, find work that fits your skills and schedule, and earn through verified bank payouts.')
  const { isAuthenticated, canAcceptTasks, isProfileIncomplete, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [claimModal, setClaimModal] = useState<Task | null>(null)
  const [detailModal, setDetailModal] = useState<Task | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [needsPayoutAccount, setNeedsPayoutAccount] = useState(false)

  const load = useCallback(async (p = 1, s = search, cat = category) => {
    setLoading(true)
    setError('')
    try {
      const filters: Record<string, string> = {}
      if (s) filters.search = s
      if (cat) filters.category = cat
      const res = await tasksApi.getAvailable(p, PAGE_SIZE, filters)
      // Accept both the direct paginated response and the standard API data envelope.
      const response = res.data as any
      const data = response?.data ?? response
      const list = (data?.tasks ?? data?.Tasks ?? []) as Task[]
      setTasks(Array.isArray(list) ? list : [])
      setTotalPages(data?.totalPages ?? data?.TotalPages ?? 1)
      setTotalItems(data?.count ?? data?.Count ?? data?.totalCount ?? list.length)
    } catch {
      setError('Failed to load available tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => { load(page, search, category) }, [page])

  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (!taskId || loading || tasks.length === 0) return
    const task = tasks.find(t => String(t.taskId || t.id) === taskId)
    if (task) {
      setTermsAccepted(false)
      setClaimError('')
      setClaimModal(task)
      setSearchParams(prev => {
        prev.delete('taskId')
        return prev
      }, { replace: true })
    }
  }, [searchParams, tasks, loading, setSearchParams])
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      load(1, search, category)
    }, 350)
    return () => clearTimeout(timer)
  }, [search, category])

  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      load(page, search, category)
      setLastUpdated(new Date())
    }, 103000)
    return () => clearInterval(interval)
  }, [page, search, category])

  const handleManualRefresh = () => {
    setLastUpdated(new Date())
    load(page, search, category)
  }
  const title = (task: Task) => task.taskName || task.taskDescription || task.task_description || 'Task'
  const description = (task: Task) => task.task_description || task.taskDescription || ''
  const location = (task: Task) => task.area_suburb || task.area || 'Location to be confirmed'
  const date = (task: Task) => {
    const value = task.date_time_needed || task.dateNeeded
    return value ? new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date flexible'
  }
  // The backend-calculated payout is the financial source of truth. Never derive it from the creator's budget here.
  const payout = (task: Task): number | null => {
    const raw = task.payoutAmount ?? (task as any).PayoutAmount
    if (raw === null || raw === undefined || raw === '') return null
    const amount = Number(raw)
    return Number.isFinite(amount) && amount > 0 ? amount : null
  }
  const payoutLabel = (task: Task) => {
    const amount = payout(task)
    return amount === null ? 'Payout unavailable' : `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const openAccept = (task: Task) => {
    if (!isAuthenticated()) {
      const taskId = String(task.taskId || task.id || '')
      return navigate(taskId ? `/login?returnToTaskId=${encodeURIComponent(taskId)}` : '/login', {
        state: taskId ? { returnToTaskId: taskId } : undefined,
      })
    }
    if (isProfileIncomplete()) return navigate('/user/profile')
    if (!canAcceptTasks()) return
    setTermsAccepted(false)
    setClaimError('')
    setNeedsPayoutAccount(false)
    setClaimModal(task)
  }

  const accept = async () => {
    if (!claimModal || !termsAccepted) return
    setClaimLoading(true)
    setClaimError('')
    setNeedsPayoutAccount(false)
    try {
      const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || ''
      const contact = user?.phoneNumber || user?.contact || ''
      const res = await tasksApi.claim(claimModal.taskId, name, contact, true)
      if (res.data?.success !== true || res.data?.data !== true) {
        setNeedsPayoutAccount(res.data?.error === 'PAYOUT_BANK_ACCOUNT_REQUIRED')
        setClaimError(res.data?.message || 'This task could not be accepted.')
        await load(page, search, category)
        return
      }
      const acceptedId = claimModal.taskId
      setClaimModal(null)
      setTasks(prev => prev.filter(t => t.taskId !== acceptedId))
      navigate('/tasks/my-active')
    } catch (err: any) {
      const missingPayoutAccount = err.response?.data?.error === 'PAYOUT_BANK_ACCOUNT_REQUIRED'
      setNeedsPayoutAccount(missingPayoutAccount)
      setClaimError(err.response?.data?.message || 'This task is no longer available. Please refresh and try again.')
      if (!missingPayoutAccount)
        setTasks(prev => prev.filter(t => t.taskId !== claimModal.taskId))
    } finally {
      setClaimLoading(false)
    }
  }

  const buttonText = () => {
    if (!isAuthenticated()) return 'Sign in'
    if (isProfileIncomplete()) return 'Complete profile'
    if (!canAcceptTasks()) return 'Not available'
    return 'Accept task'
  }

  return (
    <div className="browse-page">
      {!isAuthenticated() && (
        <header className="browse-hero premium-page-hero">
          <div className="container browse-hero-grid">
            <div className="browse-hero-copy">
              <span className="marketing-kicker">AVAILABLE TASKS</span>
              <h1>Find work. <em>Get paid.</em></h1>
              <p>Browse local tasks posted by real people. Accept work that fits your skills and schedule, and receive payouts directly to your bank account.</p>
              <div className="browse-hero-trust">
                <span><i>✓</i> Verified payouts</span>
                <span><i>✓</i> Protected payments</span>
                <span><i>✓</i> Real local tasks</span>
              </div>
              <div className="marketing-actions" style={{ marginTop: '1.5rem' }}>
                <Link className="btn btn-primary btn-lg" to="/register">Sign up to earn</Link>
                <Link className="btn btn-secondary btn-lg" to="/login">Log in</Link>
              </div>
            </div>
            <div className="browse-hero-visual">
              <img src={heroImage} alt="A runner completing a local task" />
              <div className="browse-hero-image-note"><span className="hero-caption-dot" /> Accept tasks · Complete work · Get paid</div>
            </div>
          </div>
        </header>
      )}
      <div className="container browse-content">
        <div className="browse-toolbar"><div className="browse-toolbar-stat"><strong>{totalItems}</strong><span>Available Tasks</span></div><div className="browse-toolbar-right"><span className="browse-refresh-timer"><i className="fas fa-clock" /> Last updated: {lastUpdated.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span><button className="btn btn-secondary btn-sm" onClick={handleManualRefresh} disabled={loading}><i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} /> {loading ? 'Refreshing...' : 'Refresh'}</button></div></div>

      <div className="container">
        <div className="filters-card"><div className="filters-row">
          <div className="search-wrapper"><i className="fas fa-search" /><input className="form-input" type="search" placeholder="Search tasks..." aria-label="Search tasks" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(1)} /></div>
          <select className="form-select" value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}>
            <option value="">All Categories</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || category) && <button className="btn btn-secondary" onClick={() => { setSearch(''); setCategory(''); setPage(1) }}>Clear</button>}
        </div></div>

        {error && <div className="alert alert-error mb-4"><i className="fas fa-exclamation-circle" /> {error}<button className="btn btn-sm btn-outline" onClick={() => load(page)}>Retry</button></div>}

        {loading ? <div className="loading-state"><div className="spinner" /><p>Loading available tasks...</p></div> :
          tasks.length === 0 ? <div className="empty-state"><i className="fas fa-search" /><h3>No Tasks Found</h3><p>{search || category ? 'Try adjusting your filters.' : 'No tasks are available right now.'}</p></div> :
          <div className="tasks-grid">{tasks.map(task => (
            <TaskCard as="article" key={task.taskId || task.id} className="task-card">
              <div className="task-card-header"><span className="task-category"><i className="fas fa-tag" /> {task.category || 'General'}</span></div>
              <div className="task-card-body">
                <h3 className="task-title">{title(task)}</h3>
                <p className="task-subtitle">{description(task).slice(0, 140)}{description(task).length > 140 ? '…' : ''}</p>
                <div className="task-meta task-meta-grid">
                  <div className="task-meta-item"><i className="fas fa-map-marker-alt" /><span>{location(task)}</span></div>
                  <div className="task-meta-item"><i className="fas fa-calendar-alt" /><span>{date(task)}</span></div>
                </div>
                <div className="task-earnings"><span className="task-earnings-label">You earn</span><strong>{payoutLabel(task)}</strong></div>
                <div className="task-protection"><i className="fas fa-shield-alt" /><span>Protected payment · Direct bank payout</span></div>
              </div>
              <div className="task-card-footer">
                <button className="btn btn-outline btn-sm" onClick={() => setDetailModal(task)}><i className="fas fa-eye" /> View task</button>
                <button className="btn btn-primary btn-sm" disabled={isAuthenticated() && !canAcceptTasks()} onClick={() => openAccept(task)}>{buttonText()} <i className="fas fa-arrow-right" /></button>
              </div>
            </TaskCard>
          ))}</div>}

        {!loading && <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalItems}
          totalPages={totalPages}
          onPageChange={setPage}
          label="available tasks"
        />}
      </div>
      </div>

      {detailModal && <div className="modal-overlay" onClick={() => setDetailModal(null)}>
        <div className="modal-box task-detail-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><div><span className="modal-eyebrow">{detailModal.category || 'Task'}</span><h3><i className="fas fa-tasks" /> {title(detailModal)}</h3></div><button className="btn-close" onClick={() => setDetailModal(null)}><i className="fas fa-times" /></button></div>
          <div className="modal-body">
            <p className="detail-description">{description(detailModal)}</p>
            <div className="detail-grid">
              <div className="detail-item"><span>Location</span><strong><i className="fas fa-map-marker-alt" /> {location(detailModal)}</strong></div>
              <div className="detail-item"><span>When</span><strong><i className="fas fa-calendar-alt" /> {date(detailModal)}</strong></div>
              <div className="detail-item detail-earnings"><span>Your earnings</span><strong>{payoutLabel(detailModal)}</strong></div>
            </div>
            <div className="task-protection"><i className="fas fa-shield-alt" /><span>Payment is held by DFY and released to your verified bank account after the task is completed and confirmed.</span></div>
            {detailModal.notes && <div className="detail-notes"><strong>Additional details</strong><p>{detailModal.notes}</p></div>}
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setDetailModal(null)}>Close</button><button className="btn btn-primary" onClick={() => { setDetailModal(null); openAccept(detailModal) }}>{buttonText()} <i className="fas fa-arrow-right" /></button></div>
        </div>
      </div>}

      {claimModal && <div className="modal-overlay" onClick={() => !claimLoading && setClaimModal(null)}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><h3><i className="fas fa-handshake" /> Accept Task</h3><button className="btn-close" disabled={claimLoading} onClick={() => setClaimModal(null)}><i className="fas fa-times" /></button></div>
          <div className="modal-body">
            <p>You're accepting:</p><div className="claim-task-info"><strong>{title(claimModal)}</strong><p>{description(claimModal)}</p><p><i className="fas fa-map-marker-alt" /> {location(claimModal)}</p><p><i className="fas fa-calendar-alt" /> {date(claimModal)}</p><p><i className="fas fa-money-bill-wave" /> You earn: <strong>{payoutLabel(claimModal)}</strong></p></div>
            <div className="alert alert-info"><strong>Before you accept</strong><ul style={{ margin: '.5rem 0 0 1rem' }}><li>A verified Paystack bank account is required before accepting.</li><li>Complete the task as described and within the agreed timing.</li><li>Keep task communication on DFY where practical.</li><li>Only mark the task complete when the work is actually finished.</li><li>Payment is released after the creator confirms completion.</li><li>Payout is sent directly to your verified bank account; DFY does not use a runner wallet.</li></ul></div>
            {needsPayoutAccount && <div className="alert alert-warning mt-3">Add and verify your payout destination first: <Link to="/user/bank-accounts" onClick={() => setClaimModal(null)}>Payout Settings</Link>.</div>}
            <label style={{ display:'flex', gap:'.6rem', alignItems:'flex-start', cursor:'pointer' }}><input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} /><span>I agree to the runner terms for this task.</span></label>
            {claimError && <div className="alert alert-error mt-3"><i className="fas fa-exclamation-circle" /> {claimError}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" disabled={claimLoading} onClick={() => setClaimModal(null)}>Cancel</button><button className="btn btn-primary" disabled={!termsAccepted || claimLoading} onClick={accept}>{claimLoading ? <><span className="spinner spinner-sm" /> Accepting...</> : 'Accept Task'}</button></div>
        </div>
      </div>}
    </div>
  )
}
