import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { tasksApi } from '../../api'
import type { Task } from '../../types'
import Pagination from '../../components/Pagination'
import TaskCard from '../../components/workspace/TaskCard'

const PAGE_SIZE = 10

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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const filter = searchParams.get('filter') || 'all'

  const load = useCallback(async (targetPage: number, taskId?: string) => {
    setLoading(true)
    setError('')
    try {
      const status = filter === 'confirmation' ? 'completed' : filter === 'payments' ? 'pendingPayment' : 'actionRequired'
      const res = await tasksApi.getMyPosted(targetPage, PAGE_SIZE, taskId, status)
      const result = res.data?.data
      const raw: Task[] = result?.tasks || result?.Tasks || []
      setTasks(raw.map(t => ({
        ...t,
        taskName: DOMPurify.sanitize(t.taskName || '', { ALLOWED_TAGS: [] }),
        taskDescription: DOMPurify.sanitize(t.taskDescription || '', { ALLOWED_TAGS: [] }),
        area: DOMPurify.sanitize(t.area || '', { ALLOWED_TAGS: [] }),
        helperName: DOMPurify.sanitize(t.helperName || '', { ALLOWED_TAGS: [] }),
        helperContact: DOMPurify.sanitize(t.helperContact || '', { ALLOWED_TAGS: [] }),
      })))
      setTotalTasks(Number(result?.count ?? raw.length))
      setTotalPages(Math.max(1, Number(result?.totalPages ?? 1)))
      if (result?.page) setPage(Number(result.page))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tasks requiring your attention.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  const linkedTaskId = searchParams.get('taskId')
  useEffect(() => {
    void load(page, page === 1 ? linkedTaskId ?? undefined : undefined)
  }, [filter, linkedTaskId, load, page])

  useEffect(() => {
    const target = searchParams.get('taskId')
    if (!target || loading) return
    const exists = tasks.some(t => String(t.taskId) === target)
    if (!exists) return
    requestAnimationFrame(() => document.getElementById(`action-task-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [searchParams, loading, tasks])

  if (loading) return <div className="loading-state"><div className="spinner" /><p>Checking tasks that need your attention...</p></div>

  return (
    <div className="action-required-page">
      <div className="page-header">
        <div className="container">
          <h1><i className={`fas ${filter === 'payments' ? 'fa-credit-card' : 'fa-triangle-exclamation'}`} /> {filter === 'confirmation' ? 'Await Confirmation' : filter === 'payments' ? 'Payments' : 'Action Required'}</h1>
          <p>{filter === 'confirmation' ? 'Review completed tasks and confirm the runner payout.' : filter === 'payments' ? 'Complete creator payments for tasks waiting to go live.' : 'Tasks waiting for you to pay or confirm completion.'}</p>
        </div>
      </div>
      <div className="container">
        {error && <div className="alert alert-error mb-4" role="alert"><i className="fas fa-exclamation-circle" /> {error} <button className="btn btn-secondary btn-sm" onClick={() => void load(page)}>Retry</button></div>}
        {tasks.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-circle-check" />
            <h3>You're all caught up</h3>
            <p>There are no creator actions waiting for you.</p>
            <button className="btn btn-primary" onClick={() => navigate('/tasks/my-posted')}>View My Posted Tasks</button>
          </div>
        ) : (
          <div className="tasks-grid action-required-grid">
            {tasks.map(task => {
              const awaitingConfirmation = normStatus(task.taskStatus) === 'awaitingconfirmation'
              const pendingPayment = normStatus(task.taskStatus) === 'pendingpayment' || normStatus(task.paymentStatus) === 'pending'
              return (
                <TaskCard id={`action-task-${task.taskId}`} key={task.taskId} className="task-card action-required-card" style={{ border: '1px solid var(--border)' }}>
                  <div className="task-card-header">
                    <span className={`badge ${awaitingConfirmation ? 'badge-completed' : 'badge-draft'}`}>
                      {awaitingConfirmation ? 'Awaiting Your Confirmation' : 'Payment Required'}
                    </span>
                    <div className="task-budget">{money(task.budget)}</div>
                  </div>
                  <div className="task-card-body">
                    <h3 className="task-title">{task.taskName || task.taskDescription}</h3>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{task.taskDescription}</p>
                    <div className="task-meta">
                      <div className="task-meta-item"><i className="fas fa-tag" /><span>{task.category || 'General'}</span></div>
                      <div className="task-meta-item"><i className="fas fa-map-marker-alt" /><span>{task.area}</span></div>
                      {task.helperName && <div className="task-meta-item"><i className="fas fa-user" /><span>{task.helperName}</span></div>}
                    </div>
                    {awaitingConfirmation && <div className="alert alert-info mt-3"><i className="fas fa-clock" /> The runner marked this task complete. You have 24 hours to confirm or dispute. If you take no action, the task is automatically confirmed and the payout is initiated.</div>}
                    {pendingPayment && <div className="alert alert-warning mt-3"><i className="fas fa-credit-card" /> This task is waiting for its creator payment before it can go live.</div>}
                  </div>
                  <div className="task-card-footer">
                    <div className="action-row">
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/tasks/my-posted?taskId=${encodeURIComponent(task.taskId)}`)}>
                        <i className="fas fa-list" /> Open Task
                      </button>
                      {awaitingConfirmation && <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tasks/my-posted?taskId=${encodeURIComponent(task.taskId)}&action=confirm`)}>
                        <i className="fas fa-check" /> Confirm & Pay Runner
                      </button>}
                      {task.helperContact && awaitingConfirmation && <a className="btn btn-outline btn-sm" href={`tel:${task.helperContact}`}><i className="fas fa-phone" /> Call</a>}
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
          label="tasks"
        />}
      </div>
    </div>
  )
}
