import React, { useState, useEffect } from 'react'
import { Minus, Plus, Loader2 } from 'lucide-react'
import axios from 'axios'

const MobileOrder = ({ symbol }) => {
  const [orderType, setOrderType] = useState('market')
  const [tradeType, setTradeType] = useState('buy') // buy or sell
  const [volume, setVolume] = useState(0.01)
  const [pendingPrice, setPendingPrice] = useState('')
  const [prices, setPrices] = useState({ bid: 0, ask: 0 })
  const [balance, setBalance] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showTP, setShowTP] = useState(false)
  const [showSL, setShowSL] = useState(false)
  const [takeProfit, setTakeProfit] = useState('')
  const [stopLoss, setStopLoss] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const [priceRes, userRes] = await Promise.all([
          axios.get('/api/trades/prices', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        ])
        if (priceRes.data.success && priceRes.data.data[symbol]) {
          setPrices(priceRes.data.data[symbol])
        }
        if (userRes.data.success) {
          setBalance(userRes.data.data.balance || 0)
        }
      } catch (err) {}
    }
    fetchData()
    const interval = setInterval(fetchData, 1000)
    return () => clearInterval(interval)
  }, [symbol])

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

  const decimals = getDecimals(symbol)

  const handleOpenOrder = async () => {
    // Check kill switch
    if (isTradingLocked()) {
      alert('Trading is currently locked. Kill switch is active.')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) return alert('Please login')
    
    setSubmitting(true)
    try {
      const activeAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || '{}')
      const orderData = {
        symbol,
        type: tradeType,
        amount: volume,
        orderType: orderType === 'market' ? 'market' : 'limit',
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        tradingAccountId: activeAccount._id
      }
      
      if (orderType === 'pending' && pendingPrice) {
        orderData.price = parseFloat(pendingPrice)
      }
      
      const res = await axios.post('/api/trades', orderData, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      
      if (res.data.success) {
        alert(orderType === 'market' ? 'Order executed!' : 'Pending order placed!')
        setTakeProfit('')
        setStopLoss('')
        setPendingPrice('')
        // Dispatch event to update positions
        window.dispatchEvent(new Event('tradeCreated'))
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  const adjustVolume = (delta) => {
    setVolume(prev => Math.max(0.01, +(prev + delta).toFixed(2)))
  }

  const margin = (volume * 100000 * prices.ask / 100).toFixed(2)
  const executionPrice = tradeType === 'buy' ? prices.ask : prices.bid

  return (
    <div className="h-full overflow-y-auto p-4" style={{ backgroundColor: '#000000' }}>
      {/* Order Type Tabs */}
      <div className="flex mb-4 rounded-lg overflow-hidden" style={{ backgroundColor: '#0d0d0d' }}>
        <button
          onClick={() => setOrderType('market')}
          className="flex-1 py-2 text-sm font-medium"
          style={{ 
            backgroundColor: orderType === 'market' ? '#1a1a1a' : 'transparent',
            color: orderType === 'market' ? '#fff' : '#6b7280'
          }}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('pending')}
          className="flex-1 py-2 text-sm font-medium"
          style={{ 
            backgroundColor: orderType === 'pending' ? '#1a1a1a' : 'transparent',
            color: orderType === 'pending' ? '#fff' : '#6b7280'
          }}
        >
          Pending
        </button>
      </div>

      {/* Buy/Sell Selection */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setTradeType('sell')}
          className="py-4 rounded-xl"
          style={{ 
            backgroundColor: tradeType === 'sell' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)', 
            border: tradeType === 'sell' ? '2px solid #ef4444' : '1px solid #ef4444'
          }}
        >
          <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Sell</p>
          <p className="text-lg font-bold" style={{ color: '#ef4444' }}>
            {prices.bid?.toFixed(decimals) || '-.--'}
          </p>
        </button>
        <button
          onClick={() => setTradeType('buy')}
          className="py-4 rounded-xl"
          style={{ 
            backgroundColor: tradeType === 'buy' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.1)', 
            border: tradeType === 'buy' ? '2px solid #22c55e' : '1px solid #22c55e'
          }}
        >
          <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Buy</p>
          <p className="text-lg font-bold" style={{ color: '#22c55e' }}>
            {prices.ask?.toFixed(decimals) || '-.--'}
          </p>
        </button>
      </div>

      {/* Pending Price (only for pending orders) */}
      {orderType === 'pending' && (
        <div className="mb-4">
          <p className="text-xs mb-2" style={{ color: '#6b7280' }}>Entry Price</p>
          <input
            type="number"
            placeholder="Enter price"
            value={pendingPrice}
            onChange={(e) => setPendingPrice(e.target.value)}
            className="w-full p-3 rounded-lg text-sm"
            style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a', color: '#fff' }}
          />
        </div>
      )}

      {/* Volume */}
      <div className="mb-4">
        <p className="text-xs mb-2" style={{ color: '#6b7280' }}>Volume (Lots)</p>
        <div 
          className="flex items-center rounded-lg"
          style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}
        >
          <button onClick={() => adjustVolume(-0.01)} className="p-3">
            <Minus size={16} color="#9ca3af" />
          </button>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
            className="flex-1 bg-transparent text-center text-sm"
            style={{ color: '#fff' }}
            step="0.01"
          />
          <button onClick={() => adjustVolume(0.01)} className="p-3">
            <Plus size={16} color="#9ca3af" />
          </button>
        </div>
      </div>

      {/* TP/SL */}
      <div className="space-y-3 mb-4">
        <button
          onClick={() => setShowTP(!showTP)}
          className="w-full flex items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}
        >
          <span className="text-sm" style={{ color: '#22c55e' }}>Take Profit</span>
          <Plus size={16} color="#22c55e" />
        </button>
        {showTP && (
          <input
            type="number"
            placeholder="TP Price"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full p-3 rounded-lg text-sm"
            style={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
          />
        )}

        <button
          onClick={() => setShowSL(!showSL)}
          className="w-full flex items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}
        >
          <span className="text-sm" style={{ color: '#ef4444' }}>Stop Loss</span>
          <Plus size={16} color="#ef4444" />
        </button>
        {showSL && (
          <input
            type="number"
            placeholder="SL Price"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full p-3 rounded-lg text-sm"
            style={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
          />
        )}
      </div>

      {/* Info */}
      <div 
        className="p-3 rounded-lg mb-4"
        style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}
      >
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: '#6b7280' }}>Margin</span>
          <span style={{ color: '#fff' }}>${margin}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: '#6b7280' }}>Free</span>
          <span style={{ color: '#fff' }}>${balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Open Order Button */}
      <button
        onClick={handleOpenOrder}
        disabled={submitting || (orderType === 'pending' && !pendingPrice)}
        className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2"
        style={{ 
          backgroundColor: tradeType === 'buy' ? '#22c55e' : '#ef4444',
          color: '#000',
          opacity: submitting || (orderType === 'pending' && !pendingPrice) ? 0.5 : 1
        }}
      >
        {submitting ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            {orderType === 'market' ? 'Open' : 'Place'} {tradeType.toUpperCase()} Order
          </>
        )}
      </button>

      {/* Order Summary */}
      <div className="mt-3 text-center">
        <p className="text-xs" style={{ color: '#6b7280' }}>
          {orderType === 'market' ? 'Market' : 'Pending'} • {volume} lots @ {orderType === 'market' 
            ? executionPrice?.toFixed(decimals) 
            : pendingPrice || '-.--'}
        </p>
      </div>
    </div>
  )
}

export default MobileOrder
