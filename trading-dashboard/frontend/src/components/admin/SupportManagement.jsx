import React, { useState, useEffect, useRef } from 'react'
import {
  MessageCircle,
  Send,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  User,
  Mail,
  Phone,
  RefreshCw,
  ChevronDown,
  Flag,
  Inbox
} from 'lucide-react'
import axios from 'axios'

const SupportManagement = () => {
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [statusFilter])

  useEffect(() => {
    scrollToBottom()
  }, [selectedTicket?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, ticketsRes] = await Promise.all([
        axios.get('/api/admin/support/stats', getAuthHeader()),
        axios.get(`/api/admin/support/tickets?status=${statusFilter}`, getAuthHeader())
      ])
      if (statsRes.data.success) setStats(statsRes.data.data)
      if (ticketsRes.data.success) setTickets(ticketsRes.data.data)
    } catch (err) {
      console.error('Failed to fetch support data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketDetails = async (ticketId) => {
    try {
      const res = await axios.get(`/api/admin/support/tickets/${ticketId}`, getAuthHeader())
      if (res.data.success) {
        setSelectedTicket(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch ticket:', err)
    }
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedTicket) return

    try {
      setSending(true)
      const res = await axios.post(`/api/admin/support/tickets/${selectedTicket._id}/reply`, {
        message: newMessage
      }, getAuthHeader())
      
      if (res.data.success) {
        setSelectedTicket(res.data.data)
        setNewMessage('')
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleUpdateStatus = async (ticketId, status) => {
    try {
      const res = await axios.put(`/api/admin/support/tickets/${ticketId}/status`, { status }, getAuthHeader())
      if (res.data.success) {
        setSelectedTicket(res.data.data)
        fetchData()
      }
    } catch (err) {
      alert('Failed to update status')
    }
  }

  const handleUpdatePriority = async (ticketId, priority) => {
    try {
      const res = await axios.put(`/api/admin/support/tickets/${ticketId}/priority`, { priority }, getAuthHeader())
      if (res.data.success) {
        setSelectedTicket(res.data.data)
        fetchData()
      }
    } catch (err) {
      alert('Failed to update priority')
    }
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'open': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Open' }
      case 'in_progress': return { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', label: 'In Progress' }
      case 'resolved': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Resolved' }
      case 'closed': return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', label: 'Closed' }
      default: return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', label: status }
    }
  }

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
      case 'high': return { bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }
      case 'medium': return { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }
      case 'low': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }
      default: return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
    }
  }

  const filteredTickets = tickets.filter(t =>
    t.ticketId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Open</p>
          <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{stats.open || 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>In Progress</p>
          <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{stats.inProgress || 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.15) 100%)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Resolved</p>
          <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{stats.resolved || 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.15) 0%, rgba(75, 85, 99, 0.15) 100%)', border: '1px solid rgba(107, 114, 128, 0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Closed</p>
          <p className="text-2xl font-bold" style={{ color: '#6b7280' }}>{stats.closed || 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Unread</p>
          <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{stats.unreadCount || 0}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Tickets List */}
        <div className="w-96 flex flex-col rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {/* Filters */}
          <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex gap-2">
              {['all', 'open', 'in_progress', 'resolved'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium capitalize"
                  style={{
                    backgroundColor: statusFilter === status ? 'var(--accent-blue)' : 'var(--bg-hover)',
                    color: statusFilter === status ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  {status === 'in_progress' ? 'Active' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>No tickets found</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const status = getStatusStyle(ticket.status)
                const priority = getPriorityStyle(ticket.priority)
                const hasUnread = ticket.lastMessageBy === 'user'
                return (
                  <button
                    key={ticket._id}
                    onClick={() => fetchTicketDetails(ticket._id)}
                    className="w-full p-4 text-left transition-all"
                    style={{
                      backgroundColor: selectedTicket?._id === ticket._id ? 'var(--bg-hover)' : 'transparent',
                      borderBottom: '1px solid var(--border-color)'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                        {ticket.subject}
                      </span>
                      {hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 ml-2 mt-1 animate-pulse"></span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: priority.bg, color: priority.color }}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {ticket.userId?.firstName} {ticket.userId?.lastName}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(ticket.lastMessageAt || ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedTicket.subject}</h3>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{selectedTicket.ticketId}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <User size={14} /> {selectedTicket.userId?.firstName} {selectedTicket.userId?.lastName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail size={14} /> {selectedTicket.userId?.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status Dropdown */}
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(selectedTicket._id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    {/* Priority Dropdown */}
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleUpdatePriority(selectedTicket._id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedTicket.messages?.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[70%] rounded-2xl p-4"
                      style={{
                        background: msg.sender === 'admin'
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                          : 'var(--bg-hover)',
                        border: msg.sender === 'user' ? '1px solid var(--border-color)' : 'none'
                      }}
                    >
                      <p className="text-sm" style={{ color: msg.sender === 'admin' ? '#fff' : 'var(--text-primary)' }}>
                        {msg.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs" style={{ color: msg.sender === 'admin' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                          {msg.senderName || (msg.sender === 'admin' ? 'You' : 'Customer')}
                        </span>
                        <span className="text-xs" style={{ color: msg.sender === 'admin' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={handleSendReply} className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 px-4 py-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="p-3 rounded-xl disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                    >
                      {sending ? <Loader2 size={20} className="animate-spin" style={{ color: '#fff' }} /> : <Send size={20} style={{ color: '#fff' }} />}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={64} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>Select a ticket to view conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SupportManagement
