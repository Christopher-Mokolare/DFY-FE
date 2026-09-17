import { useState, useEffect } from 'react'
import { adminApi } from '../../api'
import { exportCSV, exportPDF } from '../../utils/export'

export default function AdminPayments() {
  const [data, setData] = useState<any>(null)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAll = () => Promise.all([
    adminApi.getPayments(),
    adminApi.getBankAccounts(),
  ]).then(([paymentsRes, bankRes]) => {
    setData(paymentsRes.data?.data || paymentsRes.data)
    setBankAccounts(bankRes.data?.data || [])
  }).catch(() => {}).finally(() => setLoading(false))

  useEffect(() => { loadAll() }, [])

  const handleVerifyBank = async (id: number) => {
    setVerifyingId(id)
    try {
      await adminApi.verifyBankAccount(id)
      await loadAll()
    } catch { /* ignore */ } finally {
      setVerifyingId(null)
    }
  }

  if (loading) return <div className="loading-state"><div className="spinner" /></div>

  const recentPayments = data?.recentPayments || []

  const exportPaymentsCSV = () => exportCSV(
    'payments',
    ['Task ID', 'User', 'Amount', 'Date'],
    recentPayments.map((p: any) => [
      p.taskId,
      p.userName,
      `R${p.amount}`,
      new Date(p.date).toLocaleDateString('en-ZA')
    ])
  )

  const exportPaymentsPDF = () => exportPDF(
    'Payments Report',
    ['Task ID', 'User', 'Amount', 'Date'],
    recentPayments.map((p: any) => [
      p.taskId,
      p.userName,
      `R${p.amount}`,
      new Date(p.date).toLocaleDateString('en-ZA')
    ])
  )

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div className="container">
          <h1><i className="fas fa-credit-card" /> Payments Overview</h1>
          <p>Ozow collections, direct runner payouts and bank verification</p>
        </div>
      </div>

      <div className="container">
        {data && (
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-icon bg-success"><i className="fas fa-coins" /></div>
              <div className="stat-content"><h3>R{(data.platformEarnings ?? 0).toFixed(2)}</h3><p>Platform Earnings</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-info"><i className="fas fa-chart-line" /></div>
              <div className="stat-content"><h3>R{(data.grossVolume ?? 0).toFixed(2)}</h3><p>Gross Volume</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-warning"><i className="fas fa-lock" /></div>
              <div className="stat-content"><h3>R{(data.pendingCommission ?? 0).toFixed(2)}</h3><p>Pending Commission</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-danger"><i className="fas fa-undo" /></div>
              <div className="stat-content"><h3>R{(data.totalRefunded ?? 0).toFixed(2)}</h3><p>Total Refunded</p></div>
            </div>
          </div>
        )}

        {recentPayments.length > 0 && (
          <div className="section-card" style={{ marginBottom: '1.5rem' }}>
            <div className="section-header">
              <h2><i className="fas fa-history" /> Recent Payments</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={exportPaymentsCSV}><i className="fas fa-file-csv" /> CSV</button>
                <button className="btn btn-secondary btn-sm" onClick={exportPaymentsPDF}><i className="fas fa-file-pdf" /> PDF</button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    {['Task ID', 'Task', 'Creator', 'Runner', 'Amount', 'Commission', 'Payout', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{p.taskId}</td>
                      <td style={{ padding: '0.75rem 0.5rem', maxWidth: 160 }}><div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{p.taskName}</div></td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8125rem' }}>{p.userName}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{p.runnerName ? <div><div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{p.runnerName}</div>{p.runnerContact && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.runnerContact}</div>}</div> : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>R{p.amount}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--success)', fontWeight: 600, whiteSpace: 'nowrap' }}>R{(p.commission ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>R{(p.payout ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}><span className={`badge badge-${(p.status || '').toLowerCase()}`}>{p.status}</span></td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(p.date).toLocaleDateString('en-ZA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="section-card" style={{ marginTop: '1.5rem' }}>
          <div className="section-header">
            <h2><i className="fas fa-university" /> Bank Account Verification</h2>
            <span className="text-muted text-sm">{bankAccounts.filter((b: any) => !b.isVerified).length} pending</span>
          </div>
          {bankAccounts.length === 0 ? (
            <div className="empty-state"><i className="fas fa-university" /><p>No bank accounts</p></div>
          ) : (
            <div className="admin-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    {['User', 'Bank', 'Account', 'Type', 'Status', ''].map(h => <th key={h} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {bankAccounts.map((b: any) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}><div style={{ fontWeight: 500 }}>{b.accountHolderName}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.userEmail}</div></td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{b.bankName}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace' }}>****{b.accountNumber?.slice(-4)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{b.accountType}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}><span className={`badge badge-${b.isVerified ? 'success' : 'warning'}`}>{b.isVerified ? 'Verified' : 'Pending'}</span></td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{!b.isVerified && <button className="btn btn-primary btn-sm" onClick={() => handleVerifyBank(b.id)} disabled={verifyingId === b.id}>{verifyingId === b.id ? <span className="spinner spinner-sm" /> : <><i className="fas fa-check" /> Verify</>}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
