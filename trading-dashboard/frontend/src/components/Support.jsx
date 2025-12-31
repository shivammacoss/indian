import React, { useState, useEffect, useRef } from 'react'
import {
  MessageCircle,
  Send,
  Plus,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Paperclip,
  Star,
  HelpCircle,
  Headphones
} from 'lucide-react'
import axios from 'axios'

const Support = () => {
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)
  
  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    message: ''
  })

  const categories = [
    { value: 'general', label: 'General Inquiry', icon: '💬' },
    { value: 'deposit', label: 'Deposit Issue', icon: '💰' },
    { value: 'withdrawal', label: 'Withdrawal Issue', icon: '💸' },
    { value: 'trading', label: 'Trading Help', icon: '📈' },
    { value: 'technical', label: 'Technical Problem', icon: '🔧' },
    { value: 'kyc', label: 'KYC/Verification', icon: '📋' },
    { value: 'other', label: 'Other', icon: '❓' }
  ]

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [selectedTicket?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/support/tickets', getAuthHeader())
      if (res.data.success) {
        setTickets(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketDetails = async (ticketId) => {
    try {
      const res = await axios.get(`/api/support/tickets/${ticketId}`, getAuthHeader())
      if (res.data.success) {
        setSelectedTicket(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch ticket:', err)
    }
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!newTicketForm.subject || !newTicketForm.message) return

    try {
      setSending(true)
      const res = await axios.post('/api/support/tickets', newTicketForm, getAuthHeader())
      if (res.data.success) {
        setTickets([res.data.data, ...tickets])
        setSelectedTicket(res.data.data)
        setShowNewTicket(false)
        setNewTicketForm({ subject: '', category: 'general', priority: 'medium', message: '' })
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create ticket')
    } finally {
      setSending(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedTicket) return

    try {
      setSending(true)
      const res = await axios.post(`/api/support/tickets/${selectedTicket._id}/message`, {
        message: newMessage
      }, getAuthHeader())
      
      if (res.data.success) {
        setSelectedTicket(res.data.data)
        setNewMessage('')
        fetchTickets() // Refresh ticket list
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Tickets List */}
      <div className="w-80 flex flex-col" style={{ borderRight: '1px solid var(--border-color)' }}>
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Headphones size={24} style={{ color: '#3b82f6' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Support</h2>
            </div>
            <button
              onClick={() => setShowNewTicket(true)}
              className="p-2 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
            >
              <Plus size={20} style={{ color: '#fff' }} />
            </button>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Tickets */}
        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="p-8 text-center">
              <HelpCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No tickets yet</p>
              <button
                onClick={() => setShowNewTicket(true)}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: '#fff' }}
              >
                Create New Ticket
              </button>
            </div>
          ) : (
            tickets.map((ticket) => {
              const status = getStatusStyle(ticket.status)
              const hasUnread = ticket.lastMessageBy === 'admin'
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
                      <span className="w-2 h-2 rounded-full bg-blue-500 ml-2 mt-1"></span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{ticket.ticketId}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(ticket.lastMessageAt || ticket.createdAt).toLocaleDateString()}
                  </p>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <>
            {/* Chat Header */}
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedTicket.subject}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ ...getStatusStyle(selectedTicket.status) }}>
                    {getStatusStyle(selectedTicket.status).label}
                  </span>
                  <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                    {categories.find(c => c.value === selectedTicket.category)?.icon} {selectedTicket.category}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-2">
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedTicket.messages?.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[70%] rounded-2xl p-4"
                    style={{
                      background: msg.sender === 'user'
                        ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                        : 'var(--bg-card)',
                      border: msg.sender === 'admin' ? '1px solid var(--border-color)' : 'none'
                    }}
                  >
                    <p className="text-sm" style={{ color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)' }}>
                      {msg.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs" style={{ color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                        {msg.senderName || (msg.sender === 'admin' ? 'Support Team' : 'You')}
                      </span>
                      <span className="text-xs" style={{ color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedTicket.status !== 'closed' && (
              <form onSubmit={handleSendMessage} className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="p-3 rounded-xl disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
                  >
                    {sending ? <Loader2 size={20} className="animate-spin" style={{ color: '#fff' }} /> : <Send size={20} style={{ color: '#fff' }} />}
                  </button>
                </div>
              </form>
            )}

            {selectedTicket.status === 'closed' && (
              <div className="p-4 text-center" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>This ticket is closed</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Select a ticket or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>New Support Ticket</h3>
              <button onClick={() => setShowNewTicket(false)}>
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Subject</label>
                <input
                  type="text"
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  required
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setNewTicketForm({ ...newTicketForm, category: cat.value })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                      style={{
                        backgroundColor: newTicketForm.category === cat.value ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-hover)',
                        border: newTicketForm.category === cat.value ? '2px solid #3b82f6' : '2px solid transparent',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <span>{cat.icon}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Message</label>
                <textarea
                  value={newTicketForm.message}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, message: e.target.value })}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  required
                  className="w-full px-4 py-3 rounded-xl resize-none"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-xl font-medium text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
              >
                {sending ? 'Creating...' : 'Create Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Support
