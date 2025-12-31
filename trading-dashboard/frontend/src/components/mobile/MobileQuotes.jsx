import React, { useState, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, X, Minus, Plus, LineChart, Home } from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../../context/ThemeContext'

const MobileQuotes = ({ onOpenChart, onGoHome }) => {
  const { isDark } = useTheme()
  const bgPrimary = isDark ? '#000' : '#f5f5f7'
  const bgCard = isDark ? '#0d0d0d' : '#ffffff'
  const bgSecondary = isDark ? '#1a1a1a' : '#f2f2f7'
  const borderColor = isDark ? '#1a1a1a' : '#e5e5ea'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? '#6b7280' : '#8e8e93'
  const [instruments, setInstruments] = useState([])
  const [prices, setPrices] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedSymbol, setSelectedSymbol] = useState(null)
  const [showTradePopup, setShowTradePopup] = useState(false)
  
  // Order form state
  const [orderType, setOrderType] = useState('market') // market or pending
  const [volume, setVolume] = useState(0.01)
  const [selectedLeverage, setSelectedLeverage] = useState(100)
  const [maxLeverage, setMaxLeverage] = useState(1000)
  const [showStopLoss, setShowStopLoss] = useState(false)
  const [showTakeProfit, setShowTakeProfit] = useState(false)
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [pendingOrderType, setPendingOrderType] = useState('BUY LIMIT')
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState(0)

  const categories = ['All', 'Forex', 'Crypto', 'Metals']

  useEffect(() => {
    fetchInstruments()
    const priceInterval = setInterval(fetchPrices, 1000)
    return () => clearInterval(priceInterval)
  }, [])

  const fetchInstruments = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/market/instruments', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setInstruments(res.data.data || [])
      }
    } catch (err) {
      console.error('Error fetching instruments:', err)
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
    } catch (err) {
      console.error('Error fetching prices:', err)
    }
  }

  const handleSymbolClick = (symbol) => {
    setSelectedSymbol(symbol)
    localStorage.setItem('selectedSymbol', symbol)
    setShowTradePopup(true)
  }

  // Fetch account data for leverage
  useEffect(() => {
    const fetchAccountData = async () => {
      const savedAccount = localStorage.getItem('activeTradingAccount')
      if (savedAccount) {
        try {
          const token = localStorage.getItem('token')
          const accountData = JSON.parse(savedAccount)
          const res = await axios.get(`/api/trading-accounts/${accountData._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.data.success && res.data.data) {
            setBalance(res.data.data.balance || 0)
            setMaxLeverage(res.data.data.leverage || 1000)
          }
        } catch (err) {}
      }
    }
    fetchAccountData()
  }, [showTradePopup])

  const adjustVolume = (delta) => {
    const newVol = Math.max(0.01, Math.round((volume + delta) * 100) / 100)
    setVolume(newVol)
  }

  const pendingOrderTypes = ['BUY LIMIT', 'SELL LIMIT', 'BUY STOP', 'SELL STOP']

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

  const handleTrade = async (type) => {
    // Check kill switch
    if (isTradingLocked()) {
      alert('Trading is currently locked. Kill switch is active.')
      return
    }

    const activeAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || '{}')
    if (!activeAccount._id) {
      alert('Please select a trading account first')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const orderData = {
        symbol: selectedSymbol,
        type,
        amount: volume,
        leverage: selectedLeverage,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        tradingAccountId: activeAccount._id
      }

      if (orderType === 'market') {
        orderData.orderType = 'market'
      } else {
        const pendingType = pendingOrderType.toLowerCase().replace(' ', '_')
        orderData.orderType = pendingType.includes('limit') ? 'limit' : 'stop'
        orderData.price = parseFloat(entryPrice)
        orderData.type = pendingOrderType.toLowerCase().includes('buy') ? 'buy' : 'sell'
        
        if (!entryPrice) {
          alert('Please enter entry price for pending order')
          setLoading(false)
          return
        }
      }

      const res = await axios.post('/api/trades', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        window.dispatchEvent(new Event('tradeCreated'))
        setShowTradePopup(false)
        // Reset form
        setVolume(0.01)
        setStopLoss('')
        setTakeProfit('')
        setEntryPrice('')
        setShowStopLoss(false)
        setShowTakeProfit(false)
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Trade failed')
    } finally {
      setLoading(false)
    }
  }

  const filteredInstruments = instruments.filter(inst => {
    const matchesSearch = inst.symbol?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === 'All' || inst.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const getCategory = (symbol) => {
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('LTC') || symbol.includes('XRP')) return 'Crypto'
    if (symbol.includes('XAU') || symbol.includes('XAG')) return 'Metals'
    return 'Forex'
  }

  // Build display list from prices if instruments are empty
  const displayList = filteredInstruments.length > 0 ? filteredInstruments : 
    Object.keys(prices).filter(symbol => {
      const matchesSearch = symbol.toLowerCase().includes(searchTerm.toLowerCase())
      const category = getCategory(symbol)
      const matchesCategory = activeCategory === 'All' || category === activeCategory
      return matchesSearch && matchesCategory
    }).map(symbol => ({ symbol, category: getCategory(symbol) }))

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

  // Format price with correct decimals (remove trailing zeros)
  const formatPrice = (price, symbol) => {
    if (!price) return '---'
    return parseFloat(price.toFixed(getDecimals(symbol))).toString()
  }

  // Helper to format price with big last pip (MT5 style)
  const formatPriceWithBigPip = (price, symbol, type) => {
    if (!price) return { main: '---', pip: '', decimal: '' }
    
    const decimals = getDecimals(symbol)
    const priceStr = price.toFixed(decimals)
    
    // Split into main part and last digit (pip)
    const main = priceStr.slice(0, -1)
    const pip = priceStr.slice(-1)
    
    return { main, pip, full: priceStr }
  }

  // Calculate spread in pips
  const calculateSpread = (bid, ask, symbol) => {
    if (!bid || !ask) return 0
    const isJPY = symbol?.includes('JPY')
    const multiplier = isJPY ? 100 : 10000
    const spread = Math.round((ask - bid) * multiplier)
    return spread
  }

  // Get instrument fixed spread (admin set) - default 0
  const getFixedSpread = (symbol) => {
    const inst = instruments.find(i => i.symbol === symbol)
    return inst?.spread || 0
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: bgPrimary }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {onGoHome && (
              <button 
                onClick={onGoHome}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: bgSecondary }}
              >
                <Home size={18} color={textPrimary} />
              </button>
            )}
            <h1 className="text-xl font-bold" style={{ color: textPrimary }}>Quotes</h1>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: textSecondary }} />
          <input
            type="text"
            placeholder="Search instruments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: textPrimary }}
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
              style={{ 
                backgroundColor: activeCategory === cat ? '#3b82f6' : bgSecondary,
                color: activeCategory === cat ? '#fff' : textSecondary
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MT5 Style Instruments List */}
      <div className="flex-1 overflow-y-auto px-2">
        {displayList.map((inst) => {
          const symbol = inst.symbol
          const price = prices[symbol]
          const bid = price?.bid || 0
          const ask = price?.ask || 0
          const low = price?.low || bid * 0.998
          const high = price?.high || ask * 1.002
          
          const bidFormatted = formatPriceWithBigPip(bid, symbol, 'bid')
          const askFormatted = formatPriceWithBigPip(ask, symbol, 'ask')
          
          const marketSpread = calculateSpread(bid, ask, symbol)
          const fixedSpread = getFixedSpread(symbol)
          const totalSpread = marketSpread + fixedSpread

          const now = new Date()
          const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

          return (
            <div
              key={symbol}
              onClick={() => handleSymbolClick(symbol)}
              className="flex items-center py-2.5 px-2 mx-1 mb-1 rounded-xl"
              style={{ 
                backgroundColor: isDark ? '#0d0d0d' : '#fff', 
                border: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` 
              }}
            >
              {/* Time & Symbol */}
              <div className="w-16 flex-shrink-0">
                <div className="text-[10px]" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>{time}</div>
                <div className="font-bold text-xs" style={{ color: isDark ? '#fff' : '#000' }}>{symbol}</div>
              </div>

              {/* Sell (Bid) */}
              <div className="flex-1 text-center">
                <div className="text-[10px]" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>sell</div>
                <div className="flex items-baseline justify-center">
                  <span className="text-sm font-medium" style={{ color: '#ef4444' }}>{bidFormatted.main}</span>
                  <span className="text-xl font-bold" style={{ color: '#ef4444' }}>{bidFormatted.pip}</span>
                </div>
                <div className="text-[10px]" style={{ color: '#3b82f6' }}>low {low.toFixed(symbol?.includes('BTC') ? 1 : symbol?.includes('ETH') || symbol?.includes('XAU') ? 2 : symbol?.includes('JPY') ? 2 : 4)}</div>
              </div>

              {/* Spread */}
              <div className="w-12 text-center flex-shrink-0">
                <div className="text-[10px]" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>spread</div>
                <div className="text-base font-bold" style={{ color: isDark ? '#fff' : '#000' }}>{totalSpread}</div>
              </div>

              {/* Buy (Ask) */}
              <div className="flex-1 text-center">
                <div className="text-[10px]" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>buy</div>
                <div className="flex items-baseline justify-center">
                  <span className="text-sm font-medium" style={{ color: '#3b82f6' }}>{askFormatted.main}</span>
                  <span className="text-xl font-bold" style={{ color: '#3b82f6' }}>{askFormatted.pip}</span>
                </div>
                <div className="text-[10px]" style={{ color: '#3b82f6' }}>high {high.toFixed(symbol?.includes('BTC') ? 1 : symbol?.includes('ETH') || symbol?.includes('XAU') ? 2 : symbol?.includes('JPY') ? 2 : 4)}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* iOS-style Trade Popup */}
      {showTradePopup && selectedSymbol && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end ios-sheet-backdrop">
          <div 
            className="rounded-t-3xl overflow-hidden ios-sheet overflow-y-auto"
            style={{ 
              background: isDark ? 'rgba(28, 28, 30, 0.98)' : '#fff',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              maxHeight: '90vh' 
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: isDark ? '#4a4a4c' : '#d1d1d6' }}></div>
            </div>
            
            {/* Popup Header */}
            <div className="flex items-center justify-between px-5 py-3 sticky top-0 z-10" style={{ background: isDark ? 'rgba(28, 28, 30, 0.98)' : '#fff' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: isDark ? '#fff' : '#000' }}>{selectedSymbol}</h2>
                <div className="text-sm mt-1">
                  <span style={{ color: '#ef4444' }} className="font-medium">{formatPrice(prices[selectedSymbol]?.bid, selectedSymbol)}</span>
                  <span style={{ color: isDark ? '#4a4a4c' : '#c7c7cc' }} className="mx-2">/</span>
                  <span style={{ color: '#3b82f6' }} className="font-medium">{formatPrice(prices[selectedSymbol]?.ask, selectedSymbol)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setShowTradePopup(false)
                    if (onOpenChart) onOpenChart(selectedSymbol)
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#3b82f6' }}
                  title="Open Chart"
                >
                  <LineChart size={18} color="#fff" />
                </button>
                <button 
                  onClick={() => setShowTradePopup(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f2f2f7' }}
                >
                  <X size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                </button>
              </div>
            </div>

            {/* Order Form */}
            <div className="p-4">
              {/* Order Type Tabs */}
              <div className="flex mb-4 rounded-lg overflow-hidden" style={{ backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7' }}>
                <button
                  onClick={() => setOrderType('market')}
                  className="flex-1 py-2.5 text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: orderType === 'market' ? '#3b82f6' : 'transparent',
                    color: orderType === 'market' ? '#fff' : (isDark ? '#9ca3af' : '#6b7280')
                  }}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType('pending')}
                  className="flex-1 py-2.5 text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: orderType === 'pending' ? '#3b82f6' : 'transparent',
                    color: orderType === 'pending' ? '#fff' : (isDark ? '#9ca3af' : '#6b7280')
                  }}
                >
                  Pending
                </button>
              </div>

              {/* Pending Order Type */}
              {orderType === 'pending' && (
                <div className="mb-3">
                  <label className="text-xs mb-1 block" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Order Type</label>
                  <select
                    value={pendingOrderType}
                    onChange={(e) => setPendingOrderType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5ea'}` }}
                  >
                    {pendingOrderTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Entry Price for Pending */}
              {orderType === 'pending' && (
                <div className="mb-3">
                  <label className="text-xs mb-1 block" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Entry Price</label>
                  <input
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder={formatPrice(prices[selectedSymbol]?.bid, selectedSymbol)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5ea'}` }}
                  />
                </div>
              )}

              {/* Volume */}
              <div className="mb-3">
                <label className="text-xs mb-1 block" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Volume (Lots)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustVolume(-0.01)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center active:opacity-70"
                    style={{ backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' }}
                  >
                    <Minus size={16} color={isDark ? '#fff' : '#000'} />
                  </button>
                  <input
                    type="number"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value) || 0.01)}
                    step="0.01"
                    min="0.01"
                    className="flex-1 px-3 py-2.5 rounded-lg text-center font-bold"
                    style={{ backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5ea'}` }}
                  />
                  <button
                    onClick={() => adjustVolume(0.01)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center active:opacity-70"
                    style={{ backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' }}
                  >
                    <Plus size={16} color={isDark ? '#fff' : '#000'} />
                  </button>
                </div>
              </div>

              {/* Leverage */}
              <div className="mb-3">
                <label className="text-xs mb-1 block" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Leverage</label>
                <select
                  value={selectedLeverage}
                  onChange={(e) => setSelectedLeverage(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5ea'}` }}
                >
                  {[30, 50, 100, 200, 400, 500, 600, 800, 1000, 1500, 2000].filter(l => l <= maxLeverage).map(lev => (
                    <option key={lev} value={lev}>1:{lev}</option>
                  ))}
                </select>
              </div>

              {/* Stop Loss */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Stop Loss</label>
                  <button
                    onClick={() => setShowStopLoss(!showStopLoss)}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: showStopLoss ? '#ef4444' : (isDark ? '#2c2c2e' : '#e5e5ea'),
                      color: showStopLoss ? '#fff' : (isDark ? '#9ca3af' : '#6b7280')
                    }}
                  >
                    {showStopLoss ? 'ON' : 'OFF'}
                  </button>
                </div>
                {showStopLoss && (
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Stop Loss Price"
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5ea'}` }}
                  />
                )}
              </div>

              {/* Take Profit */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>Take Profit</label>
                  <button
                    onClick={() => setShowTakeProfit(!showTakeProfit)}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: showTakeProfit ? '#22c55e' : (isDark ? '#2c2c2e' : '#e5e5ea'),
                      color: showTakeProfit ? '#fff' : (isDark ? '#9ca3af' : '#6b7280')
                    }}
                  >
                    {showTakeProfit ? 'ON' : 'OFF'}
                  </button>
                </div>
                {showTakeProfit && (
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Take Profit Price"
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7', color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5ea'}` }}
                  />
                )}
              </div>

              {/* Buy/Sell Buttons - Slim & Attractive */}
              {orderType === 'market' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTrade('sell')}
                    disabled={loading}
                    className="flex-1 py-3 rounded-full font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                  >
                    <span>SELL</span>
                    <span className="text-xs opacity-80">{formatPrice(prices[selectedSymbol]?.bid, selectedSymbol)}</span>
                  </button>
                  <button
                    onClick={() => handleTrade('buy')}
                    disabled={loading}
                    className="flex-1 py-3 rounded-full font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                  >
                    <span>BUY</span>
                    <span className="text-xs opacity-80">{formatPrice(prices[selectedSymbol]?.ask, selectedSymbol)}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleTrade(pendingOrderType.toLowerCase().includes('buy') ? 'buy' : 'sell')}
                  disabled={loading}
                  className="w-full py-3 rounded-full font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: pendingOrderType.includes('BUY') ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                >
                  {loading ? 'Placing...' : `Place ${pendingOrderType}`}
                </button>
              )}
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
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default MobileQuotes
