import React, { useState, useEffect, useCallback } from 'react'
import { Edit2, X, ChevronDown, Loader2, XCircle } from 'lucide-react'
import axios from 'axios'
import socketService from '../services/socketService'

const PositionsTable = () => {
  const [activeTab, setActiveTab] = useState('positions')
  const [positions, setPositions] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState({})
  const [closingTrade, setClosingTrade] = useState(null)
  const [modifyingTrade, setModifyingTrade] = useState(null)
  const [modifyForm, setModifyForm] = useState({ stopLoss: '', takeProfit: '' })
  const [showCloseDialog, setShowCloseDialog] = useState(null)
  const [showOneClick, setShowOneClick] = useState(false)
  const [quickLots, setQuickLots] = useState(0.01)

  // Check if trading is locked (kill switch)
  const isTradingLocked = () => {
    const savedLockEnd = localStorage.getItem('tradingLockEnd')
    if (savedLockEnd) {
      const endTime = new Date(savedLockEnd)
      if (endTime > new Date()) return true
      else localStorage.removeItem('tradingLockEnd')
    }
    return false
  }

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
    if (!price && price !== 0) return '---'
    return price.toFixed(getDecimals(symbol))
  }
  
  const styles = {
    container: { backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' },
    border: { borderColor: 'var(--border-color)' },
    text: { color: 'var(--text-primary)' },
    textSecondary: { color: 'var(--text-secondary)' },
  }

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchPositions()
    fetchPrices()
    
    // Connect to socket service
    socketService.connect()

    // Handle all trade events with a single handler
    const handleTradeUpdate = () => {
      console.log('[PositionsTable] Trade update event')
      fetchPositions()
    }

    // Listen to window events from socket service
    const tradeEvents = [
      'tradeClosed', 'orderExecuted', 'pendingOrderActivated', 
      'orderCancelled', 'orderPlaced', 'stopOut', 'tradeCreated',
      'trade_copied', 'trade_modified', 'trade_closed', 'balanceUpdate',
      'tradeUpdate', 'accountChanged'
    ]
    
    tradeEvents.forEach(event => {
      window.addEventListener(event, handleTradeUpdate)
    })
    
    // Listen for storage changes (account switch)
    const handleStorageChange = (e) => {
      if (e.key === 'activeTradingAccount') {
        console.log('[PositionsTable] Account changed, refreshing positions')
        fetchPositions()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Listen for tick events to update prices
    const handleTick = (e) => {
      const data = e.detail
      if (data?.symbol) {
        setPrices(prev => ({
          ...prev,
          [data.symbol]: { bid: data.bid, ask: data.ask }
        }))
      }
    }
    window.addEventListener('tick', handleTick)

    // Poll for prices every 1 second for faster updates
    const interval = setInterval(() => {
      fetchPrices()
    }, 1000)

    return () => {
      tradeEvents.forEach(event => {
        window.removeEventListener(event, handleTradeUpdate)
      })
      window.removeEventListener('tick', handleTick)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const fetchPositions = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Get active trading account to filter trades
      const activeTradingAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || 'null')
      const tradingAccountId = activeTradingAccount?._id
      
      // Build query with trading account filter
      const queryParams = tradingAccountId ? `?tradingAccountId=${tradingAccountId}` : ''
      const res = await axios.get(`/api/trades${queryParams}`, getAuthHeader())
      
      if (res.data.success) {
        const trades = res.data.data?.trades || res.data.data || []
        setPositions(trades.filter(t => t.status === 'open'))
        setPendingOrders(trades.filter(t => t.status === 'pending'))
        setHistory(trades.filter(t => t.status === 'closed').slice(0, 20))
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err)
      setPositions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPrices = async () => {
    try {
      const res = await axios.get('/api/trades/prices', getAuthHeader())
      if (res.data.success) {
        setPrices(res.data.data)
      }
    } catch (err) {
      // Silent fail for price updates
    }
  }

  const closeTrade = async (tradeId) => {
    try {
      setClosingTrade(tradeId)
      const res = await axios.post(`/api/trades/${tradeId}/close`, {}, getAuthHeader())
      if (res.data.success) {
        fetchPositions()
        window.dispatchEvent(new Event('tradeClosed'))
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close trade')
    } finally {
      setClosingTrade(null)
    }
  }

  const cancelOrder = async (tradeId) => {
    try {
      setClosingTrade(tradeId)
      const res = await axios.put(`/api/trades/${tradeId}/cancel`, {}, getAuthHeader())
      if (res.data.success) {
        fetchPositions()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order')
    } finally {
      setClosingTrade(null)
    }
  }

  const modifyTrade = async (tradeId) => {
    try {
      const res = await axios.put(`/api/trades/${tradeId}/modify`, {
        stopLoss: modifyForm.stopLoss ? parseFloat(modifyForm.stopLoss) : null,
        takeProfit: modifyForm.takeProfit ? parseFloat(modifyForm.takeProfit) : null
      }, getAuthHeader())
      if (res.data.success) {
        setModifyingTrade(null)
        fetchPositions()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to modify trade')
    }
  }

  const calculatePnL = (trade) => {
    const price = prices[trade.symbol]
    if (!price) return trade.profit || 0
    
    const currentPrice = trade.type === 'buy' ? price.bid : price.ask
    const priceDiff = trade.type === 'buy' 
      ? currentPrice - trade.price 
      : trade.price - currentPrice
    
    // Simplified P&L calculation
    let contractSize = 100000
    if (trade.symbol.includes('XAU')) contractSize = 100
    else if (trade.symbol.includes('XAG')) contractSize = 5000
    else if (trade.symbol.includes('BTC') || trade.symbol.includes('ETH')) contractSize = 1
    
    return priceDiff * trade.amount * contractSize
  }

  const getCurrentPrice = (trade) => {
    const price = prices[trade.symbol]
    if (!price) return trade.price
    return trade.type === 'buy' ? price.bid : price.ask
  }
  
  const tabs = [
    { id: 'positions', label: 'Positions', count: positions.length },
    { id: 'pending', label: 'Pending', count: pendingOrders.length },
    { id: 'history', label: 'History 24H', count: history.length },
    { id: 'cancelled', label: 'Cancelled 24H', count: 0 },
  ]

  // Calculate live total P&L
  const totalPnL = positions.reduce((sum, pos) => sum + calculatePnL(pos), 0)

  return (
    <div className="h-full flex flex-col transition-colors" style={styles.container}>
      {/* Tabs */}
      <div 
        className="flex items-center justify-between px-4"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors"
              style={{ 
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-green)' : '2px solid transparent'
              }}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.id === 'positions' ? 'Pos' : tab.id === 'pending' ? 'Pend' : tab.id === 'history' ? 'Hist' : 'Canc'}</span>
              ({tab.count})
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          {/* One Click Trading Toggle Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>One Click</span>
            <button
              onClick={() => setShowOneClick(!showOneClick)}
              className="relative w-10 h-5 rounded-full transition-all"
              style={{ backgroundColor: showOneClick ? '#3b82f6' : 'var(--bg-hover)' }}
              title="Toggle One Click Trading"
            >
              <div 
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow"
                style={{ left: showOneClick ? '22px' : '2px' }}
              />
            </button>
          </div>
          
          {/* Quick Trade Buttons - Show when One Click enabled */}
          {showOneClick && (
            <div className="flex items-center gap-1.5 rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <button
                onClick={async () => {
                  // Check kill switch
                  if (isTradingLocked()) {
                    alert('Trading is currently locked. Kill switch is active.')
                    return
                  }
                  const symbol = localStorage.getItem('selectedSymbol') || 'XAUUSD'
                  const activeAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || '{}')
                  console.log('[QuickTrade] SELL', symbol, quickLots, activeAccount._id)
                  try {
                    const token = localStorage.getItem('token')
                    const res = await axios.post('/api/trades', { 
                      symbol, type: 'sell', amount: quickLots, orderType: 'market',
                      tradingAccountId: activeAccount._id 
                    }, { headers: { Authorization: `Bearer ${token}` }})
                    console.log('[QuickTrade] Response:', res.data)
                    if (res.data.success) {
                      fetchPositions()
                      window.dispatchEvent(new Event('tradeCreated'))
                    }
                  } catch (err) { 
                    console.error('[QuickTrade] Error:', err.response?.data || err)
                    alert(err.response?.data?.message || 'Trade failed')
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >S</button>
              <input 
                type="number" 
                value={quickLots} 
                onChange={(e) => setQuickLots(parseFloat(e.target.value) || 0.01)} 
                step="0.01" 
                min="0.01"
                className="w-14 text-center text-xs font-semibold rounded px-1 py-1" 
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }} 
              />
              <button
                onClick={async () => {
                  // Check kill switch
                  if (isTradingLocked()) {
                    alert('Trading is currently locked. Kill switch is active.')
                    return
                  }
                  const symbol = localStorage.getItem('selectedSymbol') || 'XAUUSD'
                  const activeAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || '{}')
                  console.log('[QuickTrade] BUY', symbol, quickLots, activeAccount._id)
                  try {
                    const token = localStorage.getItem('token')
                    const res = await axios.post('/api/trades', { 
                      symbol, type: 'buy', amount: quickLots, orderType: 'market',
                      tradingAccountId: activeAccount._id 
                    }, { headers: { Authorization: `Bearer ${token}` }})
                    console.log('[QuickTrade] Response:', res.data)
                    if (res.data.success) {
                      fetchPositions()
                      window.dispatchEvent(new Event('tradeCreated'))
                    }
                  } catch (err) { 
                    console.error('[QuickTrade] Error:', err.response?.data || err)
                    alert(err.response?.data?.message || 'Trade failed')
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110"
                style={{ backgroundColor: '#3b82f6', color: 'white' }}
              >B</button>
            </div>
          )}
          
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Floating P/L:
          </span>
          <span 
            className="text-sm font-bold"
            style={{ color: totalPnL >= 0 ? '#3b82f6' : 'var(--accent-red)' }}
          >
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </span>
        </div>
      </div>
      
      {/* Table Header */}
      <div 
        className="grid grid-cols-12 gap-2 px-4 py-2 text-xs items-center"
        style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
      >
        <div>Time</div>
        <div>Symbol</div>
        <div>Side</div>
        <div>Lots</div>
        <div>Entry</div>
        <div>Current</div>
        <div>SL</div>
        <div>TP</div>
        <div>Charges</div>
        <div>Spread</div>
        <div>P/L</div>
        <div>Action</div>
      </div>
      
      {/* Table Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin" size={20} style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : activeTab === 'positions' && positions.length > 0 ? (
          positions.map(pos => {
            const pnl = calculatePnL(pos)
            const currentPrice = getCurrentPrice(pos)
            return (
              <div 
                key={pos._id}
                className="grid grid-cols-12 gap-2 px-4 py-2 text-sm items-center transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ color: 'var(--text-secondary)' }}>{new Date(pos.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{pos.symbol}</div>
                <div>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                    style={{ 
                      backgroundColor: pos.type === 'buy' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: pos.type === 'buy' ? '#3b82f6' : 'var(--accent-red)'
                    }}
                  >
                    {pos.type}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{(pos.amount || 0).toFixed(2)}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{formatPrice(pos.price, pos.symbol)}</div>
                <div style={{ color: 'var(--text-primary)' }}>{formatPrice(currentPrice, pos.symbol)}</div>
                <div style={{ color: pos.stopLoss ? '#ef4444' : 'var(--text-muted)' }}>{pos.stopLoss || '-'}</div>
                <div style={{ color: pos.takeProfit ? '#22c55e' : 'var(--text-muted)' }}>{pos.takeProfit || '-'}</div>
                <div style={{ color: 'var(--text-muted)' }}>${(pos.tradingCharge || pos.commission || 0).toFixed(2)}</div>
                <div style={{ color: '#fbbf24' }}>{pos.spread || 0} pips</div>
                <div 
                  className="font-medium"
                  style={{ color: pnl >= 0 ? '#3b82f6' : 'var(--accent-red)' }}
                >
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setModifyingTrade(pos)
                      setModifyForm({ stopLoss: pos.stopLoss || '', takeProfit: pos.takeProfit || '' })
                    }}
                    className="transition-colors hover:opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Modify SL/TP"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => setShowCloseDialog(pos)}
                    disabled={closingTrade === pos._id}
                    className="transition-colors hover:text-red-500"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Close Trade"
                  >
                    {closingTrade === pos._id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>
                </div>
              </div>
            )
          })
        ) : activeTab === 'pending' && pendingOrders.length > 0 ? (
          pendingOrders.map(order => (
            <div 
              key={order._id}
              className="grid grid-cols-12 gap-2 px-4 py-2 text-sm items-center transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ color: 'var(--text-secondary)' }}>{new Date(order.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{order.symbol}</div>
              <div>
                <span 
                  className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                  style={{ 
                    backgroundColor: order.type === 'buy' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: order.type === 'buy' ? '#3b82f6' : 'var(--accent-red)'
                  }}
                >
                  {order.type}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{(order.amount || 0).toFixed(2)}</div>
              <div style={{ color: '#fbbf24' }}>{formatPrice(order.price, order.symbol)} ({order.orderType})</div>
              <div style={{ color: 'var(--text-muted)' }}>-</div>
              <div style={{ color: order.stopLoss ? '#ef4444' : 'var(--text-muted)' }}>{order.stopLoss || '-'}</div>
              <div style={{ color: order.takeProfit ? '#22c55e' : 'var(--text-muted)' }}>{order.takeProfit || '-'}</div>
              <div style={{ color: 'var(--text-muted)' }}>${(order.tradingCharge || order.commission || 0).toFixed(2)}</div>
              <div style={{ color: '#fbbf24' }}>{order.spread || 0} pips</div>
              <div style={{ color: 'var(--text-muted)' }}>Pending</div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => cancelOrder(order._id)}
                  disabled={closingTrade === order._id}
                  className="transition-colors hover:text-red-500"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Cancel Order"
                >
                  {closingTrade === order._id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                </button>
              </div>
            </div>
          ))
        ) : activeTab === 'history' && history.length > 0 ? (
          history.map(trade => (
            <div 
              key={trade._id}
              className="grid grid-cols-12 gap-2 px-4 py-2 text-sm items-center transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ color: 'var(--text-secondary)' }}>{new Date(trade.closedAt || trade.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{trade.symbol}</div>
              <div>
                <span 
                  className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                  style={{ 
                    backgroundColor: trade.type === 'buy' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: trade.type === 'buy' ? '#3b82f6' : 'var(--accent-red)'
                  }}
                >
                  {trade.type}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{(trade.amount || 0).toFixed(2)}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{formatPrice(trade.price, trade.symbol)}</div>
              <div style={{ color: 'var(--text-primary)' }}>{formatPrice(trade.closePrice, trade.symbol)}</div>
              <div style={{ color: 'var(--text-muted)' }}>{trade.stopLoss || '-'}</div>
              <div style={{ color: 'var(--text-muted)' }}>{trade.takeProfit || '-'}</div>
              <div style={{ color: 'var(--text-muted)' }}>${(trade.tradingCharge || trade.commission || 0).toFixed(2)}</div>
              <div style={{ color: '#fbbf24' }}>{trade.spread || 0} pips</div>
              <div 
                className="font-medium"
                style={{ color: (trade.profit || 0) >= 0 ? '#3b82f6' : 'var(--accent-red)' }}
              >
                {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {trade.closeReason || 'manual'}
              </div>
            </div>
          ))
        ) : (
          <div 
            className="flex items-center justify-center h-full"
            style={{ color: 'var(--text-muted)' }}
          >
            No {activeTab === 'positions' ? 'open positions' : activeTab === 'pending' ? 'pending orders' : 'history'}
          </div>
        )}
      </div>

      {/* Modify SL/TP Modal */}
      {modifyingTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl p-6 w-80" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Modify {modifyingTrade.symbol}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Stop Loss</label>
                <input
                  type="number"
                  step="0.00001"
                  value={modifyForm.stopLoss}
                  onChange={(e) => setModifyForm({ ...modifyForm, stopLoss: e.target.value })}
                  placeholder="Leave empty to remove"
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Take Profit</label>
                <input
                  type="number"
                  step="0.00001"
                  value={modifyForm.takeProfit}
                  onChange={(e) => setModifyForm({ ...modifyForm, takeProfit: e.target.value })}
                  placeholder="Leave empty to remove"
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModifyingTrade(null)}
                  className="flex-1 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => modifyTrade(modifyingTrade._id)}
                  className="flex-1 py-2 rounded-lg text-white"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Trade Confirmation Dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Close Trade
            </h3>
            <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Symbol</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{showCloseDialog.symbol}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Type</span>
                <span className="uppercase" style={{ color: showCloseDialog.type === 'buy' ? '#3b82f6' : '#ef4444' }}>
                  {showCloseDialog.type}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Volume</span>
                <span style={{ color: 'var(--text-primary)' }}>{showCloseDialog.amount?.toFixed(2)} lots</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Entry</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatPrice(showCloseDialog.price, showCloseDialog.symbol)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Floating P/L</span>
                <span style={{ color: calculatePnL(showCloseDialog) >= 0 ? '#3b82f6' : '#ef4444' }}>
                  {calculatePnL(showCloseDialog) >= 0 ? '+' : ''}${calculatePnL(showCloseDialog).toFixed(2)}
                </span>
              </div>
            </div>
            
            {/* Close Options */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={async () => {
                  await closeTrade(showCloseDialog._id)
                  setShowCloseDialog(null)
                }}
                disabled={closingTrade === showCloseDialog._id}
                className="py-2.5 rounded-xl font-medium text-white flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600"
              >
                {closingTrade === showCloseDialog._id ? <Loader2 size={14} className="animate-spin" /> : null}
                Close This
              </button>
              <button
                onClick={async () => {
                  setClosingTrade('all')
                  let closed = 0
                  console.log('Closing all trades:', positions.length)
                  for (const trade of positions) {
                    console.log('Closing trade:', trade._id, trade.symbol)
                    try { 
                      const res = await axios.post(`/api/trades/${trade._id}/close`, {}, getAuthHeader())
                      console.log('Close response:', res.data)
                      if (res.data.success) closed++
                    } catch (err) { 
                      console.error('Close error:', err.response?.data || err.message)
                    }
                  }
                  console.log('Closed', closed, 'trades')
                  await fetchPositions()
                  window.dispatchEvent(new Event('tradeClosed'))
                  setClosingTrade(null)
                  setShowCloseDialog(null)
                }}
                className="py-2.5 rounded-xl font-medium text-white bg-gray-600 hover:bg-gray-700 flex items-center justify-center gap-2"
                disabled={closingTrade === 'all'}
              >
                {closingTrade === 'all' && <Loader2 size={14} className="animate-spin" />}
                Close All ({positions.length})
              </button>
              <button
                onClick={async () => {
                  setClosingTrade('profit')
                  const profitTrades = positions.filter(p => calculatePnL(p) > 0)
                  for (const trade of profitTrades) {
                    try { 
                      await axios.post(`/api/trades/${trade._id}/close`, {}, getAuthHeader()) 
                    } catch (err) { console.error('Close error:', err) }
                  }
                  fetchPositions()
                  window.dispatchEvent(new Event('tradeClosed'))
                  setClosingTrade(null)
                  setShowCloseDialog(null)
                }}
                className="py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                disabled={closingTrade === 'profit'}
              >
                {closingTrade === 'profit' && <Loader2 size={14} className="animate-spin" />}
                Close Profit ({positions.filter(p => calculatePnL(p) > 0).length})
              </button>
              <button
                onClick={async () => {
                  setClosingTrade('loss')
                  const lossTrades = positions.filter(p => calculatePnL(p) < 0)
                  for (const trade of lossTrades) {
                    try { 
                      await axios.post(`/api/trades/${trade._id}/close`, {}, getAuthHeader()) 
                    } catch (err) { console.error('Close error:', err) }
                  }
                  fetchPositions()
                  window.dispatchEvent(new Event('tradeClosed'))
                  setClosingTrade(null)
                  setShowCloseDialog(null)
                }}
                className="py-2.5 rounded-xl font-medium text-white bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2"
                disabled={closingTrade === 'loss'}
              >
                {closingTrade === 'loss' && <Loader2 size={14} className="animate-spin" />}
                Close Loss ({positions.filter(p => calculatePnL(p) < 0).length})
              </button>
            </div>
            
            <button
              onClick={() => setShowCloseDialog(null)}
              className="w-full py-2.5 rounded-xl font-medium"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PositionsTable
