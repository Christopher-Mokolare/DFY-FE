import { useState, useEffect } from 'react'
import { walletApi, userPreferencesApi } from '../../api'
import './Wallet.css'

const BANKS = [
  { name: 'ABSA', code: '632005' }, { name: 'FNB', code: '250655' },
  { name: 'Standard Bank', code: '051001' }, { name: 'Nedbank', code: '198765' },
  { name: 'Capitec', code: '470010' }, { name: 'African Bank', code: '430000' },
]

export default function Wallet() {
  const [balance, setBalance] = useState(0)
  const [pending, setPending] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [totalWithdrawn, setTotalWithdrawn] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loadingTx, setLoadingTx] = useState(true)
  const [showAddBank, setShowAddBank] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fee, setFee] = useState(0)
  const [minWithdraw, setMinWithdraw] = useState(50)
  const [maxWithdraw, setMaxWithdraw] = useState(10000)
  const [bankForm, setBankForm] = useState({ bankName: '', accountHolderName: '', accountNumber: '', branchCode: '', accountType: 'Cheque' })
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bankAccountId: '' })

  useEffect(() => {
    // GET /api/v1/wallet/balance → { success, data: { availableBalance, pendingPayouts, totalEarned, totalWithdrawn } }
    walletApi.getBalance().then(r => {
      const d = r.data?.data || r.data
      setBalance(d?.availableBalance ?? d?.balance ?? 0)
      setPending(d?.pendingPayouts ?? 0)
      setTotalEarned(d?.totalEarned ?? 0)
      setTotalWithdrawn(d?.totalWithdrawn ?? 0)
    }).catch(() => {})

    // GET /api/v1/wallet/transactions → { success, data: { items: [...], totalCount, page, pageSize } }
    walletApi.getTransactions().then(r => {
      const d = r.data?.data
      setTransactions(d?.items || d?.transactions || [])
    }).catch(() => {}).finally(() => setLoadingTx(false))

    walletApi.getBankAccounts().then(r => setBankAccounts(r.data?.data || [])).catch(() => {})
    walletApi.getPendingWithdrawals().then(r => setWithdrawals(r.data?.data || [])).catch(() => {})

    userPreferencesApi.get().then(r => {
      const d = r.data?.data
      if (d?.minTaskAmount) setMinWithdraw(d.minTaskAmount)
      if (d?.maxTaskAmount) setMaxWithdraw(d.maxTaskAmount)
    }).catch(() => {})
  }, [])

  const fmt = (n: number) => `R${(n || 0).toFixed(2)}`
  const calcFee = (amt: number) => Math.max(amt * 0.02, 5)

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      await walletApi.addBankAccount(bankForm)
      const r = await walletApi.getBankAccounts()
      setBankAccounts(r.data?.data || [])
      setShowAddBank(false)
      setBankForm({ bankName: '', accountHolderName: '', accountNumber: '', branchCode: '', accountType: 'Cheque' })
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      await walletApi.requestWithdrawal({ amount: parseFloat(withdrawForm.amount), bankAccountId: parseInt(withdrawForm.bankAccountId) })
      setShowWithdraw(false)
      const r = await walletApi.getBalance()
      const d = r.data?.data || r.data
      setBalance(d?.availableBalance ?? d?.balance ?? 0)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-wallet" /> My Wallet</h1></div></div>
      <div className="container">
        <div className="wallet-summary">
          {[
            { icon: 'fa-money-bill-wave', bg: 'bg-success', label: 'Available Balance', val: fmt(balance) },
            { icon: 'fa-clock', bg: 'bg-warning', label: 'Pending Payouts', val: fmt(pending) },
            { icon: 'fa-chart-line', bg: 'bg-primary', label: 'Total Earned', val: fmt(totalEarned) },
            { icon: 'fa-arrow-down', bg: 'bg-secondary', label: 'Total Withdrawn', val: fmt(totalWithdrawn) },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-icon ${s.bg}`}><i className={`fas ${s.icon}`} /></div>
              <div className="stat-content"><h3>{s.val}</h3><p>{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="section-card">
          <div className="section-header">
            <h2><i className="fas fa-university" /> Bank Accounts</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddBank(true)}><i className="fas fa-plus" /> Add Account</button>
          </div>
          {bankAccounts.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}><i className="fas fa-university" /><p>No bank accounts added yet</p></div>
          ) : bankAccounts.map((acc: any, i: number) => (
            <div key={i} className="bank-account-row">
              <i className="fas fa-university" style={{ color: 'var(--primary)', fontSize: '1.25rem' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{acc.bankName}</div>
                <div className="text-muted text-sm">****{acc.accountNumber?.slice(-4)} • {acc.accountType} • {acc.accountHolderName}</div>
              </div>
              <span className={`badge ${acc.isVerified ? 'badge-verified' : 'badge-pending'}`}>{acc.isVerified ? 'Verified' : 'Pending'}</span>
            </div>
          ))}
        </div>

        <div className="section-card">
          <div className="section-header">
            <h2><i className="fas fa-money-bill-wave" /> Withdraw Funds</h2>
            <button className="btn btn-primary" onClick={() => setShowWithdraw(true)} disabled={balance < 50 || bankAccounts.length === 0}>
              <i className="fas fa-arrow-down" /> Withdraw
            </button>
          </div>
          {balance < 50 && <p className="text-muted text-sm">Minimum withdrawal amount is R{minWithdraw}</p>}
          {bankAccounts.length === 0 && <p className="text-muted text-sm">Add a bank account to withdraw funds</p>}
          {withdrawals.map((w: any, i: number) => (
            <div key={i} className="bank-account-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{fmt(w.amount)}</div>
                <div className="text-muted text-sm">Fee: {fmt(w.fee)} • {new Date(w.createdAt).toLocaleDateString('en-ZA')} • Ref: {w.reference}</div>
              </div>
              <span className={`badge badge-${(w.status || '').toLowerCase()}`}>{w.status}</span>
            </div>
          ))}
        </div>

        <div className="section-card">
          <div className="section-header"><h2><i className="fas fa-history" /> Transaction History</h2></div>
          {loadingTx ? <div className="loading-state"><div className="spinner" /></div> :
            transactions.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}><i className="fas fa-receipt" /><p>No transactions yet</p></div>
            ) : transactions.map((tx: any, i: number) => (
              <div key={i} className="tx-row">
                <div className={`tx-icon ${tx.amount > 0 || tx.transactionType === 'credit' ? 'credit' : 'debit'}`}>
                  <i className={`fas fa-arrow-${tx.amount > 0 || tx.transactionType === 'credit' ? 'down' : 'up'}`} />
                </div>
                <div className="tx-desc">
                  <div className="tx-desc-text">{tx.description}</div>
                  <div className="tx-desc-meta">{new Date(tx.createdAt).toLocaleDateString('en-ZA')} • Ref: {tx.reference}</div>
                </div>
                <div className={`tx-amount ${tx.transactionType === 'credit' ? 'credit' : 'debit'}`}>
                  {tx.transactionType === 'credit' ? '+' : '-'}{fmt(Math.abs(tx.amount))}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {showAddBank && (
        <div className="modal-overlay" onClick={() => setShowAddBank(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-university" /> Add Bank Account</h3>
              <button className="btn-close" onClick={() => setShowAddBank(false)}><i className="fas fa-times" /></button>
            </div>
            <form onSubmit={handleAddBank}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <select className="form-select" value={bankForm.bankName} onChange={e => { const b = BANKS.find(b => b.name === e.target.value); setBankForm(f => ({ ...f, bankName: e.target.value, branchCode: b?.code || '' })) }} required>
                    <option value="">Select Bank</option>
                    {BANKS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Account Holder Name</label><input className="form-input" value={bankForm.accountHolderName} onChange={e => setBankForm(f => ({ ...f, accountHolderName: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Account Number</label><input className="form-input" value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Branch Code</label><input className="form-input" value={bankForm.branchCode} readOnly /><small className="text-muted text-xs">Auto-filled from bank selection</small></div>
                <div className="form-group">
                  <label className="form-label">Account Type</label>
                  <select className="form-select" value={bankForm.accountType} onChange={e => setBankForm(f => ({ ...f, accountType: e.target.value }))}>
                    <option value="Cheque">Cheque/Current</option>
                    <option value="Savings">Savings</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBank(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding...' : 'Add Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div className="modal-overlay" onClick={() => setShowWithdraw(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-money-bill-wave" /> Withdraw Funds</h3>
              <button className="btn-close" onClick={() => setShowWithdraw(false)}><i className="fas fa-times" /></button>
            </div>
            <form onSubmit={handleWithdraw}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div className="form-group">
                  <label className="form-label">Amount (R{minWithdraw} - R{maxWithdraw.toLocaleString()})</label>
                  <input type="number" className="form-input" min={minWithdraw} max={maxWithdraw} value={withdrawForm.amount} onChange={e => { setWithdrawForm(f => ({ ...f, amount: e.target.value })); setFee(calcFee(parseFloat(e.target.value) || 0)) }} required />
                  <small className="text-muted text-xs">Available: {fmt(balance)}</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Account</label>
                  <select className="form-select" value={withdrawForm.bankAccountId} onChange={e => setWithdrawForm(f => ({ ...f, bankAccountId: e.target.value }))} required>
                    <option value="">Select Account</option>
                    {bankAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.bankName} - ****{a.accountNumber?.slice(-4)}</option>)}
                  </select>
                </div>
                {fee > 0 && (
                  <div style={{ background: 'var(--background)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.25rem 0' }}><span>Amount:</span><span>{fmt(parseFloat(withdrawForm.amount) || 0)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.25rem 0', color: 'var(--text-muted)' }}><span>Fee (2%):</span><span>{fmt(fee)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.5rem 0 0.25rem', borderTop: '1px solid var(--border)', fontWeight: 600 }}><span>You receive:</span><span className="text-primary">{fmt((parseFloat(withdrawForm.amount) || 0) - fee)}</span></div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWithdraw(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Processing...' : 'Withdraw'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
