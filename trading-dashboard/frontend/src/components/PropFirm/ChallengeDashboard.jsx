import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Trophy, Target, Clock, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, XCircle, ArrowLeft,
  DollarSign, Calendar, BarChart2, Activity, Wallet,
  Play, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const ChallengeDashboard = () => {
  const { isDark } = useTheme()
  const { id } = useParams()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState(null)
  const [stats, setStats] = useState(null)
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTrades, setShowTrades] = useState(false)

  useEffect(() => {
    fetchChallenge()
    fetchStats()
    fetchTrades()
  }, [id])

  const fetchChallenge = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`/api/challenges/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setChallenge(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch challenge:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`/api/challenges/${id}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setStats(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const fetchTrades = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`/api/challenges/${id}/trades`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setTrades(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#3b82f6'
      case 'funded': return '#22c55e'
      case 'failed': return '#ef4444'
      case 'phase_passed': return '#f59e0b'
      default: return 'var(--text-muted)'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="p-6 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>Challenge not found</p>
      </div>
    )
  }

  const profitPercent = stats?.profitPercent || 0
  const dailyDrawdown = stats?.dailyDrawdown || 0
  const totalDrawdown = stats?.totalDrawdown || 0

  return (
    <div className="p-4 md:p-6 pb-24" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/prop-firm/my-challenges')}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <ArrowLeft size={20} style={{ color: 'var(--text-primary)' }} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {challenge.challengeType?.name || 'Challenge'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {challenge.accountNumber}
          </p>
        </div>
        <span 
          className="px-3 py-1 rounded-full text-sm font-medium capitalize"
          style={{ 
            backgroundColor: `${getStatusColor(challenge.status)}20`,
            color: getStatusColor(challenge.status)
          }}
        >
          {challenge.status === 'active' ? `Phase ${challenge.currentPhase}` : challenge.status}
        </span>
      </div>

      {/* Account Balance Card */}
      <div 
        className="rounded-2xl p-6 mb-6"
        style={{ 
          background: `linear-gradient(135deg, ${challenge.challengeType?.color || '#3b82f6'}, ${challenge.challengeType?.color || '#3b82f6'}aa)`,
          color: 'white'
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-white/70 text-sm">Current Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(challenge.balance)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">Account Size</p>
            <p className="text-xl font-semibold">{formatCurrency(challenge.accountSize)}</p>
          </div>
        </div>
        <div className="flex justify-between">
          <div>
            <p className="text-white/70 text-sm">Profit/Loss</p>
            <p className={`text-lg font-semibold ${parseFloat(profitPercent) >= 0 ? '' : 'text-red-300'}`}>
              {parseFloat(profitPercent) >= 0 ? '+' : ''}{profitPercent}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">Equity</p>
            <p className="text-lg font-semibold">{formatCurrency(challenge.equity)}</p>
          </div>
        </div>
      </div>

      {/* Progress to Target */}
      {stats && challenge.status === 'active' && stats.profitTarget > 0 && (
        <div 
          className="rounded-2xl p-4 mb-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Progress to {stats.profitTarget}% Target
            </span>
            <span style={{ color: parseFloat(profitPercent) >= stats.profitTarget ? '#22c55e' : 'var(--text-secondary)' }}>
              {profitPercent}% / {stats.profitTarget}%
            </span>
          </div>
          <div 
            className="h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${Math.min(100, stats.profitProgress)}%`,
                backgroundColor: parseFloat(profitPercent) >= stats.profitTarget ? '#22c55e' : challenge.challengeType?.color || '#3b82f6'
              }}
            />
          </div>
          {parseFloat(profitPercent) >= stats.profitTarget && stats.tradingDays >= stats.minimumTradingDays && (
            <div className="flex items-center gap-2 mt-3 text-green-500">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">Target achieved! Phase completion in progress...</span>
            </div>
          )}
        </div>
      )}

      {/* Drawdown Meters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Daily Drawdown */}
        <div 
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={18} className="text-orange-500" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Daily Drawdown
            </span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className={`text-2xl font-bold ${parseFloat(dailyDrawdown) > 3 ? 'text-red-500' : 'text-green-500'}`}>
              {dailyDrawdown}%
            </span>
            <span className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              / {stats?.maxDailyDrawdown}%
            </span>
          </div>
          <div 
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${Math.min(100, stats?.dailyDrawdownUsed || 0)}%`,
                backgroundColor: parseFloat(dailyDrawdown) > 3 ? '#ef4444' : parseFloat(dailyDrawdown) > 2 ? '#f59e0b' : '#22c55e'
              }}
            />
          </div>
        </div>

        {/* Total Drawdown */}
        <div 
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={18} className="text-red-500" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Total Drawdown
            </span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className={`text-2xl font-bold ${parseFloat(totalDrawdown) > 7 ? 'text-red-500' : 'text-green-500'}`}>
              {totalDrawdown}%
            </span>
            <span className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              / {stats?.maxTotalDrawdown}%
            </span>
          </div>
          <div 
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${Math.min(100, stats?.totalDrawdownUsed || 0)}%`,
                backgroundColor: parseFloat(totalDrawdown) > 7 ? '#ef4444' : parseFloat(totalDrawdown) > 5 ? '#f59e0b' : '#22c55e'
              }}
            />
          </div>
        </div>
      </div>

      {/* Trading Statistics */}
      <div 
        className="rounded-2xl p-4 mb-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Trading Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Trades</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats?.totalTrades || 0}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Rate</p>
            <p className="text-xl font-bold text-green-500">
              {stats?.winRate || 0}%
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Profit Factor</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats?.profitFactor || '0.00'}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trading Days</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats?.tradingDays || 0}
              {stats?.minimumTradingDays > 0 && (
                <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
                  /{stats.minimumTradingDays}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Phase Progress */}
      {challenge.phases && challenge.phases.length > 0 && (
        <div 
          className="rounded-2xl p-4 mb-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Phase Progress
          </h3>
          <div className="space-y-3">
            {challenge.phases.map((phase, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    phase.status === 'passed' ? 'bg-green-500 text-white' :
                    phase.status === 'failed' ? 'bg-red-500 text-white' :
                    phase.status === 'active' ? 'bg-blue-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}
                >
                  {phase.status === 'passed' ? <CheckCircle size={16} /> :
                   phase.status === 'failed' ? <XCircle size={16} /> :
                   phase.phaseNumber}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    Phase {phase.phaseNumber}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Target: {phase.profitTarget}% • Min {phase.minimumTradingDays} days
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium capitalize ${
                    phase.status === 'passed' ? 'text-green-500' :
                    phase.status === 'failed' ? 'text-red-500' :
                    phase.status === 'active' ? 'text-blue-500' :
                    'text-gray-500'
                  }`}>
                    {phase.status}
                  </div>
                  {phase.profitAchieved > 0 && (
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {phase.profitAchieved.toFixed(2)}% achieved
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Funded Stage */}
            <div 
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: challenge.status === 'funded' ? '#22c55e20' : 'var(--bg-hover)' }}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  challenge.status === 'funded' ? 'bg-green-500 text-white' : 'bg-gray-600 text-white'
                }`}
              >
                <Trophy size={16} />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  Funded Account
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {challenge.challengeType?.payoutConfig?.profitSplit}% profit split
                </div>
              </div>
              <div className={`text-sm font-medium ${challenge.status === 'funded' ? 'text-green-500' : 'text-gray-500'}`}>
                {challenge.status === 'funded' ? 'Active' : 'Locked'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules */}
      {stats?.rules && (
        <div 
          className="rounded-2xl p-4 mb-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Challenge Rules
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Max Daily DD</span>
              <span style={{ color: 'var(--text-primary)' }}>{stats.rules.maxDailyDrawdown}%</span>
            </div>
            <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Max Total DD</span>
              <span style={{ color: 'var(--text-primary)' }}>{stats.rules.maxTotalDrawdown}%</span>
            </div>
            <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Weekend Holding</span>
              <span style={{ color: stats.rules.weekendHoldingAllowed ? '#22c55e' : '#ef4444' }}>
                {stats.rules.weekendHoldingAllowed ? 'Allowed' : 'Not Allowed'}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span style={{ color: 'var(--text-muted)' }}>News Trading</span>
              <span style={{ color: stats.rules.newsTrading ? '#22c55e' : '#ef4444' }}>
                {stats.rules.newsTrading ? 'Allowed' : 'Not Allowed'}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span style={{ color: 'var(--text-muted)' }}>EA/Bots</span>
              <span style={{ color: stats.rules.eaAllowed ? '#22c55e' : '#ef4444' }}>
                {stats.rules.eaAllowed ? 'Allowed' : 'Not Allowed'}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mandatory SL</span>
              <span style={{ color: stats.rules.mandatorySL ? '#f59e0b' : '#22c55e' }}>
                {stats.rules.mandatorySL ? 'Required' : 'Optional'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Trades */}
      <div 
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <button
          onClick={() => setShowTrades(!showTrades)}
          className="w-full p-4 flex items-center justify-between"
        >
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Recent Trades ({trades.length})
          </h3>
          {showTrades ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {showTrades && (
          <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
            {trades.length === 0 ? (
              <div className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
                No trades yet
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {trades.map((trade) => (
                  <div 
                    key={trade._id}
                    className="p-3 flex items-center justify-between border-b"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        trade.type === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {trade.type === 'buy' ? '↑' : '↓'}
                      </div>
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {trade.symbol}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {trade.volume} lots • {formatDate(trade.openedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${trade.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.netProfit >= 0 ? '+' : ''}{formatCurrency(trade.netProfit || 0)}
                      </div>
                      <div className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                        {trade.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {challenge.status === 'active' && (
        <div className="fixed bottom-20 left-0 right-0 p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <button
            onClick={() => {
              localStorage.setItem('challengeAccountId', challenge._id)
              localStorage.setItem('tradingMode', 'challenge')
              navigate('/trade')
            }}
            className="w-full py-4 rounded-xl font-semibold text-white"
            style={{ backgroundColor: challenge.challengeType?.color || '#3b82f6' }}
          >
            <Play size={18} className="inline mr-2" />
            Start Trading
          </button>
        </div>
      )}

      {challenge.status === 'funded' && (
        <div className="fixed bottom-20 left-0 right-0 p-4 flex gap-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <button
            onClick={() => {
              localStorage.setItem('challengeAccountId', challenge._id)
              localStorage.setItem('tradingMode', 'challenge')
              navigate('/trade')
            }}
            className="flex-1 py-4 rounded-xl font-semibold text-white"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Play size={18} className="inline mr-2" />
            Trade
          </button>
          <button
            onClick={() => navigate(`/prop-firm/challenge/${challenge._id}/payout`)}
            className="flex-1 py-4 rounded-xl font-semibold text-white bg-green-500"
          >
            <Wallet size={18} className="inline mr-2" />
            Request Payout
          </button>
        </div>
      )}
    </div>
  )
}

export default ChallengeDashboard
