import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import DOMPurify from 'dompurify'
import { tasksApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import type { ChatMessage } from '../../types'
import env from '../../env'
import './TaskChat.css'

const POLL_INTERVAL = 5000

export default function TaskChat() {
  const { taskId } = useParams<{ taskId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const taskTitle = searchParams.get('title') || 'Task Chat'

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const hubRef = useRef<signalR.HubConnection | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isAtBottomRef = useRef(true)
  const knownIdsRef = useRef<Set<string | number>>(new Set())

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    const toAdd = incoming.filter(msg => !knownIdsRef.current.has(String(msg.id)))
    if (toAdd.length === 0) return
    toAdd.forEach(msg => knownIdsRef.current.add(String(msg.id)))
    const normalized = toAdd.map(msg => ({ ...msg, id: String(msg.id) }))
    setMessages(prev =>
      [...prev, ...normalized].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    )
  }, [])

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
        // Mark unread messages as read
        if (sanitized.some(m => !m.isCurrentUser && !m.isRead)) {
          tasksApi.markMessagesRead(taskId).catch(() => {})
        }
      }
    } catch {
      // silent — polling will retry
    } finally {
      setLoading(false)
    }
  }, [taskId, mergeMessages])

  // SignalR setup
  useEffect(() => {
    if (!taskId) return
    const token = localStorage.getItem('token')
    if (!token) return

    const hubUrl = `${env.apiUrl.replace('/api/v1', '')}/api/v1/hubs/chat`

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    hub.on('ReceiveMessage', (msg: ChatMessage) => {
      const sanitized = {
        ...msg,
        content: DOMPurify.sanitize(msg.content, { ALLOWED_TAGS: [] }),
        senderName: DOMPurify.sanitize(msg.senderName, { ALLOWED_TAGS: [] }),
        isCurrentUser: msg.senderId === user?.id,
      }
      mergeMessages([sanitized])
    })

    hub.onreconnected(() => {
      setConnected(true)
      // Stop polling — SignalR is back
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    })

    hub.onclose(() => {
      setConnected(false)
      // Start polling as fallback
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchMessages, POLL_INTERVAL)
      }
    })

    hub.start()
      .then(async () => {
        setConnected(true)
        // Connected — stop polling
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        await hub.invoke('JoinTaskChat', parseInt(taskId.replace(/\D/g, '') || '0'))
      })
      .catch(() => {
        setConnected(false)
        // SignalR failed — keep polling
      })

    hubRef.current = hub

    return () => {
      hub.invoke('LeaveTaskChat', parseInt(taskId.replace(/\D/g, '') || '0')).catch(() => {})
      hub.stop()
      hubRef.current = null
    }
  }, [taskId, user?.id, mergeMessages, fetchMessages])

  // Initial fetch + polling (polling stops if SignalR connects)
  useEffect(() => {
    fetchMessages()
    // Start polling — will be cleared if SignalR connects
    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL)
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [fetchMessages])

  // Scroll to bottom when messages load or new ones arrive
  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom()
  }, [messages, scrollToBottom])

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop <= el.clientHeight + 60
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newMessage.trim()
    if (!text || sending || !taskId) return

    const tempId = `temp-${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId,
      taskId,
      senderId: user?.id ?? 0,
      senderName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.name : 'You',
      content: DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }),
      timestamp: new Date().toISOString(),
      isRead: false,
      isCurrentUser: true,
    }

    knownIdsRef.current.add(tempId)
    setMessages(prev => [...prev, optimistic])
    setNewMessage('')
    setSending(true)
    isAtBottomRef.current = true
    scrollToBottom(true)

    try {
      await tasksApi.sendMessage(taskId, text)
      // Fetch real messages and replace the optimistic one
      const res = await tasksApi.getMessages(taskId)
      if (res.data?.success) {
        const incoming: ChatMessage[] = (res.data.data || []).map((m: ChatMessage) => ({
          ...m,
          id: String(m.id),
          content: DOMPurify.sanitize(m.content, { ALLOWED_TAGS: [] }),
          senderName: DOMPurify.sanitize(m.senderName, { ALLOWED_TAGS: [] }),
        }))
        // Add any ids we don't know yet
        incoming.forEach(m => knownIdsRef.current.add(String(m.id)))
        // Replace optimistic with full server list (removes temp)
        setMessages(incoming.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()))
        knownIdsRef.current.delete(tempId)
      }
    } catch {
      // Roll back optimistic message on failure
      setMessages(prev => prev.filter(m => String(m.id) !== tempId))
      knownIdsRef.current.delete(tempId)
      setError('Failed to send message. Please try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (ts: string) => {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffHours < 24) return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    if (diffHours < 48) return `Yesterday ${date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase() || '?'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <i className="fas fa-arrow-left" />
        </button>
        <div className="chat-header-info">
          <h2 className="chat-title">{taskTitle.length > 50 ? taskTitle.substring(0, 50) + '…' : taskTitle}</h2>
          <span className={`chat-status ${connected ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {connected ? 'Live' : 'Polling'}
          </span>
        </div>
      </div>

      <div className="chat-body" ref={messagesContainerRef} onScroll={handleScroll}>
        {loading && (
          <div className="chat-loading">
            <span className="spinner spinner-sm" />
            <p>Loading messages…</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="chat-empty">
            <span className="chat-empty-icon">💬</span>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`msg-row ${msg.isCurrentUser ? 'mine' : 'theirs'}`}>
            {!msg.isCurrentUser && (
              <div className="msg-avatar">{getInitials(msg.senderName)}</div>
            )}
            <div className="msg-bubble-wrap">
              {!msg.isCurrentUser && (
                <span className="msg-sender">{msg.senderName}</span>
              )}
              <div className={`msg-bubble ${msg.isCurrentUser ? 'bubble-mine' : 'bubble-theirs'} ${String(msg.id).startsWith('temp-') ? 'bubble-sending' : ''}`}>
                <span className="msg-text">{msg.content}</span>
                <span className="msg-time">{formatTime(msg.timestamp)}</span>
                {msg.isCurrentUser && (
                  <i className={`fas ${msg.isRead ? 'fa-check-double msg-read' : 'fa-check'} msg-tick`} />
                )}
              </div>
            </div>
            {msg.isCurrentUser && (
              <div className="msg-avatar mine-avatar">{getInitials(msg.senderName)}</div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          <i className="fas fa-exclamation-circle" /> {error}
        </div>
      )}

      <form className="chat-footer" onSubmit={handleSend}>
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message…"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          autoComplete="off"
          maxLength={1000}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!newMessage.trim() || sending}
          aria-label="Send message"
        >
          {sending
            ? <span className="spinner spinner-sm" />
            : <i className="fas fa-paper-plane" />}
        </button>
      </form>
    </div>
  )
}
