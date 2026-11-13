import { useState, useEffect } from 'react'
import { adminApi } from '../../api'
import { exportCSV, exportPDF } from '../../utils/export'

export default function AdminPayments() {
  const [data, setData] = useState<any>(null)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [financeView, setFinanceView] = useState<'payments' | 'reconciliation' | 'operations' | 'approvals' | 'ledger'>('payments')
  const [operations, setOperations] = useState<any>(null)
  const [settlementReport, setSettlementReport] = useState<any>(null)
  const [ledgerReport, setLedgerReport] = useState<any>(null)
  const [operationsLoading, setOperationsLoading] = useState(false)
  const [settlementLoading, setSettlementLoading] = useState(false)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [operationsError, setOperationsError] = useState('')
  const [settlementError, setSettlementError] = useState('')
  const [ledgerError, setLedgerError] = useState('')
  const [financialApprovals, setFinancialApprovals] = useState<any[]>([])
  const [financialApprovalLoading, setFinancialApprovalLoading] = useState(false)
  const [financialApprovalError, setFinancialApprovalError] = useState('')
  const [financialRequestReason, setFinancialRequestReason] = useState('')
  const [financialDecisionReason, setFinancialDecisionReason] = useState('')
  const [financialTaskId, setFinancialTaskId] = useState('')
  const [financialApprovalBusy, setFinancialApprovalBusy] = useState(false)
  const [financialLedger, setFinancialLedger] = useState<any>(null)
  const [financialLedgerPage, setFinancialLedgerPage] = useState(1)
  const [financialLedgerLoading, setFinancialLedgerLoading] = useState(false)
  const [financialLedgerError, setFinancialLedgerError] = useState('')
  const [financialReversals, setFinancialReversals] = useState<any[]>([])
  const [financialReversalLoading, setFinancialReversalLoading] = useState(false)
  const [financialReversalBusy, setFinancialReversalBusy] = useState(false)
  const [financialReversalError, setFinancialReversalError] = useState('')

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

  const loadFinancialApprovals = async () => {
    setFinancialApprovalLoading(true)
    setFinancialApprovalError('')
    try {
      const response = await adminApi.getFinancialApprovals()
      const payload = response.data?.data || response.data
      setFinancialApprovals(Array.isArray(payload) ? payload : [])
    } catch (error: any) {
      setFinancialApprovalError(error?.response?.data?.message || 'Unable to load financial approval requests. A SuperAdmin with fresh authenticator verification is required.')
    } finally {
      setFinancialApprovalLoading(false)
    }
  }

  const loadFinancialLedger = async (page = financialLedgerPage) => {
    setFinancialLedgerLoading(true)
    setFinancialLedgerError('')
    try {
      const response = await adminApi.getFinancialLedger({ page, pageSize: 50 })
      setFinancialLedger(response.data?.data || response.data)
      setFinancialLedgerPage(page)
    } catch (error: any) {
      setFinancialLedgerError(error?.response?.data?.message || 'Unable to load the double-entry financial journal.')
    } finally {
      setFinancialLedgerLoading(false)
    }
  }

  const loadFinancialReversals = async () => {
    setFinancialReversalLoading(true)
    setFinancialReversalError('')
    try {
      const response = await adminApi.getFinancialReversalRequests()
      const payload = response.data?.data || response.data
      setFinancialReversals(Array.isArray(payload) ? payload : [])
    } catch (error: any) {
      setFinancialReversalError(error?.response?.data?.message || 'Unable to load immutable journal reversal requests.')
    } finally {
      setFinancialReversalLoading(false)
    }
  }

  const requestJournalReversal = async (journal: any) => {
    const reason = window.prompt('Explain why this exact original journal must be reversed (10–500 characters). No balance will be edited directly.')?.trim() || ''
    if (reason.length < 10 || reason.length > 500) {
      setFinancialReversalError('A reversal reason between 10 and 500 characters is required. No request was submitted.')
      return
    }
    setFinancialReversalBusy(true)
    setFinancialReversalError('')
    try {
      await adminApi.requestFinancialReversal(Number(journal.id), reason)
      await Promise.all([loadFinancialReversals(), loadFinancialLedger(financialLedgerPage)])
    } catch (error: any) {
      setFinancialReversalError(error?.response?.data?.message || 'Unable to request the exact journal reversal.')
    } finally {
      setFinancialReversalBusy(false)
    }
  }

  const decideJournalReversal = async (id: number, decision: 'approve' | 'reject') => {
    const reason = window.prompt('Record the independent review decision (10–500 characters). The requester cannot approve their own request.')?.trim() || ''
    if (reason.length < 10 || reason.length > 500) {
      setFinancialReversalError('A decision reason between 10 and 500 characters is required. No decision was submitted.')
      return
    }
    setFinancialReversalBusy(true)
    setFinancialReversalError('')
    try {
      await adminApi.decideFinancialReversal(id, decision, reason)
      await loadFinancialReversals()
    } catch (error: any) {
      setFinancialReversalError(error?.response?.data?.message || 'Unable to record the independent reversal decision.')
    } finally {
      setFinancialReversalBusy(false)
    }
  }

  const executeJournalReversal = async (item: any) => {
    if (!window.confirm('Execute the approved exact reversal? This posts the inverse of every original journal line; it does not edit or delete the original journal.')) return
    setFinancialReversalBusy(true)
    setFinancialReversalError('')
    try {
      await adminApi.executeFinancialReversal(item.id)
      await Promise.all([loadFinancialReversals(), loadFinancialLedger(financialLedgerPage)])
    } catch (error: any) {
      setFinancialReversalError(error?.response?.data?.message || 'The reversal could not be posted. Reconcile the request and original journal before retrying.')
      await loadFinancialReversals()
    } finally {
      setFinancialReversalBusy(false)
    }
  }

  const createFinancialApproval = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!financialTaskId.trim() || financialRequestReason.trim().length < 10) return
    setFinancialApprovalBusy(true)
    setFinancialApprovalError('')
    try {
      await adminApi.requestFinancialApproval(financialTaskId.trim(), financialRequestReason.trim())
      setFinancialTaskId('')
      setFinancialRequestReason('')
      await loadFinancialApprovals()
    } catch (error: any) {
      setFinancialApprovalError(error?.response?.data?.message || 'Unable to create the financial approval request.')
    } finally {
      setFinancialApprovalBusy(false)
    }
  }

  const decideFinancialApproval = async (id: number, decision: 'approve' | 'reject') => {
    if (financialDecisionReason.trim().length < 10) {
      setFinancialApprovalError('Enter a decision reason of at least 10 characters before approving or rejecting.')
      return
    }
    setFinancialApprovalBusy(true)
    setFinancialApprovalError('')
    try {
      if (decision === 'approve') await adminApi.approveFinancialRequest(id, financialDecisionReason.trim())
      else await adminApi.rejectFinancialRequest(id, financialDecisionReason.trim())
      setFinancialDecisionReason('')
      await loadFinancialApprovals()
    } catch (error: any) {
      setFinancialApprovalError(error?.response?.data?.message || 'Unable to record the independent decision.')
    } finally {
      setFinancialApprovalBusy(false)
    }
  }

  const executeFinancialApproval = async (item: any) => {
    let executionReason = ''
    if (item.action === 'refund_creator' || item.action === 'release_to_runner') {
      executionReason = window.prompt(
        'Record the execution reason and the final dispute-resolution decision (10–500 characters).',
      )?.trim() || ''
      if (executionReason.length < 10 || executionReason.length > 500) {
        setFinancialApprovalError('A separate execution reason between 10 and 500 characters is required. No action was submitted.')
        return
      }
    }

    setFinancialApprovalBusy(true)
    setFinancialApprovalError('')
    try {
      if (item.action === 'refund_creator' || item.action === 'release_to_runner') {
        if (!item.disputeId) throw new Error('This approval is not bound to a dispute. No financial action was submitted.')
        await adminApi.resolveDispute(item.disputeId, executionReason, item.action, executionReason)
      } else {
        await adminApi.executeFinancialApproval(item.id)
      }
      await loadFinancialApprovals()
      await loadOperations()
    } catch (error: any) {
      setFinancialApprovalError(error?.response?.data?.message || error?.message || 'Execution failed or requires manual reconciliation.')
      await loadFinancialApprovals()
    } finally {
      setFinancialApprovalBusy(false)
    }
  }

  const reconcileFinancialApproval = async (id: number) => {
    setFinancialApprovalBusy(true)
    setFinancialApprovalError('')
    try {
      await adminApi.reconcileFinancialApproval(id)
      await loadFinancialApprovals()
      await loadOperations()
    } catch (error: any) {
      setFinancialApprovalError(error?.response?.data?.message || 'Provider state could not be reconciled. Do not resubmit the financial action.')
      await loadFinancialApprovals()
    } finally {
      setFinancialApprovalBusy(false)
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
  useEffect(() => {
    if (financeView === 'ledger') {
      void loadFinancialLedger(1)
      void loadFinancialReversals()
    }
  }, [financeView])

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
          <p>Operational task/payment statuses. Accounting balances are shown in the double-entry journal.</p>
        </div>
      </div>

      <div className="container">
        <div className="alert alert-warning" role="note">
          The summary below is calculated from task and payment-status records. It is not a general ledger and does not replace the double-entry journal or provider reconciliation.
        </div>
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
            <button className={financeView === 'approvals' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => { setFinanceView('approvals'); void loadFinancialApprovals() }}>Two-person approvals</button>
            <button className={financeView === 'ledger' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => setFinanceView('ledger')}>Double-entry journal</button>
          </div>
          {financeView === 'reconciliation' && (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button className="btn btn-primary btn-sm" onClick={() => void runSettlementReconciliation()} disabled={settlementLoading}>
                  {settlementLoading ? <><span className="spinner spinner-sm" /> Retrieving Paystack data…</> : <><i className="fas fa-arrows-rotate" /> Run Paystack settlement reconciliation</>}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => void runLedgerReconciliation()} disabled={ledgerLoading}>
                  {ledgerLoading ? <><span className="spinner spinner-sm" /> Comparing records…</> : 'Compare task/payment records'}
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
                  <h3>Task/payment record comparison (not an accounting ledger)</h3>
                  <div className="stats-grid">
                    <div className="stat-card"><div className="stat-content"><h3>{ledgerReport.returnedTaskCount ?? 0}</h3><p>Tasks checked</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>{ledgerReport.tasksWithFindings ?? 0}</h3><p>Tasks with findings</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>{ledgerReport.findingCount ?? 0}</h3><p>Total findings</p></div></div>
                  </div>
                </div>
              )}
            </div>
          )}
          {financeView === 'ledger' && (
            <div>
              <div className="alert alert-warning" role="note">
                This is the new double-entry accounting journal. It does not read or convert retired wallet balances, task totals or audit-log text. Coverage starts with the first journal entry; historical backfill has not been performed.
              </div>
              {financialLedgerError && <div className="alert alert-warning" role="alert">{financialLedgerError}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
                <p className="text-muted text-sm" style={{ margin: 0 }}>
                  {financialLedger?.firstJournalAtUtc
                    ? `Journal coverage begins ${new Date(financialLedger.firstJournalAtUtc).toLocaleString('en-ZA')}.`
                    : 'No journal entries have been posted yet.'}
                </p>
                <button className="btn btn-secondary btn-sm" onClick={() => void loadFinancialLedger()} disabled={financialLedgerLoading}>Refresh journal</button>
              </div>
              {financialLedgerLoading ? <div className="loading-state"><div className="spinner" /></div> : financialLedger && (
                <>
                  <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                    <div className="stat-card"><div className="stat-content"><h3>R{Number(financialLedger.totalDebits || 0).toFixed(2)}</h3><p>Total debits</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>R{Number(financialLedger.totalCredits || 0).toFixed(2)}</h3><p>Total credits</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>{financialLedger.totalCount ?? 0}</h3><p>Journal entries</p></div></div>
                    <div className="stat-card"><div className="stat-content"><h3>{financialLedger.isBalanced ? 'Balanced' : 'Review required'}</h3><p>Journal integrity</p></div></div>
                  </div>
                  <h3>Chart of accounts</h3>
                  <div className="admin-table-wrap" style={{ marginBottom: '1.25rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{['Code', 'Account', 'Type', 'Currency', 'Debits', 'Credits', 'Raw debit less credit'].map(label => <th key={label} style={{ padding: '.65rem .5rem' }}>{label}</th>)}</tr></thead>
                      <tbody>{(financialLedger.accounts || []).map((account: any) => (
                        <tr key={account.code} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '.65rem .5rem', fontFamily: 'monospace' }}>{account.code}</td>
                          <td style={{ padding: '.65rem .5rem' }}>{account.name}</td>
                          <td style={{ padding: '.65rem .5rem' }}>{account.accountType}</td>
                          <td style={{ padding: '.65rem .5rem' }}>{account.currency}</td>
                          <td style={{ padding: '.65rem .5rem' }}>R{Number(account.debitTotal || 0).toFixed(2)}</td>
                          <td style={{ padding: '.65rem .5rem' }}>R{Number(account.creditTotal || 0).toFixed(2)}</td>
                          <td style={{ padding: '.65rem .5rem' }}>R{Number(account.rawDebitMinusCreditBalance || 0).toFixed(2)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <h3>Journal history</h3>
                  {(financialLedger.journals || []).length === 0 ? <p className="text-muted">No accounting events have been posted yet. Legacy records have not been fabricated into journal entries.</p> : (
                    <>
                    <div className="admin-table-wrap">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{['Recorded', 'Journal', 'Event', 'Source', 'Description', 'Debit', 'Credit', 'Provider ref', 'Lines', 'Reversal'].map(label => <th key={label} style={{ padding: '.65rem .5rem' }}>{label}</th>)}</tr></thead>
                        <tbody>{(financialLedger.journals || []).map((journal: any) => (
                          <tr key={journal.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '.65rem .5rem', whiteSpace: 'nowrap' }}>{new Date(journal.recordedAt).toLocaleString('en-ZA')}</td>
                            <td style={{ padding: '.65rem .5rem', fontFamily: 'monospace' }}>{journal.journalNumber}</td>
                            <td style={{ padding: '.65rem .5rem' }}>{journal.eventType}</td>
                            <td style={{ padding: '.65rem .5rem' }}>{journal.sourceType}: {journal.sourceId}</td>
                            <td style={{ padding: '.65rem .5rem', minWidth: '12rem' }}>{journal.description}</td>
                            <td style={{ padding: '.65rem .5rem', whiteSpace: 'nowrap' }}>R{Number(journal.debitTotal || 0).toFixed(2)}</td>
                            <td style={{ padding: '.65rem .5rem', whiteSpace: 'nowrap' }}>R{Number(journal.creditTotal || 0).toFixed(2)}</td>
                            <td style={{ padding: '.65rem .5rem', fontFamily: 'monospace' }}>{journal.providerReference || '—'}</td>
                            <td style={{ padding: '.65rem .5rem', minWidth: '14rem' }}>
                              <details>
                                <summary style={{ cursor: 'pointer' }}>View {journal.lineCount ?? journal.lines?.length ?? 0} lines</summary>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '.5rem' }}>
                                  <thead><tr><th style={{ textAlign: 'left', padding: '.3rem' }}>Account</th><th style={{ textAlign: 'right', padding: '.3rem' }}>Debit</th><th style={{ textAlign: 'right', padding: '.3rem' }}>Credit</th></tr></thead>
                                  <tbody>{(journal.lines || []).map((line: any, index: number) => (
                                    <tr key={line.lineNumber ?? index}>
                                      <td style={{ padding: '.3rem' }}>{line.accountCode} — {line.accountName}{line.memo ? <div className="text-muted">{line.memo}</div> : null}</td>
                                      <td style={{ padding: '.3rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{line.debit > 0 ? 'R' + Number(line.debit).toFixed(2) : '—'}</td>
                                      <td style={{ padding: '.3rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{line.credit > 0 ? 'R' + Number(line.credit).toFixed(2) : '—'}</td>
                                    </tr>
                                  ))}</tbody>
                                </table>
                              </details>
                            </td>
                            <td style={{ padding: '.65rem .5rem', minWidth: '10rem' }}>
                              {journal.reversalOfJournalId ? <span className="text-muted">Reversal of #{journal.reversalOfJournalId}</span>
                                : journal.isReversed ? <span className="text-muted">Already reversed</span>
                                  : <button className="btn btn-secondary btn-sm" disabled={financialReversalBusy} onClick={() => void requestJournalReversal(journal)}>Request reversal</button>}
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div className="admin-toolbar" style={{ justifyContent: 'space-between', marginTop: '.75rem' }}>
                      <span className="text-muted text-sm">
                        Showing {financialLedger.journals?.length || 0} of {financialLedger.totalCount || 0} journal entries · Page {financialLedger.page || financialLedgerPage} of {Math.max(1, Math.ceil((financialLedger.totalCount || 0) / (financialLedger.pageSize || 50)))}
                      </span>
                      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                        <button className="btn btn-secondary btn-sm" disabled={financialLedgerLoading || financialLedgerPage <= 1} onClick={() => void loadFinancialLedger(financialLedgerPage - 1)}>Previous</button>
                        <button className="btn btn-secondary btn-sm" disabled={financialLedgerLoading || financialLedgerPage >= Math.max(1, Math.ceil((financialLedger.totalCount || 0) / (financialLedger.pageSize || 50)))} onClick={() => void loadFinancialLedger(financialLedgerPage + 1)}>Next</button>
                      </div>
                    </div>
                    </>
                  )}
                  <section style={{ marginTop: '1.5rem' }} aria-labelledby="financial-reversal-requests-heading">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', alignItems: 'center' }}>
                      <h3 id="financial-reversal-requests-heading">Two-person journal reversals</h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => void loadFinancialReversals()} disabled={financialReversalLoading}>Refresh requests</button>
                    </div>
                    <p className="text-muted text-sm">Only exact reversals of existing journal lines are permitted. The original entry remains immutable. Requester, approver and executor separation is enforced by the backend.</p>
                    {financialReversalError && <div className="alert alert-warning" role="alert">{financialReversalError}</div>}
                    {financialReversalLoading ? <div className="loading-state"><div className="spinner" /></div> : financialReversals.length === 0 ? (
                      <p className="text-muted">No journal reversal requests have been recorded.</p>
                    ) : (
                      <div className="admin-table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8125rem' }}>
                          <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{['Original journal', 'Event/source', 'Amount', 'Status', 'Requester', 'Approver', 'Reason', 'Actions'].map(label => <th key={label} style={{ padding: '.65rem .5rem' }}>{label}</th>)}</tr></thead>
                          <tbody>{financialReversals.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '.65rem .5rem', fontFamily: 'monospace' }}>{item.originalJournalNumber || ('#' + item.originalJournalId)}</td>
                              <td style={{ padding: '.65rem .5rem' }}>{item.originalEventType}<div className="text-muted">{item.originalSourceType}: {item.originalSourceId}</div></td>
                              <td style={{ padding: '.65rem .5rem', whiteSpace: 'nowrap' }}>{item.currency || 'ZAR'} {Number(item.originalAmount || 0).toFixed(2)}</td>
                              <td style={{ padding: '.65rem .5rem' }}>{item.status}</td>
                              <td style={{ padding: '.65rem .5rem' }}>{item.requestedByUserId}</td>
                              <td style={{ padding: '.65rem .5rem' }}>{item.decidedByUserId || '—'}</td>
                              <td style={{ padding: '.65rem .5rem', minWidth: '13rem' }}>{item.reason}{item.decisionReason && <div className="text-muted">Decision: {item.decisionReason}</div>}{item.failureReason && <div className="alert alert-warning">{item.failureReason}</div>}</td>
                              <td style={{ padding: '.65rem .5rem', minWidth: '12rem' }}>
                                {item.status === 'Pending' && <>
                                  <button className="btn btn-primary btn-sm" style={{ marginRight: '.35rem' }} disabled={financialReversalBusy} onClick={() => void decideJournalReversal(item.id, 'approve')}>Approve</button>
                                  <button className="btn btn-secondary btn-sm" disabled={financialReversalBusy} onClick={() => void decideJournalReversal(item.id, 'reject')}>Reject</button>
                                </>}
                                {item.status === 'Approved' && <button className="btn btn-primary btn-sm" disabled={financialReversalBusy} onClick={() => void executeJournalReversal(item)}>Execute exact reversal</button>}
                                {item.executedAt && <div className="text-muted">Executed: {new Date(item.executedAt).toLocaleString('en-ZA')}</div>}
                              </td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}
          {financeView === 'approvals' && (
            <div>
              <div className="alert alert-warning" role="note">
                Exceptional escrow release requires two different SuperAdmins with fresh authenticator verification. Execution queues the normal payout; it does not bypass the manual payout gate or send a Paystack transfer. Refunds and compensating adjustments are not enabled in this workflow.
              </div>
              {financialApprovalError && <div className="alert alert-warning" role="alert">{financialApprovalError}</div>}
              <form onSubmit={event => void createFinancialApproval(event)} style={{ display: 'grid', gap: '.75rem', maxWidth: '44rem', marginBottom: '1.5rem' }}>
                <h3>Request exceptional escrow release</h3>
                <label>Task reference
                  <input className="form-input" value={financialTaskId} onChange={event => setFinancialTaskId(event.target.value)} placeholder="DFY task reference" required />
                </label>
                <label>Request reason
                  <textarea className="form-input" rows={3} minLength={10} maxLength={500} value={financialRequestReason} onChange={event => setFinancialRequestReason(event.target.value)} placeholder="Explain the exceptional circumstances and supporting review." required />
                </label>
                <div><button className="btn btn-primary btn-sm" type="submit" disabled={financialApprovalBusy || financialRequestReason.trim().length < 10 || !financialTaskId.trim()}>
                  {financialApprovalBusy ? 'Saving…' : 'Submit for independent approval'}
                </button></div>
              </form>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', alignItems: 'center', marginBottom: '.75rem' }}>
                <h3 style={{ margin: 0 }}>Approval history</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => void loadFinancialApprovals()} disabled={financialApprovalLoading}>Refresh</button>
              </div>
              {financialApprovalLoading ? <div className="loading-state"><div className="spinner" /></div> : financialApprovals.length === 0 ? (
                <p className="text-muted">No financial approval requests have been recorded.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{['Task', 'Dispute', 'Amount', 'Approved charge', 'Action', 'Status', 'Requester', 'Approver', 'Reason', 'Expiry / execution'].map(label => <th key={label} style={{ padding: '.65rem .5rem' }}>{label}</th>)}</tr></thead>
                    <tbody>{financialApprovals.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '.65rem .5rem' }}>{item.taskReference || item.taskId}</td>
                        <td style={{ padding: '.65rem .5rem' }}>{item.disputeId || '—'}</td>
                        <td style={{ padding: '.65rem .5rem', whiteSpace: 'nowrap' }}>R{Number(item.amount || 0).toFixed(2)}</td>
                        <td style={{ padding: '.65rem .5rem', fontFamily: 'monospace', maxWidth: '12rem', overflowWrap: 'anywhere' }}>{item.paymentTransactionId || '—'}</td>
                        <td style={{ padding: '.65rem .5rem' }}>{item.action === 'refund_creator' ? 'Creator refund' : item.action === 'release_to_runner' ? 'Dispute runner release' : 'Exceptional escrow release'}</td>
                        <td style={{ padding: '.65rem .5rem' }}>{item.status}</td>
                        <td style={{ padding: '.65rem .5rem' }}>{item.requestedByUserId}</td>
                        <td style={{ padding: '.65rem .5rem' }}>{item.decidedByUserId || '—'}</td>
                        <td style={{ padding: '.65rem .5rem', minWidth: '14rem' }}>{item.reason}{item.decisionReason && <div className="text-muted">Decision: {item.decisionReason}</div>}{item.lastExecutionError && <div className="alert alert-warning">{item.lastExecutionError}</div>}</td>
                        <td style={{ padding: '.65rem .5rem', minWidth: '13rem' }}>
                          <div>{item.expiresAt ? new Date(item.expiresAt).toLocaleString('en-ZA') : '—'}</div>
                          {item.executedAt && <div>Executed: {new Date(item.executedAt).toLocaleString('en-ZA')}</div>}
                          {item.status === 'Pending' && <>
                            <button className="btn btn-primary btn-sm" style={{ margin: '.35rem .35rem .35rem 0' }} disabled={financialApprovalBusy || financialDecisionReason.trim().length < 10} onClick={() => void decideFinancialApproval(item.id, 'approve')}>Approve</button>
                            <button className="btn btn-secondary btn-sm" disabled={financialApprovalBusy || financialDecisionReason.trim().length < 10} onClick={() => void decideFinancialApproval(item.id, 'reject')}>Reject</button>
                          </>}
                          {item.status === 'Approved' && <button className="btn btn-primary btn-sm" style={{ marginTop: '.35rem' }} disabled={financialApprovalBusy} onClick={() => void executeFinancialApproval(item)}>{item.action === 'refund_creator' ? 'Execute approved refund' : item.action === 'release_to_runner' ? 'Execute approved dispute release' : 'Execute approved release'}</button>}
                          {item.status === 'Executing' && (item.action === 'refund_creator' || item.action === 'release_to_runner' ? <button className="btn btn-secondary btn-sm" style={{ marginTop: '.35rem' }} disabled={financialApprovalBusy} onClick={() => void reconcileFinancialApproval(item.id)}>Reconcile provider state</button> : <button className="btn btn-secondary btn-sm" style={{ marginTop: '.35rem' }} disabled={financialApprovalBusy} onClick={() => void executeFinancialApproval(item)}>Reconcile execution</button>)}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              <label style={{ display: 'block', maxWidth: '44rem', marginTop: '1rem' }}>Independent decision reason
                <textarea className="form-input" rows={2} minLength={10} maxLength={500} value={financialDecisionReason} onChange={event => setFinancialDecisionReason(event.target.value)} placeholder="Required for approve/reject; explain the independent review." />
              </label>
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
