import React, { useState, useEffect } from 'react'
import { X, Plus, Menu } from 'lucide-react'
import axios from 'axios'
import TradingChart from '../TradingChart'
import { useTheme } from '../../context/ThemeContext'

const MobileChart = () => {
  const { isDark } = useTheme()
  const [chartTabs, setChartTabs] = useState(() => {
    const saved = localStorage.getItem('selectedSymbol') || 'XAUUSD'
    return [{ id: 1, symbol: saved }]
  })
  const [activeTabId, setActiveTabId] = useState(1)
  const [prices, setPrices] = useState({})
  const [quickLots, setQuickLots] = useState(0.01)
  const [loading, setLoading] = useState(false)
  const [showSymbolPicker, setShowSymbolPicker] = useState(false)
  const [instruments, setInstruments] = useState([])

  const activeTab = chartTabs.find(t => t.id === activeTabId) || chartTabs[0]
  const selectedSymbol = activeTab?.symbol || 'XAUUSD'

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

  useEffect(() => {
    fetchPrices()
    fetchInstruments()
    const interval = setInterval(fetchPrices, 1000)
    return () => clearInterval(interval)
  }, [])

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

  const fetchInstruments = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/market/instruments', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setInstruments(res.data.data || [])
      }
    } catch (err) {}
  }

  const addTab = (symbol) => {
    const newId = Math.max(...chartTabs.map(t => t.id), 0) + 1
    setChartTabs([...chartTabs, { id: newId, symbol }])
    setActiveTabId(newId)
    setShowSymbolPicker(false)
  }

  const closeTab = (tabId) => {
    if (chartTabs.length === 1) return
    const newTabs = chartTabs.filter(t => t.id !== tabId)
    setChartTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id)
    }
  }

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

    if (!quickLots || quickLots < 0.01) {
      alert('Invalid lot size')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Please login first')
        setLoading(false)
        return
      }

      const res = await axios.post('/api/trades', {
        symbol: selectedSymbol,
        type,
        amount: quickLots,
        orderType: 'market',
        tradingAccountId: activeAccount._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        window.dispatchEvent(new Event('tradeCreated'))
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Trade failed')
    } finally {
      setLoading(false)
    }
  }

  const price = prices[selectedSymbol] || { bid: 0, ask: 0 }
  
  // Categorize instruments
  const getCategory = (symbol) => {
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('LTC') || symbol.includes('XRP') || symbol.includes('DOGE') || symbol.includes('SOL')) return 'Crypto'
    if (symbol.includes('XAU') || symbol.includes('XAG')) return 'Metals'
    return 'Forex'
  }

  const symbolList = instruments.length > 0 ? instruments.map(i => i.symbol) : Object.keys(prices)
  
  // Group symbols by category
  const groupedSymbols = symbolList.reduce((acc, symbol) => {
    const cat = getCategory(symbol)
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(symbol)
    return acc
  }, {})

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: isDark ? '#000' : '#f5f5f7' }}>
      {/* Chart Tabs */}
      <div 
        className="flex items-center px-2 py-2 overflow-x-auto" 
        style={{ backgroundColor: isDark ? '#0a0a0a' : '#fff', borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}
      >
        {chartTabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg mr-1"
            style={{ 
              backgroundColor: activeTabId === tab.id ? '#3b82f6' : (isDark ? '#1a1a1a' : '#e5e5ea')
            }}
          >
            <span className="text-xs font-medium" style={{ color: activeTabId === tab.id ? '#fff' : (isDark ? '#fff' : '#000') }}>{tab.symbol}</span>
            {chartTabs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                className="ml-1 rounded"
              >
                <X size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowSymbolPicker(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center ml-1"
          style={{ backgroundColor: isDark ? '#1a1a1a' : '#e5e5ea' }}
        >
          <Plus size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
        </button>
      </div>

      {/* Full Screen Chart */}
      <div className="flex-1 relative">
        <TradingChart symbol={selectedSymbol} />
      </div>

      {/* Slim Buy/Sell Panel at Bottom */}
      <div 
        className="px-3 py-2 flex items-center gap-2" 
        style={{ backgroundColor: isDark ? '#0a0a0a' : '#fff', borderTop: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}` }}
      >
        <button
          onClick={() => handleTrade('sell')}
          disabled={loading}
          className="flex-1 py-2.5 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
        >
          <span>SELL</span>
          <span className="text-xs opacity-80">{formatPrice(price.bid, selectedSymbol)}</span>
        </button>
        
        <input
          type="number"
          value={quickLots}
          onChange={(e) => setQuickLots(parseFloat(e.target.value) || 0.01)}
          step="0.01"
          min="0.01"
          className="w-16 px-2 py-2 rounded-full text-center text-xs font-bold"
          style={{ backgroundColor: isDark ? '#1a1a1a' : '#e5e5ea', color: isDark ? '#fff' : '#000', border: 'none' }}
        />
        
        <button
          onClick={() => handleTrade('buy')}
          disabled={loading}
          className="flex-1 py-2.5 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
        >
          <span>BUY</span>
          <span className="text-xs opacity-80">{formatPrice(price.ask, selectedSymbol)}</span>
        </button>
      </div>

      
      {/* Symbol Picker Modal - Segmented by Category */}
      {showSymbolPicker && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-h-[70vh] rounded-t-2xl overflow-hidden" style={{ backgroundColor: isDark ? '#1c1c1e' : '#fff' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${isDark ? '#2c2c2e' : '#e5e5ea'}` }}>
              <h3 className="font-bold" style={{ color: isDark ? '#fff' : '#000' }}>Add Chart</h3>
              <button onClick={() => setShowSymbolPicker(false)}>
                <X size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[55vh] p-3">
              {Object.entries(groupedSymbols).map(([category, symbols]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-xs font-bold uppercase mb-2 px-2" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>{category}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {symbols.map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => addTab(symbol)}
                        className="px-3 py-2.5 rounded-lg text-center"
                        style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }}
                      >
                        <span className="text-sm font-medium" style={{ color: isDark ? '#fff' : '#000' }}>{symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileChart
