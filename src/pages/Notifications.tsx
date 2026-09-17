import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications, type AppNotification } from '../context/NotificationContext'
import './Notifications.css'

const TYPE_ICON: Record<string, string> = {
  task_claimed: 'fa-hand-paper',
  task_completed: 'fa-check-circle',
  task_posted: 'fa-bullhorn',
  payment_received: 'fa-money-bill-wave',
  payment_verified: 'fa-shield-alt',
  payment_pending: 'fa-clock',
  payout_pending: 'fa-hourglass-half',
  payout_completed: 'fa-money-bill-transfer',
  new_message: 'fa-comment',
  dispute_raised: 'fa-exclamation-triangle',
  new_user: 'fa-user-plus',
  system: 'fa-cog',
}
const TYPE_COLOR: Record<string, string> = {
  task_claimed: '#f59e0b',
  task_completed: '#22c55e',
  task_posted: '#3b82f6',
  payment_received: '#10b981',
  payment_verified: '#10b981',
  payment_pending: '#f59e0b',
  payout_pending: '#f59e0b',
  payout_completed: '#10b981',
  new_message: 'var(--primary)',
  dispute_raised: '#ef4444',
  new_user: '#8b5cf6',
  system: '#6b7280',
}

function getIcon(type: string) { return TYPE_ICON[type] || 'fa-bell' }
function getColor(type: string) { return TYPE_COLOR[type] || '#6b7280' }

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function cleanMessage(msg: string) {
  return msg.replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').trim()
}

type Tab = 'all' | 'unread' | 'messages' | 'tasks' | 'payments'

const TABS: { id: Tab; label: string; icon: string; types?: string[] }[] = [
  { id: 'all', label: 'All', icon: 'fa-bell' },
  { id: 'unread', label: 'Unread', icon: 'fa-circle' },
  { id: 'messages', label: 'Messages', icon: 'fa-comment', types: ['new_message'] },
  { id: 'tasks', label: 'Tasks', icon: 'fa-tasks', types: ['task_claimed', 'task_completed', 'task_posted', 'payment_pending', 'new_user'] },
  { id: 'payments', label: 'Payments', icon: 'fa-money-bill-wave', types: ['payment_received', 'payment_verified', 'payout_pending', 'payout_completed'] },
]

export default function Notifications() {
  const { notifications, unreadCount, loading, hasMore, loadMore, markRead, markAllRead, markTaskNotificationsRead, remove, clearRead } = useNotifications()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.roles?.includes('Admin')
  const [tab, setTab] = useState<Tab>('all')
  const [loadingMore, setLoadingMore] = useState(false)

  const filtered = useMemo(() => {
    const tabDef = TABS.find(t => t.id === tab)!
    let base = notifications
    if (tab === 'unread') base = base.filter(n => !n.isRead)
    else if (tabDef.types) base = base.filter(n => tabDef.types!.includes(n.type))

    const seen = new Map<string, { n: AppNotification; count: number; hasUnread: boolean }>()
    for (const n of base) {
      const key = `${n.type}::${n.relatedTaskId ?? 'none'}`
      const existing = seen.get(key)
      if (existing) {
        existing.count += n.count ?? 1
        if (!n.isRead) existing.hasUnread = true
      } else {
        seen.set(key, { n, count: n.count ?? 1, hasUnread: !n.isRead })
      }
    }
    return Array.from(seen.values())
  }, [notifications, tab])

  const tabCounts = useMemo(() => ({
    all: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    messages: notifications.filter(n => n.type === 'new_message').length,
    tasks: notifications.filter(n => ['task_claimed', 'task_completed', 'task_posted'].includes(n.type)).length,
    payments: notifications.filter(n => ['payment_received', 'payment_verified', 'payout_pending', 'payout_completed'].includes(n.type)).length,
  }), [notifications])

  const handleClick = async (n: AppNotification) => {
    if (n.type === 'new_message' && n.relatedTaskId != null) {
      markTaskNotificationsRead(n.relatedTaskId)
    } else if (!n.isRead) {
      await markRead(n.id)
    }

    const taskId = n.relatedTaskStringId

    if (isAdmin) {
      if (n.type === 'dispute_raised') {
        navigate('/admin/disputes')
        return
      }
      if (n.type === 'new_user') {
        navigate('/admin/users')
        return
      }
      if (n.type === 'payment_pending' || n.type === 'payout_pending' || n.type === 'payout_completed') {
        navigate(taskId ? `/admin/payments?highlight=${taskId}` : '/admin/payments')
        return
      }
      if (['task_posted', 'task_claimed', 'task_completed'].includes(n.type)) {
        navigate(taskId ? `/admin/tasks?highlight=${taskId}` : '/admin/tasks')
        return
      }
    }

    if (!n.relatedTaskStringId && !n.relatedTaskId) return
    if (n.type === 'new_message') {
      if (taskId) navigate(`/tasks/${taskId}/chat`)
    } else if (n.type === 'payout_completed') {
      navigate('/tasks/my-completed')
    } else if (n.type === 'payout_pending' || n.type === 'payment_received') {
      navigate(taskId ? `/tasks/${taskId}` : '/dashboard')
    } else {
      navigate(taskId ? `/tasks/${taskId}` : '/tasks/my-posted')
    }
  }

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await loadMore()
    setLoadingMore(false)
  }

  return (
    <div className="notif-page">
      <div className="page-header">
        <div className="container">
          <h1>
            <i className="fas fa-bell" /> Notifications
            {unreadCount > 0 && <span className="notif-header-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </h1>
        </div>
      </div>

      <div className="container">
        {(unreadCount > 0 || notifications.some(n => n.isRead)) && (
          <div className="notif-actions">
            {unreadCount > 0 && <button className="btn btn-outline btn-sm" onClick={markAllRead}><i className="fas fa-check-double" /> Mark all read</button>}
            {notifications.some(n => n.isRead) && <button className="btn btn-sm notif-clear-btn" onClick={clearRead}><i className="fas fa-trash" /> Clear read</button>}
          </div>
        )}

        <div className="notif-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`notif-tab${tab === t.id ? ' notif-tab--active' : ''}`} onClick={() => setTab(t.id)}>
              <i className={`fas ${t.icon}`} />
              <span className="notif-tab-label">{t.label}</span>
              {tabCounts[t.id] > 0 && <span className="notif-tab-count">{tabCounts[t.id]}</span>}
            </button>
          ))}
        </div>

        {loading && <div className="loading-state"><div className="spinner" /><p>Loading notifications…</p></div>}

        {!loading && filtered.length === 0 && <div className="empty-state"><i className="fas fa-bell-slash" /><h3>No {tab !== 'all' ? tab : ''} notifications</h3><p>You're all caught up!</p></div>}

        <div className="notif-list">
          {filtered.map(({ n, count, hasUnread }) => (
            <div key={n.id} className={`notif-item${hasUnread ? ' notif-item--unread' : ''}${(n.relatedTaskId || n.relatedTaskStringId) ? ' notif-item--clickable' : ''}`} onClick={() => handleClick(n)}>
              <div className="notif-icon" style={{ background: getColor(n.type) + '18' }}>
                <i className={`fas ${getIcon(n.type)}`} style={{ color: getColor(n.type) }} />
                {count > 1 && <span className="notif-count-badge" style={{ background: getColor(n.type) }}>{count > 99 ? '99+' : count}</span>}
              </div>
              <div className="notif-body">
                <div className="notif-title-row">
                  <span className="notif-title">{n.title}{count > 1 && <span className="notif-count-label"> · {count}x</span>}</span>
                  {hasUnread && <span className="notif-dot" />}
                </div>
                <p className="notif-message">{cleanMessage(n.message)}</p>
                <span className="notif-time">{timeAgo(n.updatedAt || n.createdAt)}</span>
              </div>
              <button className="notif-delete" onClick={e => { e.stopPropagation(); remove(n.id) }} aria-label="Delete"><i className="fas fa-times" /></button>
            </div>
          ))}
        </div>

        {hasMore && tab === 'all' && (
          <div className="notif-load-more">
            <button className="btn btn-outline btn-sm" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? <><span className="spinner spinner-sm" /> Loading…</> : <><i className="fas fa-chevron-down" /> Load more</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
