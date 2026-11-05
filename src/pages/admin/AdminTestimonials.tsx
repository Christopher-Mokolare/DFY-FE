import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, CSSProperties } from 'react'
import { adminApi } from '../../api'

type Testimonial = {
  id: number
  name: string
  role: string
  text: string
  isPublished: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}
type FormState = { name: string; role: string; text: string; isPublished: boolean; sortOrder: string }
const emptyForm: FormState = { name: '', role: 'Task Creator', text: '', isPublished: false, sortOrder: '' }

export default function AdminTestimonials() {
  const [items, setItems] = useState<Testimonial[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.getTestimonials()
      const data = response.data?.data
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError('Testimonials could not be loaded. Check the API connection and your administrator access.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setError(''); setNotice('') }
  const updateField = (key: keyof FormState, value: string | boolean) => setForm(current => ({ ...current, [key]: value }))

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const wasEditing = editingId !== null
    setSaving(true); setError(''); setNotice('')
    const payload = { name: form.name.trim(), role: form.role.trim(), text: form.text.trim(), isPublished: form.isPublished, ...(form.sortOrder.trim() ? { sortOrder: Number(form.sortOrder) } : {}) }
    try {
      if (editingId === null) await adminApi.createTestimonial(payload)
      else await adminApi.updateTestimonial(editingId, payload)
      resetForm()
      setNotice(wasEditing ? 'Testimonial changes saved.' : 'Testimonial created.')
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not save this testimonial. Please try again.')
    } finally { setSaving(false) }
  }

  const edit = (item: Testimonial) => {
    setEditingId(item.id)
    setForm({ name: item.name, role: item.role, text: item.text, isPublished: item.isPublished, sortOrder: String(item.sortOrder) })
    setNotice(''); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const togglePublished = async (item: Testimonial) => {
    setError(''); setNotice('')
    try {
      await adminApi.setTestimonialPublished(item.id, !item.isPublished)
      setNotice(!item.isPublished ? 'Testimonial published on the homepage.' : 'Testimonial unpublished.')
      await load()
    } catch (e: any) { setError(e?.response?.data?.message || 'Could not update publication status.') }
  }

  const remove = async (item: Testimonial) => {
    if (!window.confirm(`Delete the testimonial from ${item.name}? This cannot be undone.`)) return
    setError(''); setNotice('')
    try {
      await adminApi.deleteTestimonial(item.id)
      if (editingId === item.id) resetForm()
      setNotice('Testimonial deleted.')
      await load()
    } catch (e: any) { setError(e?.response?.data?.message || 'Could not delete this testimonial.') }
  }

  const move = async (item: Testimonial, direction: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
    const index = sorted.findIndex(t => t.id === item.id)
    const target = sorted[index + direction]
    if (!target) return
    setError(''); setNotice('')
    try {
      await adminApi.reorderTestimonial(item.id, target.sortOrder)
      await adminApi.reorderTestimonial(target.id, item.sortOrder)
      setNotice('Display order updated.')
      await load()
    } catch (e: any) { setError(e?.response?.data?.message || 'Could not reorder testimonials.') }
  }

  return (
    <div className="admin-page">
      <section className="admin-welcome">
        <div>
          <div className="admin-eyebrow"><span className="admin-pulse" /> WEBSITE CONTENT</div>
          <h1>Testimonials</h1>
          <p>Manage the community stories shown on the public homepage—no code changes or frontend deployment needed for content edits.</p>
        </div>
        <div className="admin-date"><i className="fas fa-quote-left" /> {items.length} total · {items.filter(t => t.isPublished).length} published</div>
      </section>

      {error && <div role="alert" className="admin-error" style={{ marginBottom: '1rem' }}><i className="fas fa-circle-exclamation" /><div><strong>Something needs attention</strong><p>{error}</p></div></div>}
      {notice && <div role="status" style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: 12, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0' }}><i className="fas fa-check-circle" /> {notice}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        <section className="admin-panel" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)' }}>
          <div className="admin-panel-header" style={{ marginBottom: '1rem' }}>
            <div><span className="admin-panel-kicker">{editingId === null ? 'CREATE CONTENT' : `EDITING #${editingId}`}</span><h2>{editingId === null ? 'Add a testimonial' : 'Edit testimonial'}</h2></div>
            {editingId !== null && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>}
          </div>
          <form onSubmit={save} style={{ display: 'grid', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '.4rem', fontWeight: 650 }}>Display name
              <input required maxLength={100} value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. Thabo M." className="form-control" style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: '.4rem', fontWeight: 650 }}>Community role
              <select required value={form.role} onChange={e => updateField('role', e.target.value)} className="form-control" style={fieldStyle}>
                <option>Task Creator</option><option>Task Runner</option><option>Task Creator & Runner</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: '.4rem', fontWeight: 650 }}>Testimonial
              <textarea required maxLength={1200} rows={5} value={form.text} onChange={e => updateField('text', e.target.value)} placeholder="Share the person's experience in their own words…" className="form-control" style={{ ...fieldStyle, resize: 'vertical' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '.8rem', fontWeight: 400 }}>{form.text.length}/1200 characters</span>
            </label>
            <label style={{ display: 'grid', gap: '.4rem', fontWeight: 650 }}>Display order
              <input type="number" min={0} step={1} value={form.sortOrder} onChange={e => updateField('sortOrder', e.target.value)} placeholder="Automatically assigned" className="form-control" style={fieldStyle} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.65rem', padding: '.8rem', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 650 }}>
              <input type="checkbox" checked={form.isPublished} onChange={e => updateField('isPublished', e.target.checked)} />
              Publish on the homepage
            </label>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minHeight: 46 }}>{saving ? 'Saving…' : editingId === null ? 'Save testimonial' : 'Save changes'}</button>
          </form>
          <p style={{ margin: '1rem 0 0', fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Only publish testimonials you have permission to use and that reflect a genuine experience.</p>
        </section>

        <section className="admin-panel" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)' }}>
          <div className="admin-panel-header" style={{ marginBottom: '1rem' }}>
            <div><span className="admin-panel-kicker">HOMEPAGE CONTENT</span><h2>Community stories</h2></div>
            <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}><i className="fas fa-rotate" /> Refresh</button>
          </div>
          {loading ? <div className="admin-loading"><div className="spinner" /><span>Loading testimonials…</span></div> : items.length === 0 ? (
            <div className="empty-state"><i className="fas fa-quote-left" /><p>No testimonials yet</p><span>Add one using the form.</span></div>
          ) : (
            <div style={{ display: 'grid', gap: '.9rem' }}>
              {[...items].sort((a, b) => a.sortOrder - b.sortOrder).map((item, index, sorted) => (
                <article key={item.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--surface, #fff)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    <div className="testimonial-avatar" aria-hidden="true" style={{ flexShrink: 0 }}>{item.name.charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0, flex: 1 }}><strong>{item.name}</strong><div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{item.role}</div></div>
                    <span className={`badge ${item.isPublished ? 'badge-success' : 'badge-warning'}`}>{item.isPublished ? 'Published' : 'Draft'}</span>
                  </div>
                  <p style={{ margin: '1rem 0', lineHeight: 1.7, overflowWrap: 'anywhere' }}>“{item.text}”</p>
                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => edit(item)}><i className="fas fa-pen" /> Edit</button>
                    <button type="button" className="btn btn-secondary" onClick={() => void togglePublished(item)}><i className={`fas ${item.isPublished ? 'fa-eye-slash' : 'fa-eye'}`} /> {item.isPublished ? 'Unpublish' : 'Publish'}</button>
                    <button type="button" className="btn btn-secondary" onClick={() => void move(item, -1)} disabled={index === 0} aria-label={`Move ${item.name} up`}><i className="fas fa-arrow-up" /></button>
                    <button type="button" className="btn btn-secondary" onClick={() => void move(item, 1)} disabled={index === sorted.length - 1} aria-label={`Move ${item.name} down`}><i className="fas fa-arrow-down" /></button>
                    <button type="button" className="btn btn-secondary" onClick={() => void remove(item)} style={{ color: '#b91c1c', marginLeft: 'auto' }}><i className="fas fa-trash" /> Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

const fieldStyle: CSSProperties = { width: '100%', minHeight: 44, padding: '.7rem .8rem', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', background: 'var(--surface, #fff)', font: 'inherit' }
