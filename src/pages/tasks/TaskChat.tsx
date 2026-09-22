import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import DOMPurify from 'dompurify'
import { tasksApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import type { ChatMessage } from '../../types'
import env from '../../env'
import './TaskChat.css'

const POLL_INTERVAL = 5000

const normalizeStatus = (value: unknown) => String(value || '').replace(/_/g, '').replace(/\s/g, '').toLowerCase()

const statusMeta = (status: string) => {
  switch (normalizeStatus(status)) {
    case 'completed': return { label: 'Awaiting confirmation', tone: 'warning' }
    case 'runnerpaid': return { label: 'Completed & closed', tone: 'closed' }
    case 'cancelled': return { label: 'Cancelled', tone: 'closed' }
    case 'claimed':
    case 'inprogress': return { label: 'Active', tone: 'active' }
    default: return { label: status || 'Task conversation', tone: 'neutral' }
  }
}

const formatTime = (ts: string) => {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 24 * 60) return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  if (diffMins < 48 * 60) return `Yesterday · ${date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ' · ' + date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

const dateLabel = (ts: string) => new Date(ts).toLocaleDateString('en-ZA', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase() || '?'
}

export default function TaskChat() {
  const { taskId } = useParams<{ taskId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notifications, markTaskNotificationsRead } = useNotifications()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [taskInfo, setTaskInfo] = useState<any>(null)

  const taskTitle = taskInfo?.taskName || taskInfo?.taskDescription || searchParams.get('title') || 'Task conversation'
  const taskStatus = taskInfo?.taskStatus || ''
  const meta = statusMeta(taskStatus)
  const chatClosed = normalizeStatus(taskStatus) === 'runnerpaid' || normalizeStatus(taskStatus) === 'cancelled'
  const participantName = taskInfo?.runnerName && taskInfo?.createdByUserId === user?.id
    ? taskInfo.runnerName
    : taskInfo?.creatorName || taskInfo?.runnerName || 'Task participant'

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const hubRef = useRef<signalR.HubConnection | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isAtBottomRef = useRef(true)
  const knownIdsRef = useRef<Set<string | number>>(new Set())

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    const toAdd = incoming.filter(msg => !knownIdsRef.current.has(String(msg.id)))
    if (!toAdd.length) return

    toAdd.forEach(msg => knownIdsRef.current.add(String(msg.id)))
    const normalized = toAdd.map(msg => ({ ...msg, id: String(msg.id) }))

    setMessages(prev => {
      let next = [...prev]

      // The sender gets an optimistic bubble immediately, then SignalR/API returns
      // the persisted message with its real database ID. Reconcile the optimistic
      // bubble instead of rendering the same message twice.
      for (const msg of normalized) {
        const optimisticIndex = next.findIndex(existing =>
          String(existing.id).startsWith('temp-') &&
          existing.isCurrentUser === msg.isCurrentUser &&
          existing.senderId === msg.senderId &&
          existing.content === msg.content &&
          Math.abs(new Date(existing.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 30_000
        )

        if (optimisticIndex !== -1) {
          const optimisticId = String(next[optimisticIndex].id)
          knownIdsRef.current.delete(optimisticId)
          next[optimisticIndex] = msg
        } else {
          next.push(msg)
        }
      }

      return next.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    })
  }, [])

  const fetchTask = useCallback(async () => {
    if (!taskId) return
    try {
      const res = await tasksApi.getById(taskId)
      if (res.data?.success) setTaskInfo(res.data.data)
    } catch { /* chat can still load */ }
  }, [taskId])

  const fetchMessages = useCallback(async () => {
    if (!taskId) return
    try {
      const res = await tasksApi.getMessages(taskId)
      if (res.data?.success) {
        const raw: ChatMessage[] = res.data.data || []
        const sanitized = raw.map(m => ({
          ...m,
          content: DOMPurify.sanitize(m.content, { ALLOWED_TAGS: [] }),
          senderName: DOMPurify.sanitize(m.senderName, { ALLOWED_TAGS: [] }),
        }))
        mergeMessages(sanitized)
        if (sanitized.some(m => !m.isCurrentUser && !m.isRead)) tasksApi.markMessagesRead(taskId).catch(() => {})
      }
    } catch {
      // polling retries
    } finally {
      setLoading(false)
    }
  }, [taskId, mergeMessages])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  useEffect(() => {
    if (!taskId) return
    const token = localStorage.getItem('token')
    if (!token) return

    const hubUrl = `${env.apiUrl.replace('/api/v1', '')}/api/v1/hubs/chat`
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token, skipNegotiation: true, transport: signalR.HttpTransportType.WebSockets })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    hub.on('ReceiveMessage', (msg: ChatMessage) => {
      mergeMessages([{
        ...msg,
        content: DOMPurify.sanitize(msg.content, { ALLOWED_TAGS: [] }),
        senderName: DOMPurify.sanitize(msg.senderName, { ALLOWED_TAGS: [] }),
        isCurrentUser: msg.senderId === user?.id,
      }])
    })

    hub.onreconnected(() => {
      setConnected(true)
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    })

    hub.onclose(() => {
      setConnected(false)
      if (!pollRef.current) pollRef.current = setInterval(fetchMessages, POLL_INTERVAL)
    })

    hub.start()
      .then(async () => {
        setConnected(true)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        await hub.invoke('JoinTaskChat', taskId)
      })
      .catch(() => {
        setConnected(false)
        if (!pollRef.current) pollRef.current = setInterval(fetchMessages, POLL_INTERVAL)
      })

    hubRef.current = hub
    return () => {
      hub.invoke('LeaveTaskChat', taskId).catch(() => {})
      hub.stop()
      hubRef.current = null
    }
  }, [taskId, user?.id, mergeMessages, fetchMessages])

  useEffect(() => {
    fetchMessages()
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [fetchMessages])

  useEffect(() => {
    if (taskId) markTaskNotificationsRead(taskId)
  }, [notifications, taskId, markTaskNotificationsRead])

  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom()
  }, [messages, scrollToBottom])

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop <= el.clientHeight + 60
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = newMessage.trim()
    if (!text || sending || !taskId || chatClosed) return

    const tempId = `temp-${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId, taskId, senderId: user?.id ?? 0,
      senderName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.name : 'You',
      content: DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }),
      timestamp: new Date().toISOString(), isRead: false, isCurrentUser: true,
    }

    knownIdsRef.current.add(tempId)
    setMessages(prev => [...prev, optimistic])
    setNewMessage('')
    setSending(true)
    isAtBottomRef.current = true
    scrollToBottom(true)

    try {
      const res = await tasksApi.sendMessage(taskId, text)
      if (res.data?.success === false) throw new Error(res.data.message || 'Unable to send message')
      await fetchMessages()
    } catch (err: any) {
      setMessages(prev => prev.filter(m => String(m.id) !== tempId))
      knownIdsRef.current.delete(tempId)
      setError(err?.message || 'Failed to send message. Please try again.')
      setTimeout(() => setError(''), 3500)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  let lastDate = ''
  return (
    <div className="chat-page">
      <header className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate('/messages')} aria-label="Back to messages">
          <i className="fas fa-arrow-left" />
        </button>
        <div className="chat-header-avatar">{initials(participantName)}</div>
        <div className="chat-header-info">
          <div className="chat-kicker">TASK CONVERSATION</div>
          <h1 className="chat-title">{taskTitle.length > 64 ? taskTitle.slice(0, 64) + '…' : taskTitle}</h1>
          <div className="chat-header-meta">
            <span>{participantName}</span>
            <span className={`chat-status-pill ${meta.tone}`}><span />{meta.label}</span>
            <span className="chat-live"><i className="fas fa-circle" /> {connected ? 'Live' : 'Syncing'}</span>
          </div>
        </div>
        <button className="chat-task-btn" onClick={() => navigate(`${taskInfo?.createdByUserId === user?.id ? '/tasks/my-posted' : ['claimed','in_progress'].includes(String(taskStatus).toLowerCase()) ? '/tasks/my-active' : '/tasks/my-completed'}?taskId=${encodeURIComponent(taskId || '')}`)} title="Open task">
          <i className="fas fa-arrow-up-right-from-square" />
          <span>Task</span>
        </button>
      </header>

      <div className="chat-context">
        <div><i className="fas fa-shield-halved" /><span>Keep communication on DoForYou</span></div>
        <span className="chat-context-id">{taskId}</span>
      </div>

      <div className="chat-body" ref={messagesContainerRef} onScroll={handleScroll}>
        {loading && (
          <div className="chat-loading"><span className="spinner spinner-sm" /><p>Loading conversation…</p></div>
        )}

        {!loading && messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon"><i className="fas fa-comments" /></div>
            <h2>Start the conversation</h2>
            <p>Coordinate the task here. Keep important details, timing and updates in this conversation.</p>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <div className="chat-message-stack">
            {messages.map(msg => {
              const currentDate = dateLabel(msg.timestamp)
              const showDate = currentDate !== lastDate
              lastDate = currentDate
              return (
                <div key={msg.id}>
                  {showDate && <div className="chat-date-separator"><span>{currentDate}</span></div>}
                  {msg.isSystem ? (
                    <div className="chat-inline-system">
                      <i className="fas fa-circle-info" />
                      <span>{msg.content}</span>
                      <time>{formatTime(msg.timestamp)}</time>
                    </div>
                  ) : (
                  <div className={`msg-row ${msg.isCurrentUser ? 'mine' : 'theirs'}`}>
                    {!msg.isCurrentUser && <div className="msg-avatar">{initials(msg.senderName)}</div>}
                    <div className="msg-bubble-wrap">
                      {!msg.isCurrentUser && <span className="msg-sender">{msg.senderName}</span>}
                      <div className={`msg-bubble ${msg.isCurrentUser ? 'bubble-mine' : 'bubble-theirs'} ${String(msg.id).startsWith('temp-') ? 'bubble-sending' : ''}`}>
                        <div className="msg-text">{msg.content}</div>
                        <div className="msg-meta"><span>{formatTime(msg.timestamp)}</span>{msg.isCurrentUser && <i className={`fas ${msg.isRead ? 'fa-check-double msg-read' : 'fa-check'}`} />}</div>
                      </div>
                    </div>
                    {msg.isCurrentUser && <div className="msg-avatar mine-avatar">{initials(msg.senderName)}</div>}
                  </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {taskStatus && (
          <div className={`chat-system-card ${meta.tone}`}>
            <div className="chat-system-icon"><i className={`fas ${chatClosed ? 'fa-lock' : 'fa-circle-check'}`} /></div>
            <div>
              <strong>{chatClosed ? 'Conversation closed' : meta.label}</strong>
              <p>
                {chatClosed
                  ? 'The task has been completed and paid. This conversation is read-only, but its history remains available.'
                  : normalizeStatus(taskStatus) === 'completed'
                    ? 'The runner marked the task complete. Review the work and confirm the task to release the payout.'
                    : 'This conversation is available for task coordination and updates.'}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <div className="chat-error"><i className="fas fa-circle-exclamation" /> {error}</div>}

      {chatClosed ? (
        <div className="chat-closed-footer">
          <i className="fas fa-lock" />
          <div><strong>Conversation closed</strong><span>You can still view the full history, but new messages are disabled.</span></div>
        </div>
      ) : (
        <form className="chat-footer" onSubmit={handleSend}>
          <div className="chat-input-wrap">
            <textarea
              className="chat-input"
              placeholder="Write a message…"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              maxLength={1000}
              rows={1}
              aria-label="Message"
            />
            <span className="chat-input-hint">Enter to send · Shift + Enter for a new line</span>
          </div>
          <button type="submit" className="chat-send-btn" disabled={!newMessage.trim() || sending} aria-label="Send message">
            {sending ? <span className="spinner spinner-sm" /> : <i className="fas fa-paper-plane" />}
          </button>
        </form>
      )}
    </div>
  )
}
