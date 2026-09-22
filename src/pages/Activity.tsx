import { useEffect, useState } from 'react'
import { tasksApi } from '../api'
import './Activity.css'

const formatStatus = (value: any) => String(value || 'Updated').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const formatDate = (value: any) => value ? new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable'

export default function Activity() {
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    tasksApi.getRecentActivity(50).then(res => { const items = res.data?.data; setActivity(Array.isArray(items) ? items : []) }).catch(() => setActivity([])).finally(() => setLoading(false))
  }, [])
  return (
    <div className="activity-page">
      <div className="page-header"><div className="container"><h1><i className="fas fa-history" /> Activity</h1><p>Your recent task and account activity</p></div></div>
      <div className="container activity-container">
        {loading ? <div className="loading-state"><div className="spinner" /><p>Loading activity...</p></div> : activity.length === 0 ? (
          <div className="empty-state"><i className="fas fa-history" /><h3>No Activity Yet</h3><p>Your task activity will appear here as you post, claim, complete or update tasks.</p></div>
        ) : (
          <div className="activity-list">
            {activity.map((item, index) => {
              const title = item.taskName || item.title || item.name || item.description || item.message || 'Task updated'
              const description = item.taskName || item.title || item.name ? (item.description || item.message || '') : ''
              return <article className="activity-row" key={item.id || (title + '-' + (item.updatedAt || index))}>
                <div className="activity-row-icon"><i className={'fas ' + (item.type === 'created' ? 'fa-plus-circle' : 'fa-handshake')} /></div>
                <div className="activity-row-content"><h2>{title}</h2>{description && <p>{description}</p>}<div className="activity-row-meta"><span className="activity-status">{formatStatus(item.status)}</span><span aria-hidden="true">·</span><time dateTime={item.updatedAt || undefined}>{formatDate(item.updatedAt)}</time></div></div>
              </article>
            })}
          </div>
        )}
      </div>
    </div>
  )
}
