import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications, type AppNotification } from '../context/NotificationContext'
import './Notifications.css'

const TYPE_ICON: Record<string, string> = {
  task_claimed:    'fa-hand-paper',
  task_completed:  'fa-check-circle',
  task_posted:     'fa-bullhorn',
  payment_received:'fa-money-bill-wave',
  payment_verified:'fa-shield-alt',
  new_message:     'fa-comment',
  system:          'fa-cog',
}
const TYPE_COLOR: Record<string, string> = {
  task_claimed:    '#f59e0b',
  task_completed:  '#22c55e',
  task_posted:     '#3b82f6',
  payment_received:'#10b981',
  payment_verified:'#10b981',
  new_message:     'var(--primary)',
  system:          '#6b7280',
}

function getIcon(type: string)  { return TYPE_ICON[type]  || 'fa-bell' }
function getColor(type: string) { return TYPE_COLOR[type] || '#6b7280' }

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
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
  { id: 'all',      label: 'All',      icon: 'fa-bell' },
  { id: 'unread',   label: 'Unread',   icon: 'fa-circle' },
  { id: 'messages', label: 'Messages', icon: 'fa-comment',        types: ['new_message'] },
  { id: 'tasks',    label: 'Tasks',    icon: 'fa-tasks',          types: ['task_claimed', 'task_completed', 'task_posted'] },
  { id: 'payments', label: 'Payments', icon: 'fa-money-bill-wave',types: ['payment_received', 'payment_verified', 'payment_released'] },
]

export default function Notifications() {
  const { notifications, unreadCount, loading, hasMore, loadMore, markRead, markAllRead, remove, clearRead } = useNotifications()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.roles?.includes('Admin')
  const [tab, setTab]               = useState<Tab>('all')
  const [loadingMore, setLoadingMore] = useState(false)

  const filtered = useMemo(() => {
    const tabDef = TABS.find(t => t.id === tab)!
    let base = notifications
    if (tab === 'unread')   base = base.filter(n => !n.isRead)
    else if (tabDef.types) base = base.filter(n => tabDef.types!.includes(n.type))

    // Group by type + relatedTaskId — handles both old ungrouped rows and new coalesced rows
    const seen = new Map<string, { n: AppNotification; count: number; hasUnread: boolean }>()
    for (const n of base) {
      const key = `${n.type}::${n.relatedTaskId ?? 'none'}`
      const existing = seen.get(key)
      if (existing) {
        existing.count += n.count ?? 1
        if (!n.isRead) existing.hasUnread = true
        // keep the most recent (base is already sorted newest-first)
      } else {
        seen.set(key, { n, count: n.count ?? 1, hasUnread: !n.isRead })
      }
    }
    return Array.from(seen.values())
  }, [notifications, tab])

  const tabCounts = useMemo(() => ({
    all:      notifications.length,
    unread:   notifications.filter(n => !n.isRead).length,
    messages: notifications.filter(n => n.type === 'new_message').length,
    tasks:    notifications.filter(n => ['task_claimed','task_completed','task_posted'].includes(n.type)).length,
    payments: notifications.filter(n => ['payment_received','payment_verified','payment_released'].includes(n.type)).length,
  }), [notifications])

  const handleClick = async (n: AppNotification) => {
    if (!n.isRead) await markRead(n.id)
    if (!n.relatedTaskStringId && !n.relatedTaskId) return
    const taskId = n.relatedTaskStringId
    if (n.type === 'new_message') {
      if (taskId) navigate(`/tasks/${taskId}/chat`)
    } else if (n.type === 'payment_received') {
      navigate('/wallet')
    } else if (isAdmin && ['task_posted','task_claimed','task_completed'].includes(n.type)) {
      navigate(taskId ? `/admin/tasks?highlight=${taskId}` : '/admin/tasks')
    } else if (isAdmin && n.type === 'payment_released') {
      navigate(taskId ? `/admin/payments?highlight=${taskId}` : '/admin/payments')
    } else {
      navigate('/tasks/my-posted')
    }
  }

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await loadMore()
    setLoadingMore(false)
  }

  return (
    <div className="notif-page">
      {/* Page header — matches app pattern */}
      <div className="page-header">
        <div className="container">
          <h1>
            <i className="fas fa-bell" /> Notifications
            {unreadCount > 0 && (
              <span className="notif-header-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </h1>
        </div>
      </div>

      <div className="container">
        {/* Action bar */}
        {(unreadCount > 0 || notifications.some(n => n.isRead)) && (
          <div className="notif-actions">
            {unreadCount > 0 && (
              <button className="btn btn-outline btn-sm" onClick={markAllRead}>
                <i className="fas fa-check-double" /> Mark all read
              </button>
            )}
            {notifications.some(n => n.isRead) && (
              <button className="btn btn-sm notif-clear-btn" onClick={clearRead}>
                <i className="fas fa-trash" /> Clear read
              </button>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <div className="notif-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`notif-tab${tab === t.id ? ' notif-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`fas ${t.icon}`} />
              <span className="notif-tab-label">{t.label}</span>
              {tabCounts[t.id] > 0 && (
                <span className="notif-tab-count">{tabCounts[t.id]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading notifications…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-bell-slash" />
            <h3>No {tab !== 'all' ? tab : ''} notifications</h3>
            <p>You're all caught up!</p>
          </div>
        )}

        {/* List */}
        <div className="notif-list">
          {filtered.map(({ n, count, hasUnread }) => (
            <div
              key={n.id}
              className={`notif-item${hasUnread ? ' notif-item--unread' : ''}${(n.relatedTaskId || n.relatedTaskStringId) ? ' notif-item--clickable' : ''}`}
              onClick={() => handleClick(n)}
            >
              {/* Icon */}
              <div className="notif-icon" style={{ background: getColor(n.type) + '18' }}>
                <i className={`fas ${getIcon(n.type)}`} style={{ color: getColor(n.type) }} />
                {count > 1 && (
                  <span className="notif-count-badge" style={{ background: getColor(n.type) }}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="notif-body">
                <div className="notif-title-row">
                  <span className="notif-title">
                    {n.title}
                    {count > 1 && <span className="notif-count-label"> · {count}x</span>}
                  </span>
                  {hasUnread && <span className="notif-dot" />}
                </div>
                <p className="notif-message">{cleanMessage(n.message)}</p>
                <span className="notif-time">{timeAgo(n.updatedAt || n.createdAt)}</span>
              </div>

              {/* Delete */}
              <button
                className="notif-delete"
                onClick={e => { e.stopPropagation(); remove(n.id) }}
                aria-label="Delete"
              >
                <i className="fas fa-times" />
              </button>
            </div>
          ))}
        </div>

        {/* Load more */}
        {hasMore && tab === 'all' && (
          <div className="notif-load-more">
            <button className="btn btn-outline btn-sm" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore
                ? <><span className="spinner spinner-sm" /> Loading…</>
                : <><i className="fas fa-chevron-down" /> Load more</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
