import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi } from '../../api'

interface Category {
  id: number
  name: string
  description?: string | null
  icon?: string | null
  sortOrder: number
  createdAt: string
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [sortOrder, setSortOrder] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.getAdminCategories()
      setCategories(response.data?.data || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load task categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const reset = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setIcon('')
    setSortOrder('')
  }

  const edit = (category: Category) => {
    setEditingId(category.id)
    setName(category.name)
    setDescription(category.description || '')
    setIcon(category.icon || '')
    setSortOrder(String(category.sortOrder))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const reason = window.prompt(
      editingId ? 'Record the reason for editing this category:' : 'Record the reason for creating this category:',
    )?.trim() || ''
    if (reason.length < 5) {
      setError('A reason of at least 5 characters is required. No change was made.')
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
      sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined,
      reason,
    }
    try {
      if (editingId) await adminApi.updateCategory(editingId, payload)
      else await adminApi.createCategory(payload)
      reset()
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save the category.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (category: Category) => {
    const reason = window.prompt(`Why should category "${category.name}" be deleted?`)?.trim() || ''
    if (reason.length < 5) {
      setError('A reason of at least 5 characters is required. No change was made.')
      return
    }
    if (!window.confirm(`Delete category "${category.name}"? Categories referenced by existing tasks cannot be deleted.`)) return
    setBusy(true)
    setError('')
    try {
      await adminApi.deleteCategory(category.id, reason)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to delete the category.')
    } finally {
      setBusy(false)
    }
  }

  const move = async (category: Category, direction: -1 | 1) => {
    const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const index = ordered.findIndex(item => item.id === category.id)
    const other = ordered[index + direction]
    if (!other) return
    const reason = window.prompt(`Why should "${category.name}" be moved in the category order?`)?.trim() || ''
    if (reason.length < 5) {
      setError('A reason of at least 5 characters is required. No change was made.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminApi.reorderCategory(category.id, other.sortOrder, reason)
      await adminApi.reorderCategory(other.id, category.sortOrder, reason)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to reorder categories.')
    } finally {
      setBusy(false)
    }
  }

  const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container">
        <h1><i className="fas fa-layer-group" /> Task Categories</h1>
        <p className="text-muted">Create, edit and order marketplace categories. Every change requires a reason and is audited.</p>
      </div></div>
      <div className="container">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit category' : 'Create category'}</h2>
          <form onSubmit={event => void submit(event)} style={{ display: 'grid', gap: '.75rem', maxWidth: '44rem' }}>
            <label><span className="text-sm">Category name</span>
              <input className="form-input" required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} />
            </label>
            <label><span className="text-sm">Description</span>
              <textarea className="form-input" rows={2} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <label><span className="text-sm">Icon name</span>
                <input className="form-input" maxLength={64} value={icon} onChange={event => setIcon(event.target.value)} placeholder="e.g. fa-broom" />
              </label>
              <label><span className="text-sm">Sort order (optional)</span>
                <input className="form-input" type="number" min={0} step={1} value={sortOrder} onChange={event => setSortOrder(event.target.value)} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-primary btn-sm" type="submit" disabled={busy || name.trim().length < 2}>
                {busy ? 'Saving...' : editingId ? 'Save category' : 'Create category'}
              </button>
              {editingId && <button className="btn btn-secondary btn-sm" type="button" onClick={reset} disabled={busy}>Cancel edit</button>}
            </div>
          </form>
        </div>

        <div className="section-card">
          <h2 style={{ marginTop: 0 }}>Existing categories ({categories.length})</h2>
          {loading ? <div className="loading-state"><div className="spinner" /></div> : ordered.length === 0 ? (
            <div className="empty-state">No task categories have been created.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%' }}>
                <thead><tr><th>Order</th><th>Category</th><th>Description</th><th>Icon</th><th>Actions</th></tr></thead>
                <tbody>{ordered.map((category, index) => (
                  <tr key={category.id}>
                    <td>{category.sortOrder}</td>
                    <td><strong>{category.name}</strong></td>
                    <td>{category.description || '—'}</td>
                    <td>{category.icon || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={busy || index === 0} onClick={() => void move(category, -1)} aria-label={`Move ${category.name} up`}>↑</button>{' '}
                      <button type="button" className="btn btn-secondary btn-sm" disabled={busy || index === ordered.length - 1} onClick={() => void move(category, 1)} aria-label={`Move ${category.name} down`}>↓</button>{' '}
                      <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => edit(category)}>Edit</button>{' '}
                      <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void remove(category)}>Delete</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
