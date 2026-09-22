import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tasksApi, ratingsApi } from '../../api'

export default function MyCompletedTasks() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ratingModal, setRatingModal] = useState<any | null>(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [ratingReview, setRatingReview] = useState('')
  const [ratingLoading, setRatingLoading] = useState(false)
  const [ratingError, setRatingError] = useState('')
  const [ratedTaskIds, setRatedTaskIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    tasksApi.getMyCompleted()
      .then(r => setTasks(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const target = searchParams.get('taskId')
    if (!target || loading) return
    requestAnimationFrame(() => document.getElementById(`completed-task-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [searchParams, loading])

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

  const fmt = (n: number) => `R${(n || 0).toFixed(2)}`
  const lifecycle = (t: any) => {
    const s = String(t.status || '').toLowerCase()
    const payout = String(t.payoutStatus || '').toLowerCase()
    if (payout === 'failed' || payout === 'returned' || payout === 'cancelled') return { label: 'Payout Issue', tone: 'badge-cancelled', detail: payout === 'failed' ? 'The payout failed. Check your verified bank details and wait for retry or contact support.' : payout === 'returned' ? 'The payout was returned. Check your verified bank details and contact support if needed.' : 'The payout was cancelled. Check the task/payment status or contact support.' }
    if (s === 'runnerpaid' || payout === 'completed' || payout === 'paid') return { label: 'Paid', tone: 'badge-runner_paid', detail: t.payoutCompletedAt ? `Paid ${new Date(t.payoutCompletedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Payout completed' }
    if (s === 'payoutpending' || payout === 'processing' || payout === 'pending' || payout === 'initiated') return { label: 'Payout Processing', tone: 'badge-draft', detail: 'Creator confirmed. Your payout is being processed.' }
    if (s === 'completed') return { label: 'Awaiting Creator', tone: 'badge-completed', detail: 'You completed the task. The creator must confirm before payout is released.' }
    return { label: t.status || 'Completed', tone: 'badge-completed', detail: 'Task completed.' }
  }

  if (loading) return <div className="loading-state"><div className="spinner" /><p>Loading completed tasks...</p></div>

  return (
    <div className="my-completed-page" style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div className="container">
          <h1><i className="fas fa-trophy" /> Completed Tasks</h1>
          <p>Tasks you have completed as a runner</p>
        </div>
      </div>
      <div className="container">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-trophy" />
            <h3>No Completed Tasks</h3>
            <p>Tasks you complete will appear here.</p>
            <button className="btn btn-primary" onClick={() => navigate('/tasks/browse')}>Browse Tasks</button>
          </div>
        ) : (
          <div className="tasks-grid">
            {tasks.map((t: any) => (
              <TaskCard
                variant="completed"
                className="completed-task-card"
                status={(() => { const state = lifecycle(t); return <span className={`badge ${state.tone}`}>{state.label}</span> })()}
                amount={<><span>{fmt(t.payoutAmount || t.budget * 0.85)}</span><small className="task-card__amount-label">earned</small></>}
                title={t.title || t.taskDescription}
                meta={<>
                  <span><i className="fas fa-tag" /> {t.category}</span>
                  <span><i className="fas fa-map-marker-alt" /> {t.location || t.area}</span>
                  {t.completedAt && <span><i className="fas fa-check-circle" /> {new Date(t.completedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  <span><i className="fas fa-user" /> {t.creatorName}</span>
                </>}
                extra={<div className="alert alert-info"><i className="fas fa-route" /> {lifecycle(t).detail}</div>}
                actions={!ratedTaskIds.has(t.taskId)
                  ? <button className="btn btn-outline btn-block btn-sm" onClick={() => { setRatingModal(t); setRatingReview(''); setRatingValue(5); setRatingError('') }}><i className="fas fa-star" /> Rate Creator</button>
                  : <span className="task-card__rated"><i className="fas fa-check" /> Rated</span>}
              />              </div>
            ))}
          </div>
        )}
      </div>

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
