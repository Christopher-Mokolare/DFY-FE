import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { authApi, userPreferencesApi } from '../../api'
import './Profile.css'

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
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', userType: '', idNumber: '', address: '', dateOfBirth: '' })
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

  useEffect(() => {
    authApi.getProfile().then(r => {
      const d = r.data?.data || r.data
      if (d) {
        setForm({ firstName: d.firstName || '', lastName: d.lastName || '', email: d.email || '', phoneNumber: d.phoneNumber || d.contact || '', userType: d.userType || '', idNumber: d.idNumber || '', address: d.address || '', dateOfBirth: d.dateOfBirth ? d.dateOfBirth.substring(0, 10) : '' })
        setCompletion(d.profileCompletion ?? 0)
        setMissingProfileFields(d.missingProfileFields ?? [])
      }
    }).catch(() => {
      if (user) {
        setForm({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', phoneNumber: user.phoneNumber || user.contact || '', userType: user.userType || '', idNumber: user.idNumber || '', address: user.address || '', dateOfBirth: '' })
        setCompletion(user.profileCompletion ?? 0)
        setMissingProfileFields((user as any).missingProfileFields ?? [])
      }
    })
  }, [user])

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [f]: e.target.value }))

  const handleIdNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.value.replace(/\D/g, '').substring(0, 13)
    const updates: any = { idNumber: id }
    if (id.length === 13) {
      const yy = id.substring(0, 2)
      const mm = id.substring(2, 4)
      const dd = id.substring(4, 6)
      const year = parseInt(yy) <= new Date().getFullYear() % 100 ? `20${yy}` : `19${yy}`
      const dob = `${year}-${mm}-${dd}`
      const date = new Date(dob)
      if (!isNaN(date.getTime())) updates.dateOfBirth = dob
    }
    setForm(prev => ({ ...prev, ...updates }))
  }

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
    if (form.idNumber.length !== 13) {
      setError('ID number must be 13 digits.')
      setLoading(false)
      return
    }
    try {
      const res = await authApi.updateProfile(form)
      if (res.data?.success === false) { setError(res.data?.message || 'Failed to update profile.'); return }
      const r = await authApi.getProfile()
      const d = r.data?.data || r.data
      if (d) {
        localStorage.setItem('currentUser', JSON.stringify(d))
        setCompletion(d.profileCompletion ?? 0)
        setMissingProfileFields(d.missingProfileFields ?? [])
        refreshUser()
      }
      setSuccess('Profile updated successfully!')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile.')
    } finally { setLoading(false) }
  }

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return }
    setPwLoading(true); setPwError(''); setPwSuccess('')
    try {
      const res = await authApi.changePassword(pwForm)
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to change password.')
      setPwSuccess('Password changed successfully!')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Failed to change password.')
    } finally { setPwLoading(false) }
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
              <div className="form-row-2">
                <div className="form-group"><label className="form-label">ID Number</label><input className="form-input" value={form.idNumber} onChange={handleIdNumber} maxLength={13} /></div>
                <div className="form-group"><label className="form-label">Date of Birth</label><input type="date" className="form-input" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></div>
              </div>
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
          </div>

          <div className="section-card">
            <div className="section-header"><h2><i className="fas fa-lock" /> Change Password</h2></div>
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
                    <input type={showPw.new ? 'text' : 'password'} className="form-input" style={{ paddingRight: '2.5rem' }} value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} />
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
          </div>
        </div>
      </div>
    </div>
  )
}
