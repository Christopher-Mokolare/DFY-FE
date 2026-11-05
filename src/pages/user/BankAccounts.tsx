import { useEffect, useState } from 'react'
import { bankingApi, authApi } from '../../api'

interface BankOption {
  bankCode: string
  bankGroupId: string
  name: string
  branchCode: string
}

interface BankAccount {
  id: number
  bankName: string
  bankCode?: string | null
  accountNumber: string
  accountHolderName: string
  accountType: string
  isVerified: boolean
  isDefaultPayout: boolean
  verificationMessage?: string | null
  createdAt: string
}

export default function BankAccounts() {
  const [banks, setBanks] = useState<BankOption[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [banksError, setBanksError] = useState('')
  const [accountsError, setAccountsError] = useState('')
  const [form, setForm] = useState({
    bankCode: '',
    accountNumber: '',
    accountHolderName: '',
    accountType: 'personal',
  })

  const load = async () => {
    setLoading(true)
    setError('')
    setBanksError('')
    setAccountsError('')

    const [banksResult, accountsResult, profileResult] = await Promise.allSettled([
      bankingApi.getBanks(),
      bankingApi.getBankAccounts(),
      authApi.getProfile(),
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

    if (profileResult.status === 'fulfilled' && !form.accountHolderName) {
      const profile = profileResult.value.data?.data ?? profileResult.value.data
      const profileName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
      if (profileName) setForm(prev => ({ ...prev, accountHolderName: profileName }))
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
      const selectedBank = banks.find(bank => (bank.bankCode || bank.bankGroupId) === form.bankCode)
      if (!selectedBank) throw new Error('Please select a supported bank.')

      const response = await bankingApi.addBankAccount({
        bankCode: selectedBank.bankCode || selectedBank.bankGroupId,
        bankGroupId: selectedBank.bankGroupId,
        bankName: selectedBank.name,
        accountNumber: form.accountNumber,
        accountHolderName: form.accountHolderName,
        branchCode: selectedBank.branchCode,
        accountType: form.accountType,
      })

      const payload = response.data
      await load()
      if (payload?.success === false) {
        setError(payload.message || 'Bank account verification failed.')
        return
      }

      setSuccess(payload?.message || 'Bank account added and verified successfully.')
      setForm({ bankCode: '', accountNumber: '', accountHolderName: '', accountType: 'personal' })
    } catch (err: any) {
      await load()
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
      await load()
      if (response.data?.success === false) {
        setError(response.data?.message || 'Bank verification failed.')
        return
      }
      setSuccess(response.data?.message || 'Bank account verified successfully.')
    } catch (err: any) {
      await load()
      setError(err.response?.data?.message || 'Unable to verify the bank account.')
    } finally {
      setVerifyingId(null)
    }
  }

  const removeAccount = async (account: BankAccount) => {
    if (!window.confirm(`Remove ${account.bankName} account ${account.accountNumber} from your payout settings?`))
      return

    setRemovingId(account.id)
    setError('')
    setSuccess('')
    try {
      const response = await bankingApi.removeBankAccount(account.id)
      await load()
      setSuccess(response.data?.message || 'Bank account removed.')
    } catch (err: any) {
      await load()
      const status = err.response?.status
      const message = err.response?.data?.message
      setError(message || (status === 404 || status === 405
        ? 'Bank-account removal is not available on this backend version yet. Deploy the backend update, then try again.'
        : status === 409
          ? 'This account is linked to a payout in progress and cannot be removed yet.'
          : 'Unable to remove the bank account. Please try again.'))
    } finally {
      setRemovingId(null)
    }
  }

  const setDefaultPayoutAccount = async (account: BankAccount) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await bankingApi.setDefaultPayoutAccount(account.id)
      await load()
      setSuccess(response.data?.message || 'Default payout account updated.')
    } catch (err: any) {
      await load()
      setError(err.response?.data?.message || 'Unable to update the default payout account.')
    } finally {
      setSaving(false)
    }
  }

  const payoutReadyCount = accounts.filter(account => account.isVerified).length
  const displayedAccounts = [...accounts].sort(
    (left, right) => Number(right.isDefaultPayout) - Number(left.isDefaultPayout),
  )
  const isTestFixture = (account: BankAccount) =>
    account.bankCode?.toUpperCase() === 'DFY-E2E' ||
    account.bankName.toLowerCase() === 'dfy e2e test bank'

  return (
    <div className="bank-accounts-page admin-page">
      <section className="bank-page-heading">
        <div>
          <div className="admin-eyebrow"><i className="fas fa-shield-halved" /> PAYOUT SETTINGS</div>
          <h1>Bank Accounts</h1>
          <p>Manage the verified bank account used for your direct runner payouts.</p>
        </div>
        <div className="bank-page-heading-meta">
          <span><i className="fas fa-lock" /> Secure verification</span>
          <span><i className="fas fa-building-columns" /> Direct Paystack payouts</span>
        </div>
      </section>

      {success && <div className="alert alert-success bank-page-alert"><i className="fas fa-check-circle" /> {success}</div>}
      {error && <div className="alert alert-error bank-page-alert"><i className="fas fa-circle-exclamation" /><div><strong>Something needs attention</strong><span>{error}</span></div></div>}

      <div className="bank-page-grid">
        <section className="admin-panel bank-account-form-card">
          <div className="admin-panel-header">
            <div>
              <span className="admin-panel-kicker">Payout destination</span>
              <h2>Add bank account</h2>
            </div>
            <div className="bank-account-card-icon"><i className="fas fa-plus" /></div>
          </div>

          <p className="bank-panel-description">Your details are securely verified before DFY releases a direct payout through Paystack.</p>

          <div className="bank-security-note"><i className="fas fa-lock" /><span>Your banking information is encrypted and used only for payout verification and settlement.</span></div>

          {banksError && (
            <div className="bank-inline-error">
              <div className="bank-inline-error-icon"><i className="fas fa-triangle-exclamation" /></div>
              <div className="bank-inline-error-copy"><strong>Bank list unavailable</strong><span>{banksError}</span></div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>Retry</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="bank-form-grid">
              <div className="form-group">
                <label className="form-label">Bank</label>
                <select className="form-input" value={form.bankCode} onChange={set('bankCode')} required disabled={loading || saving}>
                  <option value="">Select your bank</option>
                  {banks.map(bank => <option key={bank.bankCode || bank.bankGroupId} value={bank.bankCode || bank.bankGroupId}>{bank.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payout Account Type</label>
                <select className="form-input" value={form.accountType} onChange={set('accountType')} disabled={saving}>
                  <option value="personal">Personal</option>
                </select>
                <small className="form-help">DFY currently supports personal South African accounts for runner payouts.</small>
              </div>
              <div className="form-group">
                <label className="form-label">Account Holder Name</label>
                <input className="form-input" value={form.accountHolderName} onChange={set('accountHolderName')} required disabled={saving} autoComplete="name" />
                <small className="form-help">Enter the name exactly as registered with your bank and matching your South African ID.</small>
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input className="form-input" inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={set('accountNumber')} required disabled={saving} />
              </div>
            </div>

            <div className="bank-form-footer">
              <span><i className="fas fa-circle-info" /> Verification is required before payouts.</span>
              <button type="submit" className="btn btn-primary bank-submit" disabled={saving || loading || banks.length === 0}>
                {saving ? <><span className="spinner spinner-sm" /> Verifying...</> : <><i className="fas fa-shield-halved" /> Add &amp; Verify Account</>}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-panel bank-account-list-card">
          <div className="admin-panel-header">
            <div>
              <span className="admin-panel-kicker">Settlement accounts</span>
              <h2>Your bank accounts</h2>
            </div>
            <span className="bank-account-count" aria-label={`${accounts.length} active bank accounts`}>{accounts.length}</span>
          </div>
          <p className="bank-panel-description">
            {payoutReadyCount} of {accounts.length} active {accounts.length === 1 ? 'account is' : 'accounts are'} verified and ready for payouts.
          </p>
          <p className="bank-panel-description">Choose which verified account receives new payouts. Existing payouts keep their original destination.</p>

          {loading ? (
            <div className="admin-empty"><i className="fas fa-spinner fa-spin" /><p>Loading bank accounts...</p></div>
          ) : accountsError ? (
            <div className="admin-error bank-account-error"><i className="fas fa-circle-exclamation" /><div><strong>Accounts unavailable</strong><p>{accountsError}</p><button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>Retry</button></div></div>
          ) : accounts.length === 0 ? (
            <div className="admin-empty"><i className="fas fa-building-columns" /><p>No active bank accounts have been added yet.</p><span>Add an account above to enable direct payouts.</span></div>
          ) : (
            <div className="bank-account-list">
              {displayedAccounts.map(account => (
                <div key={account.id} className={`bank-account-row${isTestFixture(account) ? ' bank-account-row-test-fixture' : ''}`}>
                  <div className="bank-account-row-main">
                    <div className="bank-account-row-icon"><i className="fas fa-building-columns" /></div>
                    <div>
                      <strong>{account.bankName}</strong>
                      <span>{account.accountHolderName} · {account.accountType}</span>
                      <small>Account {account.accountNumber}</small>
                    </div>
                  </div>
                  <div className="bank-account-row-actions">
                    <span className={`admin-status ${account.isVerified ? 'success' : 'warning'}`}>
                      <i className={`fas ${account.isVerified ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} /> {account.isVerified ? account.isDefaultPayout ? 'Default payout account' : 'Ready for payouts' : isTestFixture(account) ? 'E2E test account' : 'Not verified for payouts'}
                    </span>
                    {!account.isVerified && !isTestFixture(account) && <button type="button" className="btn btn-secondary btn-sm" onClick={() => retryVerification(account.id)} disabled={verifyingId === account.id || removingId === account.id}>{verifyingId === account.id ? 'Verifying...' : 'Retry verification'}</button>}
                    {account.isVerified && !account.isDefaultPayout && <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setDefaultPayoutAccount(account)} disabled={saving || removingId === account.id}>Make default</button>}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void removeAccount(account)} disabled={removingId === account.id || verifyingId === account.id}>
                      {removingId === account.id ? 'Removing...' : 'Remove'}
                    </button>
                    {isTestFixture(account) && <small className="bank-account-verification-message">Seeded for lifecycle tests; it has no real bank details or Paystack recipient. Remove this test record.</small>}
                    {account.verificationMessage && <small className="bank-account-verification-message">{account.verificationMessage}</small>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
