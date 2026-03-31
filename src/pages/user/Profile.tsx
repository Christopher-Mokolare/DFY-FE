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
  const [prefSaving, setPrefSaving] = useState(false)
  const [prefSuccess, setPrefSuccess] = useState('')

  useEffect(() => {
    authApi.getProfile().then(r => {
      const d = r.data?.data || r.data
      if (d) setForm({ firstName: d.firstName || '', lastName: d.lastName || '', email: d.email || '', phoneNumber: d.phoneNumber || d.contact || '', userType: d.userType || '', idNumber: d.idNumber || '', address: d.address || '', dateOfBirth: d.dateOfBirth ? d.dateOfBirth.substring(0, 10) : '' })
    }).catch(() => {
      if (user) setForm({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', phoneNumber: user.phoneNumber || user.contact || '', userType: user.userType || '', idNumber: user.idNumber || '', address: user.address || '', dateOfBirth: '' })
    })
  }, [user])

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [f]: e.target.value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('')
    try {
      await authApi.updateProfile(form)
      const r = await authApi.getProfile()
      const d = r.data?.data || r.data
      if (d) { localStorage.setItem('currentUser', JSON.stringify(d)); refreshUser() }
      setSuccess('Profile updated successfully!')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile.')
    } finally { setLoading(false) }
  }

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return }
    setPwLoading(true); setPwError(''); setPwSuccess('')
    try {
      await authApi.changePassword(pwForm)
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
        canCreateTasks: value === 'creator' || value === 'both',
        canAcceptTasks: value === 'runner' || value === 'both',
      })
      setPrefSuccess('Preferences saved!')
      setTimeout(() => setPrefSuccess(''), 3000)
    } catch { /* ignore */ } finally { setPrefSaving(false) }
  }

  const completion = user?.profileCompletion ?? 0

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1><i className="fas fa-user" /> My Profile</h1><p>Manage your personal information</p></div></div>
      <div className="container profile-grid">
        <div>
          <div className="profile-card">
            <div className="profile-avatar">{(form.firstName || user?.name || 'U').charAt(0).toUpperCase()}</div>
            <h3>{form.firstName} {form.lastName}</h3>
            <p className="text-muted">{form.email}</p>
            <span className={`badge ${form.userType === 'creator' ? 'badge-posted' : form.userType === 'runner' ? 'badge-claimed' : 'badge-info'}`}>{form.userType || 'Not set'}</span>
            {completion > 0 && (
              <div className="completion-bar">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                  <span>Profile Completion</span><span>{completion}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${completion}%`, background: 'var(--primary-gradient)', borderRadius: '3px' }} />
                </div>
              </div>
            )}
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
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={set('email')} required /></div>
                <div className="form-group"><label className="form-label">Phone Number</label><input type="tel" className="form-input" value={form.phoneNumber} onChange={set('phoneNumber')} /></div>
              </div>
              <div className="form-row-2">
                <div className="form-group"><label className="form-label">ID Number</label><input className="form-input" value={form.idNumber} onChange={set('idNumber')} maxLength={13} /></div>
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
              <div className="form-group"><label className="form-label">Current Password</label><input type="password" className="form-input" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required /></div>
              <div className="form-row-2">
                <div className="form-group"><label className="form-label">New Password</label><input type="password" className="form-input" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={6} /></div>
                <div className="form-group"><label className="form-label">Confirm Password</label><input type="password" className="form-input" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required /></div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwLoading}>{pwLoading ? 'Changing...' : 'Change Password'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
