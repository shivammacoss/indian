import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, MessageCircle, Plus, Loader2, Send, ChevronLeft, X } from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../../context/ThemeContext'

const MobileSupport = ({ onBack }) => {
  const { isDark } = useTheme()
  const bgPrimary = isDark ? '#000000' : '#f5f5f7'
  const bgCard = isDark ? '#0d0d0d' : '#ffffff'
  const bgSecondary = isDark ? '#1a1a1a' : '#f2f2f7'
  const borderColor = isDark ? '#1a1a1a' : '#e5e5ea'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? '#6b7280' : '#8e8e93'
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
    { value: 'general', label: 'General' },
    { value: 'deposit', label: 'Deposit' },
    { value: 'withdrawal', label: 'Withdrawal' },
    { value: 'trading', label: 'Trading' },
    { value: 'technical', label: 'Technical' }
  ]

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedTicket?.messages])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/support/tickets', getAuthHeader())
      if (res.data.success) setTickets(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketDetails = async (ticketId) => {
    try {
      const res = await axios.get(`/api/support/tickets/${ticketId}`, getAuthHeader())
      if (res.data.success) setSelectedTicket(res.data.data)
    } catch (err) {
      console.error('Failed to fetch ticket:', err)
    }
  }

  const handleCreateTicket = async () => {
    if (!newTicketForm.subject || !newTicketForm.message) return alert('Fill all fields')
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return
    try {
      setSending(true)
      const res = await axios.post(`/api/support/tickets/${selectedTicket._id}/messages`, { content: newMessage }, getAuthHeader())
      if (res.data.success) {
        setSelectedTicket(res.data.data)
        setNewMessage('')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#3b82f6'
      case 'in_progress': return '#fbbf24'
      case 'resolved': return '#22c55e'
      case 'closed': return '#6b7280'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgPrimary }}>
        <Loader2 className="animate-spin" size={24} color={textSecondary} />
      </div>
    )
  }

  // Ticket detail view
  if (selectedTicket) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: bgPrimary }}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: bgCard, borderBottom: `1px solid ${borderColor}` }}>
          <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-lg" style={{ backgroundColor: bgSecondary }}>
            <ChevronLeft size={18} color={textSecondary} />
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedTicket.subject}</p>
            <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: `${getStatusColor(selectedTicket.status)}20`, color: getStatusColor(selectedTicket.status) }}>
              {selectedTicket.status}
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedTicket.messages?.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%] p-3 rounded-xl" style={{ backgroundColor: msg.sender === 'user' ? '#3b82f6' : bgSecondary }}>
                <p className="text-sm" style={{ color: msg.sender === 'user' ? '#fff' : textPrimary }}>{msg.content}</p>
                <p className="text-xs mt-1" style={{ color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : textSecondary }}>
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
          <div className="p-4 flex gap-2" style={{ borderTop: `1px solid ${borderColor}` }}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-3 rounded-lg text-sm"
              style={{ backgroundColor: bgSecondary, color: textPrimary, border: `1px solid ${borderColor}` }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage} disabled={sending} className="p-3 rounded-lg" style={{ backgroundColor: '#22c55e' }}>
              {sending ? <Loader2 className="animate-spin" size={18} color="#000" /> : <Send size={18} color="#000" />}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: bgPrimary }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: bgCard, borderBottom: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
            <ArrowLeft size={18} color="#9ca3af" />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: '#fff' }}>Support</h1>
        </div>
        <button onClick={() => setShowNewTicket(true)} className="p-2 rounded-lg" style={{ backgroundColor: '#22c55e' }}>
          <Plus size={18} color="#000" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tickets.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle size={32} color={textSecondary} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: textSecondary }}>No support tickets</p>
          </div>
        ) : tickets.map(ticket => (
          <button
            key={ticket._id}
            onClick={() => fetchTicketDetails(ticket._id)}
            className="w-full p-3 rounded-xl mb-2 text-left"
            style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium" style={{ color: textPrimary }}>{ticket.subject}</p>
              <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: `${getStatusColor(ticket.status)}20`, color: getStatusColor(ticket.status) }}>
                {ticket.status}
              </span>
            </div>
            <p className="text-xs" style={{ color: textSecondary }}>{ticket.category} • {new Date(ticket.createdAt).toLocaleDateString()}</p>
          </button>
        ))}
      </div>

      {showNewTicket && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full p-4 rounded-t-2xl" style={{ backgroundColor: isDark ? '#1c1c1e' : '#fff' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: textPrimary }}>New Ticket</h3>
              <button onClick={() => setShowNewTicket(false)} className="p-2 rounded-lg" style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }}>
                <X size={18} color={textSecondary} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Subject"
              value={newTicketForm.subject}
              onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
              className="w-full p-3 rounded-lg mb-3 text-sm"
              style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', color: textPrimary, border: `1px solid ${borderColor}` }}
            />
            <select
              value={newTicketForm.category}
              onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
              className="w-full p-3 rounded-lg mb-3 text-sm"
              style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', color: textPrimary, border: `1px solid ${borderColor}` }}
            >
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <textarea
              placeholder="Describe your issue..."
              value={newTicketForm.message}
              onChange={(e) => setNewTicketForm({ ...newTicketForm, message: e.target.value })}
              rows={4}
              className="w-full p-3 rounded-lg mb-3 text-sm"
              style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', color: textPrimary, border: `1px solid ${borderColor}` }}
            />
            <button
              onClick={handleCreateTicket}
              disabled={sending}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
              style={{ backgroundColor: '#22c55e', color: '#000' }}
            >
              {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Submit Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileSupport
