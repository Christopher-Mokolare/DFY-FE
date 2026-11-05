import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authApi, identityVerificationApi, userPreferencesApi } from '../../api'
import SumsubVerificationWidget from '../../components/identity/SumsubVerificationWidget'
import GoogleIdentityButton from '../../components/auth/GoogleIdentityButton'
import './Profile.css'

const IDENTITY_VERIFICATION_CONSENT_VERSION = 'identity-verification-v1'

const USER_TYPES = [
  {
    value: 'creator',
    icon: 'fa-plus-circle',
    label: 'Task Creator',
    desc: 'Post tasks and hire helpers to complete them',
    perks: ['Post unlimited tasks', 'Manage task payments', 'Rate and review helpers'],
  },
  {
    value: 'runner',
    icon: 'fa-running',
    label: 'Task Runner',
    desc: 'Find and complete tasks to earn money',
    perks: ['Browse available tasks', 'Earn money by completing tasks', 'Build your reputation'],
  },
  {
    value: 'both',
    icon: 'fa-handshake',
    label: 'Both Creator & Runner',
    desc: 'Full access to post and complete tasks',
    perks: ['Post unlimited tasks', 'Complete tasks for others', 'Maximum earning potential'],
  },
]

export default function Profile() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', userType: '', address: '' })
  const [hasIdNumber, setHasIdNumber] = useState(false)
  const [idNumberLastFour, setIdNumberLastFour] = useState('')
  const [hasPasswordLogin, setHasPasswordLogin] = useState(true)
  const [hasGoogleLogin, setHasGoogleLogin] = useState(false)
  const [googleLinkIdToken, setGoogleLinkIdToken] = useState('')
  const [googleLinkPassword, setGoogleLinkPassword] = useState('')
  const [googleLinkSecondFactor, setGoogleLinkSecondFactor] = useState('')
  const [googleLinkLoading, setGoogleLinkLoading] = useState(false)
  const [googleLinkMessage, setGoogleLinkMessage] = useState('')
  const [googleLinkError, setGoogleLinkError] = useState('')
  const [passwordSetupLoading, setPasswordSetupLoading] = useState(false)
  const [passwordSetupMessage, setPasswordSetupMessage] = useState('')
  const [passwordSetupError, setPasswordSetupError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [prefSaving, setPrefSaving] = useState(false)
  const [prefSuccess, setPrefSuccess] = useState('')
  const [completion, setCompletion] = useState(0)
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([])
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [marketingConsentSaving, setMarketingConsentSaving] = useState(false)
  const [marketingConsentMessage, setMarketingConsentMessage] = useState('')
  const [marketingConsentError, setMarketingConsentError] = useState('')
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState('not_started')
  const [identityProviderConfigured, setIdentityProviderConfigured] = useState(false)
  const [identityAttemptsRemaining, setIdentityAttemptsRemaining] = useState(0)
  const [identityConsentAccepted, setIdentityConsentAccepted] = useState(false)
  const [identitySessionCode, setIdentitySessionCode] = useState('')
  const [identitySessionLoading, setIdentitySessionLoading] = useState(false)
  const [identitySessionError, setIdentitySessionError] = useState('')
  const [authenticatorTwoFactorEnabled, setAuthenticatorTwoFactorEnabled] = useState(false)
  const [canAcceptTasks, setCanAcceptTasks] = useState(false)
  const [hasVerifiedPayoutAccount, setHasVerifiedPayoutAccount] = useState(false)
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [totpConfigured, setTotpConfigured] = useState(false)
  const [totpRemainingCodes, setTotpRemainingCodes] = useState(0)
  const [totpSecret, setTotpSecret] = useState('')
  const [totpProvisioningUri, setTotpProvisioningUri] = useState('')
  const [totpCurrentPassword, setTotpCurrentPassword] = useState('')
  const [totpGoogleIdToken, setTotpGoogleIdToken] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpRecoveryCodes, setTotpRecoveryCodes] = useState<string[]>([])
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpMessage, setTotpMessage] = useState('')
  const [totpError, setTotpError] = useState('')

  useEffect(() => {
    authApi.getProfile().then(r => {
      const d = r.data?.data || r.data
      if (d) {
        setForm({ firstName: d.firstName || '', lastName: d.lastName || '', email: d.email || '', phoneNumber: d.phoneNumber || d.contact || '', userType: d.userType || '', address: d.address || '' })
        setHasIdNumber(!!d.hasIdNumber)
        setIdNumberLastFour(d.idNumberLastFour || '')
        setHasPasswordLogin(d.hasPasswordLogin !== false)
        setHasGoogleLogin(!!d.hasGoogleLogin)
        setCompletion(d.profileCompletion ?? 0)
        setMissingProfileFields(d.missingProfileFields ?? [])
        setMarketingConsent(!!d.marketingConsent)
        setIdentityVerificationStatus(d.identityVerificationStatus || 'not_started')
        setAuthenticatorTwoFactorEnabled(!!d.authenticatorTwoFactorEnabled)
        setCanAcceptTasks(!!d.canAcceptTasks)
        setHasVerifiedPayoutAccount(!!d.hasVerifiedPayoutAccount)
      }
    }).catch(() => {
      if (user) {
        setForm({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', phoneNumber: user.phoneNumber || user.contact || '', userType: user.userType || '', address: user.address || '' })
        setHasIdNumber(false)
        setIdNumberLastFour('')
        setHasPasswordLogin(user.hasPasswordLogin !== false)
        setHasGoogleLogin(!!user.hasGoogleLogin)
        setCompletion(user.profileCompletion ?? 0)
        setMissingProfileFields((user as any).missingProfileFields ?? [])
        setMarketingConsent(!!user.marketingConsent)
        setIdentityVerificationStatus(user.identityVerificationStatus || 'not_started')
        setAuthenticatorTwoFactorEnabled(!!user.authenticatorTwoFactorEnabled)
        setCanAcceptTasks(!!user.canAcceptTasks)
        setHasVerifiedPayoutAccount(!!user.hasVerifiedPayoutAccount)
      }
    })
  }, [user])

  useEffect(() => {
    identityVerificationApi.getStatus().then(response => {
      const data = response.data?.data || response.data
      if (data) {
        setIdentityProviderConfigured(!!data.configured)
        setIdentityAttemptsRemaining(Number(data.attemptsRemaining ?? 0))
      }
    }).catch(() => {
      setIdentityProviderConfigured(false)
      setIdentityAttemptsRemaining(0)
    })
  }, [])

  useEffect(() => {
    authApi.getTwoFactorStatus().then(response => {
      const data = response.data?.data || response.data
      if (data) {
        setTotpEnabled(!!data.enabled)
        setTotpRemainingCodes(Number(data.remainingRecoveryCodes || 0))
        setTotpConfigured(!!data.encryptionConfigured)
      }
    }).catch(() => {
      setTotpConfigured(false)
    })
  }, [])

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [f]: e.target.value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('')
    if (!/^0(6|7|8)\d{8}$/.test(form.phoneNumber.replace(/\s/g, ''))) {
      setError('Enter a valid South African mobile number, e.g. 0821234567.')
      setLoading(false)
      return
    }
    if (['just around', 'near me', 'around', 'n/a', 'na', 'tbc', 'unknown', 'somewhere'].includes(form.address.trim().toLowerCase())) {
      setError('Please enter a real area or suburb.')
      setLoading(false)
      return
    }
    try {
      const res = await authApi.updateProfile(form)
      if (res.data?.success === false) { setError(res.data?.message || 'Failed to update profile.'); return }
      const r = await authApi.getProfile()
      const d = r.data?.data || r.data
      if (d) {
        setHasIdNumber(!!d.hasIdNumber)
        setIdNumberLastFour(d.idNumberLastFour || '')
        setHasPasswordLogin(d.hasPasswordLogin !== false)
        setHasGoogleLogin(!!d.hasGoogleLogin)
        localStorage.setItem('currentUser', JSON.stringify(d))
        setCompletion(d.profileCompletion ?? 0)
        setMissingProfileFields(d.missingProfileFields ?? [])
        setMarketingConsent(!!d.marketingConsent)
        setIdentityVerificationStatus(d.identityVerificationStatus || 'not_started')
        setAuthenticatorTwoFactorEnabled(!!d.authenticatorTwoFactorEnabled)
        setCanAcceptTasks(!!d.canAcceptTasks)
        setHasVerifiedPayoutAccount(!!d.hasVerifiedPayoutAccount)
        refreshUser()
      }
      setSuccess('Profile updated successfully!')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile.')
    } finally { setLoading(false) }
  }

  const requestPasswordSetup = async () => {
    setPasswordSetupLoading(true)
    setPasswordSetupMessage('')
    setPasswordSetupError('')
    try {
      const response = await authApi.forgotPassword(form.email.trim().toLowerCase())
      setPasswordSetupMessage(response.data?.message || 'If an account matches that email, password reset instructions will be sent shortly.')
    } catch {
      // Keep the response neutral: never confirm account existence through the UI.
      setPasswordSetupMessage('If an account matches that email, password reset instructions will be sent shortly.')
    } finally {
      setPasswordSetupLoading(false)
    }
  }

  const handleGoogleLink = async () => {
    setGoogleLinkError('')
    setGoogleLinkMessage('')
    if (!googleLinkIdToken) {
      setGoogleLinkError('Choose the Google account you want to link first.')
      return
    }
    if (!hasPasswordLogin || !googleLinkPassword) {
      setGoogleLinkError('Enter your current DoForYou password to approve this link.')
      return
    }

    setGoogleLinkLoading(true)
    try {
      const reauthResponse = await authApi.reauthenticate({
        currentPassword: googleLinkPassword,
        secondFactorCode: totpEnabled ? googleLinkSecondFactor.trim() || undefined : undefined,
      })
      if (reauthResponse.data?.success === false) {
        throw new Error(reauthResponse.data?.message || 'Reauthentication failed.')
      }
      const reauthData = reauthResponse.data?.data || reauthResponse.data
      const stepUpToken = reauthData?.stepUpToken
      if (!stepUpToken) throw new Error('A fresh reauthentication token was not returned. Try again.')
      const linkResponse = await authApi.linkGoogleAccount(googleLinkIdToken, stepUpToken)
      if (linkResponse.data?.success === false) {
        throw new Error(linkResponse.data?.message || 'Google could not be linked.')
      }
      setGoogleLinkIdToken('')
      setGoogleLinkPassword('')
      setGoogleLinkSecondFactor('')
      await logout()
      navigate('/login', { replace: true, state: { googleLinked: true } })
    } catch (err: any) {
      setGoogleLinkError(err.response?.data?.message || err.message || 'Google could not be linked. No account changes were confirmed.')
    } finally {
      setGoogleLinkLoading(false)
    }
  }

  const handleMarketingConsentChange = async (enabled: boolean) => {
    const previous = marketingConsent
    setMarketingConsent(enabled)
    setMarketingConsentSaving(true)
    setMarketingConsentError('')
    setMarketingConsentMessage('')
    try {
      const response = await authApi.updateMarketingConsent(enabled)
      if (response.data?.success === false) throw new Error(response.data?.message || 'Could not save your marketing preference.')
      const data = response.data?.data || response.data
      setMarketingConsent(Boolean(data?.enabled ?? enabled))
      setMarketingConsentMessage(enabled
        ? 'Optional marketing updates are enabled.'
        : 'Optional marketing updates have been turned off.')
    } catch (err: any) {
      setMarketingConsent(previous)
      setMarketingConsentError(err.response?.data?.message || err.message || 'Could not save your marketing preference.')
    } finally {
      setMarketingConsentSaving(false)
    }
  }

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword.length < 12 || pwForm.newPassword.length > 72 || new TextEncoder().encode(pwForm.newPassword).length > 72) { setPwError('Use at least 12 characters and no more than 72 UTF-8 bytes.'); return }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return }
    setPwLoading(true); setPwError(''); setPwSuccess('')
    try {
      const res = await authApi.changePassword(pwForm)
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to change password.')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      logout()
      navigate('/login', { replace: true, state: { passwordChanged: true } })
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Failed to change password.')
    } finally { setPwLoading(false) }
  }

  const refreshIdentityVerificationState = async () => {
    const [profileResponse, statusResponse] = await Promise.all([
      authApi.getProfile(),
      identityVerificationApi.getStatus(),
    ])
    const profile = profileResponse.data?.data || profileResponse.data
    const status = statusResponse.data?.data || statusResponse.data
    if (profile) {
      setIdentityVerificationStatus(profile.identityVerificationStatus || 'not_started')
      setAuthenticatorTwoFactorEnabled(!!profile.authenticatorTwoFactorEnabled)
      setCanAcceptTasks(!!profile.canAcceptTasks)
      setHasVerifiedPayoutAccount(!!profile.hasVerifiedPayoutAccount)
      setIdentityProviderConfigured(!!status?.configured)
      setIdentityAttemptsRemaining(Number(status?.attemptsRemaining ?? 0))
      refreshUser()
    }
  }

  const handleStartIdentityVerification = async () => {
    if (!identityConsentAccepted) {
      setIdentitySessionError('Read the privacy notice and confirm consent before continuing.')
      return
    }
    setIdentitySessionLoading(true)
    setIdentitySessionError('')
    try {
      const response = await identityVerificationApi.createSession({
        consentAccepted: true,
        consentVersion: IDENTITY_VERIFICATION_CONSENT_VERSION,
      })
      const body = response.data
      const data = body?.data || body
      if (body?.success === false || !data?.handoffCode) {
        throw new Error(body?.message || 'The identity verification session could not be started.')
      }
      setIdentitySessionCode(String(data.handoffCode))
      setIdentitySessionError('')
    } catch (err: any) {
      setIdentitySessionError(err.response?.data?.message || err.message || 'The identity verification session could not be started.')
    } finally {
      setIdentitySessionLoading(false)
    }
  }

  const handleTotpSetup = async () => {
    setTotpLoading(true); setTotpError(''); setTotpMessage('')
    try {
      if (hasGoogleLogin && !totpGoogleIdToken) {
        setTotpError('Confirm your linked Google account before setting up an authenticator.')
        return
      }
      const response = await authApi.setupTwoFactor({
        currentPassword: hasGoogleLogin ? undefined : totpCurrentPassword || undefined,
        googleIdToken: hasGoogleLogin ? totpGoogleIdToken : undefined,
      })
      const data = response.data?.data || response.data
      setTotpSecret(data.secret || '')
      setTotpProvisioningUri(data.provisioningUri || '')
      setTotpCode('')
      setTotpGoogleIdToken('')
      setTotpMessage('Add this key to your authenticator app, then enter a current six-digit code to enable it.')
    } catch (err: any) {
      setTotpError(err.response?.data?.message || 'Authenticator setup could not start.')
    } finally { setTotpLoading(false) }
  }

  const handleTotpCancel = async () => {
    setTotpLoading(true); setTotpError(''); setTotpMessage('')
    try {
      await authApi.cancelTwoFactorSetup()
      setTotpSecret('')
      setTotpProvisioningUri('')
      setTotpCode('')
      setTotpMessage('Authenticator setup cancelled.')
    } catch (err: any) {
      setTotpError(err.response?.data?.message || 'Setup could not be cancelled on the server. The pending setup expires automatically.')
      setTotpSecret('')
      setTotpProvisioningUri('')
      setTotpCode('')
    } finally { setTotpLoading(false) }
  }

  const handleTotpConfirm = async () => {
    setTotpLoading(true); setTotpError(''); setTotpMessage('')
    try {
      const response = await authApi.confirmTwoFactor(totpCode.trim())
      const data = response.data?.data || response.data
      setTotpEnabled(true)
      setTotpRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : [])
      setTotpRemainingCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes.length : 0)
      setTotpSecret('')
      setTotpProvisioningUri('')
      setTotpCurrentPassword('')
      setTotpCode('')
      setTotpMessage('Authenticator enabled. Save the recovery codes below now; they cannot be retrieved later.')
    } catch (err: any) {
      setTotpError(err.response?.data?.message || 'The authenticator code could not be confirmed.')
    } finally { setTotpLoading(false) }
  }

  const handleTotpDisable = async () => {
    setTotpLoading(true); setTotpError(''); setTotpMessage('')
    try {
      await authApi.disableTwoFactor({ currentPassword: totpCurrentPassword || undefined, code: totpCode.trim() })
      setTotpEnabled(false)
      setTotpRemainingCodes(0)
      setTotpCurrentPassword('')
      setTotpCode('')
      setTotpRecoveryCodes([])
      setTotpMessage('Authenticator disabled. Signing out so you can sign in again.')
    } catch (err: any) {
      setTotpError(err.response?.data?.message || 'Authenticator could not be disabled.')
    } finally { setTotpLoading(false) }
  }

  const finishTotpSession = () => {
    setTotpRecoveryCodes([])
    logout()
    navigate('/login', { replace: true, state: { twoFactorUpdated: true } })
  }

  const handleUserTypeChange = async (value: string) => {
    setForm(prev => ({ ...prev, userType: value }))
    setPrefSaving(true); setPrefSuccess('')
    try {
      await userPreferencesApi.update({
        userType: value,
        canCreateTasks: value === 'creator' || value === 'both',
        canAcceptTasks: value === 'runner' || value === 'both',
      })
      const profileResponse = await authApi.getProfile()
      const profile = profileResponse.data?.data || profileResponse.data
      if (profile) {
        setForm(prev => ({ ...prev, userType: profile.userType || value }))
        setCompletion(profile.profileCompletion ?? completion)
        setMissingProfileFields(profile.missingProfileFields ?? [])
      }
      refreshUser()
      setPrefSuccess('Preferences saved!')
      setTimeout(() => setPrefSuccess(''), 3000)
    } catch (err: any) {
      setForm(prev => ({ ...prev, userType: user?.userType || '' }))
      setPrefSuccess('')
      setError(err.response?.data?.message || 'Could not save your account type.')
    } finally { setPrefSaving(false) }
  }

  return (
    <div className="profile-page" style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-user" /> My Profile</h1><p>Manage your personal information</p></div></div>
      <div className="container profile-grid">
        <div>
          <div className="profile-card">
            <div className="profile-avatar">{(form.firstName || user?.name || 'U').charAt(0).toUpperCase()}</div>
            <h3>{form.firstName} {form.lastName}</h3>
            <p className="text-muted">{form.email}</p>
            <span className={`badge ${form.userType === 'creator' ? 'badge-posted' : form.userType === 'runner' ? 'badge-claimed' : 'badge-info'}`}>{form.userType || 'Not set'}</span>
            <div className="completion-bar">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                  <span>Profile Completion</span><span>{completion}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${completion}%`, background: 'var(--primary-gradient)', borderRadius: '3px' }} />
                </div>
              {missingProfileFields.length > 0 && (
                <p className="text-muted text-sm" style={{ margin: '.55rem 0 0', lineHeight: 1.4 }}>
                  {missingProfileFields.map(field => field === 'idNumber' ? 'ID number needs verification' : field === 'phoneNumber' ? 'Valid phone number required' : field === 'dateOfBirth' ? 'Date of birth required' : field === 'userType' ? 'Choose an account type' : field === 'address' ? 'Address required' : field).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="section-card">
            <div className="section-header"><h2><i className="fas fa-user-edit" /> Personal Information</h2></div>
            {success && <div className="alert alert-success mb-4"><i className="fas fa-check-circle" /> {success}</div>}
            {error && <div className="alert alert-error mb-4"><i className="fas fa-exclamation-circle" /> {error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-row-2">
                <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={form.firstName} onChange={set('firstName')} required /></div>
                <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={form.lastName} onChange={set('lastName')} required /></div>
              </div>
              <div className="form-row-2">
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} readOnly disabled title="Email changes require account verification support." /></div>
                <div className="form-group"><label className="form-label">Phone Number</label><input type="tel" className="form-input" value={form.phoneNumber} onChange={set('phoneNumber')} /></div>
              </div>
              {(form.userType === 'runner' || form.userType === 'both') && (
                <div className="alert alert-info mt-3" role="status">
                  {hasIdNumber
                    ? <p className="text-sm">An ID number is already on file ending {idNumberLastFour}. Do not send identity documents through this profile form.</p>
                    : <p className="text-sm">Runner identity information will be collected through the dedicated verification flow once the verification provider and data protection controls are configured.</p>}
                  <p className="text-sm" style={{ marginBottom: 0 }}>A valid ID format is not identity verification. Runner acceptance remains locked until identity/liveness checks and authenticator-based 2FA are completed.</p>
                </div>
              )}
              <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={set('address')} /></div>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <><span className="spinner spinner-sm" /> Saving...</> : <><i className="fas fa-save" /> Save Changes</>}</button>
            </form>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2><i className="fas fa-sliders-h" /> User Type &amp; Preferences</h2>
              {prefSaving && <span className="text-muted text-sm"><span className="spinner spinner-sm" /> Saving...</span>}
              {prefSuccess && <span className="text-sm" style={{ color: '#166534' }}><i className="fas fa-check-circle" /> {prefSuccess}</span>}
            </div>
            <p className="text-muted text-sm" style={{ marginBottom: '1.25rem' }}>Choose how you want to use DoForYou:</p>
            <div className="usertype-grid">
              {USER_TYPES.map(t => (
                <label key={t.value} className={`usertype-card ${form.userType === t.value ? 'selected' : ''}`}>
                  <input type="radio" name="userType" value={t.value} checked={form.userType === t.value} onChange={() => handleUserTypeChange(t.value)} />
                  <div className="usertype-card-header">
                    <div className="usertype-icon"><i className={`fas ${t.icon}`} /></div>
                    <div>
                      <div className="usertype-label">{t.label}</div>
                      <div className="usertype-desc">{t.desc}</div>
                    </div>
                  </div>
                  <ul className="usertype-perks">
                    {t.perks.map((p, i) => (
                      <li key={i}><i className="fas fa-check" /> {p}</li>
                    ))}
                  </ul>
                </label>
              ))}
            </div>
            {(form.userType === 'runner' || form.userType === 'both') && (
              <div className="alert alert-info mt-4" role="status">
                <strong>Runner eligibility</strong>
                <p className="text-sm" style={{ margin: '.4rem 0' }}>Identity check: {identityVerificationStatus.replace(/_/g, ' ')}.</p>
                <p className="text-sm" style={{ margin: '.4rem 0' }}>Authenticator 2FA: {authenticatorTwoFactorEnabled ? 'enabled' : 'not enabled'}.</p>
                <p className="text-sm" style={{ margin: '.4rem 0' }}>Payout account: {hasVerifiedPayoutAccount ? 'bank recipient verified' : 'not verified'}.</p>
                <p className="text-sm" style={{ margin: '.4rem 0' }}>{canAcceptTasks ? 'Runner task acceptance is enabled.' : 'Task acceptance remains locked until the backend confirms identity verification is passed and authenticator 2FA is enabled.'}</p>
                {identityVerificationStatus !== 'passed' && identityVerificationStatus !== 'manual_review' && (
                  <div style={{ display: 'grid', gap: '.75rem', marginTop: '.75rem' }}>
                    {!identityProviderConfigured && (
                      <p className="text-sm" style={{ margin: 0 }}>
                        Identity verification is not enabled on this staging API yet. The provider credentials, webhook secret, verification level and approved notice version must be configured first.
                      </p>
                    )}
                    {identityProviderConfigured && (
                      <>
                        <p className="text-sm" style={{ margin: 0 }}>
                          Up to three verification starts are allowed in a rolling 24-hour window. Identity documents and liveness are collected by Sumsub; DoForYou stores only the provider status and minimal event audit metadata.
                        </p>
                        <label style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
                          <input
                            type="checkbox"
                            checked={identityConsentAccepted}
                            onChange={e => setIdentityConsentAccepted(e.target.checked)}
                            disabled={identitySessionLoading || !!identitySessionCode}
                          />
                          <span className="text-sm">
                            I consent to the identity and liveness verification described in the{' '}
                            <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Policy</Link> and the provider-specific notice.
                          </span>
                        </label>
                        <p className="text-muted text-xs" style={{ margin: 0 }}>Verification starts remaining in this 24-hour window: {identityAttemptsRemaining}.</p>
                        {identitySessionError && <div className="alert alert-error" role="alert">{identitySessionError}</div>}
                        {!identitySessionCode && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => void handleStartIdentityVerification()}
                            disabled={!identityConsentAccepted || identitySessionLoading || identityAttemptsRemaining < 1}
                          >
                            {identitySessionLoading ? 'Preparing verification…' : 'Start identity verification'}
                          </button>
                        )}
                        {identitySessionCode && (
                          <SumsubVerificationWidget
                            handoffCode={identitySessionCode}
                            onSubmitted={() => {
                              void refreshIdentityVerificationState().catch(() => {
                                setIdentitySessionError('Verification was submitted. Return to your profile and refresh to see the provider-reviewed status.')
                              })
                            }}
                            onClose={() => {
                              setIdentitySessionCode('')
                              setIdentityConsentAccepted(false)
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
                {identityVerificationStatus === 'manual_review' && (
                  <p className="text-sm" style={{ margin: '.5rem 0 0' }}>Your verification requires review. Task acceptance stays locked; contact support for the next step.</p>
                )}
              </div>
            )}
          </div>

          <div className="section-card">
            <div className="section-header"><h2><i className="fas fa-envelope" /> Marketing preferences</h2></div>
            {marketingConsentMessage && <div className="alert alert-info mb-3" role="status">{marketingConsentMessage}</div>}
            {marketingConsentError && <div className="alert alert-error mb-3" role="alert">{marketingConsentError}</div>}
            <label style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start', cursor: marketingConsentSaving ? 'wait' : 'pointer' }}>
              <input
                type="checkbox"
                checked={marketingConsent}
                disabled={marketingConsentSaving}
                onChange={event => { void handleMarketingConsentChange(event.target.checked) }}
                aria-label="Receive optional DoForYou marketing emails"
                style={{ marginTop: '.25rem' }}
              />
              <span>
                <strong>Send me optional DoForYou product updates and offers.</strong>
                <span className="text-muted text-sm" style={{ display: 'block', marginTop: '.25rem' }}>
                  This preference is optional and can be changed at any time. Important account, task, security and payment messages are not marketing.
                </span>
              </span>
            </label>
            {marketingConsentSaving && <p className="text-muted text-sm" role="status" style={{ marginTop: '.5rem' }}>Saving preference…</p>}
          </div>

          <div className="section-card">
            <div className="section-header"><h2><i className="fas fa-shield-alt" /> Authenticator security</h2></div>
            {totpError && <div className="alert alert-error mb-3" role="alert">{totpError}</div>}
            {totpMessage && <div className="alert alert-info mb-3" role="status">{totpMessage}</div>}
            <p className="text-muted text-sm">
              Use an authenticator app to generate sign-in codes. Recovery codes are one-time backups. Enabling or disabling the authenticator invalidates existing sessions.
            </p>
            {totpRecoveryCodes.length > 0 && (
              <div className="alert alert-warning" role="status">
                <strong>Save these recovery codes now</strong>
                <p className="text-sm">Each code works once. They are not stored in readable form and cannot be displayed again.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '.5rem', margin: '.75rem 0' }}>
                  {totpRecoveryCodes.map(code => <code key={code} style={{ background: '#fff', padding: '.4rem', borderRadius: '.25rem' }}>{code}</code>)}
                </div>
                <button type="button" className="btn btn-primary" onClick={finishTotpSession}>I've saved my codes — sign out</button>
              </div>
            )}
            {!totpConfigured && <p className="text-muted text-sm">Authenticator enrollment is disabled on this staging API until its encryption key is configured.</p>}
            {totpConfigured && !totpEnabled && !totpSecret && (
              <>
                {hasGoogleLogin ? (
                  <div className="form-group">
                    <p className="text-muted text-sm">Confirm control of your linked Google account for this authenticator setup.</p>
                    <GoogleIdentityButton
                      onCredential={token => { setTotpGoogleIdToken(token); setTotpError(''); setTotpMessage('Google account confirmed. Continue to set up authenticator.') }}
                      disabled={totpLoading}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Current password</label>
                    <input type="password" className="form-input" value={totpCurrentPassword} onChange={e => setTotpCurrentPassword(e.target.value)} autoComplete="current-password" />
                  </div>
                )}
                <button type="button" className="btn btn-primary" onClick={handleTotpSetup} disabled={totpLoading || (hasGoogleLogin ? !totpGoogleIdToken : !totpCurrentPassword)}>
                  {totpLoading ? 'Starting…' : 'Set up authenticator'}
                </button>
              </>
            )}
            {totpConfigured && !totpEnabled && !!totpSecret && (
              <>
                <div className="form-group">
                  <label className="form-label">Authenticator setup key</label>
                  <code className="form-input" style={{ display: 'block', overflowWrap: 'anywhere' }}>{totpSecret}</code>
                  <small className="text-muted text-xs">In your authenticator app, choose “enter setup key” and type this key. Do not share it.</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Six-digit code</label>
                  <input className="form-input" value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
                </div>
                <button type="button" className="btn btn-primary" onClick={handleTotpConfirm} disabled={totpLoading || totpCode.length !== 6}>
                  {totpLoading ? 'Confirming…' : 'Confirm and enable'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleTotpCancel} disabled={totpLoading} style={{ marginLeft: '.5rem' }}>Cancel setup</button>
                <details style={{ marginTop: '.75rem' }}><summary className="text-sm">Provisioning URI (advanced)</summary><code style={{ display: 'block', overflowWrap: 'anywhere' }}>{totpProvisioningUri}</code></details>
              </>
            )}
            {totpConfigured && totpEnabled && totpRecoveryCodes.length === 0 && (
              <>
                <p className="text-sm">Authenticator is enabled. Remaining recovery codes: {totpRemainingCodes}.</p>
                <div className="form-group">
                  <label className="form-label">Current password (password accounts)</label>
                  <input type="password" className="form-input" value={totpCurrentPassword} onChange={e => setTotpCurrentPassword(e.target.value)} autoComplete="current-password" />
                </div>
                <div className="form-group">
                  <label className="form-label">Authenticator or recovery code</label>
                  <input className="form-input" value={totpCode} onChange={e => setTotpCode(e.target.value)} autoComplete="one-time-code" maxLength={20} />
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleTotpDisable} disabled={totpLoading || !totpCode.trim()}>
                  {totpLoading ? 'Disabling…' : 'Disable authenticator'}
                </button>
              </>
            )}
          </div>

          <div className="section-card">
            <div className="section-header"><h2><i className="fab fa-google" /> Linked sign-in methods</h2></div>
            {hasGoogleLogin ? (
              <p className="text-sm" role="status">Google sign-in is linked to this account.</p>
            ) : hasPasswordLogin ? (
              <>
                <p className="text-muted text-sm">Linking Google requires your current DoForYou password and, when enabled, an authenticator or recovery code. We never merge accounts automatically based on email alone.</p>
                {googleLinkError && <div className="alert alert-error mb-3" role="alert">{googleLinkError}</div>}
                {googleLinkMessage && <div className="alert alert-info mb-3" role="status">{googleLinkMessage}</div>}
                <GoogleIdentityButton
                  onCredential={token => { setGoogleLinkIdToken(token); setGoogleLinkError(''); setGoogleLinkMessage('Google account selected. Complete reauthentication to link it.') }}
                  disabled={googleLinkLoading}
                />
                {googleLinkIdToken && (
                  <>
                    <div className="form-group" style={{ marginTop: '.75rem' }}>
                      <label className="form-label" htmlFor="google-link-password">Current DoForYou password</label>
                      <input id="google-link-password" type="password" className="form-input" value={googleLinkPassword} onChange={e => setGoogleLinkPassword(e.target.value)} autoComplete="current-password" />
                    </div>
                    {totpEnabled && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="google-link-second-factor">Authenticator or recovery code</label>
                        <input id="google-link-second-factor" className="form-input" value={googleLinkSecondFactor} onChange={e => setGoogleLinkSecondFactor(e.target.value)} autoComplete="one-time-code" />
                      </div>
                    )}
                    <button type="button" className="btn btn-primary" onClick={() => { void handleGoogleLink() }} disabled={googleLinkLoading || !googleLinkPassword || (totpEnabled && !googleLinkSecondFactor.trim())}>
                      {googleLinkLoading ? 'Reauthenticating…' : 'Link Google account'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => { setGoogleLinkIdToken(''); setGoogleLinkPassword(''); setGoogleLinkSecondFactor(''); setGoogleLinkError(''); setGoogleLinkMessage('') }} disabled={googleLinkLoading} style={{ marginLeft: '.5rem' }}>Cancel</button>
                  </>
                )}
              </>
            ) : (
              <p className="text-muted text-sm">Google linking is unavailable for this account's current sign-in configuration. Contact support if you need to change your sign-in method.</p>
            )}
          </div>

          <div className="section-card">
            <div className="section-header"><h2><i className="fas fa-lock" /> Change Password</h2></div>
            {hasPasswordLogin ? (
              <>

            {pwSuccess && <div className="alert alert-success mb-4"><i className="fas fa-check-circle" /> {pwSuccess}</div>}
            {pwError && <div className="alert alert-error mb-4"><i className="fas fa-exclamation-circle" /> {pwError}</div>}
            <form onSubmit={handlePwChange}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw.current ? 'text' : 'password'} className="form-input" style={{ paddingRight: '2.5rem' }} value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
                  <button type="button" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #6b7280)', padding: 0 }} aria-label={showPw.current ? 'Hide password' : 'Show password'}><i className={`fas ${showPw.current ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw.new ? 'text' : 'password'} className="form-input" style={{ paddingRight: '2.5rem' }} value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={12} />
                    <button type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #6b7280)', padding: 0 }} aria-label={showPw.new ? 'Hide password' : 'Show password'}><i className={`fas ${showPw.new ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw.confirm ? 'text' : 'password'} className="form-input" style={{ paddingRight: '2.5rem' }} value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
                    <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #6b7280)', padding: 0 }} aria-label={showPw.confirm ? 'Hide password' : 'Show password'}><i className={`fas ${showPw.confirm ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwLoading}>{pwLoading ? 'Changing...' : 'Change Password'}</button>
            </form>
              </>
            ) : (
              <>
                <p className="text-muted text-sm">This account uses Google sign-in and does not currently have a password sign-in method. You can add one by requesting a password setup link sent to your verified email address.</p>
                {passwordSetupMessage && <div className="alert alert-info mb-3" role="status">{passwordSetupMessage}</div>}
                {passwordSetupError && <div className="alert alert-error mb-3" role="alert">{passwordSetupError}</div>}
                <button type="button" className="btn btn-primary" onClick={() => { void requestPasswordSetup() }} disabled={passwordSetupLoading}>
                  {passwordSetupLoading ? 'Sending…' : 'Email password setup link'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
