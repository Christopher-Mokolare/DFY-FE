import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tasksApi } from '../api'
import { usePostErrand } from '../hooks/usePostErrand'

export function PaymentSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)
  const [calledRef] = useState({ called: false })

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (calledRef.called) return
    calledRef.called = true

    // PayFast returns m_payment_id = our TaskId on the return URL
    const taskId = params.get('m_payment_id')
    tasksApi.handlePaymentSuccess(taskId || undefined)
      .catch(() => {})
      .finally(() => setConfirmed(true))

    const t = setTimeout(() => navigate('/tasks/my-posted'), 5000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', color: '#166534' }}><i className="fas fa-check-circle" /></div>
        <h2 style={{ marginBottom: '0.5rem' }}>Payment Successful!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your task has been posted and is now live. Redirecting to your tasks...</p>
        <button className="btn btn-primary" onClick={() => navigate('/tasks/my-posted')}>View My Tasks</button>
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
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your payment was cancelled. Your task has been saved as a draft.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/tasks/my-posted')}>View My Tasks</button>
          <button className="btn btn-primary" onClick={handlePostErrand}>Try Again</button>
          {ProfileIncompleteModal}
        </div>
      </div>
    </div>
  )
}
