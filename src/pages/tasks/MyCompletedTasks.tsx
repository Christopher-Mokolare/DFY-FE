import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tasksApi, ratingsApi } from '../../api'

export default function MyCompletedTasks() {
  const navigate = useNavigate()
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

  if (loading) return <div className="loading-state"><div className="spinner" /><p>Loading completed tasks...</p></div>

  return (
    <div style={{ paddingBottom: '3rem' }}>
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
              <div key={t.taskId} className="task-card">
                <div className="task-card-header">
                  <span className={`badge ${t.status === 'runnerpaid' ? 'badge-runner_paid' : 'badge-completed'}`}>
                    {t.status === 'runnerpaid' ? 'Paid' : 'Completed'}
                  </span>
                  <div className="task-budget">
                    {fmt(t.payoutAmount || t.budget * 0.85)}
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
              </div>
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
