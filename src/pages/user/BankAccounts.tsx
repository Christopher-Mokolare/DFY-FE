import { useEffect, useState } from 'react'
import { bankingApi } from '../../api'

interface BankOption {
  bankGroupId: string
  name: string
  branchCode: string
}

interface BankAccount {
  id: number
  bankName: string
  accountNumber: string
  accountHolderName: string
  accountType: string
  isVerified: boolean
  createdAt: string
}

export default function BankAccounts() {
  const [banks, setBanks] = useState<BankOption[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [banksError, setBanksError] = useState('')
  const [accountsError, setAccountsError] = useState('')
  const [form, setForm] = useState({
    bankGroupId: '',
    accountNumber: '',
    accountHolderName: '',
    accountType: 'Savings',
  })

  const load = async () => {
    setLoading(true)
    setError('')
    setBanksError('')
    setAccountsError('')

    const [banksResult, accountsResult] = await Promise.allSettled([
      bankingApi.getBanks(),
      bankingApi.getBankAccounts(),
    ])

    if (banksResult.status === 'fulfilled') {
      const bankData = banksResult.value.data?.data ?? []
      setBanks(bankData)
      if (bankData.length === 0) setBanksError(banksResult.value.data?.message || 'The bank list is temporarily unavailable.')
    } else {
      const err: any = banksResult.reason
      setBanks([])
      setBanksError(err.response?.data?.message || 'The bank list is temporarily unavailable. Please try again.')
    }

    if (accountsResult.status === 'fulfilled') {
      setAccounts(accountsResult.value.data?.data ?? [])
    } else {
      const err: any = accountsResult.reason
      setAccounts([])
      setAccountsError(err.response?.data?.message || 'Unable to load your bank accounts. Please try again.')
    }

    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const selectedBank = banks.find(bank => bank.bankGroupId === form.bankGroupId)
      if (!selectedBank) throw new Error('Please select a supported bank.')

      const response = await bankingApi.addBankAccount({
        bankGroupId: selectedBank.bankGroupId,
        bankName: selectedBank.name,
        accountNumber: form.accountNumber,
        accountHolderName: form.accountHolderName,
        branchCode: selectedBank.branchCode,
        accountType: form.accountType,
      })

      const payload = response.data
      if (payload?.success === false) {
        setError(payload.message || 'Bank account verification failed.')
        return
      }

      setSuccess(payload?.message || 'Bank account added and verified successfully.')
      setForm({ bankGroupId: '', accountNumber: '', accountHolderName: '', accountType: 'Savings' })
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to add bank account.')
    } finally {
      setSaving(false)
    }
  }

  const retryVerification = async (id: number) => {
    setVerifyingId(id)
    setError('')
    setSuccess('')
    try {
      const response = await bankingApi.verifyBankAccount(id)
      if (response.data?.success === false) {
        setError(response.data?.message || 'Bank verification failed.')
        return
      }
      setSuccess(response.data?.message || 'Bank account verified successfully.')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to verify the bank account.')
    } finally {
      setVerifyingId(null)
    }
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div className="container">
          <h1><i className="fas fa-university" /> Bank Accounts</h1>
          <p>Add and verify the bank account that will receive your direct Ozow runner payouts.</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 900, paddingTop: '2rem' }}>
        {success && <div className="alert alert-success mb-4"><i className="fas fa-check-circle" /> {success}</div>}
        {error && <div className="alert alert-error mb-4"><i className="fas fa-exclamation-circle" /> {error}</div>}

        <div className="section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-header">
            <h2><i className="fas fa-plus-circle" /> Add Bank Account</h2>
          </div>
          <p className="text-muted text-sm" style={{ marginBottom: '1.25rem' }}>
            Your bank details are verified before DFY can release a direct payout through Ozow.
          </p>

          {banksError && (
            <div className="alert alert-warning mb-4">
              <i className="fas fa-triangle-exclamation" />
              <div style={{ flex: 1 }}>
                <strong>Bank list unavailable</strong>
                <div>{banksError}</div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>Retry</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Bank</label>
                <select className="form-input" value={form.bankGroupId} onChange={set('bankGroupId')} required disabled={loading || saving}>
                  <option value="">Select your bank</option>
                  {banks.map(bank => (
                    <option key={bank.bankGroupId} value={bank.bankGroupId}>{bank.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Account Type</label>
                <select className="form-input" value={form.accountType} onChange={set('accountType')} disabled={saving}>
                  <option value="Savings">Savings</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Current">Current</option>
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Account Holder Name</label>
                <input className="form-input" value={form.accountHolderName} onChange={set('accountHolderName')} required disabled={saving} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input className="form-input" inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={set('accountNumber')} required disabled={saving} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving || loading || banks.length === 0}>
              {saving ? <><span className="spinner spinner-sm" /> Verifying...</> : <><i className="fas fa-shield-alt" /> Add &amp; Verify Account</>}
            </button>
          </form>
        </div>

        <div className="section-card">
          <div className="section-header">
            <h2><i className="fas fa-list" /> Your Bank Accounts</h2>
          </div>

          {loading ? (
            <p className="text-muted">Loading bank accounts...</p>
          ) : accountsError ? (
            <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
              <i className="fas fa-triangle-exclamation" style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '.75rem' }} />
              <p className="text-muted" style={{ marginBottom: '.9rem' }}>{accountsError}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>Retry</button>
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-muted">No active bank accounts have been added yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {accounts.map(account => (
                <div key={account.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <strong>{account.bankName}</strong>
                    <div className="text-muted text-sm">{account.accountHolderName} · {account.accountType}</div>
                    <div className="text-muted text-sm">Account {account.accountNumber}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`badge ${account.isVerified ? 'badge-posted' : 'badge-claimed'}`}>
                      {account.isVerified ? 'Verified' : 'Verification required'}
                    </span>
                    {!account.isVerified && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => retryVerification(account.id)} disabled={verifyingId === account.id}>
                        {verifyingId === account.id ? 'Verifying...' : 'Verify'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
