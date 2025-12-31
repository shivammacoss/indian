import React, { useState, useEffect } from 'react'
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  FileText,
  Loader2,
  ChevronDown
} from 'lucide-react'
import axios from 'axios'

const Orders = () => {
  const [activeTab, setActiveTab] = useState('open')
  const [trades, setTrades] = useState([])
  const [tradingAccounts, setTradingAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('all')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchData(true)
    // Auto-refresh every 5 seconds (silently)
    const interval = setInterval(() => fetchData(false), 5000)
    return () => clearInterval(interval)
  }, [activeTab])

  const fetchData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      
      // Fetch trades and trading accounts in parallel
      const [tradesRes, accountsRes] = await Promise.all([
        axios.get('/api/trades?limit=200&allAccounts=true', getAuthHeader()),
        axios.get('/api/trading-accounts', getAuthHeader())
      ])
      
      if (tradesRes.data.success) {
        const tradesData = tradesRes.data.data?.trades || tradesRes.data.data || []
        setTrades(tradesData)
      }
      
      if (accountsRes.data.success) {
        setTradingAccounts(accountsRes.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const getFilteredTrades = () => {
    let filtered = trades

    // Filter by trading account
    if (selectedAccountId !== 'all') {
      filtered = filtered.filter(t => t.tradingAccountId === selectedAccountId || t.tradingAccountId?._id === selectedAccountId)
    }

    // Filter by tab
    if (activeTab === 'open') {
      filtered = filtered.filter(t => t.status === 'open')
    } else if (activeTab === 'pending') {
      filtered = filtered.filter(t => t.status === 'pending')
    } else if (activeTab === 'history') {
      filtered = filtered.filter(t => t.status === 'closed' || t.status === 'cancelled')
    }

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t._id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by date
    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.createdAt) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.createdAt) <= new Date(dateTo + 'T23:59:59'))
    }

    return filtered
  }

  // Helper to get account number from trade
  const getAccountNumber = (trade) => {
    if (trade.tradingAccountId?.accountNumber) return trade.tradingAccountId.accountNumber
    const account = tradingAccounts.find(a => a._id === trade.tradingAccountId)
    return account?.accountNumber || 'N/A'
  }

  const downloadStatement = (format) => {
    const filtered = getFilteredTrades()
    
    if (format === 'csv') {
      const headers = ['Date', 'Symbol', 'Type', 'Side', 'Lots', 'Entry', 'Exit', 'P&L', 'Status']
      const rows = filtered.map(t => [
        new Date(t.createdAt).toLocaleString(),
        t.symbol,
        t.orderType,
        t.side,
        t.lots || t.amount,
        t.entryPrice,
        t.exitPrice || '-',
        t.profit?.toFixed(2) || '0.00',
        t.status
      ])
      
      const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hcfinvest_statement_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } else if (format === 'pdf') {
      alert('PDF download feature coming soon!')
    }
    
    setShowDownloadMenu(false)
  }

  const filteredTrades = getFilteredTrades()
  const openCount = trades.filter(t => t.status === 'open').length
  const pendingCount = trades.filter(t => t.status === 'pending').length
  const historyCount = trades.filter(t => t.status === 'closed' || t.status === 'cancelled').length

  const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.profit || 0), 0)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Orders & History</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your trades and download statements</p>
        </div>
        <button onClick={() => fetchData(true)} className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
          <RefreshCw size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Open Orders</p>
          <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{openCount}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending Orders</p>
          <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{pendingCount}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Closed Orders</p>
          <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>{historyCount}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: totalPnL >= 0 ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.15) 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)', border: `1px solid ${totalPnL >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total P&L</p>
          <p className="text-2xl font-bold" style={{ color: totalPnL >= 0 ? '#22c55e' : '#ef4444' }}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('open')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
            style={{ 
              background: activeTab === 'open' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'var(--bg-card)', 
              color: activeTab === 'open' ? '#fff' : 'var(--text-secondary)' 
            }}
          >
            <Clock size={16} /> Open ({openCount})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
            style={{ 
              background: activeTab === 'pending' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 'var(--bg-card)', 
              color: activeTab === 'pending' ? '#000' : 'var(--text-secondary)' 
            }}
          >
            <Clock size={16} /> Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
            style={{ 
              background: activeTab === 'history' ? 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' : 'var(--bg-card)', 
              color: activeTab === 'history' ? '#fff' : 'var(--text-secondary)' 
            }}
          >
            <CheckCircle size={16} /> History ({historyCount})
          </button>
        </div>

        {/* Download Button */}
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium"
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#fff' }}
          >
            <Download size={16} /> Download Statement <ChevronDown size={14} />
          </button>
          {showDownloadMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg z-10" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <button onClick={() => downloadStatement('csv')} className="w-full px-4 py-3 text-left text-sm hover:bg-opacity-80 rounded-t-xl" style={{ color: 'var(--text-primary)' }}>
                <FileText size={14} className="inline mr-2" /> CSV Statement
              </button>
              <button onClick={() => downloadStatement('pdf')} className="w-full px-4 py-3 text-left text-sm hover:bg-opacity-80 rounded-b-xl" style={{ color: 'var(--text-primary)' }}>
                <FileText size={14} className="inline mr-2" /> PDF Ledger
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        {/* Account Filter */}
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        >
          <option value="all">All Accounts</option>
          {tradingAccounts.map(acc => (
            <option key={acc._id} value={acc._id}>
              {acc.accountNumber} {acc.isDemo ? '(Demo)' : '(Live)'}
            </option>
          ))}
        </select>

        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by symbol or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {filteredTrades.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No {activeTab} orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Date/Time</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Account</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Symbol</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Side</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Lots</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Entry</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SL/TP</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>P&L</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => (
                  <tr key={trade._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(trade.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                        {getAccountNumber(trade)}
                      </span>
                      {trade.isCopiedTrade && (
                        <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Copy</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{trade.symbol}</span>
                    </td>
                    <td className="py-4 px-4 text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{trade.orderType}</td>
                    <td className="py-4 px-4">
                      <span className={`flex items-center gap-1 text-sm font-medium ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.side === 'buy' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {trade.side?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{trade.lots || trade.amount}</td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{trade.entryPrice?.toFixed(5)}</td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {trade.stopLoss ? `SL: ${trade.stopLoss}` : '-'} / {trade.takeProfit ? `TP: ${trade.takeProfit}` : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-sm font-bold ${(trade.profit || 0) >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                        {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        trade.status === 'open' ? 'bg-blue-500/10 text-blue-500' :
                        trade.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                        trade.status === 'closed' ? 'bg-green-500/10 text-green-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Orders
