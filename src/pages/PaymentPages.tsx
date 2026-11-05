import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tasksApi } from '../api'
import { usePostErrand } from '../hooks/usePostErrand'

export function PaymentSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Checking your payment status…')
  const taskId = params.get('taskId') || params.get('transactionReference') || params.get('transactionreference')

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    let attempts = 0

    const check = async () => {
      if (!taskId) {
        setStatus('Payment return received. You can check your tasks for the latest status.')
        return
      }

      try {
        const response = await tasksApi.getById(taskId)
        const task = response.data?.data
        const normalized = String(task?.taskStatus || task?.status || '').toLowerCase()

        if (normalized === 'posted' || task?.paymentStatus === 'EscrowHeld') {
          setStatus('Payment verified. Your task is now live.')
          if (interval) clearInterval(interval)
          setTimeout(() => navigate('/tasks/my-posted'), 1200)
          return
        }

        if (normalized === 'cancelled' || normalized === 'pendingpayment') {
          setStatus('Your payment is still being verified. Your task will remain unavailable until DFY confirms the payment.')
        } else {
          setStatus('Payment return received. DFY is confirming the transaction with Paystack.')
        }
      } catch {
        setStatus('Payment return received. DFY is confirming the transaction with Paystack.')
      }

      attempts += 1
      if (attempts >= 10 && interval) {
        clearInterval(interval)
        setStatus('Payment verification is taking longer than expected. Your task will appear once DFY confirms the payment.')
      }
    }

    void check()
    interval = setInterval(() => { void check() }, 2000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [navigate, taskId])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '3rem', maxWidth: 560 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', color: '#166534' }}><i className="fas fa-shield-alt" /></div>
        <h2 style={{ marginBottom: '0.5rem' }}>Payment Return Received</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{status}</p>
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
