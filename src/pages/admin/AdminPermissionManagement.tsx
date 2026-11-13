import { useEffect, useState } from 'react'
import { adminApi } from '../../api'

interface AdminAccount {
  id: number
  name: string
  email: string
  isAdministrator: boolean
  isSuperAdmin: boolean
  emailVerified: boolean
  authenticatorTwoFactorEnabled: boolean
  isArchived: boolean
  isSuspended: boolean
}

interface Permission {
  key: string
  description: string
}

interface PermissionGrant {
  id: number
  userId: number
  permissionKey: string
  grantedByUserId: number
  reason: string
  grantedAt: string
  expiresAt?: string | null
  revokedAt?: string | null
  revokedByUserId?: number | null
}

export default function AdminPermissionManagement() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [grants, setGrants] = useState<PermissionGrant[]>([])
  const [userId, setUserId] = useState('')
  const [permissionKey, setPermissionKey] = useState('')
  const [days, setDays] = useState('30')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [accountResponse, permissionResponse, grantResponse] = await Promise.all([
        adminApi.getSuperAdminAccounts({ page: 1, pageSize: 100 }),
        adminApi.getAdminPermissionCatalog(),
        adminApi.getAdminPermissionGrants(),
      ])
      const accountRows = accountResponse.data?.data?.accounts || []
      const permissionRows = permissionResponse.data?.data || []
      setAccounts(accountRows)
      setPermissions(permissionRows)
      setGrants(grantResponse.data?.data || [])
      if (!userId && accountRows.length) {
        const firstAdmin = accountRows.find((account: AdminAccount) =>
          account.isAdministrator && !account.isSuperAdmin && !account.isArchived &&
          !account.isSuspended && account.emailVerified && account.authenticatorTwoFactorEnabled)
        if (firstAdmin) setUserId(String(firstAdmin.id))
      }
      if (!permissionKey && permissionRows.length) setPermissionKey(permissionRows[0].key)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load administrator permissions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const eligibleAccounts = accounts.filter(account =>
    account.isAdministrator && !account.isSuperAdmin && !account.isArchived &&
    !account.isSuspended && account.emailVerified && account.authenticatorTwoFactorEnabled)

  const submitGrant = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId || !permissionKey || reason.trim().length < 10) {
      setError('Select an eligible administrator and permission, and provide a reason of at least 10 characters.')
      return
    }
    if (permissionKey === 'kyc.override') {
      setError('KYC override is not assignable until its separately controlled override workflow is delivered.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const expiresAt = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString()
      await adminApi.grantAdminPermission(Number(userId), permissionKey, reason.trim(), expiresAt)
      setReason('')
      setNotice('Permission granted and audited.')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to grant this permission.')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (grant: PermissionGrant) => {
    const revocationReason = window.prompt(
      `Why are you revoking ${grant.permissionKey} from account #${grant.userId}?`,
    )?.trim() || ''
    if (revocationReason.length < 10) {
      setError('A revocation reason of at least 10 characters is required. No change was made.')
      return
    }
    if (!window.confirm(`Revoke ${grant.permissionKey} from account #${grant.userId}?`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await adminApi.revokeAdminPermission(grant.id, revocationReason)
      setNotice('Permission revoked and audited.')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to revoke this permission.')
    } finally {
      setBusy(false)
    }
  }

  const permissionName = (key: string) => permissions.find(item => item.key === key)?.description || key
  const statusOf = (grant: PermissionGrant) => grant.revokedAt
    ? 'Revoked'
    : grant.expiresAt && new Date(grant.expiresAt).getTime() <= Date.now()
      ? 'Expired'
      : 'Active'

  return (
    <section className="section-card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Granular administrator permissions</h2>
      <p className="text-muted text-sm">
        Permissions are individually assigned, checked by the API on every request, and expire within 90 days.
        Every grant and revocation requires a reason and is written to the audit log. SuperAdmins retain
        their platform-level access with fresh authenticator verification.
      </p>
      <div className="alert alert-info" role="note">
        KYC reviewers and identity-document viewers are separate permissions. KYC override remains unavailable
        until its separate override workflow is delivered. Exceptional escrow releases and refunds remain blocked
        until independent two-person financial execution is implemented.
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <form onSubmit={event => void submitGrant(event)} style={{ display: 'grid', gap: '.75rem', maxWidth: '48rem' }}>
        <label>
          <span className="text-sm">Administrator account</span>
          <select className="form-input" required value={userId} onChange={event => setUserId(event.target.value)}>
            <option value="">Select eligible Admin...</option>
            {eligibleAccounts.map(account => (
              <option key={account.id} value={account.id}>{account.name} — {account.email}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm">Permission</span>
          <select className="form-input" required value={permissionKey} onChange={event => setPermissionKey(event.target.value)}>
            {permissions.map(permission => (
              <option key={permission.key} value={permission.key} disabled={permission.key === 'kyc.override'}>
                {permission.description} ({permission.key})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm">Grant duration</span>
          <select className="form-input" value={days} onChange={event => setDays(event.target.value)}>
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days (maximum)</option>
          </select>
        </label>
        <label>
          <span className="text-sm">Business reason</span>
          <textarea className="form-input" rows={3} minLength={10} maxLength={500} required
            value={reason} onChange={event => setReason(event.target.value)}
            placeholder="Explain why this administrator requires the selected permission." />
        </label>
        <div>
          <button className="btn btn-primary btn-sm" type="submit"
            disabled={busy || loading || !userId || !permissionKey || reason.trim().length < 10}>
            {busy ? 'Saving...' : 'Grant permission'}
          </button>
        </div>
      </form>

      <h3 style={{ marginTop: '1.5rem' }}>Permission grant history</h3>
      {loading ? <div className="loading-state"><div className="spinner" /></div> : grants.length === 0 ? (
        <p className="text-muted text-sm">No permission grants have been recorded.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%' }}>
            <thead><tr><th>Administrator</th><th>Permission</th><th>Status</th><th>Expires</th><th>Reason</th><th>Action</th></tr></thead>
            <tbody>{grants.map(grant => {
              const status = statusOf(grant)
              const account = accounts.find(item => item.id === grant.userId)
              return (
                <tr key={grant.id}>
                  <td>{account?.email || `Account #${grant.userId}`}</td>
                  <td><strong>{permissionName(grant.permissionKey)}</strong><div className="text-muted text-sm">{grant.permissionKey}</div></td>
                  <td>{status}</td>
                  <td>{grant.expiresAt ? new Date(grant.expiresAt).toLocaleString('en-ZA') : 'No expiry'}</td>
                  <td>{grant.reason}</td>
                  <td>{status === 'Active' ? (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                      onClick={() => void revoke(grant)}>Revoke</button>
                  ) : <span className="text-muted text-sm">No action</span>}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
