import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi } from '../../api'
import { useAuth } from '../../context/AuthContext'

interface SuperAdminChange {
  id: number
  action: 'grant' | 'revoke'
  targetUserId: number
  targetEmail: string
  targetName: string
  requestedByUserId: number
  reason: string
  createdAt: string
  expiresAt: string
}

interface Invitation {
  id: number
  email: string
  reason: string
  status: string
  createdAt: string
  expiresAt: string
  acceptedAt?: string | null
}

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
  isSuspended: boolean
  suspendedAt?: string | null
  lastLoginAt?: string | null
  createdAt: string
}

export default function AdminManagement() {
  const { user } = useAuth()
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
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteReason, setInviteReason] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [superAdminChanges, setSuperAdminChanges] = useState<SuperAdminChange[]>([])
  const [changeAction, setChangeAction] = useState<'grant' | 'revoke'>('grant')
  const [changeTargetId, setChangeTargetId] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [changeBusy, setChangeBusy] = useState(false)

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
      try {
        const inviteResponse = await adminApi.getAdminInvitations()
        setInvitations(inviteResponse.data?.data || [])
        const changeResponse = await adminApi.getSuperAdminChanges()
        setSuperAdminChanges(changeResponse.data?.data || [])
      } catch {
        setInvitations([])
      }
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

  const submitSuperAdminChange = async (event: FormEvent) => {
    event.preventDefault()
    const targetId = Number(changeTargetId)
    if (!targetId || changeReason.trim().length < 10) {
      setError('Select an account and provide a reason of at least 10 characters.')
      return
    }
    setChangeBusy(true)
    setError('')
    try {
      await adminApi.createSuperAdminChange(changeAction, targetId, changeReason.trim())
      setChangeTargetId('')
      setChangeReason('')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to submit the two-person SuperAdmin request.')
    } finally {
      setChangeBusy(false)
    }
  }

  const decideSuperAdminChange = async (item: SuperAdminChange, decision: 'approve' | 'reject') => {
    const reason = window.prompt(
      `Provide the independent second-person reason to ${decision} ${item.action} SuperAdmin request for ${item.targetEmail} (requested by account #${item.requestedByUserId}).`,
    )?.trim() || ''
    if (reason.length < 10) {
      setError('A decision reason of at least 10 characters is required.')
      return
    }
    if (!window.confirm(`Confirm ${decision} for ${item.targetEmail}? This action is audited.`)) return
    setError('')
    try {
      await adminApi.decideSuperAdminChange(item.id, decision, reason)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'The second-person decision was rejected.')
    }
  }

  const submitInvitation = async (event: FormEvent) => {
    event.preventDefault()
    if (inviteReason.trim().length < 5) {
      setError('Provide a reason of at least 5 characters for this invitation.')
      return
    }
    setInviteBusy(true)
    setError('')
    try {
      await adminApi.createAdminInvitation(inviteEmail.trim(), inviteReason.trim())
      setInviteEmail('')
      setInviteReason('')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to send the administrator invitation.')
    } finally {
      setInviteBusy(false)
    }
  }

  const revokeInvitation = async (invitation: Invitation) => {
    const reason = window.prompt(`Why are you revoking the invitation sent to ${invitation.email}?`)?.trim() || ''
    if (reason.length < 5) {
      setError('A revocation reason of at least 5 characters is required.')
      return
    }
    if (!window.confirm(`Revoke the pending invitation for ${invitation.email}?`)) return
    setError('')
    try {
      await adminApi.revokeAdminInvitation(invitation.id, reason)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to revoke this invitation.')
    }
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
          <h2 style={{ marginTop: 0 }}>SuperAdmin access — two-person approval</h2>
          <p className="text-muted text-sm">
            Granting or revoking SuperAdmin access requires two different SuperAdmins, each with recent authenticator verification.
            The final active SuperAdmin cannot be removed. Promotion targets must already have verified email and authenticator MFA.
          </p>
          <form onSubmit={event => void submitSuperAdminChange(event)} style={{ display: 'grid', gap: '.75rem', maxWidth: '42rem' }}>
            <label><span className="text-sm">Requested change</span>
              <select className="form-input" value={changeAction} onChange={event => { setChangeAction(event.target.value as 'grant' | 'revoke'); setChangeTargetId('') }}>
                <option value="grant">Grant SuperAdmin</option>
                <option value="revoke">Revoke SuperAdmin</option>
              </select>
            </label>
            <label><span className="text-sm">Target account</span>
              <select className="form-input" required value={changeTargetId} onChange={event => setChangeTargetId(event.target.value)}>
                <option value="">Select account...</option>
                {accounts.filter(account => account.id !== user?.id && !account.isArchived && (changeAction === 'grant'
                  ? !account.isSuperAdmin && account.emailVerified && account.authenticatorTwoFactorEnabled
                  : account.isSuperAdmin)).map(account => (
                  <option key={account.id} value={account.id}>{account.name} — {account.email}</option>
                ))}
              </select>
            </label>
            <label><span className="text-sm">Business reason</span>
              <textarea className="form-input" rows={3} minLength={10} maxLength={500} required
                value={changeReason} onChange={event => setChangeReason(event.target.value)}
                placeholder="Explain why this SuperAdmin privilege change is necessary." />
            </label>
            <div><button className="btn btn-primary btn-sm" type="submit" disabled={changeBusy || !changeTargetId || changeReason.trim().length < 10}>
              {changeBusy ? 'Submitting...' : 'Submit for second-person approval'}
            </button></div>
          </form>
          <h3 style={{ marginTop: '1.5rem' }}>Pending approval requests</h3>
          {superAdminChanges.length === 0 ? <p className="text-muted text-sm">No pending SuperAdmin changes.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%' }}>
                <thead><tr><th>Change</th><th>Target</th><th>Requested by</th><th>Expires</th><th>Reason</th><th>Decision</th></tr></thead>
                <tbody>{superAdminChanges.map(item => (
                  <tr key={item.id}>
                    <td>{item.action === 'grant' ? 'Grant SuperAdmin' : 'Revoke SuperAdmin'}</td>
                    <td>{item.targetName}<div className="text-muted text-sm">{item.targetEmail}</div></td>
                    <td>Account #{item.requestedByUserId}</td>
                    <td>{new Date(item.expiresAt).toLocaleString('en-ZA')}</td>
                    <td>{item.reason}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {item.requestedByUserId !== user?.id && item.targetUserId !== user?.id
                        ? <>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => void decideSuperAdminChange(item, 'approve')}>Approve</button>{' '}
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void decideSuperAdminChange(item, 'reject')}>Reject</button>
                          </>
                        : <span className="text-muted text-sm">Independent SuperAdmin required</span>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Invite a new administrator</h2>
          <p className="text-muted text-sm">
            Invitations expire after 48 hours and can only grant Admin access. The recipient must register or sign in
            with the invited email, verify it, enable authenticator MFA and complete the acceptance step.
          </p>
          <form onSubmit={event => void submitInvitation(event)} style={{ display: 'grid', gap: '.75rem', maxWidth: '42rem' }}>
            <label>
              <span className="text-sm">Email address</span>
              <input className="form-input" type="email" required maxLength={320} value={inviteEmail}
                onChange={event => setInviteEmail(event.target.value)} placeholder="admin@example.com" />
            </label>
            <label>
              <span className="text-sm">Business reason</span>
              <textarea className="form-input" required minLength={5} maxLength={500} rows={3}
                value={inviteReason} onChange={event => setInviteReason(event.target.value)}
                placeholder="Why does this person need administrator access?" />
            </label>
            <div><button className="btn btn-primary btn-sm" type="submit" disabled={inviteBusy || !inviteEmail.trim() || inviteReason.trim().length < 5}>
              {inviteBusy ? 'Sending invitation...' : 'Send Admin invitation'}
            </button></div>
          </form>
          {invitations.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: '1.25rem' }}>
              <h3>Recent invitations</h3>
              <table className="admin-table" style={{ width: '100%' }}>
                <thead><tr><th>Email</th><th>Status</th><th>Expires</th><th>Reason</th><th>Action</th></tr></thead>
                <tbody>{invitations.map(invitation => (
                  <tr key={invitation.id}>
                    <td>{invitation.email}</td>
                    <td>{invitation.status}</td>
                    <td>{new Date(invitation.expiresAt).toLocaleString('en-ZA')}</td>
                    <td>{invitation.reason}</td>
                    <td>{invitation.status === 'pending' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => void revokeInvitation(invitation)}>Revoke</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Provisioning an administrator</h2>
          <p>
            Use the invitation form above to invite someone who does not yet have an account. They must register
            or sign in using the invited email, verify it, enable authenticator MFA and accept the one-time invitation.
            You can also grant access to an existing verified account below. Both paths require a recorded reason
            and fresh authenticator verification.
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
                          <span className="badge badge-info">User</span>
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
