import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tasksApi, ratingsApi } from '../../api'
import Pagination from '../../components/Pagination'
import TaskCard from '../../components/workspace/TaskCard'

const PAGE_SIZE = 10

function formatRunnerPayout(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Payout unavailable'
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Payout unavailable'
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getStatusBadge(status: string) {
  const s = status?.toLowerCase()
  const map: Record<string, string> = {
    posted: 'badge-posted', claimed: 'badge-claimed',
    in_progress: 'badge-in_progress', completed: 'badge-completed',
    confirmed: 'badge-confirmed', runnerpaid: 'badge-runner_paid',
  }
  return `badge ${map[s] || 'badge-draft'}`
}

export default function MyActiveTasks() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const [completeModal, setCompleteModal] = useState<any | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [ratingModal, setRatingModal] = useState<any | null>(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [ratingReview, setRatingReview] = useState('')
  const [ratingLoading, setRatingLoading] = useState(false)
  const [ratingError, setRatingError] = useState('')
  const [ratedTaskIds, setRatedTaskIds] = useState<Set<string>>(new Set())
  const [actionError, setActionError] = useState('')

  const loadTasks = useCallback(async (targetPage = page, targetTaskId?: string) => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await tasksApi.getMyActive(targetPage, PAGE_SIZE, targetTaskId)
      const data = res.data?.data
      const list = data?.tasks || data?.Tasks || (Array.isArray(data) ? data : [])
      setTasks(Array.isArray(list) ? list : [])
      setTotalTasks(Number(data?.count ?? list.length))
      setTotalPages(Math.max(1, Number(data?.totalPages ?? 1)))
      if (data?.page) setPage(Number(data.page))
    } catch (err: any) {
      setLoadError(err.response?.data?.message || 'Failed to load active tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page])

  const linkedTaskId = searchParams.get('taskId')
  useEffect(() => {
    void loadTasks(page, page === 1 ? linkedTaskId ?? undefined : undefined)
  }, [linkedTaskId, loadTasks, page])

  useEffect(() => {
    if (!linkedTaskId || loading || !tasks.some(task => String(task.taskId) === linkedTaskId)) return
    requestAnimationFrame(() => document.getElementById(`active-task-${linkedTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    setSearchParams(params => {
      params.delete('taskId')
      return params
    }, { replace: true })
  }, [linkedTaskId, loading, tasks, setSearchParams])

  const handleComplete = async () => {
    if (!completeModal) return
    setActionLoading(true); setActionError('')
    try {
      const res = await tasksApi.complete(completeModal.taskId)
      if (res.data?.success === false) { setActionError(res.data?.message || 'Failed to mark complete'); return }
      setCompleteModal(null)
      await loadTasks(page)
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to mark complete')
    } finally { setActionLoading(false) }
  }

  const handleRating = async () => {
    if (!ratingModal) return
    setRatingLoading(true)
    setRatingError('')
    try {
      const res = await ratingsApi.submit(ratingModal.taskId, ratingValue, ratingReview)
      if (res.data?.success) {
        setRatedTaskIds(prev => new Set(prev).add(ratingModal.taskId))
        setRatingModal(null)
        setRatingReview('')
        setRatingValue(5)
      } else {
        setRatingError(res.data?.message || 'Failed to submit rating')
      }
    } catch { setRatingError('Failed to submit rating') } finally { setRatingLoading(false) }
  }
  const norm = (t: any) => ({
    taskId: t.taskId,
    taskDescription: t.description || t.taskDescription || t.title || '',
    taskName: t.taskName || t.name || '',
    area: t.location || t.area || '',
    budget: t.budget || 0,
    payoutAmount: t.payoutAmount ?? t.PayoutAmount ?? null,
    taskStatus: t.status || t.taskStatus || '',
    dateNeeded: t.dueDate || t.dateNeeded || '',
    userName: t.creatorName || t.userName || '',
    userContact: t.creatorContact || t.userContact || '',
  })

  return (
    <div className="my-active-page active-tasks-page">
      <div className="page-header">
        <div className="container active-tasks-content">
          <h1><i className="fas fa-tasks" /> My Active Tasks</h1>
          <p>Tasks you are currently working on</p>
        </div>
      </div>
      <div className="container">
        {loadError && <div className="alert alert-error mb-4" role="alert">{loadError} <button className="btn btn-secondary btn-sm" onClick={() => void loadTasks(page)}>Retry</button></div>}
        {loading ? <div className="loading-state"><div className="spinner" /><p>Loading your active tasks...</p></div> : tasks.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-tasks" />
            <h3>No Active Tasks</h3>
            <p>You haven't accepted any tasks yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/tasks/browse')}>Browse Available Tasks</button>
          </div>
        ) : (
          <div className="tasks-grid">
            {tasks.map(raw => {
              const t = norm(raw)
              return (
                <TaskCard id={`active-task-${t.taskId}`} key={t.taskId} className="task-card active-task-card">
                  <div className="task-card-header">
                    <span className={getStatusBadge(t.taskStatus)}>{t.taskStatus}</span>
                    <div className="task-budget">
                      {formatRunnerPayout(t.payoutAmount)}
                      <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>payout</small>
                    </div>
                  </div>
                  <div className="task-card-body">
                    <h3 className="task-title">{t.taskName || t.taskDescription}</h3>
                    {t.taskName && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.taskDescription}</p>}
                    <div className="task-meta">
                      <div className="task-meta-item"><i className="fas fa-map-marker-alt" /><span>{t.area}</span></div>
                      {t.dateNeeded && <div className="task-meta-item"><i className="fas fa-calendar" /><span>{new Date(t.dateNeeded).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
                      <div className="task-meta-item"><i className="fas fa-user" /><span>{t.userName}</span></div>
                      {t.userContact && <div className="task-meta-item"><i className="fas fa-phone" /><span>{t.userContact}</span></div>}
                    </div>
                  </div>
                  <div className="task-card-footer">
                    <div className="active-task-actions">
                      <div className="active-task-contact-actions">
                        <button className="btn btn-outline btn-sm active-task-contact-btn" onClick={() => navigate(`/tasks/${t.taskId}/chat?title=${encodeURIComponent(t.taskName || t.taskDescription || 'Task Chat')}`)}><i className="fas fa-comment" /> Chat</button>
                        {t.userContact && <a href={`tel:${t.userContact}`} className="btn btn-outline btn-sm active-task-contact-btn"><i className="fas fa-phone" /> Call</a>}
                      </div>
                      {['claimed', 'in_progress'].includes(t.taskStatus?.toLowerCase()) && (
                        <button className="btn btn-primary btn-block btn-sm" onClick={() => setCompleteModal(raw)}>
                          <i className="fas fa-check" /> Mark as Complete
                        </button>
                      )}
                      {['runnerpaid', 'runner_paid', 'completed'].includes(t.taskStatus?.toLowerCase()) && !ratedTaskIds.has(t.taskId) && (
                        <button className="btn btn-outline btn-block btn-sm" onClick={() => { setRatingModal(raw); setRatingReview(''); setRatingValue(5); setRatingError('') }}>
                          <i className="fas fa-star" /> Rate Creator
                        </button>
                      )}
                    </div>
                  </div>
                </TaskCard>
              )
            })}
          </div>
        )}
        {!loading && <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalTasks}
          totalPages={totalPages}
          onPageChange={setPage}
          label="active tasks"
        />}
      </div>

      {completeModal && (
        <div className="modal-overlay" onClick={() => setCompleteModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-check-circle" /> Mark Task Complete</h3>
              <button className="btn-close" onClick={() => setCompleteModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <p>Confirm you have completed:</p>
              <p className="mt-2"><strong>{completeModal.description || completeModal.taskDescription || completeModal.title}</strong></p>
              <div className="alert alert-info mt-3"><i className="fas fa-info-circle" /> The task creator will be notified to confirm and release payment.</div>
            </div>
            {actionError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '0 1.5rem 0.5rem' }}>{actionError}</p>}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setCompleteModal(null); setActionError('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleComplete} disabled={actionLoading}>
                {actionLoading ? <><span className="spinner spinner-sm" /> Processing...</> : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ratingModal && (
        <div className="modal-overlay" onClick={() => setRatingModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-star" /> Rate the Creator</h3>
              <button className="btn-close" onClick={() => setRatingModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <p className="mb-3">How was working with <strong>{ratingModal.creatorName || ratingModal.userName}</strong>?</p>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '1.5rem' }}>
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{ cursor: 'pointer', color: n <= ratingValue ? '#F59E0B' : 'var(--border)' }} onClick={() => setRatingValue(n)}>
                      <i className="fas fa-star" />
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Review (optional)</label>
                <textarea className="form-textarea" placeholder="Share your experience..." value={ratingReview} onChange={e => setRatingReview(e.target.value)} rows={3} />
              </div>
            </div>
            {ratingError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '0 1.5rem 0.5rem' }}>{ratingError}</p>}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setRatingModal(null); setRatingError('') }}>Skip</button>
              <button className="btn btn-primary" onClick={handleRating} disabled={ratingLoading}>
                {ratingLoading ? <><span className="spinner spinner-sm" /> Submitting...</> : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
