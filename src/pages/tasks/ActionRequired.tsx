import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { tasksApi } from '../../api'
import type { Task } from '../../types'

function normStatus(value?: string) {
  return (value || '').toLowerCase().replace(/[_ -]/g, '')
}

function money(value: any) {
  return `R${Number(value || 0).toFixed(2)}`
}

export default function ActionRequired() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await tasksApi.getMyPosted()
      const inner = res.data?.data
      const raw: Task[] = inner?.tasks || inner?.Tasks || []
      setTasks(raw.map(t => ({
        ...t,
        taskName: DOMPurify.sanitize(t.taskName || '', { ALLOWED_TAGS: [] }),
        taskDescription: DOMPurify.sanitize(t.taskDescription || '', { ALLOWED_TAGS: [] }),
        area: DOMPurify.sanitize(t.area || '', { ALLOWED_TAGS: [] }),
        helperName: DOMPurify.sanitize(t.helperName || '', { ALLOWED_TAGS: [] }),
        helperContact: DOMPurify.sanitize(t.helperContact || '', { ALLOWED_TAGS: [] }),
      })))
    } catch {
      setError('Failed to load tasks requiring your attention.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filter = searchParams.get('filter') || 'all'

  const actionTasks = useMemo(() => tasks.filter(t => {
    const s = normStatus(t.taskStatus)
    if (filter === 'confirmation') return s === 'completed'
    if (filter === 'payments') return s === 'pendingpayment'
    return s === 'completed' || s === 'pendingpayment'
  }), [tasks, filter])

  useEffect(() => {
    const target = searchParams.get('taskId')
    if (!target || loading) return
    const exists = actionTasks.some(t => String(t.taskId) === target)
    if (!exists) return
    requestAnimationFrame(() => document.getElementById(`action-task-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [searchParams, loading, actionTasks])

  if (loading) return <div className="loading-state"><div className="spinner" /><p>Checking tasks that need your attention...</p></div>

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div className="container">
          <h1><i className={`fas ${filter === 'payments' ? 'fa-credit-card' : 'fa-triangle-exclamation'}`} /> {filter === 'confirmation' ? 'Await Confirmation' : filter === 'payments' ? 'Payments' : 'Action Required'}</h1>
          <p>{filter === 'confirmation' ? 'Review completed tasks and confirm the runner payout.' : filter === 'payments' ? 'Complete creator payments for tasks waiting to go live.' : 'Tasks waiting for you to pay or confirm completion.'}</p>
        </div>
      </div>
      <div className="container">
        {error && <div className="alert alert-error mb-4"><i className="fas fa-exclamation-circle" /> {error}</div>}
        {actionTasks.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-circle-check" />
            <h3>You're all caught up</h3>
            <p>There are no creator actions waiting for you.</p>
            <button className="btn btn-primary" onClick={() => navigate('/tasks/my-posted')}>View My Posted Tasks</button>
          </div>
        ) : (
          <div className="tasks-grid">
            {actionTasks.map(task => {
              const completed = normStatus(task.taskStatus) === 'completed'
              const pendingPayment = normStatus(task.taskStatus) === 'pendingpayment' || normStatus(task.paymentStatus) === 'pending'
              return (
                <TaskCard
                  id={`action-task-${task.taskId}`}
                  key={task.taskId}
                  variant="action-required"
                  status={<span className={`badge ${completed ? 'badge-completed' : 'badge-draft'}`}>{completed ? 'Awaiting Your Confirmation' : 'Payment Required'}</span>}
                  amount={money(task.budget)}
                  title={task.taskName || task.taskDescription}
                  description={task.taskDescription}
                  meta={<><span><i className="fas fa-tag" /> {task.category || 'General'}</span><span><i className="fas fa-map-marker-alt" /> {task.area}</span>{task.helperName && <span><i className="fas fa-user" /> {task.helperName}</span>}</>}
                  extra={
                    <>
                      {completed && <div className="alert alert-info"><i className="fas fa-lock" /> The runner marked this task complete. Review it and release the payout when satisfied.</div>}
                      {pendingPayment && <div className="alert alert-warning"><i className="fas fa-credit-card" /> This task is waiting for its creator payment before it can go live.</div>}
                    </>
                  }
                  actions={
                    <div className="action-row">
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/tasks/my-posted?taskId=${encodeURIComponent(task.taskId)}`)}>
                        <i className="fas fa-list" /> Open Task
                      </button>
                      {completed && <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tasks/my-posted?taskId=${encodeURIComponent(task.taskId)}&action=confirm`)}>
                        <i className="fas fa-check" /> Confirm & Pay Runner
                      </button>}
                      {task.helperContact && completed && <a className="btn btn-outline btn-sm" href={`tel:${task.helperContact}`}><i className="fas fa-phone" /> Call</a>}
                    </div>
                  }
                />
            })}
          </div>
        )}
      </div>
    </div>
  )
}
