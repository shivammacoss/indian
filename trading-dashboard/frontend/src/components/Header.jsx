import React, { useState, useEffect, useRef } from 'react'
import { Settings, ChevronDown, Wallet, LogOut, ShieldOff, Clock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const Header = ({ onTradeClick, showOrderPanel }) => {
  const navigate = useNavigate()
  const [balance, setBalance] = useState(0)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showKillSwitch, setShowKillSwitch] = useState(false)
  const [killDuration, setKillDuration] = useState('1')
  const [killUnit, setKillUnit] = useState('hours')
  const [tradingLocked, setTradingLocked] = useState(false)
  const [lockEndTime, setLockEndTime] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  const menuRef = useRef(null)

  const fetchBalance = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setBalance(res.data.data.balance || 0)
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  // Check for existing kill switch lock
  useEffect(() => {
    const savedLockEnd = localStorage.getItem('tradingLockEnd')
    if (savedLockEnd) {
      const endTime = new Date(savedLockEnd)
      if (endTime > new Date()) {
        setTradingLocked(true)
        setLockEndTime(endTime)
      } else {
        localStorage.removeItem('tradingLockEnd')
      }
    }
  }, [])

  // Update time remaining countdown
  useEffect(() => {
    if (!tradingLocked || !lockEndTime) return

    const updateTimer = () => {
      const now = new Date()
      const diff = lockEndTime - now

      if (diff <= 0) {
        setTradingLocked(false)
        setLockEndTime(null)
        localStorage.removeItem('tradingLockEnd')
        setTimeRemaining('')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [tradingLocked, lockEndTime])

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowSettingsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchBalance()
    const interval = setInterval(fetchBalance, 3000)
    
    const handleBalanceUpdate = () => fetchBalance()
    window.addEventListener('balanceUpdate', handleBalanceUpdate)
    window.addEventListener('tradeCreated', handleBalanceUpdate)
    window.addEventListener('tradeClosed', handleBalanceUpdate)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('balanceUpdate', handleBalanceUpdate)
      window.removeEventListener('tradeCreated', handleBalanceUpdate)
      window.removeEventListener('tradeClosed', handleBalanceUpdate)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const activateKillSwitch = () => {
    const duration = parseInt(killDuration)
    let milliseconds = 0
    
    switch (killUnit) {
      case 'minutes':
        milliseconds = duration * 60 * 1000
        break
      case 'hours':
        milliseconds = duration * 60 * 60 * 1000
        break
      case 'days':
        milliseconds = duration * 24 * 60 * 60 * 1000
        break
      default:
        milliseconds = duration * 60 * 60 * 1000
    }

    const endTime = new Date(Date.now() + milliseconds)
    localStorage.setItem('tradingLockEnd', endTime.toISOString())
    setLockEndTime(endTime)
    setTradingLocked(true)
    setShowKillSwitch(false)
    setShowSettingsMenu(false)
  }

  return (
    <header 
      className="h-14 flex items-center justify-between px-4 transition-colors"
      style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderBottom: '1px solid var(--border-color)' 
      }}
    >
      {/* Left - Empty space */}
      <div className="flex items-center">
      </div>
      
      {/* Right - Wallet, Settings & Trade */}
      <div className="flex items-center gap-4">
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <Wallet size={18} style={{ color: 'var(--accent-green)' }} />
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        {/* Settings Dropdown */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="p-2 transition-colors rounded-lg hover:bg-gray-700/50"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Settings size={20} />
          </button>

          {showSettingsMenu && (
            <div 
              className="absolute right-0 top-12 w-56 rounded-xl shadow-2xl py-2 z-50"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <button
                onClick={() => { setShowKillSwitch(true); setShowSettingsMenu(false); }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700/30 transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                <ShieldOff size={18} className="text-orange-500" />
                <div className="text-left">
                  <p className="text-sm font-medium">Kill Switch</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trading discipline control</p>
                </div>
              </button>
              <div className="h-px mx-3 my-1" style={{ backgroundColor: 'var(--border-color)' }}></div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-red-400"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Trading Locked Indicator */}
        {tradingLocked && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
            <ShieldOff size={16} className="text-red-400" />
            <span className="text-xs font-medium text-red-400">{timeRemaining}</span>
          </div>
        )}
        
        <button 
          onClick={tradingLocked ? null : onTradeClick}
          disabled={tradingLocked}
          className="font-medium px-4 py-2 rounded-lg text-sm transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: tradingLocked ? '#4b5563' : showOrderPanel ? 'var(--bg-hover)' : 'var(--accent-blue)'
          }}
        >
          {tradingLocked ? 'Locked' : 'Trade'}
        </button>
      </div>

      {/* Kill Switch Modal */}
      {showKillSwitch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div 
            className="w-full max-w-md rounded-2xl p-6 mx-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <ShieldOff size={24} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Kill Switch</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Trading discipline control</p>
                </div>
              </div>
              <button onClick={() => setShowKillSwitch(false)} className="p-2 hover:bg-gray-700/50 rounded-lg">
                <X size={20} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                🛡️ <strong>Emotional Trading Control</strong><br/>
                Lock yourself out of trading for a set period to maintain discipline and avoid emotional decisions.
              </p>
              <p className="text-xs text-orange-400">
                ⚠️ This cannot be undone once activated. You will not be able to place any trades until the timer expires.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Lock Duration</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={killDuration}
                  onChange={(e) => setKillDuration(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl text-center text-lg font-bold"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
                <select
                  value={killUnit}
                  onChange={(e) => setKillUnit(e.target.value)}
                  className="px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowKillSwitch(false)}
                className="flex-1 py-3 rounded-xl font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                onClick={activateKillSwitch}
                className="flex-1 py-3 rounded-xl font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                Activate Kill Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
