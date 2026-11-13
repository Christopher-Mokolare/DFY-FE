import { FormEvent, useEffect, useState } from 'react'
import { adminApi } from '../../api'

interface Account {
  id: number
  name: string
  email: string
  roles?: string | null
  isAdministrator: boolean
  isSuperAdmin: boolean
  emailVerified: boolean
  authenticatorTwoFactorEnabled: boolean
  isArchived: boolean
  lastLoginAt?: string | null
  createdAt: string
}

export default function AdminManagement() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.getSuperAdminAccounts({
        page, pageSize: 25, search: submittedSearch || undefined, includeArchived,
      })
      const data = response.data?.data
      setAccounts(data?.accounts || [])
      setTotalPages(data?.totalPages || 1)
      setTotalCount(data?.totalCount || 0)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load administrative accounts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [page, includeArchived, submittedSearch])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setSubmittedSearch(search.trim())
  }

  const changeAccess = async (account: Account) => {
    const nextRole = account.isAdministrator ? 'User' : 'Admin'
    const action = account.isAdministrator ? 'revoke Admin access from' : 'grant Admin access to'
    const reason = window.prompt(
      `Enter the reason to ${action} ${account.name} (${account.email}). A fresh authenticator verification is required.`,
    )?.trim() || ''
    if (reason.length < 5) {
      setError('A reason of at least 5 characters is required. No change was made.')
      return
    }
    if (!window.confirm(`Confirm: ${action} ${account.email}?`)) return

    setBusyId(account.id)
    setError('')
    try {
      await adminApi.updateUserRole(account.id, nextRole, reason)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'The role change was rejected. Verify your authenticator again and retry.')
    } finally {
      setBusyId(null)
    }
  }

  const administratorCount = accounts.filter(account => account.isAdministrator).length

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div className="container">
          <h1><i className="fas fa-user-shield" /> Admin Management</h1>
          <p className="text-muted">Control who can administer the DoForYou marketplace.</p>
        </div>
      </div>
      <div className="container">
        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Provisioning an administrator</h2>
          <p>
            Have the intended person register using their own email address and verify that email first.
            Find their account below and grant Admin access. The change requires your recent authenticator
            verification and a recorded reason. This controlled promotion flow does not create an account
            or send an invitation email.
          </p>
          <p className="text-muted text-sm" style={{ marginBottom: 0 }}>
            SuperAdmin accounts are intentionally excluded from one-person role changes. A separate
            two-person approval workflow is required before another SuperAdmin can be created or removed.
          </p>
        </div>

        <div className="section-card">
          <div className="admin-toolbar">
            <form onSubmit={submitSearch} style={{ display: 'flex', gap: '.5rem', flex: 1 }}>
              <input
                className="form-input"
                aria-label="Search accounts"
                placeholder="Search name or email..."
                value={search}
                onChange={event => setSearch(event.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary btn-sm" type="submit">
                <i className="fas fa-search" /> Search
              </button>
            </form>
            <label className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={includeArchived} onChange={event => { setIncludeArchived(event.target.checked); setPage(1) }} />
              Include archived
            </label>
            <span className="text-muted text-sm">{totalCount} accounts</span>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {loading ? (
            <div className="loading-state"><div className="spinner" /></div>
          ) : accounts.length === 0 ? (
            <div className="empty-state">No matching accounts found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>System access</th>
                    <th>Email</th>
                    <th>Authenticator</th>
                    <th>Last sign-in</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(account => (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.name || 'Unnamed account'}</strong>
                        <div className="text-muted text-sm">{account.email}</div>
                      </td>
                      <td>
                        {account.isSuperAdmin ? (
                          <span className="badge badge-success">SuperAdmin</span>
                        ) : account.isAdministrator ? (
                          <span className="badge badge-info">Admin</span>
                        ) : (
                          <span className="badge badge-secondary">User</span>
                        )}
                        {account.isArchived && <div className="text-muted text-sm">Archived</div>}
                      </td>
                      <td>{account.emailVerified ? 'Verified' : 'Not verified'}</td>
                      <td>{account.authenticatorTwoFactorEnabled ? 'Enabled' : 'Not enabled'}</td>
                      <td>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('en-ZA') : 'Never'}</td>
                      <td>
                        {account.isSuperAdmin ? (
                          <span className="text-muted text-sm">Two-person approval required</span>
                        ) : (
                          <button
                            type="button"
                            className={account.isAdministrator ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                            disabled={busyId !== null || account.isArchived || (!account.isAdministrator && !account.emailVerified)}
                            onClick={() => void changeAccess(account)}
                            title={!account.isAdministrator && !account.emailVerified ? 'Email verification is required before granting Admin access' : undefined}
                          >
                            {busyId === account.id ? 'Saving...' : account.isAdministrator ? 'Revoke Admin' : 'Grant Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-toolbar" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
            <span className="text-muted text-sm">Administrators on this page: {administratorCount}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button>
              <span className="text-muted text-sm">Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages || loading} onClick={() => setPage(value => value + 1)}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
