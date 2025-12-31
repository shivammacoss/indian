import React, { useState, useEffect } from 'react'
import { Home, BarChart3, LineChart, List, Clock, Wallet } from 'lucide-react'
import axios from 'axios'
import MobileQuotes from './MobileQuotes'
import MobileChart from './MobileChart'
import MobilePositions from './MobilePositions'
import MobileHistory from './MobileHistory'
import TradeNotifications from '../TradeNotifications'
import { useTheme } from '../../context/ThemeContext'

const MobileTrade = ({ onBack }) => {
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('quotes')
  const [selectedSymbol, setSelectedSymbol] = useState(() => {
    return localStorage.getItem('selectedSymbol') || 'XAUUSD'
  })
  const [equity, setEquity] = useState(0)

  // Save selected symbol to localStorage
  useEffect(() => {
    localStorage.setItem('selectedSymbol', selectedSymbol)
  }, [selectedSymbol])

  useEffect(() => {
    const fetchEquity = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const res = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data.success) {
          setEquity(res.data.data.balance || 0)
        }
      } catch (err) {}
    }
    fetchEquity()
    const interval = setInterval(fetchEquity, 5000)
    return () => clearInterval(interval)
  }, [])

  const tabs = [
    { id: 'quotes', label: 'Quotes', icon: BarChart3 },
    { id: 'chart', label: 'Chart', icon: LineChart },
    { id: 'positions', label: 'Positions', icon: List },
    { id: 'history', label: 'History', icon: Clock },
  ]

  const handleOpenChart = (symbol) => {
    setSelectedSymbol(symbol)
    localStorage.setItem('selectedSymbol', symbol)
    setActiveTab('chart')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'quotes':
        return <MobileQuotes onOpenChart={handleOpenChart} onGoHome={onBack} />
      case 'chart':
        return <MobileChart />
      case 'positions':
        return <MobilePositions />
      case 'history':
        return <MobileHistory />
      default:
        return <MobileQuotes onOpenChart={handleOpenChart} onGoHome={onBack} />
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: isDark ? '#000000' : '#f5f5f7' }}>
      {/* Trade Notifications */}
      <TradeNotifications />
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      {/* Bottom Trade Navigation */}
      <nav 
        className="flex items-center justify-around"
        style={{ 
          backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
          borderTop: `1px solid ${isDark ? '#2c2c2e' : '#e5e5ea'}`,
          paddingTop: '8px',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center flex-1 py-1"
          >
            <tab.icon 
              size={20} 
              color={activeTab === tab.id ? '#3b82f6' : (isDark ? '#8e8e93' : '#6b6b6b')} 
            />
            <span 
              className="text-[10px] mt-0.5"
              style={{ color: activeTab === tab.id ? '#3b82f6' : (isDark ? '#8e8e93' : '#6b6b6b') }}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default MobileTrade
