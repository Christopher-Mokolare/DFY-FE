import { useState, useEffect } from 'react'
import { adminApi } from '../../api'
import { exportCSV, exportPDF } from '../../utils/export'

export default function AdminPayments() {
  const [data, setData] = useState<any>(null)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [financeView, setFinanceView] = useState<'payments' | 'reconciliation' | 'operations'>('payments')
  const [operations, setOperations] = useState<any>(null)
  const [settlementReport, setSettlementReport] = useState<any>(null)
  const [ledgerReport, setLedgerReport] = useState<any>(null)
  const [operationsLoading, setOperationsLoading] = useState(false)
  const [settlementLoading, setSettlementLoading] = useState(false)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [operationsError, setOperationsError] = useState('')
  const [settlementError, setSettlementError] = useState('')
  const [ledgerError, setLedgerError] = useState('')

  const loadAll = () => Promise.all([
    adminApi.getPayments(),
    adminApi.getBankAccounts(),
  ]).then(([paymentsRes, bankRes]) => {
    setData(paymentsRes.data?.data || paymentsRes.data)
    setBankAccounts(bankRes.data?.data || [])
  }).catch(() => {}).finally(() => setLoading(false))

  const loadOperations = async () => {
    setOperationsLoading(true)
    setOperationsError('')
    try {
      const response = await adminApi.getPaymentOperations({ days: 30, limit: 100 })
      setOperations(response.data?.data || response.data)
    } catch (error: any) {
      setOperationsError(error?.response?.data?.message || 'Unable to load the payment operations queue.')
    } finally {
      setOperationsLoading(false)
    }
  }

  const runSettlementReconciliation = async () => {
    setSettlementLoading(true)
    setSettlementError('')
    try {
      const to = new Date()
      const from = new Date(to)
      from.setDate(from.getDate() - 30)
      const response = await adminApi.getPaystackSettlementReconciliation({
        from: from.toISOString(),
        to: to.toISOString(),
        maxSettlements: 25,
      })
      setSettlementReport(response.data?.data || response.data)
    } catch (error: any) {
      setSettlementError(error?.response?.data?.message || 'Unable to retrieve Paystack settlement records. Check the staging configuration and try again.')
      setSettlementReport(error?.response?.data?.data || null)
    } finally {
      setSettlementLoading(false)
    }
  }

  const runLedgerReconciliation = async () => {
    setLedgerLoading(true)
    setLedgerError('')
    try {
      const response = await adminApi.getFinancialReconciliation({ days: 30, limit: 250 })
      setLedgerReport(response.data?.data || response.data)
    } catch (error: any) {
      setLedgerError(error?.response?.data?.message || 'Unable to load the DFY ledger consistency report.')
    } finally {
      setLedgerLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { void loadOperations() }, [])

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
          <p>Paystack collections, direct runner payouts and bank verification</p>
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

        <div className="section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-header">
            <div>
              <h2><i className="fas fa-shield-halved" /> Financial controls</h2>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Read-only checks against DFY records and Paystack settlement data. No payouts or refunds are triggered here.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => void loadOperations()} disabled={operationsLoading}>
              <i className="fas fa-rotate" /> Refresh operations
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button className={financeView === 'payments' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => setFinanceView('payments')}>Payments overview</button>
            <button className={financeView === 'reconciliation' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => setFinanceView('reconciliation')}>Reconciliation</button>
            <button className={financeView === 'operations' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => setFinanceView('operations')}>Operations queue</button>
          </div>
          {financeView === 'reconciliation' && (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button className="btn btn-primary btn-sm" onClick={() => void runSettlementReconciliation()} disabled={settlementLoading}>
                  {settlementLoading ? <><span className="spinner spinner-sm" /> Retrieving Paystack data…</> : <><i className="fas fa-arrows-rotate" /> Run Paystack settlement reconciliation</>}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => void runLedgerReconciliation()} disabled={ledgerLoading}>
                  {ledgerLoading ? <><span className="spinner spinner-sm" /> Checking ledger…</> : 'Run DFY ledger check'}
                </button>
              </div>
              {settlementError && <div className="alert alert-warning" role="alert">{settlementError}</div>}
              {settlementReport && (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {settlementReport.message || (settlementReport.reconciliationComplete ? 'Provider data retrieved.' : 'Provider data may be incomplete.')}
                  </p>
                  <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                    <div className="stat-card"><div className="stat-content"><h3>{settlementReport.settlementCount ?? settlementReport.settlements?.length ?? 0}</h3><p>Settlement batches</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>{settlementReport.transactionCount ?? settlementReport.transactions?.length ?? 0}</h3><p>Settlement transactions</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>{settlementReport.transactionFindings ?? 0}</h3><p>Transaction findings</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>{settlementReport.reconciliationComplete === false ? 'Partial' : settlementReport.providerRecordsRetrieved === false ? 'Unavailable' : 'Retrieved'}</h3><p>Provider data status</p></div></div>
                  </div>
                  {(settlementReport.settlementTotalsByCurrency || []).length > 0 && (
                    <div className="admin-table-wrap" style={{ marginBottom: '1rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead><tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>{['Currency', 'Gross processed', 'Settlement amount', 'Effective amount', 'Provider fees'].map(h => <th key={h} style={{ padding: '0.65rem 0.5rem' }}>{h}</th>)}</tr></thead>
                        <tbody>{settlementReport.settlementTotalsByCurrency.map((row: any) => (
                          <tr key={row.currency} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.65rem 0.5rem' }}>{row.currency}</td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>{row.grossProcessed?.toFixed?.(2) ?? row.grossProcessed}</td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>{row.settlementAmount?.toFixed?.(2) ?? row.settlementAmount}</td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>{row.effectiveAmount?.toFixed?.(2) ?? row.effectiveAmount}</td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>{row.providerFees?.toFixed?.(2) ?? row.providerFees}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  {(settlementReport.transactions || []).length > 0 && (
                    <div className="admin-table-wrap">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead><tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>{['Reference', 'Task', 'Status', 'Currency', 'Amount', 'Provider fee', 'Findings'].map(h => <th key={h} style={{ padding: '0.65rem 0.5rem' }}>{h}</th>)}</tr></thead>
                        <tbody>{settlementReport.transactions.slice(0, 100).map((row: any, i: number) => (
                          <tr key={row.reference || i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{row.reference || '—'}</td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>{row.matchedTaskIds?.join(', ') || 'Unmatched'}</td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>{row.status}</td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>{row.currency}</td>
                            <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>{row.providerAmount?.toFixed?.(2) ?? row.providerAmount}</td>
                            <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>{row.providerFees?.toFixed?.(2) ?? row.providerFees ?? '—'}</td>
                            <td style={{ padding: '0.65rem 0.5rem', color: row.findings?.length ? 'var(--danger)' : 'var(--success)' }}>{row.findings?.join(' ') || 'Consistent'}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {(settlementReport.localSuccessfulAttemptsNotMatchedByReturnedSettlementReference || []).length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h3>Local successful payments not matched in this settlement window</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    These are review candidates, not confirmed missing settlements. Payment and settlement dates can differ.
                  </p>
                  <div className="admin-table-wrap">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{['Reference', 'Task', 'Amount', 'Status', 'Completed'].map(h => <th key={h} style={{ padding: '0.65rem 0.5rem' }}>{h}</th>)}</tr></thead>
                      <tbody>{settlementReport.localSuccessfulAttemptsNotMatchedByReturnedSettlementReference.map((row: any) => (
                        <tr key={row.reference} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{row.reference}</td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>{row.taskId}</td>
                          <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>R{Number(row.amount || 0).toFixed(2)}</td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>{row.status}</td>
                          <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>{row.completedAt ? new Date(row.completedAt).toLocaleString('en-ZA') : '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
              {settlementReport.providerError && <div className="alert alert-warning" role="alert" style={{ marginTop: '1rem' }}>{settlementReport.providerError}</div>}
              {ledgerError && <div className="alert alert-warning" role="alert" style={{ marginTop: '1rem' }}>{ledgerError}</div>}
              {ledgerReport && (
                <div style={{ marginTop: '1rem' }}>
                  <h3>DFY ledger consistency</h3>
                  <div className="stats-grid">
                    <div className="stat-card"><div className="stat-content"><h3>{ledgerReport.returnedTaskCount ?? 0}</h3><p>Tasks checked</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>{ledgerReport.tasksWithFindings ?? 0}</h3><p>Tasks with findings</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>{ledgerReport.findingCount ?? 0}</h3><p>Total findings</p></div></div>
                  </div>
                </div>
              )}
            </div>
          )}
          {financeView === 'operations' && (
            <div>
              {operationsError && <div className="alert alert-warning" role="alert">{operationsError}</div>}
              {operationsLoading ? <div className="loading-state"><div className="spinner" /></div> : operations && (
                <>
                  <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                    {[
                      ['Pending/processing payouts', operations.summary?.pendingOrProcessingPayouts ?? 0],
                      ['Stale payouts', operations.summary?.stalePayouts ?? 0],
                      ['Unresolved refunds', operations.summary?.unresolvedRefunds ?? 0],
                      ['Open disputes', operations.summary?.openDisputes ?? 0],
                      ['Failed payment attempts', operations.summary?.failedPaymentAttempts ?? 0],
                    ].map(([label, value]) => <div className="stat-card" key={label}><div className="stat-content"><h3>{value}</h3><p>{label}</p></div></div>)}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{operations.note}</p>
                  <h3>Payout queue</h3>
                  {(operations.payouts || []).length === 0 ? <p className="text-muted">No payout records in this view.</p> : (
                    <div className="admin-table-wrap" style={{ marginBottom: '1rem' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{['Task', 'Amount', 'Status', 'Attempts', 'Last updated', 'Next retry', 'Reference'].map(h => <th key={h} style={{ padding: '0.65rem 0.5rem' }}>{h}</th>)}</tr></thead>
                      <tbody>{operations.payouts.map((row: any) => <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{row.taskReference}</td><td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>R{Number(row.amount || 0).toFixed(2)}</td><td style={{ padding: '0.65rem 0.5rem' }}>{row.status}</td><td style={{ padding: '0.65rem 0.5rem' }}>{row.attemptCount}</td><td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>{row.updatedAt ? new Date(row.updatedAt).toLocaleString('en-ZA') : '—'}</td><td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>{row.nextAttemptAt ? new Date(row.nextAttemptAt).toLocaleString('en-ZA') : '—'}</td><td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace' }}>{row.merchantReference}</td>
                      </tr>)}</tbody>
                    </table></div>
                  )}
                  <h3>Refund queue</h3>
                  {(operations.refunds || []).length === 0 ? <p className="text-muted">No refund records in this view.</p> : (
                    <div className="admin-table-wrap" style={{ marginBottom: '1rem' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{['Task', 'Amount', 'Status', 'Refund reference', 'Last reconciled'].map(h => <th key={h} style={{ padding: '0.65rem 0.5rem' }}>{h}</th>)}</tr></thead>
                      <tbody>{operations.refunds.map((row: any) => <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{row.taskReference}</td><td style={{ padding: '0.65rem 0.5rem' }}>R{Number(row.amount || 0).toFixed(2)}</td><td style={{ padding: '0.65rem 0.5rem' }}>{row.status}</td><td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace' }}>{row.refundId}</td><td style={{ padding: '0.65rem 0.5rem' }}>{row.lastReconciledAt ? new Date(row.lastReconciledAt).toLocaleString('en-ZA') : '—'}</td>
                      </tr>)}</tbody>
                    </table></div>
                  )}
                  <h3>Disputes</h3>
                  {(operations.disputes || []).length === 0 ? <p className="text-muted">No disputes in this view.</p> : (
                    <div className="admin-table-wrap"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{['Task', 'Category', 'Status', 'Created'].map(h => <th key={h} style={{ padding: '0.65rem 0.5rem' }}>{h}</th>)}</tr></thead>
                      <tbody>{operations.disputes.map((row: any) => <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{row.taskReference}</td><td style={{ padding: '0.65rem 0.5rem' }}>{row.category}</td><td style={{ padding: '0.65rem 0.5rem' }}>{row.status}</td><td style={{ padding: '0.65rem 0.5rem' }}>{new Date(row.createdAt).toLocaleString('en-ZA')}</td>
                      </tr>)}</tbody>
                    </table></div>
                  )}
                  {operations.summary?.chargebackCaseTrackingAvailable === false && <p className="alert alert-warning" style={{ marginTop: '1rem' }}>Paystack chargeback case/deadline tracking is not yet represented in DFY's data model. Do not treat this queue as a chargeback deadline monitor.</p>}
                </>
              )}
            </div>
          )}
        </div>

        {financeView === 'payments' && recentPayments.length > 0 && (
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

        {financeView === 'payments' && (
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
        )}
      </div>
    </div>
  )
}
