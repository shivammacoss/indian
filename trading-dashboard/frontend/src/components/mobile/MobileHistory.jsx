import React, { useState, useEffect } from 'react'
import { Loader2, TrendingUp, TrendingDown, Calendar, X } from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../../context/ThemeContext'

const MobileHistory = () => {
  const { isDark } = useTheme()
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, profit, loss
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateLabel, setDateLabel] = useState('All Time')

  // Get decimals based on symbol (matching instrument settings)
  const getDecimals = (symbol) => {
    if (!symbol) return 5
    if (symbol.includes('JPY')) return 3
    if (symbol.includes('BTC')) return 2
    if (symbol.includes('ETH')) return 2
    if (symbol.includes('XAU')) return 2
    if (symbol.includes('XAG')) return 3
    if (symbol.includes('US30') || symbol.includes('US500') || symbol.includes('US100') || symbol.includes('DE30') || symbol.includes('UK100')) return 1
    if (symbol.includes('JP225')) return 0
    if (symbol.includes('OIL')) return 2
    if (symbol.includes('XNG')) return 3
    if (symbol.includes('LTC') || symbol.includes('XRP') || symbol.includes('DOGE') || symbol.includes('SOL')) return 4
    return 5
  }

  const formatPrice = (price, symbol) => {
    if (!price) return '---'
    return parseFloat(price.toFixed(getDecimals(symbol))).toString()
  }

  const applyDateRange = () => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      setDateLabel(`${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
    } else if (startDate) {
      setDateLabel(`From ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
    } else if (endDate) {
      setDateLabel(`Until ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
    } else {
      setDateLabel('All Time')
    }
    setShowDatePicker(false)
  }

  const clearDateFilter = () => {
    setStartDate('')
    setEndDate('')
    setDateLabel('All Time')
    setShowDatePicker(false)
  }

  useEffect(() => {
    fetchTrades()
  }, [])

  const fetchTrades = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await axios.get('/api/trades?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        const tradesData = res.data.data?.trades || res.data.data || []
        // Filter only closed trades
        const closedTrades = tradesData.filter(t => t.status === 'closed')
        setTrades(closedTrades)
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTrades = trades.filter(trade => {
    // Date range filter
    const tradeDate = new Date(trade.closedAt || trade.updatedAt)
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      if (tradeDate < start) return false
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (tradeDate > end) return false
    }
    // Profit/Loss filter
    if (filter === 'profit') return (trade.profit || 0) >= 0
    if (filter === 'loss') return (trade.profit || 0) < 0
    return true
  })

  const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
  const winningTrades = filteredTrades.filter(t => (t.profit || 0) > 0).length
  const losingTrades = filteredTrades.filter(t => (t.profit || 0) < 0).length
  const winRate = filteredTrades.length > 0 ? ((winningTrades / filteredTrades.length) * 100).toFixed(1) : 0

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: isDark ? '#000' : '#f5f5f7' }}>
        <Loader2 className="animate-spin" size={24} color={isDark ? '#6b7280' : '#8e8e93'} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: isDark ? '#000' : '#f5f5f7' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#fff' : '#000' }}>Trade History</h1>
          <button
            onClick={() => setShowDatePicker(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: isDark ? '#1a1a1a' : '#e5e5ea', color: isDark ? '#fff' : '#000' }}
          >
            <Calendar size={16} color="#3b82f6" />
            <span>{dateLabel}</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: isDark ? '#1a1a1a' : '#fff', border: isDark ? 'none' : '1px solid #e5e5ea' }}>
            <div className="text-xs mb-1" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Total P/L</div>
            <div className="text-lg font-bold" style={{ color: totalPnL >= 0 ? '#22c55e' : '#ef4444' }}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: isDark ? '#1a1a1a' : '#fff', border: isDark ? 'none' : '1px solid #e5e5ea' }}>
            <div className="text-xs mb-1" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Win Rate</div>
            <div className="text-lg font-bold" style={{ color: isDark ? '#fff' : '#000' }}>{winRate}%</div>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: isDark ? '#1a1a1a' : '#fff', border: isDark ? 'none' : '1px solid #e5e5ea' }}>
            <div className="text-xs mb-1" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Trades</div>
            <div className="text-lg font-bold" style={{ color: isDark ? '#fff' : '#000' }}>{filteredTrades.length}</div>
          </div>
        </div>

        {/* Profit/Loss Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'profit', label: 'Profit' },
            { id: 'loss', label: 'Loss' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: filter === f.id ? (f.id === 'profit' ? '#22c55e' : f.id === 'loss' ? '#ef4444' : '#3b82f6') : (isDark ? '#1a1a1a' : '#e5e5ea'),
                color: filter === f.id ? '#fff' : (isDark ? '#9ca3af' : '#6b7280')
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto px-4">
        {filteredTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>
            <Calendar size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No trade history</p>
          </div>
        ) : (
          filteredTrades.map(trade => (
            <div 
              key={trade._id}
              className="py-3"
              style={{ borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: trade.type === 'buy' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}
                  >
                    {trade.type === 'buy' ? 
                      <TrendingUp size={14} color="#22c55e" /> : 
                      <TrendingDown size={14} color="#ef4444" />
                    }
                  </span>
                  <span className="font-semibold" style={{ color: isDark ? '#fff' : '#000' }}>{trade.symbol}</span>
                  <span 
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ 
                      backgroundColor: trade.type === 'buy' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      color: trade.type === 'buy' ? '#22c55e' : '#ef4444'
                    }}
                  >
                    {trade.type?.toUpperCase()}
                  </span>
                </div>
                <span className="font-bold" style={{ color: (trade.profit || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                  {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>
                <span>{trade.amount} lots • {formatPrice(trade.price, trade.symbol)} → {formatPrice(trade.closePrice, trade.symbol)}</span>
                <span>{formatDate(trade.closedAt || trade.updatedAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full p-4 rounded-t-2xl" style={{ backgroundColor: isDark ? '#1c1c1e' : '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: isDark ? '#fff' : '#000' }}>Select Date Range</h3>
              <button onClick={() => setShowDatePicker(false)}>
                <X size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 rounded-lg"
                  style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#3a3a3c' : '#e5e5ea'}` }}
                />
              </div>
              
              <div>
                <label className="text-xs mb-1 block" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 rounded-lg"
                  style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#3a3a3c' : '#e5e5ea'}` }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearDateFilter}
                  className="flex-1 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea', color: isDark ? '#fff' : '#000' }}
                >
                  Clear
                </button>
                <button
                  onClick={applyDateRange}
                  className="flex-1 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: '#3b82f6', color: '#fff' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileHistory
