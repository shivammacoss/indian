import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { 
  Trophy, Target, Clock, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, XCircle, ChevronRight,
  Play, Pause, DollarSign, Calendar, BarChart2
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const MyChallenges = () => {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchChallenges()
  }, [])

  const fetchChallenges = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/challenges/my', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setChallenges(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch challenges:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Play size={16} />
      case 'funded': return <Trophy size={16} />
      case 'failed': return <XCircle size={16} />
      case 'phase_passed': return <CheckCircle size={16} />
      default: return <Pause size={16} />
    }
  }

  const filteredChallenges = challenges.filter(c => {
    if (filter === 'all') return true
    return c.status === filter
  })

  const stats = {
    total: challenges.length,
    active: challenges.filter(c => c.status === 'active').length,
    funded: challenges.filter(c => c.status === 'funded').length,
    failed: challenges.filter(c => c.status === 'failed').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 overflow-x-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            My Challenges
          </h1>
          <p className="text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
            Track your prop firm challenge progress
          </p>
        </div>
        <button
          onClick={() => navigate('/prop-firm')}
          className="px-4 py-2.5 rounded-xl font-medium text-white text-sm md:text-base w-full sm:w-auto"
          style={{ backgroundColor: '#3b82f6' }}
        >
          + New Challenge
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
        <div 
          className="p-2 md:p-4 rounded-xl text-center"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="text-lg md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {stats.total}
          </div>
          <div className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>Total</div>
        </div>
        <div 
          className="p-2 md:p-4 rounded-xl text-center"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="text-lg md:text-2xl font-bold text-blue-500">{stats.active}</div>
          <div className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>Active</div>
        </div>
        <div 
          className="p-2 md:p-4 rounded-xl text-center"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="text-lg md:text-2xl font-bold text-green-500">{stats.funded}</div>
          <div className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>Funded</div>
        </div>
        <div 
          className="p-2 md:p-4 rounded-xl text-center"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="text-lg md:text-2xl font-bold text-red-500">{stats.failed}</div>
          <div className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>Failed</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {['all', 'active', 'funded', 'failed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium capitalize transition-all flex-shrink-0 ${
              filter === f ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: filter === f ? getStatusColor(f === 'all' ? 'active' : f) : 'var(--bg-card)',
              color: filter === f ? 'white' : 'var(--text-secondary)'
            }}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Challenges List */}
      {filteredChallenges.length === 0 ? (
        <div 
          className="text-center py-12 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <Trophy size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No Challenges Found
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {filter === 'all' 
              ? 'Start your first challenge to begin your prop trading journey'
              : `No ${filter} challenges`}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => navigate('/prop-firm')}
              className="mt-4 px-6 py-2 rounded-xl font-medium text-white"
              style={{ backgroundColor: '#3b82f6' }}
            >
              Browse Challenges
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChallenges.map((challenge) => {
            const profitPercent = ((challenge.balance - challenge.initialBalance) / challenge.initialBalance) * 100
            const currentPhase = challenge.challengeType?.phases?.find(p => p.phaseNumber === challenge.currentPhase)
            const targetPercent = currentPhase?.profitTarget || 0
            const progress = targetPercent > 0 ? Math.min(100, (profitPercent / targetPercent) * 100) : 0

            return (
              <div
                key={challenge._id}
                className="rounded-2xl p-4 transition-all"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${challenge.challengeType?.color || '#3b82f6'}20` }}
                    >
                      {challenge.status === 'funded' ? (
                        <Trophy size={20} style={{ color: '#22c55e' }} />
                      ) : (
                        <Target size={20} style={{ color: challenge.challengeType?.color || '#3b82f6' }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm md:text-base truncate" style={{ color: 'var(--text-primary)' }}>
                        {challenge.challengeType?.name || 'Challenge'}
                      </div>
                      <div className="text-xs md:text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                        {challenge.accountNumber} • {formatCurrency(challenge.accountSize)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <span 
                      className="flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${getStatusColor(challenge.status)}20`,
                        color: getStatusColor(challenge.status)
                      }}
                    >
                      {getStatusIcon(challenge.status)}
                      <span className="hidden sm:inline">{challenge.status === 'active' ? `Phase ${challenge.currentPhase}` : challenge.status}</span>
                    </span>
                  </div>
                </div>

                {/* Progress & Stats */}
                <div className="grid grid-cols-4 gap-2 md:gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Balance</div>
                    <div className="font-semibold text-sm md:text-base truncate" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(challenge.balance)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Profit</div>
                    <div className={`font-semibold text-sm md:text-base ${profitPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Trades</div>
                    <div className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
                      {challenge.stats?.totalTrades || 0}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Win</div>
                    <div className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
                      {(challenge.stats?.winRate || 0).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar (for active challenges) */}
                {challenge.status === 'active' && targetPercent > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-muted)' }}>
                        Progress to {targetPercent}% target
                      </span>
                      <span style={{ color: profitPercent >= targetPercent ? '#22c55e' : 'var(--text-secondary)' }}>
                        {profitPercent.toFixed(2)}%
                      </span>
                    </div>
                    <div 
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                    >
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.max(0, progress)}%`,
                          backgroundColor: profitPercent >= targetPercent ? '#22c55e' : challenge.challengeType?.color || '#3b82f6'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Drawdown Warning */}
                {challenge.status === 'active' && (
                  <div className="flex flex-wrap gap-3 md:gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-1 md:gap-2 text-xs">
                      <TrendingDown size={12} className="text-orange-500 flex-shrink-0" />
                      <span style={{ color: 'var(--text-muted)' }}>Daily:</span>
                      <span className={challenge.stats?.currentDailyDrawdown > 3 ? 'text-red-500' : 'text-green-500'}>
                        {(challenge.stats?.currentDailyDrawdown || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 text-xs">
                      <TrendingDown size={12} className="text-red-500 flex-shrink-0" />
                      <span style={{ color: 'var(--text-muted)' }}>Total:</span>
                      <span className={challenge.stats?.currentTotalDrawdown > 7 ? 'text-red-500' : 'text-green-500'}>
                        {(challenge.stats?.currentTotalDrawdown || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Failure Reason */}
                {challenge.status === 'failed' && challenge.failureReason && (
                  <div className="flex items-center gap-2 mt-3 pt-3 text-sm text-red-500" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <AlertTriangle size={16} />
                    {challenge.failureDetails || challenge.failureReason.replace(/_/g, ' ')}
                  </div>
                )}

                {/* Trade Button for Active Challenges */}
                {challenge.status === 'active' && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Store challenge account for trading
                        localStorage.setItem('activeTradingAccount', JSON.stringify({
                          _id: challenge.tradingAccount?._id || challenge.tradingAccount,
                          accountNumber: challenge.accountNumber,
                          balance: challenge.balance,
                          isChallenge: true,
                          challengeId: challenge._id,
                          challengeRules: challenge.challengeType?.riskRules
                        }))
                        localStorage.setItem('activeChallengeId', challenge._id)
                        navigate('/trade')
                      }}
                      className="w-full py-2.5 rounded-xl font-medium text-white text-sm flex items-center justify-center gap-2"
                      style={{ backgroundColor: challenge.challengeType?.color || '#3b82f6' }}
                    >
                      <TrendingUp size={16} />
                      Start Trading
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyChallenges
