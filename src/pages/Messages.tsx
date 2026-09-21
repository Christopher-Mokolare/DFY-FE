import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { messagesApi } from '../api'
import type { ChatConversation } from '../types'
import './Messages.css'

const statusLabel = (status: string, closed: boolean) => {
  if (closed) return 'Closed'
  switch (String(status).toLowerCase()) {
    case 'claimed': return 'Active'
    case 'completed': return 'Awaiting confirmation'
    case 'payoutpending': return 'Payout processing'
    default: return status || 'Conversation'
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export default function Messages() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    messagesApi.getConversations()
      .then(res => {
        if (!active) return
        setConversations(res.data?.data || [])
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c =>
      [c.title, c.description, c.participantName, c.taskId].some(v => String(v || '').toLowerCase().includes(q))
    )
  }, [conversations, search])

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="messages-hub">
      <section className="messages-hero">
        <div>
          <div className="messages-eyebrow"><i className="fas fa-comments" /> COMMUNICATION</div>
          <h1>Messages</h1>
          <p>Keep every task conversation in one place. Your chat history stays attached to the work it belongs to.</p>
        </div>
        <div className="messages-hero-stat">
          <strong>{unreadTotal}</strong>
          <span>unread</span>
        </div>
      </section>

      <section className="messages-toolbar">
        <div className="messages-search">
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations, tasks or people…" aria-label="Search conversations" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><i className="fas fa-times" /></button>}
        </div>
      </section>

      {loading ? (
        <div className="messages-state"><span className="spinner spinner-sm" /><p>Loading conversations…</p></div>
      ) : filtered.length === 0 ? (
        <div className="messages-empty">
          <div className="messages-empty-icon"><i className="fas fa-comment-dots" /></div>
          <h2>{search ? 'No conversations found' : 'No conversations yet'}</h2>
          <p>{search ? 'Try a different search.' : 'Once you claim or post a task, your conversation will appear here.'}</p>
          {!search && <button type="button" onClick={() => navigate('/tasks/browse')}><i className="fas fa-search" /> Browse Tasks</button>}
        </div>
      ) : (
        <div className="conversation-list">
          {filtered.map(conversation => (
            <button
              type="button"
              className={`conversation-card ${conversation.unreadCount > 0 ? 'has-unread' : ''}`}
              key={conversation.taskId}
              onClick={() => navigate(`/tasks/${encodeURIComponent(conversation.taskId)}/chat?title=${encodeURIComponent(conversation.title || conversation.description)}`)}
            >
              <div className="conversation-avatar">{conversation.participantName.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'DF'}</div>
              <div className="conversation-main">
                <div className="conversation-top">
                  <strong>{conversation.title || conversation.description}</strong>
                  <time>{formatDate(conversation.lastMessageAt)}</time>
                </div>
                <div className="conversation-meta">
                  <span>{conversation.participantName}</span>
                  <span className={`conversation-status ${conversation.chatClosed ? 'closed' : ''}`}>{statusLabel(conversation.taskStatus, conversation.chatClosed)}</span>
                </div>
                <p>{conversation.lastMessage || 'No messages yet. Start the conversation.'}</p>
              </div>
              {conversation.unreadCount > 0 && <span className="conversation-unread">{conversation.unreadCount}</span>}
              <i className="fas fa-chevron-right conversation-chevron" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
