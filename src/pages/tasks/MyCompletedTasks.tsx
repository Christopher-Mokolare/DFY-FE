import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tasksApi, ratingsApi, disputesApi } from '../../api'
import Pagination from '../../components/Pagination'
import TaskCard from '../../components/workspace/TaskCard'

const PAGE_SIZE = 10
type CompletedSection = 'all' | 'awaitingCreator' | 'payoutIssue' | 'processing' | 'paid'
const COMPLETED_SECTIONS: { key: CompletedSection; label: string }[] = [
  { key: 'all', label: 'All Tasks' },
  { key: 'awaitingCreator', label: 'Awaiting Creator' },
  { key: 'payoutIssue', label: 'Payout Issue' },
  { key: 'processing', label: 'Payout Processing' },
  { key: 'paid', label: 'Paid' },
]

export default function MyCompletedTasks() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const [activeSection, setActiveSection] = useState<CompletedSection>('all')
  const [statusCounts, setStatusCounts] = useState<Record<CompletedSection, number>>({
    all: 0, awaitingCreator: 0, payoutIssue: 0, processing: 0, paid: 0,
  })
  const [ratingModal, setRatingModal] = useState<any | null>(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [ratingReview, setRatingReview] = useState('')
  const [ratingLoading, setRatingLoading] = useState(false)
  const [ratingError, setRatingError] = useState('')
  const [ratedTaskIds, setRatedTaskIds] = useState<Set<string>>(new Set())
  const [disputeModal, setDisputeModal] = useState<any | null>(null)
  const [disputeIssue, setDisputeIssue] = useState('')
  const [disputeCategory, setDisputeCategory] = useState('General')
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [disputeError, setDisputeError] = useState('')

  const loadTasks = useCallback(async (targetPage: number, targetTaskId?: string) => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await tasksApi.getMyCompleted(targetPage, PAGE_SIZE, targetTaskId, activeSection)
      const result = response.data?.data
      const nextTotalPages = Math.max(1, Number(result?.totalPages ?? 1))
      setTasks(Array.isArray(result?.tasks) ? result.tasks : Array.isArray(result) ? result : [])
      setTotalTasks(Number(result?.count ?? 0))
      setTotalPages(nextTotalPages)
      if (result?.statusCounts) {
        setStatusCounts({
          all: Number(result.statusCounts.all ?? 0),
          awaitingCreator: Number(result.statusCounts.awaitingCreator ?? 0),
          payoutIssue: Number(result.statusCounts.payoutIssue ?? 0),
          processing: Number(result.statusCounts.processing ?? 0),
          paid: Number(result.statusCounts.paid ?? 0),
        })
      }
      if (targetPage > nextTotalPages)
        setPage(nextTotalPages)
      if (targetTaskId && result?.page)
        setPage(Number(result.page))
    } catch (err: any) {
      setLoadError(err.response?.data?.message || 'Unable to load completed tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [activeSection])

  const linkedTaskId = searchParams.get('taskId')
  useEffect(() => {
    void loadTasks(page, linkedTaskId ?? undefined)
  }, [loadTasks, linkedTaskId, page])

  useEffect(() => {
    const target = searchParams.get('taskId')
    if (!target || loading) return
    const taskElement = document.getElementById(`completed-task-${target}`)
    if (!taskElement) return
    requestAnimationFrame(() => taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    setSearchParams(params => {
      params.delete('taskId')
      return params
    }, { replace: true })
  }, [searchParams, loading, setSearchParams])

  const handleDispute = async () => {
    if (!disputeModal || !disputeIssue.trim()) return
    setDisputeLoading(true)
    setDisputeError('')
    try {
      const res = await disputesApi.raise(disputeModal.taskId, disputeIssue.trim(), disputeCategory)
      if (res.data?.success === false) {
        setDisputeError(res.data?.message || 'Failed to raise dispute')
        return
      }
      setDisputeModal(null)
      setDisputeIssue('')
      setDisputeCategory('General')
      await loadTasks(page)
    } catch (err: any) {
      setDisputeError(err.response?.data?.message || 'Failed to raise dispute')
    } finally {
      setDisputeLoading(false)
    }
  }

  const handleRating = async () => {
    if (!ratingModal) return
    setRatingLoading(true); setRatingError('')
    try {
      const res = await ratingsApi.submit(ratingModal.taskId, ratingValue, ratingReview)
      if (res.data?.success) {
        setRatedTaskIds(prev => new Set(prev).add(ratingModal.taskId))
        setRatingModal(null); setRatingReview(''); setRatingValue(5)
      } else {
        setRatingError(res.data?.message || 'Failed to submit rating')
      }
    } catch { setRatingError('Failed to submit rating') } finally { setRatingLoading(false) }
  }

  const fmtPayout = (value: unknown) => {
    if (value === null || value === undefined || value === '') return 'Payout unavailable'
    const amount = Number(value)
    return Number.isFinite(amount) && amount > 0
      ? `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'Payout unavailable'
  }
  const lifecycle = (t: any) => {
    const s = String(t.status || '').toLowerCase()
    const payout = String(t.payoutStatus || '').toLowerCase()
    if (payout === 'failed' || payout === 'returned' || payout === 'cancelled') return { label: 'Payout Issue', tone: 'badge-cancelled', detail: payout === 'failed' ? 'Verify or re-verify your bank account in Payout Settings. If the payout remains failed, contact support.' : payout === 'returned' ? 'The payout was returned. Check your verified bank details and contact support if needed.' : 'The payout was cancelled. Check the task/payment status or contact support.' }
    if (s === 'runnerpaid' || payout === 'completed' || payout === 'paid') return { label: 'Paid', tone: 'badge-runner_paid', detail: t.payoutCompletedAt ? `Paid ${new Date(t.payoutCompletedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Payout completed' }
    if (payout === 'awaitingbankdetails') return { label: 'Bank verification required', tone: 'badge-draft', detail: 'Verify your bank account in Payout Settings to resume this payout.' }
    if (payout === 'awaitingfunds') return { label: 'Payout Awaiting Funds', tone: 'badge-draft', detail: 'Your payout has been approved and is waiting for available Paystack funds. DFY will retry automatically.' }
    if (s === 'payoutpending' || payout === 'processing' || payout === 'pending' || payout === 'initiated') return { label: 'Payout Processing', tone: 'badge-draft', detail: 'Creator confirmed. Your payout is being processed.' }
    if (s === 'awaitingconfirmation' || s === 'completed') return { label: 'Awaiting Creator', tone: 'badge-completed', detail: 'You completed the task. The creator has 24 hours to confirm or dispute. Silence automatically confirms the task and starts payout.' }
    return { label: t.status || 'Completed', tone: 'badge-completed', detail: 'Task completed.' }
  }
  return (
    <div className="my-completed-page" style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div className="container">
          <h1><i className="fas fa-trophy" /> Completed Tasks</h1>
          <p>Tasks you have completed as a runner</p>
        </div>
      </div>
      <div className="container">
        {loadError && <div className="alert alert-error mb-4" role="alert"><i className="fas fa-exclamation-circle" /> {loadError} <button className="btn btn-secondary btn-sm" onClick={() => void loadTasks(page)}>Retry</button></div>}
        {statusCounts.all > 0 && <div className="completed-task-tabs" role="tablist" aria-label="Completed task status">
          {COMPLETED_SECTIONS.map(({ key, label }) => (
            <button
              key={key}
              id={`completed-tab-${key}`}
              className={`completed-task-tab ${activeSection === key ? 'active' : ''}`}
              role="tab"
              aria-selected={activeSection === key}
              aria-controls="completed-task-panel"
              onClick={() => { setActiveSection(key); setPage(1) }}
            >
              <span>{label}</span>
              <span className="completed-task-tab-count">{statusCounts[key]}</span>
            </button>
          ))}
        </div>}
        {loading ? (
          <div className="loading-state"><div className="spinner" /><p>Loading completed tasks...</p></div>
        ) : tasks.length === 0 && loadError ? null : tasks.length === 0 && activeSection === 'all' ? (
          <div className="empty-state">
            <i className="fas fa-trophy" />
            <h3>No Completed Tasks</h3>
            <p>Tasks you complete will appear here.</p>
            <button className="btn btn-primary" onClick={() => navigate('/tasks/browse')}>Browse Tasks</button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-filter" />
            <h3>No {COMPLETED_SECTIONS.find(section => section.key === activeSection)?.label} Tasks</h3>
            <p>There are no tasks in this status right now.</p>
            <button className="btn btn-outline" onClick={() => { setActiveSection('all'); setPage(1) }}>View All Tasks</button>
          </div>
        ) : (
          <div id="completed-task-panel" className="tasks-grid" role="tabpanel" aria-labelledby={`completed-tab-${activeSection}`}>
            {tasks.map((t: any) => (
              <TaskCard id={`completed-task-${t.taskId}`} key={t.taskId} className="task-card">
                <div className="task-card-header">
                  {(() => { const state = lifecycle(t); return <span className={`badge ${state.tone}`}>{state.label}</span> })()}
                  <div className="task-budget">
                    {fmtPayout(t.payoutAmount)}
                    <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>earned</small>
                  </div>
                </div>
                <div className="task-card-body">
                  <h3 className="task-title">{t.title || t.taskDescription}</h3>
                  <div className="task-meta">
                    <div className="task-meta-item"><i className="fas fa-tag" /><span>{t.category}</span></div>
                    <div className="task-meta-item"><i className="fas fa-map-marker-alt" /><span>{t.location || t.area}</span></div>
                    {t.completedAt && (
                      <div className="task-meta-item">
                        <i className="fas fa-check-circle" />
                        <span>{new Date(t.completedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    )}
                    <div className="task-meta-item"><i className="fas fa-user" /><span>{t.creatorName}</span></div>
                  </div>
                  <div className="alert alert-info mt-3"><i className="fas fa-route" /> {lifecycle(t).detail}</div>
                </div>
                <div className="task-card-footer">
                  {!ratedTaskIds.has(t.taskId) && (
                    <button className="btn btn-outline btn-block btn-sm" onClick={() => { setRatingModal(t); setRatingReview(''); setRatingValue(5); setRatingError('') }}>
                      <i className="fas fa-star" /> Rate Creator
                    </button>
                  )}
                  {ratedTaskIds.has(t.taskId) && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}><i className="fas fa-check" /> Rated</span>
                  )}
                </div>
              </TaskCard>
            ))}
          </div>
        )}
        {!loading && <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalTasks}
          totalPages={totalPages}
          onPageChange={setPage}
          label="completed tasks"
        />}
      </div>

      {disputeModal && (
        <div className="modal-overlay" onClick={() => !disputeLoading && setDisputeModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-exclamation-triangle" /> Raise Dispute</h3>
              <button className="btn-close" onClick={() => !disputeLoading && setDisputeModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <p className="mb-3">Report a problem with: <strong>{disputeModal.title || disputeModal.taskDescription}</strong></p>
              <div className="alert alert-warning mb-3"><i className="fas fa-lock" /> The 24-hour payout window will be frozen while DFY reviews the dispute.</div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={disputeCategory} onChange={e => setDisputeCategory(e.target.value)} disabled={disputeLoading}>
                  <option value="General">General</option>
                  <option value="Quality">Quality of Work</option>
                  <option value="NoShow">No Show</option>
                  <option value="Payment">Payment Issue</option>
                  <option value="Fraud">Fraud / Scam</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Describe the issue *</label>
                <textarea className="form-textarea" value={disputeIssue} onChange={e => setDisputeIssue(e.target.value)} placeholder="Explain what went wrong..." rows={4} disabled={disputeLoading} />
              </div>
              {disputeError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{disputeError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDisputeModal(null)} disabled={disputeLoading}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDispute} disabled={disputeLoading || !disputeIssue.trim()}>
                {disputeLoading ? <><span className="spinner spinner-sm" /> Submitting...</> : 'Submit Dispute'}
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
              <p className="mb-3">How was working with <strong>{ratingModal.creatorName}</strong>?</p>
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
