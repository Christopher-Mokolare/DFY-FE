import { useEffect, useState } from 'react'
import { bankingApi, authApi } from '../../api'
import GoogleIdentityButton from '../../components/auth/GoogleIdentityButton'

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
  const [profileSecurity, setProfileSecurity] = useState<{ hasGoogleLogin: boolean; authenticatorTwoFactorEnabled: boolean } | null>(null)
  const [stepUpOpen, setStepUpOpen] = useState(false)
  const [stepUpPassword, setStepUpPassword] = useState('')
  const [stepUpCode, setStepUpCode] = useState('')
  const [stepUpGoogleToken, setStepUpGoogleToken] = useState<string | null>(null)
  const [stepUpError, setStepUpError] = useState('')
  const [stepUpLoading, setStepUpLoading] = useState(false)
  const [stepUpOperation, setStepUpOperation] = useState<{ label: string; execute: (token: string) => Promise<void> } | null>(null)

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

    if (profileResult.status === 'fulfilled') {
      const profile = profileResult.value.data?.data ?? profileResult.value.data
      if (profile) {
        setProfileSecurity({
          hasGoogleLogin: !!profile.hasGoogleLogin,
          authenticatorTwoFactorEnabled: !!profile.authenticatorTwoFactorEnabled,
        })
        if (!form.accountHolderName) {
          const profileName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
          if (profileName) setForm(prev => ({ ...prev, accountHolderName: profileName }))
        }
      } else {
        setProfileSecurity(null)
      }
    } else {
      setProfileSecurity(null)
    }

    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const requestStepUp = (
    label: string,
    execute: (token: string) => Promise<void>,
  ) => {
    if (!profileSecurity) {
      setError('Unable to confirm your account security settings. Reload this page and try again.')
      return
    }
    setError('')
    setSuccess('')
    setStepUpError('')
    setStepUpPassword('')
    setStepUpCode('')
    setStepUpGoogleToken(null)
    setStepUpOperation({ label, execute })
    setStepUpOpen(true)
  }

  const completeStepUp = async (googleTokenOverride?: string) => {
    if (!profileSecurity || !stepUpOperation || stepUpLoading) return
    const googleIdToken = googleTokenOverride || stepUpGoogleToken || undefined
    if (profileSecurity.hasGoogleLogin && !googleIdToken) {
      setStepUpError('Confirm your linked Google account to continue.')
      return
    }
    if (!profileSecurity.hasGoogleLogin && !stepUpPassword) {
      setStepUpError('Enter your current password to continue.')
      return
    }
    if (profileSecurity.authenticatorTwoFactorEnabled && !stepUpCode.trim()) {
      setStepUpError('Enter your authenticator or recovery code to continue.')
      return
    }

    setStepUpLoading(true)
    setStepUpError('')
    try {
      const response = await authApi.reauthenticate({
        currentPassword: profileSecurity.hasGoogleLogin ? undefined : stepUpPassword,
        googleIdToken: profileSecurity.hasGoogleLogin ? googleIdToken : undefined,
        secondFactorCode: profileSecurity.authenticatorTwoFactorEnabled ? stepUpCode.trim() : undefined,
      })
      const data = response.data?.data || response.data
      if (!response.data?.success || !data?.stepUpToken) {
        throw new Error(response.data?.message || 'Recent reauthentication could not be completed.')
      }
      const operation = stepUpOperation
      const token = data.stepUpToken as string
      setStepUpOpen(false)
      setStepUpOperation(null)
      setStepUpPassword('')
      setStepUpCode('')
      setStepUpGoogleToken(null)
      await operation.execute(token)
    } catch (err: any) {
      setStepUpError(err.response?.data?.message || err.message || 'Reauthentication failed. Please try again.')
    } finally {
      setStepUpLoading(false)
    }
  }

  const addAccountAfterStepUp = async (token: string, selectedBank: BankOption) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await bankingApi.addBankAccount({
        bankCode: selectedBank.bankCode || selectedBank.bankGroupId,
        bankGroupId: selectedBank.bankGroupId,
        bankName: selectedBank.name,
        accountNumber: form.accountNumber.trim(),
        accountHolderName: form.accountHolderName.trim(),
        branchCode: selectedBank.branchCode,
        accountType: form.accountType,
      }, token)
      const payload = response.data
      await load()
      if (payload?.success === false) {
        setError(payload.message || 'Bank account verification failed.')
        return
      }
      setSuccess(payload?.message || 'Bank account added and verification was requested.')
      setForm({ bankCode: '', accountNumber: '', accountHolderName: '', accountType: 'personal' })
    } catch (err: any) {
      await load()
      setError(err.response?.data?.message || err.message || 'Unable to add bank account.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const selectedBank = banks.find(bank => (bank.bankCode || bank.bankGroupId) === form.bankCode)
    if (!selectedBank) {
      setError('Please select a supported bank.')
      return
    }
    if (!/^\d{9,11}$/.test(form.accountNumber.trim())) {
      setError('Enter a valid 9–11 digit account number.')
      return
    }
    if (!form.accountHolderName.trim()) {
      setError('Enter the account holder name.')
      return
    }
    requestStepUp('Add bank account', token => addAccountAfterStepUp(token, selectedBank))
  }

  const retryVerificationAfterStepUp = async (id: number, token: string) => {
    setVerifyingId(id)
    setError('')
    setSuccess('')
    try {
      const response = await bankingApi.verifyBankAccount(id, token)
      await load()
      if (response.data?.success === false) {
        setError(response.data?.message || 'Bank verification failed.')
        return
      }
      setSuccess(response.data?.message || 'Bank account verification status refreshed.')
    } catch (err: any) {
      await load()
      setError(err.response?.data?.message || 'Unable to verify the bank account.')
    } finally {
      setVerifyingId(null)
    }
  }

  const retryVerification = (id: number) =>
    requestStepUp('Retry bank verification', token => retryVerificationAfterStepUp(id, token))

  const removeAccountAfterStepUp = async (account: BankAccount, token: string) => {
    setRemovingId(account.id)
    setError('')
    setSuccess('')
    try {
      const response = await bankingApi.removeBankAccount(account.id, token)
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

  const removeAccount = async (account: BankAccount) => {
    if (!window.confirm(`Remove ${account.bankName} account ending ${account.accountNumber.slice(-4)} from your payout settings?`))
      return
    requestStepUp('Remove bank account', token => removeAccountAfterStepUp(account, token))
  }

  const setDefaultAfterStepUp = async (account: BankAccount, token: string) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await bankingApi.setDefaultPayoutAccount(account.id, token)
      await load()
      setSuccess(response.data?.message || 'Default payout account updated.')
    } catch (err: any) {
      await load()
      setError(err.response?.data?.message || 'Unable to update the default payout account.')
    } finally {
      setSaving(false)
    }
  }

  const setDefaultPayoutAccount = (account: BankAccount) =>
    requestStepUp('Change default payout account', token => setDefaultAfterStepUp(account, token))

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

      {stepUpOpen && stepUpOperation && (
        <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !stepUpLoading) { setStepUpOpen(false); setStepUpOperation(null) } }} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15, 23, 42, .58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <section role="dialog" aria-modal="true" aria-labelledby="payout-step-up-title" className="admin-panel" style={{ width: 'min(100%, 440px)', padding: '1.5rem' }}>
            <div className="admin-panel-header">
              <div><span className="admin-panel-kicker">Account security</span><h2 id="payout-step-up-title">Confirm it’s you</h2></div>
              <button type="button" className="btn btn-secondary btn-sm" disabled={stepUpLoading} onClick={() => { setStepUpOpen(false); setStepUpOperation(null) }}>Close</button>
            </div>
            <p className="bank-panel-description">Reauthenticate before you {stepUpOperation.label.toLowerCase()}. The resulting authorization can be used for only one payout-settings change and expires in five minutes.</p>
            {stepUpError && <div className="alert alert-error" role="alert">{stepUpError}</div>}
            {profileSecurity?.hasGoogleLogin ? (
              <div className="form-group">
                <label className="form-label">Linked Google account</label>
                <GoogleIdentityButton onCredential={token => { setStepUpGoogleToken(token); void completeStepUp(token) }} disabled={stepUpLoading} mode="signin" />
              </div>
            ) : (
              <form onSubmit={event => { event.preventDefault(); void completeStepUp() }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="payout-step-up-password">Current password</label>
                  <input id="payout-step-up-password" className="form-input" type="password" autoComplete="current-password" value={stepUpPassword} onChange={event => setStepUpPassword(event.target.value)} required disabled={stepUpLoading} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={stepUpLoading || !stepUpPassword || !!profileSecurity?.authenticatorTwoFactorEnabled && !stepUpCode.trim()}>
                  {stepUpLoading ? 'Verifying…' : 'Verify and continue'}
                </button>
              </form>
            )}
            {profileSecurity?.authenticatorTwoFactorEnabled && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label" htmlFor="payout-step-up-code">Authenticator or recovery code</label>
                <input id="payout-step-up-code" className="form-input" value={stepUpCode} onChange={event => setStepUpCode(event.target.value.trim())} autoComplete="one-time-code" maxLength={20} disabled={stepUpLoading} />
                <small className="form-help">Required because authenticator security is enabled for your account.</small>
                {profileSecurity.hasGoogleLogin && <button type="button" className="btn btn-primary" disabled={stepUpLoading || !stepUpGoogleToken || !stepUpCode.trim()} onClick={() => void completeStepUp()} style={{ marginTop: '.75rem' }}>Verify code and continue</button>}
              </div>
            )}
          </section>
        </div>
      )}

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
                      <small>Account ending {account.accountNumber.slice(-4)}</small>
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
