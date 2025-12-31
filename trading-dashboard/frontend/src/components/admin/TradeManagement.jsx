import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  Filter,
  Download,
  Eye,
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Edit,
  X,
  RefreshCw
} from 'lucide-react'
import axios from 'axios'
import { io } from 'socket.io-client'

const TradeManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterUser, setFilterUser] = useState('all') // Filter by user
  const [activeTab, setActiveTab] = useState('open') // open, pending, history
  const [trades, setTrades] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [prices, setPrices] = useState({})
  const socketRef = useRef(null)
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState(null)
  
  // Trading accounts for selected user
  const [userAccounts, setUserAccounts] = useState([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  // Create trade form
  const [createForm, setCreateForm] = useState({
    userId: '',
    tradingAccountId: '',
    symbol: 'EURUSD',
    type: 'buy',
    orderType: 'market', // market or pending
    amount: 0.01,
    leverage: 100,
    stopLoss: '',
    takeProfit: '',
    pendingPrice: '',
    openTime: ''
  })
  
  // Modify form - full admin control
  const [modifyForm, setModifyForm] = useState({
    stopLoss: '',
    takeProfit: '',
    profit: '',
    closePrice: '',
    notes: '',
    price: '',
    amount: '',
    type: '',
    symbol: '',
    createdAt: '',
    closedAt: ''
  })

  const symbols = [
    // Forex Majors
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    // Forex Minors
    'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD', 'GBPAUD', 'EURCHF',
    // Metals
    'XAUUSD', 'XAGUSD',
    // Crypto
    'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD',
    // Indices
    'US30', 'US100', 'US500', 'DE30', 'UK100', 'JP225',
    // Commodities
    'USOIL', 'UKOIL', 'NATGAS'
  ]

  // Fetch trading accounts when user is selected
  const fetchUserAccounts = async (userId) => {
    if (!userId) {
      setUserAccounts([])
      return
    }
    try {
      setLoadingAccounts(true)
      const res = await axios.get(`/api/admin/users/${userId}/trading-accounts`, getAuthHeader())
      if (res.data.success) {
        setUserAccounts(res.data.data || [])
        // Auto-select first account if available
        if (res.data.data?.length > 0) {
          setCreateForm(prev => ({ ...prev, tradingAccountId: res.data.data[0]._id }))
        }
      }
    } catch (err) {
      console.error('Error fetching user accounts:', err)
      setUserAccounts([])
    } finally {
      setLoadingAccounts(false)
    }
  }

  // Handle user selection change
  const handleUserChange = (userId) => {
    setCreateForm(prev => ({ ...prev, userId, tradingAccountId: '' }))
    fetchUserAccounts(userId)
  }

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  // Socket connection for real-time prices
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Admin TradeManagement] Socket connected')
    })

    socket.on('prices', (priceData) => {
      setPrices(priceData)
    })

    socket.on('tick', (tick) => {
      if (tick?.symbol) {
        setPrices(prev => ({
          ...prev,
          [tick.symbol]: { bid: tick.bid, ask: tick.ask }
        }))
      }
    })

    // Listen for trade events to refresh instantly
    socket.on('tradeClosed', () => fetchData())
    socket.on('orderExecuted', () => fetchData())

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [tradesRes, usersRes] = await Promise.all([
        axios.get('/api/admin/trades', getAuthHeader()),
        axios.get('/api/admin/users?limit=1000', getAuthHeader())
      ])
      if (tradesRes.data.success) {
        setTrades(tradesRes.data.data || [])
      }
      if (usersRes.data.success) {
        // Handle nested users structure from API
        const usersData = usersRes.data.data?.users || usersRes.data.data || []
        console.log('[TradeManagement] Users loaded:', usersData.length)
        setUsers(usersData)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setTrades([])
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTrade = async (e) => {
    e.preventDefault()
    try {
      setActionLoading('create')
      const res = await axios.post('/api/admin/trades', createForm, getAuthHeader())
      if (res.data.success) {
        alert('Trade created successfully!')
        setShowCreateModal(false)
        setCreateForm({
          userId: '',
          tradingAccountId: '',
          symbol: 'EURUSD',
          type: 'buy',
          orderType: 'market',
          amount: 0.01,
          leverage: 100,
          stopLoss: '',
          takeProfit: '',
          pendingPrice: '',
          openTime: ''
        })
        setUserAccounts([])
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create trade')
    } finally {
      setActionLoading(null)
    }
  }

  const handleModifyTrade = async (e) => {
    e.preventDefault()
    if (!selectedTrade) return
    try {
      setActionLoading('modify')
      
      const updateData = {}
      
      // Full admin control - all fields
      if (modifyForm.stopLoss !== '' && modifyForm.stopLoss !== selectedTrade.stopLoss) 
        updateData.stopLoss = modifyForm.stopLoss ? parseFloat(modifyForm.stopLoss) : null
      if (modifyForm.takeProfit !== '' && modifyForm.takeProfit !== selectedTrade.takeProfit) 
        updateData.takeProfit = modifyForm.takeProfit ? parseFloat(modifyForm.takeProfit) : null
      if (modifyForm.price !== '' && modifyForm.price != selectedTrade.price) 
        updateData.price = parseFloat(modifyForm.price)
      if (modifyForm.amount !== '' && modifyForm.amount != selectedTrade.amount) 
        updateData.amount = parseFloat(modifyForm.amount)
      if (modifyForm.type && modifyForm.type !== selectedTrade.type) 
        updateData.type = modifyForm.type
      if (modifyForm.symbol && modifyForm.symbol !== selectedTrade.symbol) 
        updateData.symbol = modifyForm.symbol
      if (modifyForm.createdAt) 
        updateData.createdAt = modifyForm.createdAt
      if (modifyForm.closedAt) 
        updateData.closedAt = modifyForm.closedAt
      if (modifyForm.closePrice !== '' && modifyForm.closePrice != selectedTrade.closePrice) 
        updateData.closePrice = parseFloat(modifyForm.closePrice)
      if (modifyForm.profit !== '' && modifyForm.profit != selectedTrade.profit) 
        updateData.profit = parseFloat(modifyForm.profit)
      if (modifyForm.notes !== selectedTrade.notes) 
        updateData.notes = modifyForm.notes
      
      const res = await axios.put(`/api/admin/trades/${selectedTrade._id}/modify`, updateData, getAuthHeader())
      if (res.data.success) {
        alert('Trade modified successfully!')
        setShowModifyModal(false)
        setSelectedTrade(null)
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to modify trade')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCloseTrade = async () => {
    if (!selectedTrade) return
    try {
      setActionLoading('close')
      const res = await axios.put(`/api/admin/trades/${selectedTrade._id}/close`, {}, getAuthHeader())
      if (res.data.success) {
        alert(`Trade closed! P/L: $${res.data.data?.profit?.toFixed(2) || 0}`)
        setShowCloseModal(false)
        setSelectedTrade(null)
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close trade')
    } finally {
      setActionLoading(null)
    }
  }

  const openModifyModal = (trade) => {
    setSelectedTrade(trade)
    setModifyForm({
      stopLoss: trade.stopLoss || '',
      takeProfit: trade.takeProfit || '',
      profit: trade.profit || '',
      closePrice: trade.closePrice || '',
      notes: trade.notes || '',
      price: trade.price || '',
      amount: trade.amount || '',
      type: trade.type || 'buy',
      symbol: trade.symbol || '',
      createdAt: trade.createdAt ? new Date(trade.createdAt).toISOString().slice(0, 16) : '',
      closedAt: trade.closedAt ? new Date(trade.closedAt).toISOString().slice(0, 16) : ''
    })
    setShowModifyModal(true)
  }

  const openCloseModal = (trade) => {
    setSelectedTrade(trade)
    setShowCloseModal(true)
  }

  // Calculate real-time P/L for open trades
  const calculatePnL = (trade) => {
    if (trade.status !== 'open' && trade.status !== 'Open') {
      return trade.profit || 0
    }
    
    const priceData = prices[trade.symbol]
    if (!priceData) return trade.profit || 0
    
    const currentPrice = trade.type === 'buy' ? priceData.bid : priceData.ask
    if (!currentPrice || !trade.price) return trade.profit || 0
    
    const pipValue = trade.symbol?.includes('JPY') ? 0.01 : 0.0001
    const priceDiff = trade.type === 'buy' 
      ? currentPrice - trade.price 
      : trade.price - currentPrice
    
    // Calculate P/L based on lot size (1 lot = 100,000 units for forex)
    const lotSize = trade.symbol?.includes('XAU') ? 100 : 
                   trade.symbol?.includes('BTC') ? 1 :
                   trade.symbol?.includes('US') || trade.symbol?.includes('DE') || trade.symbol?.includes('UK') || trade.symbol?.includes('JP') ? 1 : 100000
    const pnl = priceDiff * (trade.amount || 0.01) * lotSize
    
    return pnl
  }

  // Get current price for display
  const getCurrentPrice = (trade) => {
    if (trade.status !== 'open') return trade.closePrice || '-'
    const priceData = prices[trade.symbol]
    if (!priceData) return '-'
    return trade.type === 'buy' ? priceData.bid?.toFixed(5) : priceData.ask?.toFixed(5)
  }

  const filteredTrades = trades.filter(trade => {
    const userName = trade.user?.firstName || trade.userId?.firstName || ''
    const userEmail = trade.user?.email || ''
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (trade.symbol || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (trade._id || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filter by active tab
    let matchesTab = false
    if (activeTab === 'open') matchesTab = trade.status === 'open'
    else if (activeTab === 'pending') matchesTab = trade.status === 'pending'
    else if (activeTab === 'history') matchesTab = trade.status === 'closed' || trade.status === 'cancelled'
    
    const matchesType = filterType === 'all' || (trade.type || '').toLowerCase() === filterType.toLowerCase()
    
    // Filter by user
    const userId = trade.user?._id || trade.userId?._id || trade.user || ''
    const matchesUser = filterUser === 'all' || userId === filterUser
    
    return matchesSearch && matchesTab && matchesType && matchesUser
  })

  const totalVolume = trades.reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0)
  const openTrades = trades.filter(t => t.status === 'open').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <TrendingUp size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Trades</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{trades.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <Clock size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Open Positions</p>
              <p className="text-xl font-bold" style={{ color: '#22c55e' }}>{openTrades}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <TrendingUp size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Volume</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>${totalVolume.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: totalProfit >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
              {totalProfit >= 0 ? <TrendingUp size={20} style={{ color: '#22c55e' }} /> : <TrendingDown size={20} style={{ color: '#ef4444' }} />}
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total P&L</p>
              <p className="text-xl font-bold" style={{ color: totalProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {[
          { id: 'open', label: 'Open Positions', count: trades.filter(t => t.status === 'open').length },
          { id: 'pending', label: 'Pending Orders', count: trades.filter(t => t.status === 'pending').length },
          { id: 'history', label: 'History', count: trades.filter(t => t.status === 'closed' || t.status === 'cancelled').length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 text-sm font-medium transition-colors relative"
            style={{ 
              color: activeTab === tab.id ? 'var(--accent-green)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-green)' : '2px solid transparent'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Types</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm focus:outline-none min-w-[200px]"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.firstName} {user.lastName} ({user.email?.split('@')[0]})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-blue-500 text-white hover:bg-blue-600"
          >
            <Plus size={16} />
            Create Trade
          </button>
        </div>
      </div>

      {/* Trades Table */}
      <div 
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Trade ID</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Pair</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Amount</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Leverage</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Open Price</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Current</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>P&L</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center">
                    <Loader2 className="animate-spin mx-auto" size={24} style={{ color: 'var(--text-muted)' }} />
                  </td>
                </tr>
              ) : filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No trades found
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <tr key={trade._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="py-4 px-4 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {trade._id?.slice(-8)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {trade.user?.firstName} {trade.user?.lastName}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{trade.user?.email}</div>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{trade.symbol}</td>
                    <td className="py-4 px-4">
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium uppercase"
                        style={{
                          backgroundColor: trade.type === 'buy' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: trade.type === 'buy' ? '#22c55e' : '#ef4444'
                        }}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{trade.amount?.toFixed(2)} lots</td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>1:{trade.leverage}</td>
                    <td className="py-4 px-4 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{trade.price?.toFixed(5)}</td>
                    <td className="py-4 px-4 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {getCurrentPrice(trade)}
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold" style={{ color: calculatePnL(trade) >= 0 ? '#22c55e' : '#ef4444' }}>
                      {calculatePnL(trade) >= 0 ? '+' : ''}${calculatePnL(trade).toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit capitalize"
                        style={{
                          backgroundColor: trade.status === 'open' ? 'rgba(34, 197, 94, 0.1)' : 
                                          trade.status === 'closed' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                          color: trade.status === 'open' ? '#22c55e' : 
                                 trade.status === 'closed' ? '#6b7280' : '#fbbf24'
                        }}
                      >
                        {trade.status === 'open' && <Clock size={12} />}
                        {trade.status === 'closed' && <CheckCircle size={12} />}
                        {trade.status === 'pending' && <AlertTriangle size={12} />}
                        {trade.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {(trade.status === 'open' || trade.status === 'Open') && (
                          <>
                            <button 
                              onClick={() => openModifyModal(trade)}
                              className="p-2 rounded-lg hover:opacity-70" 
                              style={{ backgroundColor: 'var(--bg-hover)' }} 
                              title="Modify SL/TP"
                            >
                              <Edit size={16} style={{ color: '#3b82f6' }} />
                            </button>
                            <button 
                              onClick={() => openCloseModal(trade)}
                              className="p-2 rounded-lg hover:opacity-70" 
                              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }} 
                              title="Close Trade"
                            >
                              <XCircle size={16} style={{ color: '#ef4444' }} />
                            </button>
                          </>
                        )}
                        {(trade.status === 'pending' || trade.status === 'Pending') && (
                          <>
                            <button 
                              onClick={() => openModifyModal(trade)}
                              className="p-2 rounded-lg hover:opacity-70" 
                              style={{ backgroundColor: 'var(--bg-hover)' }} 
                              title="Modify Order"
                            >
                              <Edit size={16} style={{ color: '#3b82f6' }} />
                            </button>
                            <button 
                              onClick={() => openCloseModal(trade)}
                              className="p-2 rounded-lg hover:opacity-70" 
                              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }} 
                              title="Cancel Order"
                            >
                              <XCircle size={16} style={{ color: '#ef4444' }} />
                            </button>
                          </>
                        )}
                        {(trade.status === 'closed' || trade.status === 'Closed' || trade.status === 'cancelled') && (
                          <button 
                            onClick={() => openModifyModal(trade)}
                            className="p-2 rounded-lg hover:opacity-70" 
                            style={{ backgroundColor: 'var(--bg-hover)' }} 
                            title="Edit Trade Details"
                          >
                            <Edit size={16} style={{ color: '#3b82f6' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Trade Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Create Trade for User</h3>
              <button onClick={() => { setShowCreateModal(false); setUserAccounts([]); }}>
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <form onSubmit={handleCreateTrade} className="space-y-4">
              {/* User Selection */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Select User *</label>
                <select
                  value={createForm.userId}
                  onChange={(e) => handleUserChange(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.email}) - Wallet: ${user.balance?.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trading Account Selection */}
              {createForm.userId && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Trading Account *</label>
                  {loadingAccounts ? (
                    <div className="flex items-center gap-2 py-3" style={{ color: 'var(--text-muted)' }}>
                      <Loader2 size={16} className="animate-spin" /> Loading accounts...
                    </div>
                  ) : userAccounts.length > 0 ? (
                    <select
                      value={createForm.tradingAccountId}
                      onChange={(e) => setCreateForm({ ...createForm, tradingAccountId: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Select account...</option>
                      {userAccounts.map(acc => (
                        <option key={acc._id} value={acc._id}>
                          {acc.accountNumber} - ${acc.balance?.toFixed(2)} ({acc.accountType?.name || 'Standard'}) {acc.isDemo ? '[DEMO]' : '[LIVE]'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm py-2" style={{ color: '#ef4444' }}>No trading accounts found for this user</p>
                  )}
                </div>
              )}

              {/* Order Type */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Order Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, orderType: 'market' })}
                    className="py-3 rounded-xl font-medium"
                    style={{ 
                      backgroundColor: createForm.orderType === 'market' ? '#3b82f6' : 'var(--bg-hover)',
                      color: createForm.orderType === 'market' ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    Market Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, orderType: 'pending' })}
                    className="py-3 rounded-xl font-medium"
                    style={{ 
                      backgroundColor: createForm.orderType === 'pending' ? '#f59e0b' : 'var(--bg-hover)',
                      color: createForm.orderType === 'pending' ? '#000' : 'var(--text-secondary)'
                    }}
                  >
                    Pending Order
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Symbol</label>
                  <select
                    value={createForm.symbol}
                    onChange={(e) => setCreateForm({ ...createForm, symbol: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    {symbols.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Side (Buy/Sell)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, type: 'buy' })}
                      className="py-3 rounded-xl font-medium"
                      style={{ 
                        backgroundColor: createForm.type === 'buy' ? '#22c55e' : 'var(--bg-hover)',
                        color: createForm.type === 'buy' ? '#000' : 'var(--text-secondary)'
                      }}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, type: 'sell' })}
                      className="py-3 rounded-xl font-medium"
                      style={{ 
                        backgroundColor: createForm.type === 'sell' ? '#ef4444' : 'var(--bg-hover)',
                        color: createForm.type === 'sell' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>

              {/* Pending Price - only for pending orders */}
              {createForm.orderType === 'pending' && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#f59e0b' }}>Pending Order Price *</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={createForm.pendingPrice}
                    onChange={(e) => setCreateForm({ ...createForm, pendingPrice: e.target.value })}
                    placeholder="Enter price to trigger order"
                    required={createForm.orderType === 'pending'}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid #f59e0b', color: 'var(--text-primary)' }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Volume (Lots)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: parseFloat(e.target.value) || 0.01 })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Leverage</label>
                  <select
                    value={createForm.leverage}
                    onChange={(e) => setCreateForm({ ...createForm, leverage: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    {[1, 10, 25, 50, 100, 200, 500, 1000].map(l => <option key={l} value={l}>1:{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#ef4444' }}>Stop Loss (optional)</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={createForm.stopLoss}
                    onChange={(e) => setCreateForm({ ...createForm, stopLoss: e.target.value })}
                    placeholder="Enter SL price"
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#22c55e' }}>Take Profit (optional)</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={createForm.takeProfit}
                    onChange={(e) => setCreateForm({ ...createForm, takeProfit: e.target.value })}
                    placeholder="Enter TP price"
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Open Time - custom trade time */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Open Time (optional - defaults to now)</label>
                <input
                  type="datetime-local"
                  value={createForm.openTime}
                  onChange={(e) => setCreateForm({ ...createForm, openTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setUserAccounts([]); }}
                  className="flex-1 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create' || (createForm.userId && !createForm.tradingAccountId)}
                  className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: createForm.orderType === 'pending' ? '#f59e0b' : (createForm.type === 'buy' ? '#22c55e' : '#ef4444') }}
                >
                  {actionLoading === 'create' && <Loader2 size={16} className="animate-spin" />}
                  {createForm.orderType === 'pending' ? 'Place Pending Order' : (createForm.type === 'buy' ? 'Open BUY' : 'Open SELL')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modify Trade Modal */}
      {showModifyModal && selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Modify Trade</h3>
              <button onClick={() => { setShowModifyModal(false); setSelectedTrade(null); }}>
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Symbol</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedTrade.symbol}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Type</span>
                <span className="uppercase" style={{ color: selectedTrade.type === 'buy' ? '#22c55e' : '#ef4444' }}>{selectedTrade.type}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Entry Price</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedTrade.price?.toFixed(5)}</span>
              </div>
            </div>
            <form onSubmit={handleModifyTrade} className="space-y-4 max-h-96 overflow-y-auto">
              {/* Core trade fields - always editable */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Symbol</label>
                  <select
                    value={modifyForm.symbol}
                    onChange={(e) => setModifyForm({ ...modifyForm, symbol: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    {symbols.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Side</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModifyForm({ ...modifyForm, type: 'buy' })}
                      className="py-2 rounded-xl font-medium text-sm"
                      style={{ 
                        backgroundColor: modifyForm.type === 'buy' ? '#22c55e' : 'var(--bg-hover)',
                        color: modifyForm.type === 'buy' ? '#000' : 'var(--text-secondary)'
                      }}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setModifyForm({ ...modifyForm, type: 'sell' })}
                      className="py-2 rounded-xl font-medium text-sm"
                      style={{ 
                        backgroundColor: modifyForm.type === 'sell' ? '#ef4444' : 'var(--bg-hover)',
                        color: modifyForm.type === 'sell' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Entry Price</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={modifyForm.price}
                    onChange={(e) => setModifyForm({ ...modifyForm, price: e.target.value })}
                    placeholder="Entry price"
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Quantity (Lots)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={modifyForm.amount}
                    onChange={(e) => setModifyForm({ ...modifyForm, amount: e.target.value })}
                    placeholder="Lots"
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#ef4444' }}>Stop Loss</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={modifyForm.stopLoss}
                    onChange={(e) => setModifyForm({ ...modifyForm, stopLoss: e.target.value })}
                    placeholder="SL price"
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#22c55e' }}>Take Profit</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={modifyForm.takeProfit}
                    onChange={(e) => setModifyForm({ ...modifyForm, takeProfit: e.target.value })}
                    placeholder="TP price"
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Open Time</label>
                <input
                  type="datetime-local"
                  value={modifyForm.createdAt}
                  onChange={(e) => setModifyForm({ ...modifyForm, createdAt: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              
              {/* For closed trades - show close fields */}
              {(selectedTrade.status === 'closed' || selectedTrade.status === 'cancelled') && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Close Price</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={modifyForm.closePrice}
                        onChange={(e) => setModifyForm({ ...modifyForm, closePrice: e.target.value })}
                        placeholder="Close price"
                        className="w-full px-4 py-3 rounded-xl"
                        style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Profit/Loss ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={modifyForm.profit}
                        onChange={(e) => setModifyForm({ ...modifyForm, profit: e.target.value })}
                        placeholder="P/L amount"
                        className="w-full px-4 py-3 rounded-xl"
                        style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Close Time</label>
                    <input
                      type="datetime-local"
                      value={modifyForm.closedAt}
                      onChange={(e) => setModifyForm({ ...modifyForm, closedAt: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </>
              )}
              
              {/* Notes */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Notes</label>
                <textarea
                  value={modifyForm.notes}
                  onChange={(e) => setModifyForm({ ...modifyForm, notes: e.target.value })}
                  placeholder="Add notes..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl resize-none"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModifyModal(false); setSelectedTrade(null); }}
                  className="flex-1 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'modify'}
                  className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600"
                >
                  {actionLoading === 'modify' && <Loader2 size={16} className="animate-spin" />}
                  Update Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Trade Modal */}
      {showCloseModal && selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Close Trade</h3>
              <button onClick={() => { setShowCloseModal(false); setSelectedTrade(null); }}>
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>User</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedTrade.user?.email}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Symbol</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedTrade.symbol}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Type</span>
                <span className="uppercase" style={{ color: selectedTrade.type === 'buy' ? '#22c55e' : '#ef4444' }}>{selectedTrade.type}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Volume</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedTrade.amount?.toFixed(2)} lots</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Entry Price</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedTrade.price?.toFixed(5)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Floating P/L</span>
                <span style={{ color: (selectedTrade.profit || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                  {(selectedTrade.profit || 0) >= 0 ? '+' : ''}${(selectedTrade.profit || 0).toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to close this trade at market price?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCloseModal(false); setSelectedTrade(null); }}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseTrade}
                disabled={actionLoading === 'close'}
                className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600"
              >
                {actionLoading === 'close' && <Loader2 size={16} className="animate-spin" />}
                Close Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TradeManagement
