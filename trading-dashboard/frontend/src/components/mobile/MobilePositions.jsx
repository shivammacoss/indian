import React, { useState, useEffect } from 'react'
import { Loader2, X, TrendingUp, TrendingDown, Edit2 } from 'lucide-react'
import axios from 'axios'
import { io } from 'socket.io-client'
import { useTheme } from '../../context/ThemeContext'

const MobilePositions = () => {
  const { isDark } = useTheme()
  const bgPrimary = isDark ? '#000' : '#f5f5f7'
  const bgCard = isDark ? '#0a0a0a' : '#ffffff'
  const bgSecondary = isDark ? '#1a1a1a' : '#f2f2f7'
  const borderColor = isDark ? '#1a1a1a' : '#e5e5ea'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? 'gray-500' : '#8e8e93'

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
  const [activeTab, setActiveTab] = useState('positions')
  const [trades, setTrades] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [showCloseDialog, setShowCloseDialog] = useState(null)
  const [closingTrade, setClosingTrade] = useState(null)
  const [modifyingTrade, setModifyingTrade] = useState(null)
  const [modifyForm, setModifyForm] = useState({ stopLoss: '', takeProfit: '' })
  const [expandedTrade, setExpandedTrade] = useState(null)
  const [accountStats, setAccountStats] = useState({
    balance: 0,
    equity: 0,
    usedMargin: 0,
    freeMargin: 0,
    marginLevel: 0
  })

  useEffect(() => {
    fetchTrades()
    fetchPrices()
    fetchAccountStats()
    
    // Set up socket for instant trade updates
    const token = localStorage.getItem('token')
    let socket = null
    
    if (token) {
      socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', { auth: { token } })
      
      socket.on('connect', () => {
        console.log('[MobilePositions] Socket connected')
      })
      
      // Instant copy trade updates
      socket.on('trade_copied', (data) => {
        console.log('[MobilePositions] Copy trade received:', data)
        fetchTrades()
        fetchAccountStats()
      })
      socket.on('trade_modified', (data) => {
        console.log('[MobilePositions] Trade modified:', data)
        fetchTrades()
      })
      socket.on('trade_closed', (data) => {
        console.log('[MobilePositions] Trade closed:', data)
        fetchTrades()
        fetchAccountStats()
      })
      socket.on('balanceUpdate', () => {
        fetchAccountStats()
      })
      socket.on('orderPlaced', () => {
        fetchTrades()
        fetchAccountStats()
      })
      socket.on('tradeClosed', () => {
        fetchTrades()
        fetchAccountStats()
      })
    }
    
    // Auto-refresh trades every 2 seconds (backup polling)
    const tradeInterval = setInterval(fetchTrades, 2000)
    // Auto-refresh prices every 1 second for live P&L
    const priceInterval = setInterval(fetchPrices, 1000)
    // Refresh account stats every 2 seconds
    const statsInterval = setInterval(fetchAccountStats, 2000)
    
    // Listen for trade events
    const handleTradeEvent = () => {
      fetchTrades()
      fetchAccountStats()
    }
    window.addEventListener('tradeCreated', handleTradeEvent)
    window.addEventListener('tradeClosed', handleTradeEvent)
    
    return () => {
      if (socket) socket.disconnect()
      clearInterval(tradeInterval)
      clearInterval(priceInterval)
      clearInterval(statsInterval)
      window.removeEventListener('tradeCreated', handleTradeEvent)
      window.removeEventListener('tradeClosed', handleTradeEvent)
    }
  }, [])

  const fetchTrades = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await axios.get('/api/trades?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        const tradesData = res.data.data?.trades || res.data.data || []
        setTrades(tradesData)
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPrices = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/trades/prices', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setPrices(res.data.data || {})
      }
    } catch (err) {}
  }

  const fetchAccountStats = async () => {
    const token = localStorage.getItem('token')
    const activeAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || '{}')
    if (!token || !activeAccount._id) return
    
    try {
      const res = await axios.get(`/api/trading-accounts/${activeAccount._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        const acc = res.data.data
        setAccountStats({
          balance: acc.balance || 0,
          equity: acc.equity || acc.balance || 0,
          usedMargin: acc.usedMargin || 0,
          freeMargin: acc.freeMargin || acc.balance || 0,
          marginLevel: acc.marginLevel || 0
        })
      }
    } catch (err) {
      // Fallback to user balance if trading account fails
      try {
        const userRes = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (userRes.data.success) {
          const balance = userRes.data.data.balance || 0
          setAccountStats({
            balance,
            equity: balance,
            usedMargin: 0,
            freeMargin: balance,
            marginLevel: 0
          })
        }
      } catch (e) {}
    }
  }

  const closeTrade = async (tradeId) => {
    const token = localStorage.getItem('token')
    setClosingTrade(tradeId)
    try {
      const res = await axios.put(`/api/trades/${tradeId}/close`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        window.dispatchEvent(new Event('tradeClosed'))
        fetchTrades()
        setShowCloseDialog(null)
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close trade')
    } finally {
      setClosingTrade(null)
    }
  }

  const closeAllTrades = async () => {
    const token = localStorage.getItem('token')
    setClosingTrade('all')
    for (const trade of openTrades) {
      try {
        await axios.put(`/api/trades/${trade._id}/close`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (err) {}
    }
    window.dispatchEvent(new Event('tradeClosed'))
    fetchTrades()
    setShowCloseDialog(null)
    setClosingTrade(null)
  }

  const closeProfitTrades = async () => {
    const token = localStorage.getItem('token')
    setClosingTrade('profit')
    const profitTrades = openTrades.filter(t => calculatePnL(t) > 0)
    for (const trade of profitTrades) {
      try {
        await axios.put(`/api/trades/${trade._id}/close`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (err) {}
    }
    window.dispatchEvent(new Event('tradeClosed'))
    fetchTrades()
    setShowCloseDialog(null)
    setClosingTrade(null)
  }

  const closeLossTrades = async () => {
    const token = localStorage.getItem('token')
    setClosingTrade('loss')
    const lossTrades = openTrades.filter(t => calculatePnL(t) < 0)
    for (const trade of lossTrades) {
      try {
        await axios.put(`/api/trades/${trade._id}/close`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (err) {}
    }
    window.dispatchEvent(new Event('tradeClosed'))
    fetchTrades()
    setShowCloseDialog(null)
    setClosingTrade(null)
  }

  const modifyTrade = async (tradeId) => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.put(`/api/trades/${tradeId}/modify`, {
        stopLoss: modifyForm.stopLoss ? parseFloat(modifyForm.stopLoss) : null,
        takeProfit: modifyForm.takeProfit ? parseFloat(modifyForm.takeProfit) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setModifyingTrade(null)
        setModifyForm({ stopLoss: '', takeProfit: '' })
        fetchTrades()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to modify trade')
    }
  }

  const openModifyDialog = (trade) => {
    setModifyForm({
      stopLoss: trade.stopLoss?.toString() || '',
      takeProfit: trade.takeProfit?.toString() || ''
    })
    setModifyingTrade(trade)
  }

  // Calculate live P&L for a trade
  const calculatePnL = (trade) => {
    const currentPrice = prices[trade.symbol]
    if (!currentPrice) return trade.profit || 0
    
    const openPrice = trade.price || 0
    const closePrice = trade.type === 'buy' ? currentPrice.bid : currentPrice.ask
    
    // Get contract size based on symbol
    let contractSize = 100000 // Forex default
    if (trade.symbol?.includes('XAU')) contractSize = 100
    else if (trade.symbol?.includes('XAG')) contractSize = 5000
    else if (trade.symbol?.includes('BTC') || trade.symbol?.includes('ETH')) contractSize = 1
    
    const priceDiff = trade.type === 'buy' 
      ? (closePrice - openPrice) 
      : (openPrice - closePrice)
    
    const pnl = priceDiff * trade.amount * contractSize
    return pnl
  }

  const openTrades = trades.filter(t => t.status === 'open')
  const pendingTrades = trades.filter(t => t.status === 'pending')

  // Calculate total P&L for open positions
  const totalPnL = openTrades.reduce((sum, trade) => sum + calculatePnL(trade), 0)

  const tabs = [
    { id: 'positions', label: 'Positions', count: openTrades.length },
    { id: 'pending', label: 'Pending', count: pendingTrades.length },
  ]

  const getDisplayTrades = () => {
    switch (activeTab) {
      case 'positions': return openTrades
      case 'pending': return pendingTrades
      default: return openTrades
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgPrimary }}>
        <Loader2 className="animate-spin" size={24} color={textSecondary} />
      </div>
    )
  }

  // Calculate equity with floating P&L
  const floatingPnL = totalPnL
  const liveEquity = accountStats.balance + floatingPnL
  const liveUsedMargin = accountStats.usedMargin
  const liveFreeMargin = liveEquity - liveUsedMargin
  const liveMarginLevel = liveUsedMargin > 0 ? (liveEquity / liveUsedMargin) * 100 : 0

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: isDark ? '#000' : '#f5f5f7' }}>
      {/* Account Stats - Line by Line like MT5 */}
      <div className="px-4 py-3" style={{ backgroundColor: isDark ? '#0d0d0d' : '#fff', borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
        <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
          <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Balance</span>
          <span style={{ color: isDark ? '#fff' : '#000' }} className="font-medium">{accountStats.balance.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
          <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Equity</span>
          <span style={{ color: isDark ? '#fff' : '#000' }} className="font-medium">{liveEquity.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
          <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Used Margin</span>
          <span style={{ color: isDark ? '#fff' : '#000' }} className="font-medium">{liveUsedMargin.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
          <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Free Margin</span>
          <span style={{ color: isDark ? '#fff' : '#000' }} className="font-medium">{liveFreeMargin.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
          <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Margin Level</span>
          <span style={{ color: isDark ? '#fff' : '#000' }} className="font-medium">{liveMarginLevel.toFixed(2)}</span>
        </div>
      </div>
      
      {/* Floating P&L Row */}
      <div className="px-4 py-2" style={{ backgroundColor: isDark ? '#0d0d0d' : '#fff', borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
        <div className="flex justify-between">
          <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Floating PL</span>
          <span className="font-bold" style={{ color: floatingPnL >= 0 ? '#3b82f6' : '#ef4444' }}>
            {floatingPnL.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-3 text-sm font-medium"
            style={{ 
              color: activeTab === tab.id ? '#3b82f6' : (isDark ? '#6b7280' : '#8e8e93'),
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {getDisplayTrades().length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>
            <p className="text-sm">No {activeTab === 'positions' ? 'open positions' : 'pending orders'}</p>
          </div>
        ) : (
          getDisplayTrades().map(trade => {
            const livePnL = calculatePnL(trade)
            const currentPrice = prices[trade.symbol]
            const livePrice = trade.type === 'buy' ? currentPrice?.bid : currentPrice?.ask
            const isExpanded = expandedTrade === trade._id
            
            return (
              <div 
                key={trade._id}
                className="px-3 py-2"
                style={{ backgroundColor: isDark ? '#0d0d0d' : '#fff', borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}
              >
                {/* Slim Row - Always Visible */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedTrade(isExpanded ? null : trade._id)}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ 
                        backgroundColor: trade.type === 'buy' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: trade.type === 'buy' ? '#22c55e' : '#ef4444'
                      }}
                    >
                      {trade.type === 'buy' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    </span>
                    <span style={{ color: isDark ? '#fff' : '#000' }} className="font-semibold text-sm">{trade.symbol}</span>
                    <span className="text-xs" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>{trade.amount} lots</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: livePnL >= 0 ? '#22c55e' : '#ef4444' }}>
                      ${livePnL >= 0 ? '+' : ''}{livePnL.toFixed(2)}
                    </span>
                    {activeTab === 'positions' && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openModifyDialog(trade); }} 
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }}
                        >
                          <Edit2 size={12} color="#3b82f6" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowCloseDialog(trade); }} 
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)' }}
                        >
                          <X size={12} color="#ef4444" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Details - Only when clicked */}
                {isExpanded && (
                  <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
                    {/* Details Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span style={{ color: isDark ? '#6b7280' : '#8e8e93' }} className="block">Open</span>
                        <span style={{ color: isDark ? '#fff' : '#000' }}>{formatPrice(trade.price, trade.symbol)}</span>
                      </div>
                      <div>
                        <span style={{ color: isDark ? '#6b7280' : '#8e8e93' }} className="block">Current</span>
                        <span style={{ color: livePnL >= 0 ? '#22c55e' : '#ef4444' }}>
                          {formatPrice(livePrice, trade.symbol)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: isDark ? '#6b7280' : '#8e8e93' }} className="block">Leverage</span>
                        <span style={{ color: isDark ? '#fff' : '#000' }}>1:{trade.leverage || 100}</span>
                      </div>
                    </div>

                    {/* SL/TP & Time */}
                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div>
                        <span style={{ color: isDark ? '#6b7280' : '#8e8e93' }} className="block">SL</span>
                        <span style={{ color: '#ef4444' }}>{trade.stopLoss ? formatPrice(trade.stopLoss, trade.symbol) : '---'}</span>
                      </div>
                      <div>
                        <span style={{ color: isDark ? '#6b7280' : '#8e8e93' }} className="block">TP</span>
                        <span style={{ color: '#22c55e' }}>{trade.takeProfit ? formatPrice(trade.takeProfit, trade.symbol) : '---'}</span>
                      </div>
                      <div>
                        <span style={{ color: isDark ? '#6b7280' : '#8e8e93' }} className="block">Opened</span>
                        <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{formatDate(trade.createdAt)}</span>
                      </div>
                    </div>

                    {/* Swap & Commission */}
                    <div className="flex justify-between text-xs mt-2 pt-2" style={{ borderTop: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}>
                      <div className="flex gap-3">
                        <span style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Swap: <span style={{ color: '#fbbf24' }}>${(trade.swap || 0).toFixed(2)}</span></span>
                        <span style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Comm: <span style={{ color: '#fbbf24' }}>${(trade.commission || 0).toFixed(2)}</span></span>
                      </div>
                      <span style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>ID: {trade._id?.slice(-6)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* iOS-style Modify SL/TP Modal */}
      {modifyingTrade && (
        <div className="fixed inset-0 z-50 flex items-end ios-sheet-backdrop">
          <div 
            className="w-full rounded-t-3xl ios-sheet"
            style={{ 
              background: 'rgba(28, 28, 30, 0.95)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)'
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-600"></div>
            </div>
            
            <div className="px-5 pb-8">
              <h3 className="text-xl font-bold text-white text-center mb-6">
                Modify {modifyingTrade.symbol}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-400">Stop Loss</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={modifyForm.stopLoss}
                    onChange={(e) => setModifyForm({ ...modifyForm, stopLoss: e.target.value })}
                    placeholder="Leave empty to remove"
                    className="w-full px-4 py-4 rounded-2xl text-white text-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: 'none' }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-400">Take Profit</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={modifyForm.takeProfit}
                    onChange={(e) => setModifyForm({ ...modifyForm, takeProfit: e.target.value })}
                    placeholder="Leave empty to remove"
                    className="w-full px-4 py-4 rounded-2xl text-white text-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: 'none' }}
                  />
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => modifyTrade(modifyingTrade._id)}
                  className="w-full py-4 rounded-2xl font-semibold text-white text-lg"
                  style={{ backgroundColor: '#0A84FF' }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setModifyingTrade(null)
                    setModifyForm({ stopLoss: '', takeProfit: '' })
                  }}
                  className="w-full py-4 rounded-2xl font-semibold text-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#0A84FF' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS-style Close Trade Action Sheet */}
      {showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-end ios-sheet-backdrop">
          <div 
            className="w-full ios-sheet"
            style={{ 
              background: 'transparent'
            }}
          >
            {/* Main Action Sheet */}
            <div 
              className="mx-3 rounded-2xl overflow-hidden mb-2"
              style={{ 
                background: 'rgba(28, 28, 30, 0.95)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)'
              }}
            >
              {/* Header */}
              <div className="px-4 py-4 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-gray-400 text-sm">Close Trade</p>
                <p className="text-white font-semibold text-lg mt-1">{showCloseDialog.symbol}</p>
                <p className={`text-2xl font-bold mt-2 ${calculatePnL(showCloseDialog) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {calculatePnL(showCloseDialog) >= 0 ? '+' : ''}${calculatePnL(showCloseDialog).toFixed(2)}
                </p>
              </div>
              
              {/* Actions */}
              <button
                onClick={() => closeTrade(showCloseDialog._id)}
                disabled={closingTrade === showCloseDialog._id}
                className="w-full py-4 text-red-500 font-semibold text-lg flex items-center justify-center gap-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
              >
                {closingTrade === showCloseDialog._id && <Loader2 size={16} className="animate-spin" />}
                Close This Trade
              </button>
              <button
                onClick={closeAllTrades}
                disabled={closingTrade === 'all'}
                className="w-full py-4 text-red-500 font-medium text-lg flex items-center justify-center gap-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
              >
                {closingTrade === 'all' && <Loader2 size={16} className="animate-spin" />}
                Close All ({openTrades.length})
              </button>
              <button
                onClick={closeProfitTrades}
                disabled={closingTrade === 'profit'}
                className="w-full py-4 text-blue-400 font-medium text-lg flex items-center justify-center gap-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
              >
                {closingTrade === 'profit' && <Loader2 size={16} className="animate-spin" />}
                Close Profitable
              </button>
              <button
                onClick={closeLossTrades}
                disabled={closingTrade === 'loss'}
                className="w-full py-4 text-orange-400 font-medium text-lg flex items-center justify-center gap-2"
              >
                {closingTrade === 'loss' && <Loader2 size={16} className="animate-spin" />}
                Close Losing
              </button>
            </div>
            
            {/* Cancel Button */}
            <div 
              className="mx-3 mb-3 rounded-2xl overflow-hidden"
              style={{ 
                background: 'rgba(28, 28, 30, 0.95)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)'
              }}
            >
              <button
                onClick={() => setShowCloseDialog(null)}
                className="w-full py-4 text-blue-400 font-semibold text-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes ios-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes ios-backdrop-fade {
          from { background: transparent; }
          to { background: rgba(0,0,0,0.4); }
        }
        .ios-sheet {
          animation: ios-sheet-up 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .ios-sheet-backdrop {
          animation: ios-backdrop-fade 0.25s ease-out forwards;
          background: rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  )
}

export default MobilePositions
