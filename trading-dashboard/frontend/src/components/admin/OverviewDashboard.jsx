import React, { useState, useEffect } from 'react'
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Clock,
  Loader2,
  Wallet,
  CreditCard,
  Percent,
  RefreshCw
} from 'lucide-react'
import axios from 'axios'

const OverviewDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalUserFund: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalEarnings: 0,
    brokerProfit: 0,
    liveAccountBalance: 0,
    demoAccountBalance: 0,
    liveAccountCount: 0,
    demoAccountCount: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalFees: 0,
    totalCommission: 0,
    totalSpread: 0,
    openTradesCount: 0,
    closedTradesCount: 0,
    currencySettings: {
      depositRate: 83,
      withdrawalRate: 83,
      depositMarkup: 0,
      withdrawalMarkup: 0
    }
  })
  const [recentUsers, setRecentUsers] = useState([])
  const [recentTrades, setRecentTrades] = useState([])
  const [pendingTransactions, setPendingTransactions] = useState([])

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  useEffect(() => {
    fetchDashboardData()
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchDashboardData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      console.error('[AdminDashboard] No admin token found')
      setLoading(false)
      return
    }

    try {
      // Fetch dashboard stats
      const dashRes = await axios.get('/api/admin/dashboard', getAuthHeader())
      console.log('[AdminDashboard] Stats response:', dashRes.data)
      if (dashRes.data.success) {
        setStats(dashRes.data.data)
      }

      // Fetch users
      const usersRes = await axios.get('/api/admin/users?limit=5', getAuthHeader())
      console.log('[AdminDashboard] Users response:', usersRes.data)
      if (usersRes.data.success) {
        setRecentUsers(usersRes.data.data.users || [])
      }

      // Fetch trades
      try {
        const tradesRes = await axios.get('/api/admin/trades?limit=10', getAuthHeader())
        console.log('[AdminDashboard] Trades response:', tradesRes.data)
        if (tradesRes.data.success) {
          setRecentTrades(tradesRes.data.data?.trades || tradesRes.data.data || [])
        }
      } catch (e) {
        console.error('[AdminDashboard] Failed to fetch trades:', e.response?.data || e.message)
      }

      // Fetch pending transactions
      try {
        const transRes = await axios.get('/api/admin/transactions/pending', getAuthHeader())
        console.log('[AdminDashboard] Transactions response:', transRes.data)
        if (transRes.data.success) {
          setPendingTransactions(transRes.data.data || [])
        }
      } catch (e) {
        console.error('[AdminDashboard] Failed to fetch transactions:', e.response?.data || e.message)
      }

    } catch (err) {
      console.error('[AdminDashboard] Error:', err.response?.data || err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date) => {
    if (!date) return 'N/A'
    const now = new Date()
    const past = new Date(date)
    const diffMs = now - past
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
  }

  const statsDisplay = [
    { label: 'Total Users', value: stats.totalUsers?.toString() || '0', icon: Users, color: '#3b82f6' },
    { label: 'User Wallet Balance', value: `$${(stats.totalUserFund || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Wallet, color: '#22c55e' },
    { label: 'Live Account Balance', value: `$${(stats.liveAccountBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: CreditCard, color: '#3b82f6' },
    { label: 'Demo Account Balance', value: `$${(stats.demoAccountBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: CreditCard, color: '#6b7280' },
    { label: 'Pending Deposits', value: stats.pendingDeposits?.toString() || '0', icon: ArrowDownRight, color: '#22c55e' },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals?.toString() || '0', icon: ArrowUpRight, color: '#ef4444' },
  ]

  const earningsDisplay = [
    { label: 'Total Fees', value: `$${(stats.totalFees || 0).toFixed(2)}`, color: '#8b5cf6' },
    { label: 'Total Commission', value: `$${(stats.totalCommission || 0).toFixed(2)}`, color: '#f59e0b' },
    { label: 'Total Spread', value: `$${(stats.totalSpread || 0).toFixed(2)}`, color: '#3b82f6' },
    { label: 'Broker Profit', value: `$${(stats.brokerProfit || 0).toFixed(2)}`, color: stats.brokerProfit >= 0 ? '#22c55e' : '#ef4444' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsDisplay.map((stat, index) => (
          <div
            key={index}
            className="p-4 rounded-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Earnings & Currency Settings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Breakdown */}
        <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 size={18} style={{ color: '#8b5cf6' }} />
            Earnings Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {earningsDisplay.map((item, index) => (
              <div key={index} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Earnings</span>
              <span className="text-lg font-bold" style={{ color: '#22c55e' }}>${(stats.totalEarnings || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <DollarSign size={18} style={{ color: '#3b82f6' }} />
            Currency Conversion Rates (INR ⇄ USD)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Deposit Rate</p>
              <p className="text-xl font-bold" style={{ color: '#22c55e' }}>
                ₹{((stats.currencySettings?.depositRate || 83) + (stats.currencySettings?.depositMarkup || 0)).toFixed(2)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>per $1 (Markup: ₹{stats.currencySettings?.depositMarkup || 0})</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Withdrawal Rate</p>
              <p className="text-xl font-bold" style={{ color: '#ef4444' }}>
                ₹{((stats.currencySettings?.withdrawalRate || 83) - (stats.currencySettings?.withdrawalMarkup || 0)).toFixed(2)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>per $1 (Markup: ₹{stats.currencySettings?.withdrawalMarkup || 0})</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <p className="text-xs" style={{ color: '#22c55e' }}>Total Deposits</p>
              <p className="text-lg font-bold" style={{ color: '#22c55e' }}>${(stats.totalDeposits || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <p className="text-xs" style={{ color: '#ef4444' }}>Total Withdrawals</p>
              <p className="text-lg font-bold" style={{ color: '#ef4444' }}>${(stats.totalWithdrawals || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Open Trades</p>
          <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{stats.openTradesCount || 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Closed Trades</p>
          <p className="text-2xl font-bold" style={{ color: '#6b7280' }}>{stats.closedTradesCount || 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Live Accounts</p>
          <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{stats.liveAccountCount || 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Demo Accounts</p>
          <p className="text-2xl font-bold" style={{ color: '#6b7280' }}>{stats.demoAccountCount || 0}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <div 
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Users</h3>
            <button className="text-sm text-blue-500 hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                  <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Balance</th>
                  <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No users found
                    </td>
                  </tr>
                ) : recentUsers.map((user) => (
                  <tr key={user._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                          {user.firstName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: user.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: user.isActive ? '#22c55e' : '#ef4444'
                        }}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>${(user.balance || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-xs" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Actions */}
        <div 
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Pending Actions</h3>
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingTransactions.length}</span>
          </div>
          <div className="space-y-3">
            {pendingTransactions.length === 0 ? (
              <p className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>No pending actions</p>
            ) : pendingTransactions.map((action) => (
              <div 
                key={action._id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ 
                      backgroundColor: action.type === 'withdrawal' ? 'rgba(239, 68, 68, 0.1)' :
                                       action.type === 'deposit' ? 'rgba(34, 197, 94, 0.1)' :
                                       'rgba(59, 130, 246, 0.1)'
                    }}
                  >
                    <Clock size={18} style={{ 
                      color: action.type === 'withdrawal' ? '#ef4444' :
                             action.type === 'deposit' ? '#22c55e' : '#3b82f6'
                    }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{action.type}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{action.userId?.firstName || 'User'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>${(action.amount || 0).toLocaleString()}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(action.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div 
        className="rounded-2xl p-5"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Trades</h3>
          <button className="text-sm text-blue-500 hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Pair</th>
                <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
                <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Amount</th>
                <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Profit/Loss</th>
                <th className="text-left py-3 px-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No trades found
                  </td>
                </tr>
              ) : recentTrades.map((trade) => (
                <tr key={trade._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-primary)' }}>{trade.userId?.firstName || 'User'}</td>
                  <td className="py-3 px-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{trade.symbol}</td>
                  <td className="py-3 px-2">
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
                  <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-primary)' }}>${(trade.amount || 0).toLocaleString()}</td>
                  <td className="py-3 px-2 text-sm font-medium" style={{ color: (trade.profit || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-2">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium capitalize"
                      style={{
                        backgroundColor: trade.status === 'open' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: trade.status === 'open' ? '#3b82f6' : '#6b7280'
                      }}
                    >
                      {trade.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default OverviewDashboard
