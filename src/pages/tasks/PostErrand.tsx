import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { tasksApi, categoryApi, userPreferencesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import './PostErrand.css'

const DEFAULT_CATEGORIES = ['Grocery Shopping','Delivery','Cleaning','Gardening','Moving','Repairs','Tutoring','Pet Care','Cooking','Other']

function calcCommission(budget: number) {
  const commission = Math.max(budget * 0.15, 0)
  return { total: budget, commission, payout: budget - commission }
}

export default function PostErrand() {
  const { user, isAuthenticated, canPostErrands } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const isEdit = !!editId

  // Redirect runners away from this page
  useEffect(() => {
    if (isAuthenticated() && !canPostErrands()) navigate('/dashboard')
  }, [isAuthenticated, canPostErrands, navigate])

  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [showCustom, setShowCustom] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [minAmount, setMinAmount] = useState(50)
  const [maxAmount, setMaxAmount] = useState(5000)

  const [form, setForm] = useState({
    taskName: '', taskDescription: '', category: '', customCategory: '',
    area: '', priority: 'standard', dateNeeded: '',
    budget: '', notes: '', termsAccepted: false,
  })

  useEffect(() => {
    categoryApi.getAll().then(r => {
      const cats = r.data?.data || r.data
      if (Array.isArray(cats) && cats.length) setCategories([...cats.map((c: any) => c.name || c), 'Other'])
    }).catch(() => {})

    userPreferencesApi.get().then(r => {
      const d = r.data?.data
      if (d?.minTaskAmount) setMinAmount(d.minTaskAmount)
      if (d?.maxTaskAmount) setMaxAmount(d.maxTaskAmount)
    }).catch(() => {})

    if (editId) {
      tasksApi.getById(editId).then(r => {
        const t = r.data?.data || r.data
        if (t) setForm(f => ({
          ...f,
          taskName: DOMPurify.sanitize(t.taskName || t.title || '', { ALLOWED_TAGS: [] }),
          taskDescription: DOMPurify.sanitize(t.taskDescription || t.description || '', { ALLOWED_TAGS: [] }),
          category: DOMPurify.sanitize(t.category || '', { ALLOWED_TAGS: [] }),
          area: DOMPurify.sanitize(t.area || t.location || '', { ALLOWED_TAGS: [] }),
          priority: t.priority || 'standard',
          dateNeeded: (t.dateNeeded || t.dueDate) ? (t.dateNeeded || t.dueDate).substring(0, 16) : '',
          budget: String(t.budget || ''),
          notes: DOMPurify.sanitize(t.notes || '', { ALLOWED_TAGS: [] }),
        }))
      }).catch(() => {})
    }
  }, [editId])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm(f => ({ ...f, [field]: val }))
    if (field === 'category') setShowCustom(e.target.value === 'Other')
  }

  const isStep1Valid = () => form.taskName.trim().length >= 3 && form.taskDescription.length >= 10 && form.category && form.area && form.priority
  const isStep2Valid = () => !!form.dateNeeded && parseFloat(form.budget) >= minAmount
  const budget = parseFloat(form.budget) || 0
  const commission = calcCommission(budget)

  const safeRedirect = (url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' && ['payfast.co.za', 'sandbox.payfast.co.za'].some(d => parsed.hostname.endsWith(d))) {
        window.location.assign(parsed.href)
      }
    } catch { /* invalid URL */ }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.termsAccepted) { setError('Please accept the terms and conditions.'); return }
    setSubmitting(true); setError('')
    try {
      const payload = {
        taskName: DOMPurify.sanitize(form.taskName, { ALLOWED_TAGS: [] }),
        taskDescription: DOMPurify.sanitize(form.taskDescription, { ALLOWED_TAGS: [] }),
        category: DOMPurify.sanitize(form.category === 'Other' ? form.customCategory : form.category, { ALLOWED_TAGS: [] }),
        area: DOMPurify.sanitize(form.area, { ALLOWED_TAGS: [] }),
        priority: form.priority,
        dateNeeded: form.dateNeeded,
        budget: parseFloat(form.budget),
        notes: DOMPurify.sanitize(form.notes, { ALLOWED_TAGS: [] }),
        termsAccepted: form.termsAccepted,
      }
      let res
      if (isEdit) res = await tasksApi.update(editId!, payload)
      else res = await tasksApi.create(payload)

      const data = res.data
      if (data.success !== false) {
        const payUrl = data.data?.paymentUrl
        if (payUrl) { safeRedirect(payUrl); return }
        navigate('/tasks/my-posted')
      } else {
        setError(data.message || 'Failed to create task.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit task.')
    } finally { setSubmitting(false) }
  }

  if (!isAuthenticated()) {
    return (
      <div className="post-page">
        <div className="container">
          <div className="login-required-card">
            <i className="fas fa-user-lock" />
            <h3>Join the Community</h3>
            <p>Sign in to start posting tasks and connecting with helpers</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>
              <i className="fas fa-sign-in-alt" /> Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  const displayName = user ? (user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.name) : ''

  return (
    <div className="post-page">
      <div className="post-hero">
        <div className="container">
          <div className="post-hero-icon"><i className="fas fa-magic" /></div>
          <h1>{isEdit ? 'Edit Your Task' : 'Create Your Task'}<span className="dot">.</span></h1>
          <p>{isEdit ? 'Update your task details' : 'Transform your to-do into someone else\'s opportunity'}</p>
          {user && (
            <div className="user-welcome">
              <div className="user-avatar-badge">{displayName.charAt(0).toUpperCase()}</div>
              <div><strong>{displayName}</strong><span>{user.contact || user.phoneNumber || user.email}</span></div>
            </div>
          )}
        </div>
      </div>

      <div className="container">
        <div className="post-form-card">
          <div className="form-steps">
            {['Details', 'Budget', 'Payment'].map((s, i) => (
              <div key={i} className={`form-step ${step > i + 1 ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
                <span className="step-num">{step > i + 1 ? <i className="fas fa-check" /> : i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {error && <div className="alert alert-error mb-4"><i className="fas fa-exclamation-circle" /> {error}</div>}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="form-section">
                <h3><i className="fas fa-clipboard-list" /> What do you need done?</h3>
                <div className="form-group">
                  <label className="form-label">Task Name * <small className="text-muted">(short title, max 60 chars)</small></label>
                  <input
                    className="form-input"
                    placeholder="e.g. Car Wash Vereeniging, Grocery Run Sandton"
                    value={form.taskName}
                    onChange={set('taskName')}
                    maxLength={60}
                    required
                  />
                  <small className="text-muted text-xs">{form.taskName.length}/60 characters</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Describe your task *</label>
                  <textarea className="form-textarea" rows={4} placeholder="Tell us what you need help with..." value={form.taskDescription} onChange={set('taskDescription')} required minLength={10} />
                  <small className="text-muted text-xs">Be specific - the more details, the better matches!</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <div className="input-with-icon">
                    <i className="fas fa-tags" />
                    <select className="form-select" value={form.category} onChange={set('category')} required>
                      <option value="">Select a category...</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {showCustom && (
                    <input className="form-input mt-2" placeholder="Enter custom category..." value={form.customCategory} onChange={set('customCategory')} required={showCustom} />
                  )}
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <div className="input-with-icon">
                      <i className="fas fa-map-marker-alt" />
                      <input className="form-input" placeholder="Area / Suburb" value={form.area} onChange={set('area')} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Urgency *</label>
                    <div className="priority-options">
                      {[{ v: 'standard', icon: 'fa-clock', label: 'Standard', sub: '48 hours' }, { v: 'urgent', icon: 'fa-bolt', label: 'Urgent', sub: '24 hours' }].map(p => (
                        <label key={p.v} className={`priority-card ${form.priority === p.v ? 'selected' : ''}`}>
                          <input type="radio" name="priority" value={p.v} checked={form.priority === p.v} onChange={set('priority')} />
                          <i className={`fas ${p.icon}`} /><span>{p.label}</span><small>{p.sub}</small>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="step-nav">
                  <button type="button" className="btn btn-primary" onClick={() => isStep1Valid() && setStep(2)} disabled={!isStep1Valid()}>
                    Next <i className="fas fa-arrow-right" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="form-section">
                <h3><i className="fas fa-calendar-alt" /> When & How Much?</h3>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Deadline *</label>
                    <div className="input-with-icon">
                      <i className="fas fa-calendar" />
                      <input type="datetime-local" className="form-input" value={form.dateNeeded} onChange={set('dateNeeded')} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Your Budget (R) *</label>
                    <div className="budget-input-wrap">
                      <span className="currency-prefix">R</span>
                      <input type="number" className="form-input budget-input" placeholder="100.00" min={50} step={0.01} value={form.budget} onChange={set('budget')} required />
                    </div>
                    <small className="text-muted text-xs">Minimum R50</small>
                    {budget >= 50 && (
                      <div className="commission-breakdown">
                        <div className="breakdown-row"><span>Task Budget:</span><span>R{commission.total.toFixed(2)}</span></div>
                        <div className="breakdown-row muted"><span>Platform Fee (15%):</span><span>-R{commission.commission.toFixed(2)}</span></div>
                        <div className="breakdown-row total"><span>Runner Receives:</span><span className="text-primary">R{commission.payout.toFixed(2)}</span></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="step-nav">
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}><i className="fas fa-arrow-left" /> Previous</button>
                  <button type="button" className="btn btn-primary" onClick={() => isStep2Valid() && setStep(3)} disabled={!isStep2Valid()}>Next <i className="fas fa-arrow-right" /></button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Anything else? (Optional)</label>
                  <textarea className="form-textarea" rows={3} placeholder="Special requirements, preferences..." value={form.notes} onChange={set('notes')} />
                </div>
                <label className="terms-check">
                  <input type="checkbox" checked={form.termsAccepted} onChange={set('termsAccepted')} />
                  <span>I agree to the <a href="/terms" target="_blank">Terms & Conditions</a></span>
                </label>
                <div className="payment-info-card">
                  <div className="payment-info-header"><i className="fas fa-shield-alt" /><h4>Secure Payment</h4></div>
                  <div className="payment-features">
                    <span><i className="fas fa-lock" /> Bank-level security</span>
                    <span><i className="fas fa-bolt" /> Instant activation</span>
                    <span><i className="fas fa-undo" /> Money-back guarantee</span>
                  </div>
                  <p className="text-muted text-xs text-center mt-2">Powered by PayFast - South Africa's leading payment gateway</p>
                </div>
                <div className="step-nav">
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}><i className="fas fa-arrow-left" /> Previous</button>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || !form.termsAccepted}>
                    {submitting ? <><span className="spinner spinner-sm" /> {isEdit ? 'Saving...' : 'Creating...'}</> : <><i className={`fas ${isEdit ? 'fa-save' : 'fa-rocket'}`} /> {isEdit ? 'Save Changes' : 'Launch My Task'}</>}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
