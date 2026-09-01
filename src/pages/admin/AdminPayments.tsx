import { useState, useEffect } from 'react'
import { adminApi } from '../../api'
import { exportCSV, exportPDF } from '../../utils/export'

export default function AdminPayments() {
  const [data, setData] = useState<any>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAll = () => Promise.all([
    adminApi.getPayments(),
    adminApi.getWithdrawalRequests(),
    adminApi.getBankAccounts(),
  ]).then(([paymentsRes, withdrawalsRes, bankRes]) => {
    setData(paymentsRes.data?.data || paymentsRes.data)
    setWithdrawals(withdrawalsRes.data?.data?.withdrawals || [])
    setBankAccounts(bankRes.data?.data || [])
  }).catch(() => {}).finally(() => setLoading(false))

  useEffect(() => { loadAll() }, [])

  const handleVerifyBank = async (id: number) => {
    setVerifyingId(id)
    try { await adminApi.verifyBankAccount(id); await loadAll() } catch { /* ignore */ } finally { setVerifyingId(null) }
  }

  if (loading) return <div className="loading-state"><div className="spinner" /></div>

  const exportPaymentsCSV = () => exportCSV('payments', ['Task ID', 'User', 'Amount', 'Date'],
    (data?.recentPayments || []).map((p: any) => [p.taskId, p.userName, `R${p.amount}`, new Date(p.date).toLocaleDateString('en-ZA')]))

  const exportPaymentsPDF = () => exportPDF('Payments Report', ['Task ID', 'User', 'Amount', 'Date'],
    (data?.recentPayments || []).map((p: any) => [p.taskId, p.userName, `R${p.amount}`, new Date(p.date).toLocaleDateString('en-ZA')]))

  const exportWithdrawalsCSV = () => exportCSV('withdrawals', ['Reference', 'User', 'Email', 'Amount', 'Fee', 'Bank', 'Status', 'Date'],
    withdrawals.map((w: any) => [w.reference, w.userName, w.userEmail, `R${w.amount}`, `R${w.fee}`, `${w.bankName} ${w.accountNumber}`, w.status, new Date(w.createdAt).toLocaleDateString('en-ZA')]))

  const exportWithdrawalsPDF = () => exportPDF('Withdrawals Report', ['Reference', 'User', 'Amount', 'Fee', 'Bank', 'Status', 'Date'],
    withdrawals.map((w: any) => [w.reference, w.userName, `R${w.amount}`, `R${w.fee}`, `${w.bankName} ${w.accountNumber}`, w.status, new Date(w.createdAt).toLocaleDateString('en-ZA')]))

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-credit-card" /> Payments Overview</h1></div></div>
      <div className="container">

        {/* Stats */}
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
            <div className="stat-card">
              <div className="stat-icon bg-secondary"><i className="fas fa-exchange-alt" /></div>
              <div className="stat-content"><h3>{withdrawals.filter((w: any) => w.status === 'Pending').length}</h3><p>Pending Withdrawals</p></div>
            </div>
          </div>
        )}

        {/* Recent Payments */}
        {data?.recentPayments?.length > 0 && (
          <div className="section-card" style={{ marginBottom: '1.5rem' }}>
            <div className="section-header">
            <h2><i className="fas fa-history" /> Recent Payments</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={exportPaymentsCSV} disabled={!data?.recentPayments?.length}><i className="fas fa-file-csv" /> CSV</button>
              <button className="btn btn-secondary btn-sm" onClick={exportPaymentsPDF} disabled={!data?.recentPayments?.length}><i className="fas fa-file-pdf" /> PDF</button>
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
                  {data.recentPayments.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{p.taskId}</td>
                      <td style={{ padding: '0.75rem 0.5rem', maxWidth: 160 }}>
                        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{p.taskName}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8125rem' }}>{p.userName}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {p.runnerName
                          ? <div>
                              <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{p.runnerName}</div>
                              {p.runnerContact && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.runnerContact}</div>}
                            </div>
                          : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>}
                      </td>
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
            {/* Mobile cards */}
            <div className="admin-cards-wrap">
              {data.recentPayments.map((p: any, i: number) => (
                <div key={i} className="admin-task-card">
                  <div className="admin-task-card-header">
                    <span className="admin-task-id">{p.taskId}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--primary)' }}>R{p.amount}</span>
                  </div>
                  <div className="admin-task-card-body">
                    {p.taskName && <p className="admin-task-desc">{p.taskName}</p>}
                    <div className="admin-task-meta">
                      <span><i className="fas fa-user" /> {p.userName}</span>
                      {p.runnerName && <span><i className="fas fa-running" /> {p.runnerName}{p.runnerContact ? ` · ${p.runnerContact}` : ''}</span>}
                      <span><i className="fas fa-calendar-alt" /> {new Date(p.date).toLocaleDateString('en-ZA')}</span>
                    </div>
                  </div>
                  <div className="admin-task-card-footer">
                    <span className={`badge badge-${(p.status || '').toLowerCase()}`}>{p.status}</span>
                    <span style={{ marginLeft: 'auto' }}>Commission: <strong>R{(p.commission ?? 0).toFixed(2)}</strong></span>
                    <span>Payout: <strong style={{ color: 'var(--primary)' }}>R{(p.payout ?? 0).toFixed(2)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdrawal Requests */}
        <div className="section-card">
          <div className="section-header">
            <h2><i className="fas fa-university" /> Withdrawal Requests</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={exportWithdrawalsCSV} disabled={withdrawals.length === 0}><i className="fas fa-file-csv" /> CSV</button>
              <button className="btn btn-secondary btn-sm" onClick={exportWithdrawalsPDF} disabled={withdrawals.length === 0}><i className="fas fa-file-pdf" /> PDF</button>
            </div>
          </div>
          {withdrawals.length === 0 ? (
            <div className="empty-state"><i className="fas fa-university" /><p>No withdrawal requests</p></div>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      {['Reference', 'User', 'Amount', 'Fee', 'Bank', 'Status', 'Date'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w: any) => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{w.reference}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: 500 }}>{w.userName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.userEmail}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--primary)' }}>R{w.amount}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>R{w.fee}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{w.bankName} {w.accountNumber}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span className={`badge badge-${w.status?.toLowerCase() === 'completed' ? 'success' : w.status?.toLowerCase() === 'failed' ? 'danger' : 'warning'}`}>{w.status}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(w.createdAt).toLocaleDateString('en-ZA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-cards-wrap">
                {withdrawals.map((w: any) => (
                  <div key={w.id} className="admin-task-card">
                    <div className="admin-task-card-header">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{w.userName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.userEmail}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>R{w.amount}</span>
                    </div>
                    <div className="admin-task-card-body">
                      <div className="admin-task-meta">
                        <span><i className="fas fa-university" /> {w.bankName} {w.accountNumber}</span>
                        <span><i className="fas fa-receipt" /> Fee: R{w.fee}</span>
                        <span><i className="fas fa-user" /> {w.userName}</span>
                      </div>
                    </div>
                    <div className="admin-task-card-footer">
                      <span className={`badge badge-${w.status?.toLowerCase() === 'completed' ? 'success' : w.status?.toLowerCase() === 'failed' ? 'danger' : 'warning'}`}>{w.status}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(w.createdAt).toLocaleDateString('en-ZA')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {/* Bank Account Verification */}
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
                    {['User', 'Bank', 'Account', 'Type', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bankAccounts.map((b: any) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{b.accountHolderName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.userEmail}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{b.bankName}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace' }}>****{b.accountNumber?.slice(-4)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{b.accountType}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className={`badge badge-${b.isVerified ? 'success' : 'warning'}`}>{b.isVerified ? 'Verified' : 'Pending'}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {!b.isVerified && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleVerifyBank(b.id)} disabled={verifyingId === b.id}>
                            {verifyingId === b.id ? <span className="spinner spinner-sm" /> : <><i className="fas fa-check" /> Verify</>}
                          </button>
                        )}
                      </td>
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
