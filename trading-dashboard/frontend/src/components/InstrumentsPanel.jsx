import React, { useState, useEffect } from 'react'
import { X, Search, Star, Wifi, WifiOff } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../context/SocketContext'
import axios from 'axios'

const baseInstruments = [
  // Major Forex pairs
  { symbol: 'EURUSD', favorite: true, category: 'forex', decimals: 5 },
  { symbol: 'GBPUSD', favorite: true, category: 'forex', decimals: 5 },
  { symbol: 'USDJPY', favorite: false, category: 'forex', decimals: 3 },
  { symbol: 'USDCHF', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'AUDUSD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'NZDUSD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'USDCAD', favorite: false, category: 'forex', decimals: 5 },
  // Cross pairs
  { symbol: 'EURGBP', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'EURJPY', favorite: false, category: 'forex', decimals: 3 },
  { symbol: 'GBPJPY', favorite: false, category: 'forex', decimals: 3 },
  { symbol: 'EURCHF', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'AUDCAD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'AUDCHF', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'AUDJPY', favorite: false, category: 'forex', decimals: 3 },
  { symbol: 'AUDNZD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'CADCHF', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'CADJPY', favorite: false, category: 'forex', decimals: 3 },
  { symbol: 'CHFJPY', favorite: false, category: 'forex', decimals: 3 },
  { symbol: 'EURAUD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'EURCAD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'EURNZD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'GBPAUD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'GBPCAD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'GBPCHF', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'GBPNZD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'NZDCAD', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'NZDCHF', favorite: false, category: 'forex', decimals: 5 },
  { symbol: 'NZDJPY', favorite: false, category: 'forex', decimals: 3 },
  // Metals
  { symbol: 'XAUUSD', favorite: true, category: 'metals', decimals: 2 },
  { symbol: 'XAGUSD', favorite: false, category: 'metals', decimals: 3 },
  { symbol: 'XAUEUR', favorite: false, category: 'metals', decimals: 2 },
  // Indices
  { symbol: 'US30', favorite: false, category: 'indices', decimals: 1 },
  { symbol: 'US500', favorite: false, category: 'indices', decimals: 1 },
  { symbol: 'US100', favorite: false, category: 'indices', decimals: 1 },
  { symbol: 'DE30', favorite: false, category: 'indices', decimals: 1 },
  { symbol: 'UK100', favorite: false, category: 'indices', decimals: 1 },
  { symbol: 'JP225', favorite: false, category: 'indices', decimals: 0 },
  // Crypto
  { symbol: 'BTCUSD', favorite: false, category: 'crypto', decimals: 2 },
  { symbol: 'ETHUSD', favorite: false, category: 'crypto', decimals: 2 },
  { symbol: 'LTCUSD', favorite: false, category: 'crypto', decimals: 2 },
  { symbol: 'XRPUSD', favorite: false, category: 'crypto', decimals: 5 },
  // Energy
  { symbol: 'USOIL', favorite: false, category: 'commodities', decimals: 2 },
  { symbol: 'UKOIL', favorite: false, category: 'commodities', decimals: 2 },
  { symbol: 'XNGUSD', favorite: false, category: 'commodities', decimals: 3 },
]

const InstrumentsPanel = ({ onClose, onSelectSymbol, selectedSymbol }) => {
  const { isDark } = useTheme()
  const { isConnected, providerStatus, prices: socketPrices, orderBooks } = useSocket()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [apiPrices, setApiPrices] = useState({})
  const [adminSpreads, setAdminSpreads] = useState({})
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, symbol: null })
  const [favorites, setFavorites] = useState(
    baseInstruments.filter(i => i.favorite).map(i => i.symbol)
  )
  
  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu({ show: false, x: 0, y: 0, symbol: null })
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Fetch admin-configured spreads
  useEffect(() => {
    const fetchSpreads = async () => {
      try {
        const res = await axios.get('/api/market/spreads')
        if (res.data.success) {
          setAdminSpreads(res.data.data)
        }
      } catch (err) {
        console.log('Using default spreads')
      }
    }
    fetchSpreads()
  }, [])

  // Fetch real-time prices from backend (AllTick API)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        
        const res = await axios.get('/api/trades/prices', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data.success) {
          setApiPrices(res.data.data)
        }
      } catch (err) {
        // Silent fail - will use socket prices
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 2000) // Update every 2 seconds
    return () => clearInterval(interval)
  }, [])

  // Get live price data for an instrument from real-time feeds
  const getLiveData = (symbol) => {
    const priceData = socketPrices[symbol]
    const apiPrice = apiPrices[symbol]
    
    let bid = 0, ask = 0, change = 0
    
    // First try socket data (real-time from Binance/Forex APIs)
    if (priceData) {
      bid = priceData.bid || priceData.price || 0
      ask = priceData.ask || priceData.price || 0
      change = priceData.change || 0
    }
    
    // Fallback to API prices if no socket data
    if ((!bid || !ask) && apiPrice) {
      bid = apiPrice.bid || 0
      ask = apiPrice.ask || 0
      change = apiPrice.change || 0
    }
    
    return { bid, ask, change: parseFloat(change) || 0 }
  }

  const tabs = [
    { id: 'favorites', label: '★' },
    { id: 'all', label: 'All' },
    { id: 'forex', label: 'Forex' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'metals', label: 'Metals' },
  ]

  const toggleFavorite = (symbol) => {
    setFavorites(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    )
  }

  const filteredInstruments = baseInstruments.filter(inst => {
    const matchesSearch = inst.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = activeTab === 'all' 
      || activeTab === 'favorites' && favorites.includes(inst.symbol)
      || inst.category === activeTab
    return matchesSearch && matchesTab
  })

  return (
    <div 
      className="h-full flex flex-col transition-colors overflow-hidden"
      style={{ 
        backgroundColor: 'var(--bg-secondary)'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Instruments</span>
        <button 
          onClick={onClose}
          className="transition-colors hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={18} />
        </button>
      </div>
      
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search instruments"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 px-3 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ 
              backgroundColor: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--bg-card)',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Instruments List */}
      <div className="flex-1 overflow-y-auto">
        {filteredInstruments.map((inst) => {
          const liveData = getLiveData(inst.symbol)
          return (
            <div
              key={inst.symbol}
              onClick={() => onSelectSymbol(inst.symbol, true)}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ show: true, x: e.clientX, y: e.clientY, symbol: inst.symbol })
              }}
              className="grid grid-cols-[auto_1fr_65px_40px_65px] items-center gap-1 px-3 py-2 cursor-pointer transition-colors"
              style={{ 
                backgroundColor: selectedSymbol === inst.symbol ? 'var(--bg-hover)' : 'transparent'
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(inst.symbol)
                }}
                className="transition-colors"
                style={{ color: favorites.includes(inst.symbol) ? '#facc15' : 'var(--text-muted)' }}
              >
                <Star size={14} fill={favorites.includes(inst.symbol) ? 'currentColor' : 'none'} />
              </button>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{inst.symbol}</div>
                <div className="text-xs" style={{ color: liveData.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {liveData.change >= 0 ? '+' : ''}{liveData.change.toFixed(2)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono" style={{ color: 'var(--accent-red)' }}>
                  {liveData.bid ? liveData.bid.toFixed(inst.decimals) : '-.--'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Bid</div>
              </div>
              {/* Spread Indicator - Admin + Market Combined */}
              <div className="text-center px-1">
                <div 
                  className="text-xs font-mono px-1.5 py-0.5 rounded font-semibold transition-all"
                  style={{ 
                    backgroundColor: 'var(--bg-hover)', 
                    color: '#f59e0b',
                    fontSize: '10px'
                  }}
                >
                  {(() => {
                    const adminSpread = adminSpreads[inst.symbol] || 0
                    // Calculate market spread in pips
                    const pipMultiplier = inst.symbol.includes('JPY') ? 100 : 
                                         inst.symbol.includes('XAU') ? 10 :
                                         inst.symbol.includes('BTC') || inst.symbol.includes('ETH') ? 1 : 10000
                    const marketSpread = liveData.bid && liveData.ask ? 
                      (liveData.ask - liveData.bid) * pipMultiplier : 0
                    const totalSpread = adminSpread + marketSpread
                    return totalSpread.toFixed(1)
                  })()}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>Sprd</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono" style={{ color: 'var(--accent-blue)' }}>
                  {liveData.ask ? liveData.ask.toFixed(inst.decimals) : '-.--'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Ask</div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Footer */}
      <div 
        className="p-3 text-xs flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
      >
        <span>{filteredInstruments.length} instruments</span>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi size={12} style={{ color: 'var(--accent-green)' }} />
              <span style={{ color: 'var(--accent-green)' }}>Live</span>
            </>
          ) : (
            <>
              <WifiOff size={12} style={{ color: 'var(--accent-red)' }} />
              <span style={{ color: 'var(--accent-red)' }}>Offline</span>
            </>
          )}
        </div>
      </div>
      
      {/* Right-Click Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed z-50 py-1 rounded-lg shadow-xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            minWidth: '160px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
            {contextMenu.symbol}
          </div>
          <button
            onClick={() => {
              onSelectSymbol(contextMenu.symbol, false)
              setContextMenu({ show: false, x: 0, y: 0, symbol: null })
            }}
            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            📈 Open Chart
          </button>
          <button
            onClick={() => {
              onSelectSymbol(contextMenu.symbol, true)
              setContextMenu({ show: false, x: 0, y: 0, symbol: null })
            }}
            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            📊 Open in New Tab
          </button>
          <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }}></div>
          <button
            onClick={() => {
              toggleFavorite(contextMenu.symbol)
              setContextMenu({ show: false, x: 0, y: 0, symbol: null })
            }}
            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {favorites.includes(contextMenu.symbol) ? '★ Remove from Favorites' : '☆ Add to Favorites'}
          </button>
        </div>
      )}
    </div>
  )
}

export default InstrumentsPanel
