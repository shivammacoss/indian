import React, { useState, useEffect } from 'react'
import { ArrowLeft, Users, DollarSign, Copy, Loader2, TrendingUp, Wallet, Clock, Share2, CheckCircle, RefreshCw, UserPlus, ArrowDownToLine, Award, Lock, Unlock, ChevronRight } from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../../context/ThemeContext'

const MobileIB = ({ onBack }) => {
  const { isDark } = useTheme()
  
  // Theme colors
  const bgPrimary = isDark ? '#000000' : '#f5f5f7'
  const bgCard = isDark ? '#0d0d0d' : '#ffffff'
  const bgSecondary = isDark ? '#1a1a1a' : '#f2f2f7'
  const borderColor = isDark ? '#1a1a1a' : '#e5e5ea'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? '#6b7280' : '#8e8e93'
  const [activeTab, setActiveTab] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [commissions, setCommissions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [profileRes, statsRes, referralsRes, commissionsRes, withdrawalsRes] = await Promise.all([
        axios.get('/api/ib/profile', getAuthHeader()),
        axios.get('/api/ib/stats', getAuthHeader()),
        axios.get('/api/ib/referrals', getAuthHeader()),
        axios.get('/api/ib/commissions', getAuthHeader()),
        axios.get('/api/ib/withdrawals', getAuthHeader())
      ])

      if (profileRes.data.success) setProfile(profileRes.data.data)
      if (statsRes.data.success) setStats(statsRes.data.data)
      if (referralsRes.data.success) setReferrals(referralsRes.data.data || [])
      if (commissionsRes.data.success) setCommissions(commissionsRes.data.data || [])
      if (withdrawalsRes.data.success) setWithdrawals(withdrawalsRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch IB data:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Generate dynamic referral link based on current origin (auto-updates with port/domain changes)
  const getDynamicReferralLink = () => {
    const referralCode = profile?.referralCode || profile?.ibId
    if (!referralCode) return ''
    return `${window.location.origin}/register?ref=${referralCode}`
  }

  const referralLink = getDynamicReferralLink()

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Join Hcfinvest', url: referralLink })
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return
    try {
      setSubmitting(true)
      const res = await axios.post('/api/ib/withdraw-to-wallet', { amount: parseFloat(withdrawAmount) }, getAuthHeader())
      if (res.data.success) {
        alert(res.data.message)
        setWithdrawAmount('')
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to withdraw')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestUpgrade = async (level) => {
    if (!confirm(`Request upgrade to ${level.name} level?`)) return
    try {
      setUpgradeLoading(true)
      const res = await axios.post('/api/ib/request-upgrade', { requestedLevel: level.level }, getAuthHeader())
      if (res.data.success) {
        // Immediately update profile state for instant UI feedback
        setProfile(prev => ({
          ...prev,
          upgradeRequest: res.data.data.upgradeRequest
        }))
        alert(res.data.message)
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request upgrade')
    } finally {
      setUpgradeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgPrimary }}>
        <Loader2 className="animate-spin" size={24} color={textSecondary} />
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'levels', label: 'Levels' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'withdrawals', label: 'History' }
  ]

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: bgPrimary }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: bgCard, borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg" style={{ backgroundColor: bgSecondary }}>
            <ArrowLeft size={18} color={textSecondary} />
          </button>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: textPrimary }}>IB Dashboard</h1>
            <p className="text-xs" style={{ color: textSecondary }}>{profile?.ibId}</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg" style={{ backgroundColor: bgSecondary }}>
          <RefreshCw size={16} color={textSecondary} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: `1px solid ${borderColor}` }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 text-xs"
            style={{ 
              color: activeTab === tab.id ? '#3b82f6' : textSecondary,
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <>
            {/* Referral Link Card */}
            <div className="rounded-xl p-4 mb-4 bg-gradient-to-r from-blue-600 to-purple-600">
              <p className="text-blue-100 text-xs mb-1">Your Referral Link</p>
              <p className="text-white font-mono text-xs break-all mb-2">{referralLink}</p>
              <p className="text-blue-200 text-xs">
                Code: <span className="font-bold text-white">{profile?.referralCode}</span>
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => copyToClipboard(referralLink)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  {copied ? <CheckCircle size={14} color="#fff" /> : <Copy size={14} color="#fff" />}
                  <span style={{ color: '#fff' }}>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Share2 size={14} color="#fff" />
                  <span style={{ color: '#fff' }}>Share</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <Users size={18} color="#3b82f6" className="mb-1" />
                <p className="text-lg font-bold" style={{ color: textPrimary }}>{stats?.totalReferrals || 0}</p>
                <p className="text-xs" style={{ color: textSecondary }}>Total Referrals</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <UserPlus size={18} color="#22c55e" className="mb-1" />
                <p className="text-lg font-bold" style={{ color: '#22c55e' }}>{stats?.activeReferrals || 0}</p>
                <p className="text-xs" style={{ color: textSecondary }}>Active Traders</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <TrendingUp size={18} color="#a855f7" className="mb-1" />
                <p className="text-lg font-bold" style={{ color: textPrimary }}>{stats?.totalTradingVolume?.toFixed(2) || 0} lots</p>
                <p className="text-xs" style={{ color: textSecondary }}>Trading Volume</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <DollarSign size={18} color="#fbbf24" className="mb-1" />
                <p className="text-lg font-bold" style={{ color: textPrimary }}>${stats?.totalDeposits?.toLocaleString() || 0}</p>
                <p className="text-xs" style={{ color: textSecondary }}>Total Deposits</p>
              </div>
            </div>

            {/* IB Wallet */}
            <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: textPrimary }}>
                <Wallet size={16} /> IB Wallet
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs" style={{ color: textSecondary }}>Available Balance</p>
                  <p className="text-lg font-bold" style={{ color: '#22c55e' }}>${stats?.availableBalance?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: textSecondary }}>Total Earned</p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>${stats?.totalCommissionEarned?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: textSecondary }}>Pending Withdrawals</p>
                  <p className="text-lg font-bold" style={{ color: '#fbbf24' }}>${stats?.pendingWithdrawals?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: textSecondary }}>Total Withdrawn</p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>${stats?.totalWithdrawn?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Amount to withdraw"
                  className="flex-1 p-2 rounded-lg text-sm"
                  style={{ backgroundColor: bgSecondary, color: textPrimary, border: `1px solid ${borderColor}` }}
                />
                <button
                  onClick={handleWithdraw}
                  disabled={submitting || !withdrawAmount}
                  className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                  style={{ backgroundColor: '#22c55e', color: '#000' }}
                >
                  <ArrowDownToLine size={14} />
                  {submitting ? 'Processing...' : 'Transfer'}
                </button>
              </div>
            </div>

            {/* Commission Model */}
            <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: textPrimary }}>Your Commission Model</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: textSecondary }}>Level:</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${profile?.levelColor || '#3b82f6'}20`, color: profile?.levelColor || '#3b82f6' }}>
                    {profile?.levelName || 'Standard'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: textSecondary }}>Commission Rate:</span>
                  <span className="text-lg font-bold" style={{ color: '#22c55e' }}>
                    ${profile?.effectiveCommission || 2}/lot
                  </span>
                </div>
                {profile?.customCommission?.enabled && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: textSecondary }}>Custom Rate:</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-500">Active</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#6b7280' }}>Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${profile?.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {profile?.status}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Levels Tab */}
        {activeTab === 'levels' && (
          <div className="space-y-4">
            {/* Progress to Next Level */}
            {profile?.nextLevel && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: textSecondary }}>Progress to {profile.nextLevel.name}</span>
                  <span className="text-sm font-bold" style={{ color: profile.nextLevel.color }}>{profile.nextLevel.progressPercent}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: bgSecondary }}>
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${profile.nextLevel.progressPercent}%`, backgroundColor: profile.nextLevel.color }}
                  />
                </div>
                <p className="text-xs" style={{ color: textSecondary }}>
                  {profile.nextLevel.referralsNeeded > 0 
                    ? `${profile.nextLevel.referralsNeeded} more referrals needed`
                    : `You qualify! Level will upgrade automatically.`
                  }
                </p>
              </div>
            )}

            {/* Auto-Upgrade Notice */}
            <div className="p-3 rounded-xl bg-blue-500/10 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              <span className="text-xs text-blue-500">Auto-upgrade enabled - levels upgrade when you reach referral targets</span>
            </div>

            {/* All Levels */}
            <div className="space-y-2">
              {profile?.allLevels?.map((level) => (
                <div 
                  key={level.level}
                  className={`p-4 rounded-xl ${level.isCurrentLevel ? 'ring-2' : ''}`}
                  style={{ 
                    backgroundColor: level.isCurrentLevel ? `${level.color}15` : bgCard,
                    border: `1px solid ${level.isCurrentLevel ? level.color : borderColor}`,
                    ringColor: level.color
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${level.color}30` }}>
                        {level.isUnlocked ? <Unlock size={18} style={{ color: level.color }} /> : <Lock size={18} style={{ color: textSecondary }} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: level.isUnlocked ? level.color : textSecondary }}>{level.name}</span>
                          {level.isCurrentLevel && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-500 text-white">Current</span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: textSecondary }}>
                          {level.minReferrals > 0 ? `${level.minReferrals}+ referrals required` : 'Default level'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: level.isUnlocked ? textPrimary : textSecondary }}>
                        ${level.commissionPerLot}
                      </p>
                      <p className="text-xs" style={{ color: textSecondary }}>per lot</p>
                    </div>
                  </div>
                  {!level.isCurrentLevel && level.level > profile.commissionLevel && (
                    <div className="mt-3 py-2 rounded-lg text-xs text-center" style={{ backgroundColor: bgSecondary }}>
                      {level.isUnlocked 
                        ? <span className="text-green-500 font-medium">✓ Qualified - Will auto-upgrade</span>
                        : <span style={{ color: textSecondary }}>Need {level.minReferrals - (profile?.stats?.totalReferrals || 0)} more referrals</span>
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-2">
            {referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users size={32} color={textSecondary} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: textSecondary }}>No referrals yet</p>
                <p className="text-xs" style={{ color: textSecondary }}>Share your link to start earning!</p>
              </div>
            ) : referrals.map(ref => (
              <div key={ref._id} className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{ref.referredUserId?.firstName} {ref.referredUserId?.lastName}</p>
                    <p className="text-xs" style={{ color: textSecondary }}>{ref.referredUserId?.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: ref.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)', color: ref.status === 'active' ? '#22c55e' : textSecondary }}>
                    {ref.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p style={{ color: textSecondary }}>Registered</p>
                    <p style={{ color: textPrimary }}>{new Date(ref.registeredAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p style={{ color: textSecondary }}>Volume</p>
                    <p style={{ color: textPrimary }}>{ref.stats?.totalTradingVolume?.toFixed(2) || 0} lots</p>
                  </div>
                  <div>
                    <p style={{ color: textSecondary }}>Commission</p>
                    <p style={{ color: '#22c55e' }}>${ref.stats?.commissionGenerated?.toFixed(2) || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'commissions' && (
          <div className="space-y-2">
            {commissions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign size={32} color={textSecondary} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: textSecondary }}>No commission history yet</p>
              </div>
            ) : commissions.map(com => (
              <div key={com._id} className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold" style={{ color: '#22c55e' }}>+${com.commissionAmount?.toFixed(2)}</p>
                      <span className="px-2 py-0.5 rounded text-xs capitalize" style={{ backgroundColor: isDark ? '#1a1a1a' : '#e5e5ea', color: isDark ? '#9ca3af' : '#6b7280' }}>
                        {com.sourceType?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: textPrimary }}>{com.sourceUserId?.firstName} {com.sourceUserId?.lastName}</p>
                    <p className="text-xs" style={{ color: textSecondary }}>
                      {com.sourceType === 'trade' ? `${com.symbol} • ${com.lots} lots` : com.sourceType === 'first_deposit' ? `$${com.depositAmount}` : '-'}
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: textSecondary }}>{new Date(com.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-2">
            {withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <ArrowDownToLine size={32} color={textSecondary} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: textSecondary }}>No withdrawal history yet</p>
              </div>
            ) : withdrawals.map(w => (
              <div key={w._id} className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold" style={{ color: textPrimary }}>${w.amount?.toFixed(2)}</p>
                    <p className="text-xs capitalize" style={{ color: textSecondary }}>{w.method}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      w.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                      w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                      w.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {w.status}
                    </span>
                    <p className="text-xs mt-1" style={{ color: textSecondary }}>{new Date(w.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MobileIB
