import { useEffect, useState } from 'react'
import { adminApi } from '../../api'

interface Account {
  id: number
  firstName?: string
  lastName?: string
  name?: string
  email: string
}

interface DuplicateCase {
  id: number
  primaryUserId: number
  candidateUserId: number
  reason: string
  evidenceReference?: string | null
  status: string
  resolutionNote?: string | null
  createdByUserId: number
  decidedByUserId?: number | null
  createdAt: string
  resolvedAt?: string | null
}

type Outcome = 'ConfirmedDuplicate' | 'FalsePositive' | 'InsufficientEvidence'

export default function AdminDuplicateAccountCases() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cases, setCases] = useState<DuplicateCase[]>([])
  const [primaryUserId, setPrimaryUserId] = useState('')
  const [candidateUserId, setCandidateUserId] = useState('')
  const [reason, setReason] = useState('')
  const [evidenceReference, setEvidenceReference] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [outcome, setOutcome] = useState<Outcome>('FalsePositive')
  const [resolutionNote, setResolutionNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [usersResponse, casesResponse] = await Promise.all([
        adminApi.getUsers({ page: 1, pageSize: 100, includeArchived: true }),
        adminApi.getDuplicateAccountCases({ page: 1, pageSize: 50 }),
      ])
      setAccounts(usersResponse.data?.data?.users || [])
      setCases(casesResponse.data?.data?.cases || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load duplicate-account investigations. Check your Users management permission.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const accountLabel = (id: number) => {
    const account = accounts.find(item => item.id === id)
    if (!account) return `Account #${id}`
    const name = account.name || [account.firstName, account.lastName].filter(Boolean).join(' ') || 'Unnamed account'
    return `${name} — ${account.email}`
  }

  const createCase = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!primaryUserId || !candidateUserId || primaryUserId === candidateUserId || reason.trim().length < 10) {
      setError('Select two different accounts and provide a reason of at least 10 characters.')
      return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      await adminApi.createDuplicateAccountCase(Number(primaryUserId), Number(candidateUserId), reason.trim(), evidenceReference.trim() || undefined)
      setReason(''); setEvidenceReference(''); setCandidateUserId('')
      setNotice('Investigation opened and audited. No account records were changed.')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to open this investigation.')
    } finally { setBusy(false) }
  }

  const resolveCase = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedCaseId || resolutionNote.trim().length < 10) {
      setError('Select an open case and provide a resolution note of at least 10 characters.')
      return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      await adminApi.resolveDuplicateAccountCase(Number(selectedCaseId), outcome, resolutionNote.trim())
      setSelectedCaseId(''); setResolutionNote('')
      setNotice('Investigation resolved and audited. Accounts and linked financial/KYC records were not merged or changed.')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to resolve this investigation. The case creator cannot decide their own case.')
    } finally { setBusy(false) }
  }

  const openCases = cases.filter(item => item.status === 'Open')

  return (
    <section className="section-card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Duplicate-account investigations</h2>
      <p className="text-muted text-sm">
        Record suspected duplicate pairs, review protected evidence references and close investigations with an independent decision.
        This workflow never merges, deletes or suspends accounts and never moves financial or KYC records.
      </p>
      <div className="alert alert-info" role="note">
        Do not paste South African ID numbers or identity-document contents here. Store evidence in the approved protected system
        and enter only its reference.
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <form onSubmit={event => void createCase(event)} style={{ display: 'grid', gap: '.75rem', maxWidth: '48rem' }}>
        <label><span className="text-sm">First account</span>
          <select className="form-input" required value={primaryUserId} onChange={event => setPrimaryUserId(event.target.value)}>
            <option value="">Select account...</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{accountLabel(account.id)}</option>)}
          </select>
        </label>
        <label><span className="text-sm">Potential duplicate account</span>
          <select className="form-input" required value={candidateUserId} onChange={event => setCandidateUserId(event.target.value)}>
            <option value="">Select account...</option>
            {accounts.filter(account => String(account.id) !== primaryUserId).map(account =>
              <option key={account.id} value={account.id}>{accountLabel(account.id)}</option>)}
          </select>
        </label>
        <label><span className="text-sm">Investigation reason</span>
          <textarea className="form-input" rows={3} required minLength={10} maxLength={500}
            value={reason} onChange={event => setReason(event.target.value)}
            placeholder="Describe the indicators that require investigation." />
        </label>
        <label><span className="text-sm">Protected evidence reference (optional)</span>
          <input className="form-input" maxLength={2000} value={evidenceReference}
            onChange={event => setEvidenceReference(event.target.value)}
            placeholder="Reference only — never paste identity numbers or document contents." />
        </label>
        <div><button type="submit" className="btn btn-primary btn-sm"
          disabled={busy || loading || !primaryUserId || !candidateUserId || reason.trim().length < 10}>
          {busy ? 'Saving...' : 'Open investigation'}
        </button></div>
      </form>

      <h3 style={{ marginTop: '1.5rem' }}>Investigation history</h3>
      {loading ? <div className="loading-state"><div className="spinner" /></div> : cases.length === 0 ? (
        <p className="text-muted text-sm">No duplicate-account investigations have been recorded.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%' }}>
            <thead><tr><th>Accounts</th><th>Status</th><th>Opened</th><th>Reason</th><th>Decision</th></tr></thead>
            <tbody>{cases.map(item => (
              <tr key={item.id}>
                <td>{accountLabel(item.primaryUserId)}<div className="text-muted text-sm">and</div>{accountLabel(item.candidateUserId)}</td>
                <td>{item.status}</td>
                <td>{new Date(item.createdAt).toLocaleString('en-ZA')}</td>
                <td>{item.reason}{item.evidenceReference && <div className="text-muted text-sm">Evidence ref: {item.evidenceReference}</div>}</td>
                <td>{item.resolutionNote || (item.status === 'Open' ? (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                    onClick={() => { setSelectedCaseId(String(item.id)); setResolutionNote('') }}>Resolve</button>
                ) : '—')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {selectedCaseId && (
        <form onSubmit={event => void resolveCase(event)} style={{ display: 'grid', gap: '.75rem', maxWidth: '48rem', marginTop: '1rem' }}>
          <h3>Resolve investigation #{selectedCaseId}</h3>
          <label><span className="text-sm">Outcome</span>
            <select className="form-input" value={outcome} onChange={event => setOutcome(event.target.value as Outcome)}>
              <option value="ConfirmedDuplicate">Confirmed duplicate</option>
              <option value="FalsePositive">False positive</option>
              <option value="InsufficientEvidence">Insufficient evidence</option>
            </select>
          </label>
          <label><span className="text-sm">Resolution note</span>
            <textarea className="form-input" rows={3} minLength={10} maxLength={500} required
              value={resolutionNote} onChange={event => setResolutionNote(event.target.value)}
              placeholder="Summarise the evidence and independent decision." />
          </label>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || resolutionNote.trim().length < 10}>
              {busy ? 'Saving...' : 'Confirm decision'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
              onClick={() => setSelectedCaseId('')}>Cancel</button>
          </div>
        </form>
      )}
      <p className="text-muted text-sm" style={{ marginTop: '1rem' }}>
        A case creator cannot make the final decision. Resolution records an outcome only; any future account merge or record migration requires a separately reviewed workflow.
      </p>
    </section>
  )
}
