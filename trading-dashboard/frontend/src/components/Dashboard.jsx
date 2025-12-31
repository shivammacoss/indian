import React, { useState, useEffect, useRef } from 'react'
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  Newspaper, 
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Zap,
  Brain,
  Target,
  Shield,
  BarChart3,
  PieChart,
  Flame,
  Star,
  Trophy,
  Rocket,
  Image
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import axios from 'axios'

const Dashboard = () => {
  const { isDark } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Real-time data states
  const [marketNews, setMarketNews] = useState([])
  const [allDayNews, setAllDayNews] = useState([]) // Keep all news for the day
  const [economicEvents, setEconomicEvents] = useState([])
  const [allDayEvents, setAllDayEvents] = useState([]) // Keep all events for the day
  const [newsLoading, setNewsLoading] = useState(true)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [lastNewsUpdate, setLastNewsUpdate] = useState(null)
  const [lastCalendarUpdate, setLastCalendarUpdate] = useState(null)
  const newsCache = useRef(new Map()) // Cache news to prevent duplicates
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Real user data from API
  const [userData, setUserData] = useState({
    name: 'Trader',
    walletBalance: 0.00,
    totalPnL: 0,
    todayPnL: 0,
    weekPnL: 0,
    monthPnL: 0
  })
  const [userStats, setUserStats] = useState({
    totalTrades: 0,
    winRate: 0,
    avgProfit: 0,
    avgLoss: 0
  })

  // Real PnL data by date - will be populated from API
  const [pnlByDate, setPnlByDate] = useState({})

  // Fetch user profile and stats
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        // Fetch user profile
        const profileRes = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (profileRes.data.success) {
          const user = profileRes.data.data
          setUserData(prev => ({
            ...prev,
            name: user.firstName || 'Trader',
            walletBalance: user.balance || 0
          }))
        }

        // Fetch user trades for stats - use correct endpoint
        try {
          const tradesRes = await axios.get('/api/trades', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (tradesRes.data.success) {
            const tradesData = tradesRes.data.data?.trades || tradesRes.data.data || []
            const trades = Array.isArray(tradesData) ? tradesData : []
            const closedTrades = trades.filter(t => t.status === 'closed')
            const winningTrades = closedTrades.filter(t => (t.profit || 0) > 0)
            const losingTrades = closedTrades.filter(t => (t.profit || 0) < 0)
            
            const totalPnL = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
            const winRate = closedTrades.length > 0 ? Math.round((winningTrades.length / closedTrades.length) * 100) : 0
            const avgProfit = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / winningTrades.length : 0
            const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / losingTrades.length) : 0

            // Calculate P&L by time periods
            const now = new Date()
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

            const todayTrades = closedTrades.filter(t => new Date(t.closedAt || t.updatedAt) >= todayStart)
            const weekTrades = closedTrades.filter(t => new Date(t.closedAt || t.updatedAt) >= weekStart)
            const monthTrades = closedTrades.filter(t => new Date(t.closedAt || t.updatedAt) >= monthStart)

            const todayPnL = todayTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
            const weekPnL = weekTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
            const monthPnL = monthTrades.reduce((sum, t) => sum + (t.profit || 0), 0)

            // Build PnL by date for calendar
            const pnlData = {}
            closedTrades.forEach(trade => {
              const tradeDate = new Date(trade.closedAt || trade.updatedAt)
              const dateKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}-${String(tradeDate.getDate()).padStart(2, '0')}`
              
              if (!pnlData[dateKey]) {
                pnlData[dateKey] = { pnl: 0, trades: 0, wins: 0 }
              }
              pnlData[dateKey].pnl += (trade.profit || 0)
              pnlData[dateKey].trades += 1
              if ((trade.profit || 0) > 0) pnlData[dateKey].wins += 1
            })

            // Calculate win rate for each day
            Object.keys(pnlData).forEach(key => {
              pnlData[key].winRate = pnlData[key].trades > 0 
                ? Math.round((pnlData[key].wins / pnlData[key].trades) * 100) 
                : 0
            })

            setPnlByDate(pnlData)

            setUserStats({
              totalTrades: trades.length,
              winRate,
              avgProfit,
              avgLoss
            })
            setUserData(prev => ({ 
              ...prev, 
              totalPnL,
              todayPnL,
              weekPnL,
              monthPnL
            }))
          }
        } catch (e) {
          console.log('Trades fetch error:', e)
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }

    fetchUserData()
    // Refresh every 10 seconds
    const interval = setInterval(fetchUserData, 10000)
    return () => clearInterval(interval)
  }, [])

  // Get PnL for selected date
  const getSelectedDatePnL = () => {
    const dateKey = selectedDate.toISOString().split('T')[0]
    return pnlByDate[dateKey] || { pnl: 0, trades: 0, winRate: 0 }
  }

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay }
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth)

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const selectDate = (day) => {
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
  }

  // Fetch market news - keeps old news and adds new ones
  const fetchMarketNews = async () => {
    setNewsLoading(true)
    try {
      const response = await axios.get('/api/market/news?limit=50')
      if (response.data.success) {
        const newNews = response.data.data || []
        
        // Merge with existing news, avoiding duplicates
        setAllDayNews(prevNews => {
          const existingIds = new Set(prevNews.map(n => n.id || n.title))
          const uniqueNewNews = newNews.filter(n => !existingIds.has(n.id || n.title))
          const merged = [...uniqueNewNews, ...prevNews]
          // Keep max 100 news items for the day
          return merged.slice(0, 100)
        })
        
        setMarketNews(newNews)
        setLastNewsUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch news:', error)
      // Enhanced fallback with images
      const fallbackNews = [
        { id: 1, title: 'Fed Signals Potential Rate Cuts in 2025', source: 'Reuters', time: new Date().toISOString(), impact: 'high', category: 'Central Banks', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=60&fit=crop' },
        { id: 2, title: 'Gold Prices Surge Amid Global Uncertainty', source: 'Bloomberg', time: new Date(Date.now() - 3600000).toISOString(), impact: 'high', category: 'Commodities', image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=100&h=60&fit=crop' },
        { id: 3, title: 'EUR/USD Breaks Key Resistance Level', source: 'FXStreet', time: new Date(Date.now() - 7200000).toISOString(), impact: 'medium', category: 'Forex', image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=100&h=60&fit=crop' },
        { id: 4, title: 'Bitcoin Hits New Monthly High', source: 'CoinDesk', time: new Date(Date.now() - 10800000).toISOString(), impact: 'high', category: 'Crypto', image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=100&h=60&fit=crop' },
        { id: 5, title: 'Oil Prices Drop on Supply Concerns', source: 'CNBC', time: new Date(Date.now() - 14400000).toISOString(), impact: 'medium', category: 'Commodities', image: 'https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?w=100&h=60&fit=crop' },
      ]
      setMarketNews(fallbackNews)
      setAllDayNews(prev => [...fallbackNews, ...prev].slice(0, 100))
    }
    setNewsLoading(false)
  }

  // Fetch economic calendar - keeps all events for the day
  const fetchEconomicCalendar = async () => {
    setCalendarLoading(true)
    try {
      const response = await axios.get('/api/market/calendar?fullDay=true')
      if (response.data.success) {
        const events = response.data.todayEvents || response.data.data || []
        
        // Merge with existing events
        setAllDayEvents(prevEvents => {
          const existingIds = new Set(prevEvents.map(e => e.id || e.event))
          const uniqueEvents = events.filter(e => !existingIds.has(e.id || e.event))
          return [...uniqueEvents, ...prevEvents].slice(0, 50)
        })
        
        setEconomicEvents(events)
        setLastCalendarUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error)
      // Enhanced fallback with full day events
      const fallbackEvents = [
        { id: 1, time: new Date().setHours(6, 0), currency: 'JPY', event: 'BoJ Interest Rate Decision', impact: 'high', actual: '0.25%', forecast: '0.25%', previous: '0.25%' },
        { id: 2, time: new Date().setHours(8, 30), currency: 'USD', event: 'Initial Jobless Claims', impact: 'high', actual: '-', forecast: '225K', previous: '218K' },
        { id: 3, time: new Date().setHours(10, 0), currency: 'USD', event: 'New Home Sales', impact: 'medium', actual: '-', forecast: '740K', previous: '738K' },
        { id: 4, time: new Date().setHours(11, 0), currency: 'EUR', event: 'ECB Economic Bulletin', impact: 'medium', actual: '-', forecast: '-', previous: '-' },
        { id: 5, time: new Date().setHours(13, 30), currency: 'USD', event: 'Crude Oil Inventories', impact: 'medium', actual: '-', forecast: '-2.1M', previous: '-1.8M' },
        { id: 6, time: new Date().setHours(14, 0), currency: 'GBP', event: 'BoE Gov Bailey Speaks', impact: 'high', actual: '-', forecast: '-', previous: '-' },
        { id: 7, time: new Date().setHours(15, 0), currency: 'USD', event: 'FOMC Member Speaks', impact: 'medium', actual: '-', forecast: '-', previous: '-' },
        { id: 8, time: new Date().setHours(18, 0), currency: 'AUD', event: 'Employment Change', impact: 'high', actual: '-', forecast: '25.0K', previous: '23.0K' },
      ]
      setEconomicEvents(fallbackEvents)
      setAllDayEvents(fallbackEvents)
    }
    setCalendarLoading(false)
  }

  // Format time ago
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return time.toLocaleDateString()
  }

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchMarketNews()
    fetchEconomicCalendar()
    
    // Auto-refresh every 5 minutes
    const newsInterval = setInterval(fetchMarketNews, 5 * 60 * 1000)
    const calendarInterval = setInterval(fetchEconomicCalendar, 10 * 60 * 1000)
    
    return () => {
      clearInterval(newsInterval)
      clearInterval(calendarInterval)
    }
  }, [])

  const selectedPnL = getSelectedDatePnL()

  return (
    <div 
      className="flex-1 overflow-y-auto p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Top Section - Greeting & Time */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 
            className="text-xl sm:text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {getGreeting()}, {userData.name}! 👋
          </h1>
          <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Here's your trading overview
          </p>
        </div>
        <div 
          className="flex items-center gap-4 px-4 py-2 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ color: 'var(--text-primary)' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="w-px h-6" style={{ backgroundColor: 'var(--border-color)' }}></div>
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: 'var(--accent-green)' }} />
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards Row - Stylish Gradient Design */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Wallet Card */}
        <div 
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <Sparkles size={128} style={{ color: '#3b82f6' }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
              >
                <Wallet size={24} style={{ color: '#fff' }} />
              </div>
              <button 
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: '#fff' }}
              >
                Deposit
              </button>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Wallet Balance</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              ${userData.walletBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Today's PnL */}
        <div 
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ 
            background: userData.todayPnL >= 0 
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
            border: `1px solid ${userData.todayPnL >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <Zap size={128} style={{ color: userData.todayPnL >= 0 ? '#22c55e' : '#ef4444' }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: userData.todayPnL >= 0 ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
              >
                {userData.todayPnL >= 0 ? 
                  <TrendingUp size={24} style={{ color: '#fff' }} /> :
                  <TrendingDown size={24} style={{ color: '#fff' }} />
                }
              </div>
              <span 
                className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                style={{ 
                  background: userData.todayPnL >= 0 ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff'
                }}
              >
                <Flame size={12} /> Today
              </span>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Today's P&L</p>
            <p 
              className="text-2xl font-bold"
              style={{ color: userData.todayPnL >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {userData.todayPnL >= 0 ? '+' : ''}${userData.todayPnL.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Weekly PnL */}
        <div 
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)'
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <Brain size={128} style={{ color: '#a855f7' }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}
              >
                <Activity size={24} style={{ color: '#fff' }} />
              </div>
              <span 
                className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', color: '#fff' }}
              >
                <Star size={12} /> 7 Days
              </span>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Weekly P&L</p>
            <p 
              className="text-2xl font-bold"
              style={{ color: userData.weekPnL >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {userData.weekPnL >= 0 ? '+' : ''}${userData.weekPnL.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Monthly PnL */}
        <div 
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <Trophy size={128} style={{ color: '#fbbf24' }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
              >
                <DollarSign size={24} style={{ color: '#fff' }} />
              </div>
              <span 
                className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#000' }}
              >
                <Rocket size={12} /> 30 Days
              </span>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Monthly P&L</p>
            <p 
              className="text-2xl font-bold"
              style={{ color: userData.monthPnL >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {userData.monthPnL >= 0 ? '+' : ''}${userData.monthPnL.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section - Calendar & PnL Details */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Calendar */}
        <div 
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>PnL Calendar</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevMonth}
                className="p-1 rounded-lg transition-colors hover:opacity-70"
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <button 
                onClick={nextMonth}
                className="p-1 rounded-lg transition-colors hover:opacity-70"
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs py-1" style={{ color: 'var(--text-muted)' }}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayPnL = pnlByDate[dateKey]
              const isSelected = selectedDate.getDate() === day && 
                                 selectedDate.getMonth() === currentMonth.getMonth() &&
                                 selectedDate.getFullYear() === currentMonth.getFullYear()
              const isToday = new Date().getDate() === day && 
                              new Date().getMonth() === currentMonth.getMonth() &&
                              new Date().getFullYear() === currentMonth.getFullYear()
              
              return (
                <button
                  key={day}
                  onClick={() => selectDate(day)}
                  className="aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center"
                  style={{ 
                    backgroundColor: isSelected ? 'var(--accent-blue)' : 
                                    dayPnL ? (dayPnL.pnl >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)') : 
                                    'transparent',
                    color: isSelected ? '#fff' : 
                           dayPnL ? (dayPnL.pnl >= 0 ? '#3b82f6' : 'var(--accent-red)') :
                           'var(--text-primary)',
                    border: isToday ? '2px solid var(--accent-blue)' : 'none'
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Date PnL Details */}
        <div 
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          
          <div className="space-y-4">
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'var(--bg-hover)' }}
            >
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Day's P&L</p>
              <p 
                className="text-3xl font-bold"
                style={{ color: selectedPnL.pnl >= 0 ? '#3b82f6' : 'var(--accent-red)' }}
              >
                {selectedPnL.pnl >= 0 ? '+' : ''}${selectedPnL.pnl.toFixed(2)}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Trades</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedPnL.trades}</p>
              </div>
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Win Rate</p>
                <p className="text-xl font-bold" style={{ color: selectedPnL.winRate >= 50 ? '#3b82f6' : 'var(--accent-red)' }}>
                  {selectedPnL.winRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div 
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Stats</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Trades</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{userStats.totalTrades}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Win Rate</span>
              <span className="font-semibold" style={{ color: userStats.winRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{userStats.winRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Profit</span>
              <span className="font-semibold" style={{ color: '#3b82f6' }}>+${userStats.avgProfit.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Loss</span>
              <span className="font-semibold" style={{ color: 'var(--accent-red)' }}>${userStats.avgLoss.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - News & Economic Calendar */}
      <div className="grid grid-cols-2 gap-4">
        {/* Market News - Enhanced with Images */}
        <div 
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
                <Newspaper size={16} style={{ color: '#fff' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Market News</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{allDayNews.length} articles today</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchMarketNews}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
                title="Refresh News"
              >
                <RefreshCw size={14} className={newsLoading ? 'animate-spin' : ''} style={{ color: '#fff' }} />
              </button>
              <span className="text-xs px-3 py-1.5 rounded-full animate-pulse flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)', color: '#fff' }}>
                <Zap size={10} /> Live
              </span>
            </div>
          </div>
          
          {newsLoading && allDayNews.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
              {(allDayNews.length > 0 ? allDayNews : marketNews).map((news, index) => (
                <a 
                  key={news.id || index}
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div className="flex gap-3">
                    {/* News Image */}
                    <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      {news.image ? (
                        <img 
                          src={news.image} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className={`w-full h-full items-center justify-center ${news.image ? 'hidden' : 'flex'}`} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)' }}>
                        <Image size={20} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>{news.title}</p>
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ 
                            background: news.impact === 'high' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
                                        news.impact === 'medium' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 
                                        'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                            color: '#fff'
                          }}
                        >
                          {news.impact || 'low'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-medium" style={{ color: '#3b82f6' }}>{news.source}</span>
                        <span>•</span>
                        <span>{getTimeAgo(news.time)}</span>
                        {news.category && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-hover)' }}>{news.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
          
          {lastNewsUpdate && (
            <div className="mt-3 pt-3 text-xs flex items-center justify-between" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <span>Last updated: {lastNewsUpdate.toLocaleTimeString()}</span>
              <span className="flex items-center gap-1"><Sparkles size={12} style={{ color: '#a855f7' }} /> AI Curated</span>
            </div>
          )}
        </div>

        {/* Economic Calendar - Enhanced Full Day View */}
        <div 
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)' }}>
                <Globe size={16} style={{ color: '#fff' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Economic Calendar</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{allDayEvents.length} events today</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchEconomicCalendar}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)' }}
                title="Refresh Calendar"
              >
                <RefreshCw size={14} className={calendarLoading ? 'animate-spin' : ''} style={{ color: '#fff' }} />
              </button>
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: '#fff' }}>
                {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          
          {calendarLoading && allDayEvents.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-2 px-3 py-2 text-xs sticky top-0 rounded-lg" style={{ color: 'var(--text-muted)', background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%)' }}>
                <div className="flex items-center gap-1"><Clock size={10} /> Time</div>
                <div>Cur</div>
                <div className="col-span-2">Event</div>
                <div>Forecast</div>
                <div>Previous</div>
              </div>
              
              {(allDayEvents.length > 0 ? allDayEvents : economicEvents).length === 0 ? (
                <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  No events scheduled for today
                </div>
              ) : (
                (allDayEvents.length > 0 ? allDayEvents : economicEvents).map((event, index) => {
                  const eventTime = event.time ? new Date(event.time) : null
                  const isPast = eventTime && eventTime < currentTime
                  const isNow = eventTime && Math.abs(eventTime - currentTime) < 30 * 60 * 1000 // Within 30 mins
                  
                  return (
                    <div 
                      key={event.id || index}
                      className="grid grid-cols-6 gap-2 px-3 py-2.5 rounded-lg text-sm items-center transition-all"
                      style={{ 
                        background: isNow 
                          ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)'
                          : isPast 
                            ? 'var(--bg-hover)' 
                            : 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%)',
                        border: isNow ? '1px solid rgba(251, 191, 36, 0.5)' : '1px solid var(--border-color)',
                        opacity: isPast ? 0.6 : 1
                      }}
                    >
                      <div className="flex items-center gap-1" style={{ color: isNow ? '#fbbf24' : 'var(--text-primary)' }}>
                        {isNow && <Zap size={12} className="animate-pulse" style={{ color: '#fbbf24' }} />}
                        {eventTime ? eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                      <div 
                        className="font-bold px-1.5 py-0.5 rounded text-center text-xs"
                        style={{ 
                          background: event.currency === 'USD' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 
                                      event.currency === 'EUR' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' :
                                      event.currency === 'GBP' ? 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' :
                                      event.currency === 'JPY' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' :
                                      event.currency === 'AUD' ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' :
                                      event.currency === 'CAD' ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' :
                                      'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          color: '#fff'
                        }}
                      >
                        {event.currency}
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                          style={{ 
                            background: event.impact === 'high' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
                                        event.impact === 'medium' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 
                                        'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                            boxShadow: event.impact === 'high' ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none'
                          }}
                        ></span>
                        <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }} title={event.event}>{event.event}</span>
                      </div>
                      <div className="font-medium" style={{ color: '#3b82f6' }}>{event.forecast || '-'}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{event.previous || '-'}</div>
                    </div>
                  )
                })
              )}
            </div>
          )}
          
          {lastCalendarUpdate && (
            <div className="mt-3 pt-3 text-xs flex items-center justify-between" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <span>Last updated: {lastCalendarUpdate.toLocaleTimeString()}</span>
              <span className="flex items-center gap-1"><Target size={12} style={{ color: '#22c55e' }} /> Full Day</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
