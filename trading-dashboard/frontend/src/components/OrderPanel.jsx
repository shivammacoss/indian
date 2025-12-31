import React, { useState, useEffect } from 'react'
import { X, Minus, Plus, Loader2 } from 'lucide-react'
import axios from 'axios'
import { useSocket } from '../context/SocketContext'

const OrderPanel = ({ symbol, orderType, setOrderType, onClose }) => {
  const { prices: socketPrices } = useSocket()
  const styles = {
    panel: { backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)' },
    border: { borderColor: 'var(--border-color)' },
    input: { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' },
    text: { color: 'var(--text-primary)' },
    textSecondary: { color: 'var(--text-secondary)' },
  }

  // Get decimals based on symbol (matching instrument settings)
  const getDecimals = (sym) => {
    if (!sym) return 5
    if (sym.includes('JPY')) return 3
    if (sym.includes('BTC')) return 2
    if (sym.includes('ETH')) return 2
    if (sym.includes('XAU')) return 2
    if (sym.includes('XAG')) return 3
    if (sym.includes('US30') || sym.includes('US500') || sym.includes('US100') || sym.includes('DE30') || sym.includes('UK100')) return 1
    if (sym.includes('JP225')) return 0
    if (sym.includes('OIL')) return 2
    if (sym.includes('XNG')) return 3
    if (sym.includes('LTC') || sym.includes('XRP') || sym.includes('DOGE') || sym.includes('SOL')) return 4
    return 5
  }

  const formatPrice = (price) => {
    if (!price) return '-.--'
    return parseFloat(price.toFixed(getDecimals(symbol))).toString()
  }
  const [volume, setVolume] = useState(0.01)
  const [entryPrice, setEntryPrice] = useState('')
  const [showTakeProfit, setShowTakeProfit] = useState(false)
  const [showStopLoss, setShowStopLoss] = useState(false)
  const [takeProfit, setTakeProfit] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [pendingOrderType, setPendingOrderType] = useState('BUY LIMIT')
  const [marginFree, setMarginFree] = useState(0)
  const [mockPrices, setMockPrices] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [tradeType, setTradeType] = useState('buy') // 'buy' or 'sell' for market orders
  const [selectedLeverage, setSelectedLeverage] = useState(100) // Default to 1:100
  const [maxLeverage, setMaxLeverage] = useState(100)
  const [chargesInfo, setChargesInfo] = useState(null)
  const [tradingAccountId, setTradingAccountId] = useState(null)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  // Fetch user balance and leverage from trading account
  useEffect(() => {
    const fetchAccountData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        // Get trading account data for leverage
        const savedAccount = localStorage.getItem('activeTradingAccount')
        if (savedAccount) {
          const accountData = JSON.parse(savedAccount)
          setTradingAccountId(accountData._id)
          const accountRes = await axios.get(`/api/trading-accounts/${accountData._id}`, getAuthHeader())
          if (accountRes.data.success && accountRes.data.data) {
            const account = accountRes.data.data
            setMarginFree(account.balance || 0)
            setMaxLeverage(account.leverage || 100)
            // Set selected leverage to account max by default
            if (selectedLeverage > account.leverage) {
              setSelectedLeverage(account.leverage)
            }
          }
        } else {
          setTradingAccountId(null)
          const res = await axios.get('/api/auth/me', getAuthHeader())
          if (res.data.success) {
            setMarginFree(res.data.data.balance || 0)
          }
        }
      } catch (err) {
        console.error('Failed to fetch account data:', err)
      }
    }
    fetchAccountData()
    const interval = setInterval(fetchAccountData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch charges breakdown when symbol/volume/leverage changes
  useEffect(() => {
    const fetchCharges = async () => {
      if (!symbol || volume <= 0) return
      const lev = selectedLeverage || 100
      try {
        const url = `/api/trades/calculate-charges?symbol=${symbol}&amount=${volume}&leverage=${lev}${tradingAccountId ? `&tradingAccountId=${tradingAccountId}` : ''}`
        const res = await axios.get(url, getAuthHeader())
        if (res.data.success) {
          setChargesInfo(res.data.data)
        }
      } catch (err) {
        console.error('[OrderPanel] Charges error:', err)
      }
    }
    fetchCharges()
  }, [symbol, volume, selectedLeverage, tradingAccountId])
  
  // Calculate margin locally as fallback (when backend hasn't responded yet)
  const calculateLocalMargin = () => {
    const price = buyPrice || sellPrice
    if (!price || !selectedLeverage) return 0
    let contractSize = 100000
    if (symbol.includes('XAU')) contractSize = 100
    else if (symbol.includes('XAG')) contractSize = 5000
    else if (symbol.includes('BTC') || symbol.includes('ETH')) contractSize = 1
    return (price * contractSize * volume) / selectedLeverage
  }

  // Fetch mock prices from backend
  useEffect(() => {
    const fetchMockPrices = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        
        const res = await axios.get('/api/trades/prices', getAuthHeader())
        if (res.data.success) {
          setMockPrices(res.data.data)
        }
      } catch (err) {
        // Silent fail
      }
    }

    fetchMockPrices()
    const interval = setInterval(fetchMockPrices, 1000)
    return () => clearInterval(interval)
  }, [])

  // Get prices - prefer socket, fallback to mock
  const getPrice = () => {
    const socketPrice = socketPrices[symbol]
    const mockPrice = mockPrices[symbol]
    
    if (socketPrice?.bid && socketPrice?.ask) {
      return { bid: socketPrice.bid, ask: socketPrice.ask }
    }
    
    if (mockPrice) {
      return { bid: mockPrice.bid, ask: mockPrice.ask }
    }
    
    return { bid: 0, ask: 0 }
  }

  const { bid: sellPrice, ask: buyPrice } = getPrice()

  const adjustVolume = (delta) => {
    const newVol = Math.max(0.01, Math.round((volume + delta) * 100) / 100)
    setVolume(newVol)
  }

  const pendingOrderTypes = ['BUY LIMIT', 'SELL LIMIT', 'BUY STOP', 'SELL STOP']

  // Use backend margin if available, otherwise calculate locally
  const marginRequired = chargesInfo?.margin || calculateLocalMargin()
  
  // Get total required - backend or local calculation
  const getTotalRequired = () => {
    if (chargesInfo?.totalRequired) return chargesInfo.totalRequired
    return marginRequired + (chargesInfo?.totalCharges || 0)
  }

  // Check if trading is locked (kill switch)
  const isTradingLocked = () => {
    const savedLockEnd = localStorage.getItem('tradingLockEnd')
    if (savedLockEnd) {
      const endTime = new Date(savedLockEnd)
      if (endTime > new Date()) {
        return true
      } else {
        localStorage.removeItem('tradingLockEnd')
      }
    }
    return false
  }

  // Submit order
  const handleSubmitOrder = async (tradeType) => {
    if (submitting) return
    
    // Check kill switch
    if (isTradingLocked()) {
      alert('Trading is currently locked. Kill switch is active.')
      return
    }
    
    try {
      setSubmitting(true)
      
      const activeAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || '{}')
      const orderData = {
        symbol,
        type: tradeType, // 'buy' or 'sell'
        amount: volume,
        leverage: selectedLeverage,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        tradingAccountId: activeAccount._id
      }

      if (orderType === 'market') {
        orderData.orderType = 'market'
      } else {
        // Pending order
        const pendingType = pendingOrderType.toLowerCase().replace(' ', '_')
        orderData.orderType = pendingType.includes('limit') ? 'limit' : 'stop'
        orderData.price = parseFloat(entryPrice)
        
        if (!entryPrice) {
          alert('Please enter entry price for pending order')
          return
        }
      }

      const res = await axios.post('/api/trades', orderData, getAuthHeader())
      
      if (res.data.success) {
        // Reset form
        setVolume(0.01)
        setEntryPrice('')
        setTakeProfit('')
        setStopLoss('')
        setShowTakeProfit(false)
        setShowStopLoss(false)
        // Dispatch custom events to refresh positions and balance
        window.dispatchEvent(new CustomEvent('tradeCreated', { detail: res.data.data }))
        window.dispatchEvent(new Event('balanceUpdate'))
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-72 h-full flex flex-col transition-colors" style={styles.panel}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{symbol} order</span>
        <button 
          onClick={onClose}
          className="transition-colors hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={18} />
        </button>
      </div>
      
      {/* Order Type Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setOrderType('market')}
          className="flex-1 py-3 text-sm font-medium transition-colors"
          style={{ 
            color: orderType === 'market' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: orderType === 'market' ? '2px solid var(--accent-green)' : '2px solid transparent'
          }}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('pending')}
          className="flex-1 py-3 text-sm font-medium transition-colors"
          style={{ 
            color: orderType === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: orderType === 'pending' ? '2px solid var(--accent-green)' : '2px solid transparent'
          }}
        >
          Pending
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto min-h-0">
        {orderType === 'market' ? (
          <>
            {/* Regular Settings Dropdown */}
            <div className="mb-4">
              <select 
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option>Regular settings</option>
              </select>
            </div>
            
            {/* Buy/Sell Selection */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button 
                onClick={() => setTradeType('sell')}
                className="rounded-lg p-3 text-center transition-colors"
                style={{ 
                  backgroundColor: tradeType === 'sell' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)', 
                  border: tradeType === 'sell' ? '2px solid var(--accent-red)' : '1px solid var(--accent-red)'
                }}
              >
                <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Sell</div>
                <div className="font-semibold" style={{ color: 'var(--accent-red)' }}>
                  {formatPrice(sellPrice)}
                </div>
              </button>
              <button 
                onClick={() => setTradeType('buy')}
                className="rounded-lg p-3 text-center transition-colors"
                style={{ 
                  backgroundColor: tradeType === 'buy' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.1)', 
                  border: tradeType === 'buy' ? '2px solid #3b82f6' : '1px solid #3b82f6'
                }}
              >
                <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Buy</div>
                <div className="font-semibold" style={{ color: '#3b82f6' }}>
                  {formatPrice(buyPrice)}
                </div>
              </button>
            </div>
            
            {/* Volume */}
            <div className="mb-4">
              <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>Volume</label>
              <div 
                className="flex items-center rounded-lg"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <button 
                  onClick={() => adjustVolume(-0.01)}
                  className="p-3 transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value) || 0.01)}
                  className="flex-1 bg-transparent text-center focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  step="0.01"
                  min="0.01"
                />
                <button 
                  onClick={() => adjustVolume(0.01)}
                  className="p-3 transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="text-right text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{volume.toFixed(2)} lot</div>
            </div>
          </>
        ) : (
          <>
            {/* Pending Order Type */}
            <div className="mb-4">
              <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>Order type</label>
              <div className="grid grid-cols-2 gap-2">
                {pendingOrderTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setPendingOrderType(type)}
                    className="py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                    style={{ 
                      backgroundColor: pendingOrderType === type 
                        ? (type.includes('BUY') ? '#3b82f6' : 'var(--bg-hover)')
                        : 'var(--bg-card)',
                      color: pendingOrderType === type 
                        ? (type.includes('BUY') ? '#fff' : 'var(--text-primary)')
                        : 'var(--text-secondary)',
                      border: pendingOrderType === type && !type.includes('BUY') ? '1px solid var(--border-color)' : 'none'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Entry Price */}
            <div className="mb-4">
              <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>Entry price</label>
              <input
                type="text"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="Enter price"
                className="w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            
            {/* Volume */}
            <div className="mb-4">
              <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>Order volume</label>
              <div 
                className="flex items-center rounded-lg"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <input
                  type="number"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value) || 0.01)}
                  className="flex-1 bg-transparent text-center px-3 py-2 focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  step="0.01"
                  min="0.01"
                />
                <button 
                  onClick={() => adjustVolume(-0.01)}
                  className="p-2 transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-secondary)', borderLeft: '1px solid var(--border-color)' }}
                >
                  <Minus size={16} />
                </button>
                <button 
                  onClick={() => adjustVolume(0.01)}
                  className="p-2 transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </>
        )}
        
        {/* Leverage Selector */}
        <div className="mb-4">
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Leverage (Max: {maxLeverage}x)
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedLeverage}
              onChange={(e) => setSelectedLeverage(parseInt(e.target.value))}
              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              {[30, 50, 100, 200, 400, 500, 600, 800, 1000, 1500, 2000].filter(l => l <= maxLeverage).map(lev => (
                <option key={lev} value={lev}>1:{lev}</option>
              ))}
            </select>
            <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              ${(marginFree * selectedLeverage).toLocaleString()}
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Trading power: ${marginFree.toFixed(2)} × {selectedLeverage} = ${(marginFree * selectedLeverage).toLocaleString()}
          </p>
        </div>
        
        {/* Take Profit */}
        <div className="mb-3">
          <button
            onClick={() => setShowTakeProfit(!showTakeProfit)}
            className="flex items-center justify-between w-full text-sm py-2"
            style={{ color: 'var(--accent-green)' }}
          >
            <span>Take profit</span>
            <Plus size={16} />
          </button>
          {showTakeProfit && (
            <input
              type="text"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Enter TP price"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          )}
        </div>
        
        {/* Stop Loss */}
        <div className="mb-4">
          <button
            onClick={() => setShowStopLoss(!showStopLoss)}
            className="flex items-center justify-between w-full text-sm py-2"
            style={{ color: 'var(--accent-red)' }}
          >
            <span>Stop loss</span>
            <Plus size={16} />
          </button>
          {showStopLoss && (
            <input
              type="text"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Enter SL price"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          )}
        </div>
        
        {/* Charges Breakdown - Simplified: Only Spread & Commission */}
        {chargesInfo && (chargesInfo.spreadPips > 0 || chargesInfo.commission > 0) && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Trading Charges
            </div>
            <div className="space-y-1 text-xs">
              {chargesInfo.spreadPips > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Spread</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{chargesInfo.spreadPips} pips</span>
                </div>
              )}
              {chargesInfo.commission > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Commission</span>
                  <span style={{ color: 'var(--text-secondary)' }}>${chargesInfo.commission.toFixed(2)} (${chargesInfo.commissionPerLot}/lot)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Margin Info */}
        <div className="flex items-center justify-between text-sm mb-2">
          <span style={{ color: 'var(--text-secondary)' }}>Margin Required</span>
          <span style={{ color: 'var(--text-primary)' }}>${marginRequired.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span style={{ color: 'var(--text-secondary)' }}>+ Charges</span>
          <span style={{ color: '#f59e0b' }}>${chargesInfo?.totalCharges?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-4 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Total Required</span>
          <span className="font-semibold" style={{ color: 'var(--accent-green)' }}>
            ${getTotalRequired().toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mb-4">
          <span style={{ color: 'var(--text-muted)' }}>Available Balance</span>
          <span style={{ color: 'var(--text-secondary)' }}>${marginFree.toLocaleString()}</span>
        </div>

        {getTotalRequired() > marginFree && (
          <div className="text-xs text-red-500 mb-4 p-2 rounded-lg bg-red-500/10">
            ⚠️ Insufficient balance. Required: ${getTotalRequired().toFixed(2)}
          </div>
        )}
      </div>
      
      {/* Submit Button */}
      <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        {orderType === 'market' ? (
          <>
            <button 
              onClick={() => handleSubmitOrder(tradeType)}
              disabled={submitting || getTotalRequired() > marginFree || (tradeType === 'buy' ? !buyPrice : !sellPrice)}
              className="w-full font-semibold py-3 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: tradeType === 'buy' ? '#3b82f6' : 'var(--accent-red)', 
                color: '#fff' 
              }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Opening...' : `Open ${tradeType.toUpperCase()} Order`}
            </button>
            <div className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
              {volume} lots @ {tradeType === 'buy' ? formatPrice(buyPrice) : formatPrice(sellPrice)}
            </div>
          </>
        ) : (
          <>
            <button 
              onClick={() => handleSubmitOrder(pendingOrderType.includes('BUY') ? 'buy' : 'sell')}
              disabled={submitting || !entryPrice || getTotalRequired() > marginFree}
              className="w-full font-semibold py-3 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: pendingOrderType.includes('BUY') ? '#3b82f6' : 'var(--accent-red)', 
                color: '#fff' 
              }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Placing...' : `Place ${pendingOrderType}`}
            </button>
            <div className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
              {volume} lots @ {entryPrice || '-.--'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderPanel
