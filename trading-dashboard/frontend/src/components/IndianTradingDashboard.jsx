import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import {
  ArrowLeft, Search, IndianRupee, Minus, Plus, ChevronLeft, ChevronRight, X,
  RefreshCw, ExternalLink, Wifi, WifiOff, Edit2, Loader2, XCircle, LayoutGrid
} from 'lucide-react'
import IndianCandlestickChart from './IndianCandlestickChart'

const IndianTradingDashboard = () => {
  const navigate = useNavigate()
  const [segment, setSegment] = useState('NSE')
  const [instrumentType, setInstrumentType] = useState('EQ')
  const [watchlist, setWatchlist] = useState([])
  const [allInstruments, setAllInstruments] = useState({}) // Store all segments data
  const [selected, setSelected] = useState(null)
  const [orderSide, setOrderSide] = useState('BUY')
  const [orderType, setOrderType] = useState('MIS')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState('')
  const [priceType, setPriceType] = useState('MARKET')
  const [searchQuery, setSearchQuery] = useState('')
  const [bottomTab, setBottomTab] = useState('positions')
  const [positions, setPositions] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [closedPositions, setClosedPositions] = useState([])
  const [showInstruments, setShowInstruments] = useState(true)
  const [showOrderPanel, setShowOrderPanel] = useState(true)
  const [activeWatchlist, setActiveWatchlist] = useState('MW-1')
  const [loading, setLoading] = useState(true)
  const [kiteAuth, setKiteAuth] = useState(false)
  const [expiries, setExpiries] = useState([])
  const [selectedExpiry, setSelectedExpiry] = useState('')
  const [strikes, setStrikes] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [instrumentsLoaded, setInstrumentsLoaded] = useState(false)
  const [showOneClick, setShowOneClick] = useState(false)
  const [quickLots, setQuickLots] = useState(1)
  const [closingTrade, setClosingTrade] = useState(null)
  const [activeChartTab, setActiveChartTab] = useState(0)
  const [chartTabs, setChartTabs] = useState([{ id: 0, symbol: null }])
  const [chargeConfig, setChargeConfig] = useState(null) // Admin-configured charges and leverage
  const [tradingAccount, setTradingAccount] = useState(null) // User's Indian trading account
  const [tradingAccountBalance, setTradingAccountBalance] = useState(0) // User's trading account balance
  const socketRef = useRef(null)
  const livePricesRef = useRef({})

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  // Fetch Indian trading account balance
  const fetchTradingAccount = async () => {
    try {
      const res = await axios.get('/api/trading-accounts', getAuthHeader())
      if (res.data.success && res.data.data) {
        // Find Indian trading account (isIndian: true) or first INR account
        const indianAccount = res.data.data.find(acc => acc.isIndian || acc.currency === 'INR')
        if (indianAccount) {
          setTradingAccount(indianAccount)
          setTradingAccountBalance(indianAccount.balance || 0)
          console.log('[Account] Indian trading account:', indianAccount.accountNumber, 'Balance:', indianAccount.balance)
        } else {
          console.log('[Account] No Indian trading account found')
        }
      }
    } catch (e) {
      console.error('[Account] Failed to fetch trading account:', e.message)
    }
  }

  // Check Kite auth status and fetch trading account
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/kite/status', getAuthHeader())
        setKiteAuth(res.data.authenticated)
      } catch (e) {
        setKiteAuth(false)
      }
    }
    checkAuth()
    fetchTradingAccount()
  }, [])

  // Setup Socket.IO for live streaming - connect directly to wesocket_zerodha-kite project
  useEffect(() => {
    try {
      const zerodhaWsUrl = import.meta.env.VITE_ZERODHA_WS_URL || window.location.origin
      socketRef.current = io(zerodhaWsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5
      })

      socketRef.current.on('connect', () => {
        console.log('[Socket.IO] Connected for Indian market streaming, socket id:', socketRef.current.id)
        setIsStreaming(true)
      })

      socketRef.current.on('disconnect', () => {
        console.log('[Socket.IO] Disconnected')
        setIsStreaming(false)
      })

      socketRef.current.on('connect_error', (err) => {
        console.log('[Socket.IO] Connection error:', err.message)
      })

      // Listen for service status from zerodhaBridge
      socketRef.current.on('serviceStatus', (status) => {
        console.log('[Socket.IO] Service status:', status)
        if (status.tickerConnected) {
          setIsStreaming(true)
        }
      })

      // Single unified tick handler - use marketData from zerodhaBridge as primary source
      let ticksReceived = 0
      const handleTick = (token, ltp, tick) => {
        if (!token || !ltp) return
        
        // Log first 5 ticks
        if (ticksReceived < 5) {
          console.log('[TICK]', token, 'LTP:', ltp)
          ticksReceived++
        }
        
        // Store in ref
        livePricesRef.current[token] = { ...tick, ltp }
        livePricesRef.current[String(token)] = { ...tick, ltp }
        
        // Update watchlist - only if token matches
        setWatchlist(prev => {
          let updated = false
          const newList = prev.map(item => {
            if (String(item.token) === String(token)) {
              updated = true
              return {
                ...item,
                ltp: ltp,
                change: tick.ch || tick.change || item.change,
                changePercent: parseFloat(tick.chp) || tick.changePercent || item.changePercent,
                bid: tick.bid || ltp,
                ask: tick.ask || ltp,
                volume: tick.volume || item.volume,
                isLive: true
              }
            }
            return item
          })
          return updated ? newList : prev
        })
        
        // Update selected
        setSelected(prev => {
          if (!prev || String(prev.token) !== String(token)) return prev
          return { ...prev, ltp: ltp, isLive: true }
        })
      }

      // Listen for marketData from zerodhaBridge (primary source)
      socketRef.current.on('marketData', (ticks) => {
        if (!Array.isArray(ticks)) return
        ticks.forEach(tick => {
          const token = tick.instrument_token || tick.token
          const ltp = tick.ltp || tick.last_price
          handleTick(token, ltp, tick)
        })
      })

      // Listen for tickerStatus from wesocket_zerodha-kite
      socketRef.current.on('tickerStatus', (status) => {
        console.log('[Zerodha WS] Ticker status:', status)
        if (status.connected) {
          setIsStreaming(true)
        }
      })

      // Listen for bulk price updates
      socketRef.current.on('indian:prices', (prices) => {
        if (prices) {
          livePricesRef.current = { ...livePricesRef.current, ...prices }
        }
      })
    } catch (err) {
      console.error('[Socket.IO] Setup error:', err)
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])


  // Load ALL instruments from all segments at once on mount
  useEffect(() => {
    const loadAllInstruments = async () => {
      setLoading(true)
      try {
        // No auth needed for instruments - it's public
        console.log('[Instruments] Loading all segments...')
        const res = await axios.get('/api/kite/instruments/all')
        
        if (res.data.success && res.data.data) {
          const processedData = {}
          
          // Process each segment's instruments
          Object.keys(res.data.data).forEach(exchange => {
            processedData[exchange] = (res.data.data[exchange] || []).map(inst => ({
              symbol: inst.symbol || inst.tradingsymbol,
              name: inst.name || inst.symbol,
              exchange: inst.exchange || exchange,
              token: inst.token || inst.instrument_token,
              instrumentType: inst.instrumentType || inst.instrument_type || 'EQ',
              strike: inst.strike,
              expiry: inst.expiry,
              lotSize: inst.lotSize || inst.lot_size,
              ltp: inst.ltp || inst.lastPrice || inst.last_price || 0,
              change: inst.change || 0,
              changePercent: inst.changePercent || 0
            }))
          })
          
          setAllInstruments(processedData)
          setInstrumentsLoaded(true)
          
          // Set initial watchlist to NSE
          if (processedData.NSE && processedData.NSE.length > 0) {
            setWatchlist(processedData.NSE)
            setSelected(processedData.NSE[0])
          }
          
          console.log('[Instruments] Loaded all segments:', res.data.counts)
        }
      } catch (error) {
        console.error('Failed to load all instruments:', error.message)
      }
      setLoading(false)
    }
    
    loadAllInstruments()
  }, [])

  // Update watchlist when segment changes (use cached data)
  useEffect(() => {
    if (!instrumentsLoaded || !allInstruments[segment]) return
    
    let instruments = allInstruments[segment] || []
    
    // Filter by instrument type for F&O, MCX, and Currency segments (no equity)
    if (segment === 'NFO' || segment === 'BFO' || segment === 'MCX' || segment === 'CDS') {
      // First filter out equity - only show FUT/CE/PE
      instruments = instruments.filter(i => 
        i.instrumentType === 'FUT' || i.instrumentType === 'CE' || i.instrumentType === 'PE'
      )
      // Then filter by selected instrument type
      if (instrumentType && instrumentType !== 'EQ') {
        instruments = instruments.filter(i => i.instrumentType === instrumentType)
      }
    }
    
    // Filter by search query
    if (searchQuery && searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase()
      instruments = instruments.filter(i => 
        i.symbol?.toLowerCase().includes(q) || 
        i.name?.toLowerCase().includes(q)
      )
    }
    
    setWatchlist(instruments)
    if (instruments.length > 0 && (!selected || selected.exchange !== segment)) {
      setSelected(instruments[0])
    }
    
    // Auto-subscribe to live data for watchlist tokens when Kite is authenticated
    if (kiteAuth && instruments.length > 0) {
      const subscribeInstruments = instruments.slice(0, 50)
      const tokens = subscribeInstruments.map(i => parseInt(i.token)).filter(t => t && !isNaN(t))
      const instrumentsInfo = subscribeInstruments.map(i => ({ token: parseInt(i.token), symbol: i.symbol, exchange: i.exchange }))
      
      if (tokens.length > 0) {
        console.log(`[Live] Auto-subscribing to ${tokens.length} ${segment} tokens...`)
        
        // Subscribe via Socket.IO directly to wesocket_zerodha-kite
        if (socketRef.current?.connected) {
          socketRef.current.emit('setSubscriptions', tokens)
          console.log(`[Live] Sent setSubscriptions via Socket.IO for ${tokens.length} tokens`)
        }
      }
    }
  }, [segment, instrumentType, searchQuery, instrumentsLoaded, allInstruments, kiteAuth])

  // Fetch expiries for F&O
  useEffect(() => {
    if (segment === 'NFO' && selected) {
      const fetchExpiries = async () => {
        try {
          const res = await axios.get(`/api/kite/expiries?symbol=${selected.name || selected.symbol}`, getAuthHeader())
          if (res.data.success) {
            setExpiries(res.data.expiries || [])
          }
        } catch (e) {
          console.log('Failed to fetch expiries')
        }
      }
      fetchExpiries()
    }
  }, [segment, selected])

  // Search is now handled in the segment change effect above (no need for separate debounce)

  const formatNum = (n) => n?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'

  // Subscribe to live data for instrument tokens via wesocket_zerodha-kite
  const subscribeToLiveData = (tokens) => {
    if (socketRef.current?.connected && tokens.length > 0) {
      socketRef.current.emit('setSubscriptions', tokens)
      console.log(`[Live] Subscribed to ${tokens.length} instruments via WebSocket`)
    }
  }

  const placeOrder = async () => {
    if (!selected) {
      alert('Please select an instrument')
      return
    }
    
    if (!selected.ltp || selected.ltp <= 0) {
      alert('Please wait for live price data or enter a limit price')
      return
    }

    if (!tradingAccount) {
      alert('No Indian trading account found. Please create one first.')
      return
    }
    
    const orderPrice = priceType === 'MARKET' ? selected.ltp : parseFloat(price) || selected.ltp
    const orderQty = parseInt(quantity) || 1
    
    console.log(`[Trade] Placing ${orderSide} order: ${selected.symbol} @ ₹${orderPrice} x ${orderQty}`)
    
    try {
      const res = await axios.post('/api/indian-trades', {
        symbol: selected.symbol,
        exchange: selected.exchange,
        instrumentToken: parseInt(selected.token) || 0,
        instrumentType: selected.instrumentType || 'EQ',
        side: orderSide,
        quantity: orderQty,
        lotSize: selected.lotSize || 1,
        productType: orderType, // MIS, CNC, NRML
        orderType: priceType, // MARKET, LIMIT
        entryPrice: orderPrice,
        limitPrice: priceType === 'LIMIT' ? parseFloat(price) : undefined,
        strike: selected.strike || 0,
        expiry: selected.expiry || null,
        tradingAccountId: tradingAccount._id // Pass trading account ID
      }, getAuthHeader())
      
      if (res.data.success) {
        alert(`${orderSide} order ${priceType === 'MARKET' ? 'executed' : 'placed'} for ${selected.symbol}`)
        fetchIndianTrades()
        fetchTradingAccount() // Refresh balance after trade
      }
    } catch (error) {
      console.error('[Trade] Place order error:', error)
      alert(error.response?.data?.message || 'Failed to place order')
    }
  }

  const closePosition = async (pos) => {
    const tradeId = pos._id || pos.id
    if (!tradeId) {
      alert('Invalid trade ID')
      return
    }
    
    try {
      setClosingTrade(tradeId)
      const exitPrice = pos.ltp || pos.entryPrice
      console.log(`[Trade] Closing ${pos.symbol} at ₹${exitPrice}`)
      
      const res = await axios.post(`/api/indian-trades/${tradeId}/close`, {
        exitPrice: exitPrice
      }, getAuthHeader())
      
      if (res.data.success) {
        alert(`Trade closed. P&L: ₹${res.data.data.profit?.toFixed(2)}`)
        fetchIndianTrades()
        fetchTradingAccount() // Refresh balance after closing trade
      }
    } catch (error) {
      console.error('[Trade] Close error:', error)
      alert(error.response?.data?.message || 'Failed to close trade')
    } finally {
      setClosingTrade(null)
    }
  }
  
  const fetchIndianTrades = async () => {
    try {
      const res = await axios.get('/api/indian-trades', getAuthHeader())
      if (res.data.success) {
        setPositions(res.data.data.positions.map(t => ({
          id: t._id,
          _id: t._id,
          symbol: t.symbol,
          exchange: t.exchange,
          side: t.side,
          qty: t.quantity,
          entryPrice: t.entryPrice,
          ltp: t.ltp || t.entryPrice,
          type: t.productType
        })))
        setPendingOrders(res.data.data.pending.map(t => ({
          id: t._id,
          _id: t._id,
          symbol: t.symbol,
          exchange: t.exchange,
          side: t.side,
          qty: t.quantity,
          price: t.limitPrice || t.entryPrice,
          type: t.productType
        })))
        setClosedPositions(res.data.data.history.map(t => ({
          id: t._id,
          symbol: t.symbol,
          exchange: t.exchange,
          side: t.side,
          qty: t.quantity,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice,
          pnl: t.profit
        })))
      }
    } catch (error) {
      console.error('Failed to fetch Indian trades:', error)
    }
  }
  
  // Fetch trades on mount
  useEffect(() => {
    fetchIndianTrades()
  }, [])

  const handleKiteLogin = async () => {
    try {
      window.open('/api/kite/start', '_blank')
    } catch (e) {
      alert('Failed to get login URL')
    }
  }

  const segments = [
    { id: 'NSE', label: 'NSE' },
    { id: 'NFO', label: 'NSE F&O' },
    { id: 'MCX', label: 'MCX' },
    { id: 'BFO', label: 'BSE F&O' },
    { id: 'CDS', label: 'Currency' }
  ]

  // Handle segment change - set default instrument type
  const handleSegmentChange = (newSegment) => {
    setSegment(newSegment)
    // Set default to FUT for F&O, MCX, Currency segments
    if (newSegment === 'NFO' || newSegment === 'BFO' || newSegment === 'MCX' || newSegment === 'CDS') {
      setInstrumentType('FUT')
    } else {
      setInstrumentType('EQ')
    }
  }
  
  // Handle instrument click - add new chart tab
  const handleInstrumentClick = (item) => {
    setSelected(item)
    
    // Check if this symbol already has a tab
    const existingTabIndex = chartTabs.findIndex(t => t.symbol === item.symbol)
    if (existingTabIndex >= 0) {
      // Switch to existing tab
      setActiveChartTab(existingTabIndex)
    } else {
      // Add new tab for this instrument
      const newId = Math.max(...chartTabs.map(t => t.id), 0) + 1
      const newTab = { 
        id: newId, 
        symbol: item.symbol, 
        token: item.token,
        exchange: item.exchange,
        ltp: item.ltp,
        change: item.changePercent
      }
      setChartTabs([...chartTabs, newTab])
      setActiveChartTab(chartTabs.length) // Switch to new tab
    }
  }
  
  // Fetch charges config when segment or selected instrument changes
  useEffect(() => {
    const fetchCharges = async () => {
      if (!selected) return
      try {
        const res = await axios.get(`/api/indian-trades/charges?segment=${segment}&symbol=${selected.symbol}&productType=${orderType}`, getAuthHeader())
        if (res.data.success) {
          setChargeConfig(res.data.data)
          console.log('[Charges] Loaded config:', res.data.data)
        }
      } catch (e) {
        console.log('[Charges] Failed to fetch:', e.message)
      }
    }
    fetchCharges()
  }, [segment, selected?.symbol, orderType])
  
  // Get leverage from admin config
  const getLeverage = () => {
    if (chargeConfig?.leverage) {
      return chargeConfig.leverage[orderType] || 1
    }
    // Default leverage if no config
    if (orderType === 'MIS') return 5 // 5x = 20% margin
    if (orderType === 'CNC') return 1 // 1x = 100% margin
    if (orderType === 'NRML') return 2.5 // 2.5x = 40% margin
    return 1
  }
  
  // Get margin percentage based on leverage
  const getMarginPercentage = () => {
    const leverage = getLeverage()
    return 100 / leverage
  }
  
  // Calculate margin required
  const calculateMargin = () => {
    const tradeValue = quantity * (priceType === 'MARKET' ? (selected?.ltp || 0) : parseFloat(price) || 0)
    const leverage = getLeverage()
    return tradeValue / leverage
  }
  
  // Calculate estimated charges
  const calculateCharges = () => {
    if (!chargeConfig) return 0
    const tradeValue = quantity * (priceType === 'MARKET' ? (selected?.ltp || 0) : parseFloat(price) || 0)
    const lots = quantity / (selected?.lotSize || 1)
    
    let brokerage = 0
    if (chargeConfig.chargeType === 'per_lot') {
      brokerage = chargeConfig.brokerage * lots
    } else if (chargeConfig.chargeType === 'per_execution') {
      brokerage = chargeConfig.brokerage
    } else {
      brokerage = (chargeConfig.brokerage / 100) * tradeValue
    }
    
    const stt = (chargeConfig.sttPercentage / 100) * tradeValue
    const txnCharges = (chargeConfig.transactionChargePercentage / 100) * tradeValue
    const gst = (chargeConfig.gstPercentage / 100) * brokerage
    const sebi = (chargeConfig.sebiChargePercentage / 100) * tradeValue
    const stamp = (chargeConfig.stampDutyPercentage / 100) * tradeValue
    
    return brokerage + stt + txnCharges + gst + sebi + stamp + (chargeConfig.flatCharge || 0)
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounts')} style={{ color: 'var(--text-muted)' }}><ArrowLeft size={20} /></button>
          <IndianRupee className="text-orange-500" size={22} />
          <span className="font-bold">Indian Markets</span>
          {kiteAuth ? (
            <span className="flex items-center gap-1 text-xs text-green-500"><Wifi size={12} /> Kite Connected</span>
          ) : (
            <button onClick={handleKiteLogin} className="flex items-center gap-1 text-xs text-orange-500 hover:underline">
              <ExternalLink size={12} /> Connect Kite
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Live Status Indicator */}
          <div 
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded ${isStreaming ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}
            title={isStreaming ? 'Live streaming active' : 'Connecting...'}
          >
            {isStreaming ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isStreaming ? 'LIVE' : 'Connecting...'}
          </div>
          <div className="px-3 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Balance </span>
            <span className="font-semibold text-sm">₹{tradingAccountBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Instruments Panel */}
        {showInstruments ? (
          <div className="w-80 flex flex-col relative" style={{ backgroundColor: 'var(--bg-primary)', borderRight: '1px solid var(--border-color)' }}>
            {/* Segment Buttons */}
            <div className="p-2 flex flex-wrap gap-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              {segments.map(seg => (
                <button 
                  key={seg.id} 
                  onClick={() => handleSegmentChange(seg.id)} 
                  className={`px-2 py-1 text-xs font-medium rounded ${segment === seg.id ? 'bg-orange-500 text-white' : ''}`} 
                  style={segment !== seg.id ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            {/* Instrument Type Filter - FUT/CE/PE for F&O, MCX, Currency */}
            {(segment === 'NFO' || segment === 'BFO' || segment === 'MCX' || segment === 'CDS') && (
              <div className="px-2 py-1 flex gap-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <button 
                  onClick={() => setInstrumentType('FUT')} 
                  className={`px-2 py-1 text-xs rounded ${instrumentType === 'FUT' ? 'bg-blue-600 text-white' : ''}`} 
                  style={instrumentType !== 'FUT' ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}
                >
                  Futures
                </button>
                <button 
                  onClick={() => setInstrumentType('CE')} 
                  className={`px-2 py-1 text-xs rounded ${instrumentType === 'CE' ? 'bg-green-600 text-white' : ''}`} 
                  style={instrumentType !== 'CE' ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}
                >
                  Call
                </button>
                <button 
                  onClick={() => setInstrumentType('PE')} 
                  className={`px-2 py-1 text-xs rounded ${instrumentType === 'PE' ? 'bg-red-600 text-white' : ''}`} 
                  style={instrumentType !== 'PE' ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}
                >
                  Put
                </button>
              </div>
            )}

            {/* Search */}
            <div className="p-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Search symbols..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded text-sm focus:outline-none" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
              </div>
            </div>
            
            {/* Instruments List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="animate-spin" size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
              ) : watchlist.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No instruments found</p>
              ) : (
                watchlist.slice(0, 100).map((item, idx) => (
                  <div key={idx} onClick={() => handleInstrumentClick(item)} className="px-3 py-2.5 cursor-pointer hover:opacity-90" style={{ backgroundColor: selected?.symbol === item.symbol ? 'var(--bg-secondary)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.symbol}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {item.name || item.exchange}
                          {item.strike ? ` | ₹${item.strike}` : ''}
                          {item.expiry ? ` | ${new Date(item.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-medium text-sm">{item.ltp ? formatNum(item.ltp) : '-'}</p>
                        {item.changePercent !== undefined && (
                          <p className={`text-xs ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {item.change >= 0 ? '+' : ''}{item.changePercent?.toFixed(2) || '0.00'}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Watchlist Tabs */}
            <div className="flex items-center justify-between px-2 py-1" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
              <div className="flex gap-2">
                {['MW-1', 'MW-2', 'MW-3'].map(mw => (
                  <button key={mw} onClick={() => setActiveWatchlist(mw)} className={`px-3 py-1 text-xs rounded ${activeWatchlist === mw ? 'bg-blue-600 text-white' : ''}`} style={activeWatchlist !== mw ? { color: 'var(--text-muted)' } : {}}>
                    {mw}
                  </button>
                ))}
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>

            {/* Collapse Button */}
            <button onClick={() => setShowInstruments(false)} className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-r flex items-center justify-center z-10" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderLeft: 'none' }}>
              <ChevronLeft size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => setShowInstruments(true)} className="w-6 h-12 self-center rounded-r flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderLeft: 'none' }}>
            <ChevronRight size={14} />
          </button>
        )}

        {/* Chart & Positions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Symbol Info Bar */}
          {selected && (
            <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-4">
                <div>
                  <span className="font-bold">{selected.symbol}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{selected.exchange}</span>
                  {selected.strike && <span className="text-xs ml-2 text-orange-500">₹{selected.strike}</span>}
                  {selected.lotSize && <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>Lot: {selected.lotSize}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">₹{formatNum(selected.ltp || 0)}</span>
                  <span className={`text-sm ${(selected.change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(selected.change || 0) >= 0 ? '▲' : '▼'} {formatNum(Math.abs(selected.change || 0))} ({(selected.changePercent || 0).toFixed(2)}%)
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowOrderPanel(!showOrderPanel)
                  // Trigger chart resize after panel animation
                  setTimeout(() => window.dispatchEvent(new Event('chart-resize')), 100)
                }} 
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
              >
                {showOrderPanel ? 'Close' : 'New Order'}
              </button>
            </div>
          )}

          {/* Chart Tabs */}
          <div className="flex items-center shrink-0" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
            {chartTabs.map((tab, idx) => (
              <div 
                key={tab.id}
                onClick={() => setActiveChartTab(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer border-r transition-colors ${activeChartTab === idx ? 'bg-opacity-100' : 'bg-opacity-50 hover:bg-opacity-75'}`}
                style={{ 
                  backgroundColor: activeChartTab === idx ? 'var(--bg-primary)' : 'transparent',
                  borderColor: 'var(--border-color)',
                  color: activeChartTab === idx ? 'var(--text-primary)' : 'var(--text-muted)'
                }}
              >
                <span>{tab.symbol || selected?.symbol || 'Chart'}</span>
                {chartTabs.length > 1 && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation()
                      setChartTabs(chartTabs.filter((_, i) => i !== idx))
                      if (activeChartTab >= chartTabs.length - 1) setActiveChartTab(Math.max(0, chartTabs.length - 2))
                    }}
                    className="hover:text-red-500"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={() => {
                const newId = Math.max(...chartTabs.map(t => t.id)) + 1
                setChartTabs([...chartTabs, { id: newId, symbol: selected?.symbol }])
                setActiveChartTab(chartTabs.length)
              }}
              className="px-2 py-1.5 text-xs hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="Add Chart Tab"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Candlestick Chart - Show active tab's chart */}
          <div className="flex-1" style={{ minHeight: '250px', backgroundColor: 'var(--bg-primary)' }}>
            {chartTabs[activeChartTab]?.symbol ? (
              <IndianCandlestickChart 
                symbol={chartTabs[activeChartTab].symbol}
                token={chartTabs[activeChartTab].token}
                exchange={chartTabs[activeChartTab].exchange}
                ltp={chartTabs[activeChartTab].ltp || selected?.ltp}
                change={chartTabs[activeChartTab].change || selected?.changePercent}
              />
            ) : selected ? (
              <IndianCandlestickChart 
                symbol={selected.symbol}
                token={selected.token}
                exchange={selected.exchange}
                ltp={selected.ltp}
                change={selected.changePercent}
              />
            ) : (
              <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                <div className="text-center">
                  <RefreshCw size={48} className="mx-auto mb-2 opacity-20" />
                  <p>Select an instrument to view chart</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Tabs - Positions/Pending/History (Forex Style) */}
          <div className="flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', height: '200px' }}>
            {/* Tab Header with Controls */}
            <div className="flex items-center justify-between px-2 shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex">
                {[
                  { id: 'positions', label: 'Positions', count: positions.length },
                  { id: 'pending', label: 'Pending', count: pendingOrders.length },
                  { id: 'history', label: 'History', count: closedPositions.length }
                ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setBottomTab(tab.id)} 
                    className="px-3 py-2 text-xs font-medium transition-colors"
                    style={{ 
                      color: bottomTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                      borderBottom: bottomTab === tab.id ? '2px solid #22c55e' : '2px solid transparent'
                    }}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              
              {/* Right Controls */}
              <div className="flex items-center gap-3">
                {/* One Click Trading Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Quick</span>
                  <button
                    onClick={() => setShowOneClick(!showOneClick)}
                    className="relative w-9 h-5 rounded-full transition-all"
                    style={{ backgroundColor: showOneClick ? '#22c55e' : 'var(--bg-tertiary)' }}
                  >
                    <div 
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow"
                      style={{ left: showOneClick ? '18px' : '2px' }}
                    />
                  </button>
                </div>
                
                {/* Quick Trade Buttons */}
                {showOneClick && selected && (
                  <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <button
                      onClick={() => { setOrderSide('SELL'); placeOrder() }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-red-500 text-white hover:bg-red-600"
                    >S</button>
                    <input 
                      type="number" 
                      value={quickLots} 
                      onChange={(e) => setQuickLots(Math.max(1, parseInt(e.target.value) || 1))} 
                      className="w-10 text-center text-xs font-semibold rounded px-1 py-1" 
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} 
                    />
                    <button
                      onClick={() => { setOrderSide('BUY'); placeOrder() }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-green-500 text-white hover:bg-green-600"
                    >B</button>
                  </div>
                )}
                
                {/* Floating P&L */}
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>P/L:</span>
                  <span className={`text-sm font-bold ${positions.reduce((sum, p) => sum + ((p.side === 'BUY' ? (p.ltp - p.entryPrice) : (p.entryPrice - p.ltp)) * p.qty), 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{formatNum(positions.reduce((sum, p) => sum + ((p.side === 'BUY' ? (p.ltp - p.entryPrice) : (p.entryPrice - p.ltp)) * p.qty), 0))}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Table Header */}
            <div 
              className="grid gap-2 px-3 py-1.5 text-xs shrink-0"
              style={{ 
                gridTemplateColumns: bottomTab === 'positions' ? '1fr 0.6fr 0.5fr 0.8fr 0.8fr 0.8fr 0.6fr' : '1fr 0.6fr 0.5fr 0.8fr 0.8fr 0.6fr',
                borderBottom: '1px solid var(--border-color)', 
                color: 'var(--text-muted)' 
              }}
            >
              <div>Symbol</div>
              <div>Side</div>
              <div>Qty</div>
              <div>Entry</div>
              <div>{bottomTab === 'history' ? 'Exit' : 'LTP'}</div>
              <div>P&L</div>
              {bottomTab === 'positions' && <div>Action</div>}
            </div>
            
            {/* Table Body */}
            <div className="flex-1 overflow-y-auto">
              {bottomTab === 'positions' && (positions.length === 0 ? (
                <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                  No open positions
                </div>
              ) : (
                positions.map(pos => {
                  const pnl = pos.side === 'BUY' ? (pos.ltp - pos.entryPrice) * pos.qty : (pos.entryPrice - pos.ltp) * pos.qty
                  return (
                    <div 
                      key={pos.id}
                      className="grid gap-2 px-3 py-1.5 text-xs items-center hover:bg-white/5 transition-colors"
                      style={{ gridTemplateColumns: '1fr 0.6fr 0.5fr 0.8fr 0.8fr 0.8fr 0.6fr' }}
                    >
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{pos.symbol}</div>
                      <div>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${pos.side === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {pos.side}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>{pos.qty}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>₹{formatNum(pos.entryPrice)}</div>
                      <div style={{ color: 'var(--text-primary)' }}>₹{formatNum(pos.ltp)}</div>
                      <div className={`font-medium ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pnl >= 0 ? '+' : ''}₹{formatNum(pnl)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => closePosition(pos)}
                          disabled={closingTrade === pos._id}
                          className="text-red-500 hover:text-red-400 transition-colors"
                          title="Close"
                        >
                          {closingTrade === pos._id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        </button>
                      </div>
                    </div>
                  )
                })
              ))}
              
              {bottomTab === 'pending' && (pendingOrders.length === 0 ? (
                <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                  No pending orders
                </div>
              ) : (
                pendingOrders.map(order => (
                  <div 
                    key={order.id}
                    className="grid gap-2 px-3 py-1.5 text-xs items-center hover:bg-white/5 transition-colors"
                    style={{ gridTemplateColumns: '1fr 0.6fr 0.5fr 0.8fr 0.8fr 0.6fr' }}
                  >
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{order.symbol}</div>
                    <div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${order.side === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {order.side}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>{order.qty}</div>
                    <div style={{ color: '#fbbf24' }}>₹{formatNum(order.price)}</div>
                    <div style={{ color: 'var(--text-muted)' }}>-</div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setPendingOrders(pendingOrders.filter(o => o.id !== order.id))}
                        className="text-red-500 hover:text-red-400 transition-colors"
                        title="Cancel"
                      >
                        <XCircle size={12} />
                      </button>
                    </div>
                  </div>
                ))
              ))}
              
              {bottomTab === 'history' && (closedPositions.length === 0 ? (
                <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                  No trade history
                </div>
              ) : (
                closedPositions.map(pos => (
                  <div 
                    key={pos.id}
                    className="grid gap-2 px-3 py-1.5 text-xs items-center hover:bg-white/5 transition-colors"
                    style={{ gridTemplateColumns: '1fr 0.6fr 0.5fr 0.8fr 0.8fr 0.6fr' }}
                  >
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{pos.symbol}</div>
                    <div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${pos.side === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {pos.side}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>{pos.qty}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>₹{formatNum(pos.entryPrice)}</div>
                    <div style={{ color: 'var(--text-primary)' }}>₹{formatNum(pos.exitPrice || pos.ltp)}</div>
                    <div className={`font-medium ${pos.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pos.pnl >= 0 ? '+' : ''}₹{formatNum(pos.pnl)}
                    </div>
                  </div>
                ))
              ))}
            </div>
          </div>
        </div>

        {/* Order Panel */}
        {showOrderPanel && (
          <div className="w-64 flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span className="font-medium text-sm truncate">{selected?.symbol}</span>
              <button onClick={() => setShowOrderPanel(false)}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div className="flex p-2 gap-2">
              <button onClick={() => setOrderSide('BUY')} className={`flex-1 py-2 rounded font-bold text-sm ${orderSide === 'BUY' ? 'bg-green-600 text-white' : ''}`} style={orderSide !== 'BUY' ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}>BUY</button>
              <button onClick={() => setOrderSide('SELL')} className={`flex-1 py-2 rounded font-bold text-sm ${orderSide === 'SELL' ? 'bg-red-600 text-white' : ''}`} style={orderSide !== 'SELL' ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}>SELL</button>
            </div>
            <div className="px-3 py-2">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Product</label>
              <div className="grid grid-cols-3 gap-1">
                {['MIS', 'CNC', 'NRML'].map(t => (<button key={t} onClick={() => setOrderType(t)} className={`py-1.5 rounded text-xs font-medium ${orderType === t ? 'bg-orange-500 text-white' : ''}`} style={orderType !== t ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}>{t}</button>))}
              </div>
            </div>
            <div className="px-3 py-2">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Type</label>
              <div className="grid grid-cols-2 gap-1">
                {['MARKET', 'LIMIT'].map(t => (<button key={t} onClick={() => setPriceType(t)} className={`py-1.5 rounded text-xs font-medium ${priceType === t ? 'bg-blue-600 text-white' : ''}`} style={priceType !== t ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}>{t}</button>))}
              </div>
            </div>
            <div className="px-3 py-2">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Qty {selected?.lotSize && `(Lot: ${selected.lotSize})`}</label>
              <div className="flex items-center gap-1">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}><Minus size={14} /></button>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 text-center py-1.5 rounded text-sm focus:outline-none" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}><Plus size={14} /></button>
              </div>
            </div>
            {priceType === 'LIMIT' && (
              <div className="px-3 py-2">
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Price</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={selected?.ltp?.toString() || '0'} className="w-full px-2 py-1.5 rounded text-sm focus:outline-none" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
              </div>
            )}
            <div className="px-3 py-2 mt-auto" style={{ borderTop: '1px solid var(--border-color)' }}>
              {/* Trade Value */}
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Trade Value: <span style={{ color: 'var(--text-primary)' }}>₹{formatNum(quantity * (priceType === 'MARKET' ? (selected?.ltp || 0) : parseFloat(price) || 0))}</span>
              </div>
              {/* Margin Required with Leverage */}
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Margin ({getLeverage()}x leverage): <span className="text-orange-500 font-medium">₹{formatNum(calculateMargin())}</span>
              </div>
              {/* Estimated Charges */}
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Est. Charges: <span className="text-yellow-500">₹{formatNum(calculateCharges())}</span>
              </div>
              {/* Total Required */}
              <div className="text-xs mb-1 font-medium" style={{ color: 'var(--text-primary)' }}>
                Total Required: <span className="text-cyan-400">₹{formatNum(calculateMargin() + calculateCharges())}</span>
              </div>
              {/* Product Type Info */}
              <div className="text-xs mb-2 px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                {orderType === 'MIS' && <span className="text-blue-400">Intraday ({getLeverage()}x) - Auto square-off at 3:15 PM</span>}
                {orderType === 'CNC' && <span className="text-green-400">Delivery (No leverage) - Shares credited to Demat</span>}
                {orderType === 'NRML' && <span className="text-purple-400">Carryforward ({getLeverage()}x) - Hold till expiry</span>}
              </div>
              <button onClick={placeOrder} disabled={!selected} className={`w-full py-2.5 rounded font-bold text-sm text-white ${orderSide === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
                {orderSide} {selected?.symbol || 'Select'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IndianTradingDashboard
