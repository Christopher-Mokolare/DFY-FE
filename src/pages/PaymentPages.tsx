import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tasksApi } from '../api'
import { usePostErrand } from '../hooks/usePostErrand'

export function PaymentSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const taskId = params.get('taskId') || params.get('transactionReference') || params.get('transactionreference')

  useEffect(() => {
    // Ozow owns payment confirmation. The return URL is only a user-facing
    // redirect; the backend changes task state after validating Ozow's notification.
    const t = setTimeout(() => navigate('/tasks/my-posted'), 5000)
    return () => clearTimeout(t)
  }, [navigate])

  const refreshTask = async () => {
    if (!taskId) return
    try {
      await tasksApi.getById(taskId)
    } catch {
      // The notification/verification flow is authoritative; a transient read failure is harmless.
    }
    navigate('/tasks/my-posted')
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '3rem', maxWidth: 560 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', color: '#166534' }}><i className="fas fa-check-circle" /></div>
        <h2 style={{ marginBottom: '0.5rem' }}>Payment Return Received</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Thanks. Ozow is confirming your payment with DoForYou. Your task will appear as live once the payment has been verified.
        </p>
        <button className="btn btn-primary" onClick={refreshTask}>View My Tasks</button>
      </div>
    </div>
  )
}

export function PaymentCancelled() {
  const navigate = useNavigate()
  const { handlePostErrand, ProfileIncompleteModal } = usePostErrand()
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', color: '#991B1B' }}><i className="fas fa-times-circle" /></div>
        <h2 style={{ marginBottom: '0.5rem' }}>Payment Cancelled</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your payment was cancelled. Your task remains available for you to pay when you are ready.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/tasks/my-posted')}>View My Tasks</button>
          <button className="btn btn-primary" onClick={handlePostErrand}>Post Another Task</button>
          {ProfileIncompleteModal}
        </div>
      </div>
    </div>
  )
}
