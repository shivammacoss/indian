import React, { useState, useEffect } from 'react'
import {
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  Link,
  Wallet,
  ArrowDownToLine,
  History,
  UserPlus,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink,
  Share2,
  Award,
  ChevronRight,
  Lock,
  Unlock,
  Zap
} from 'lucide-react'
import axios from 'axios'

const IBDashboard = () => {
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
      if (referralsRes.data.success) setReferrals(referralsRes.data.data)
      if (commissionsRes.data.success) setCommissions(commissionsRes.data.data)
      if (withdrawalsRes.data.success) setWithdrawals(withdrawalsRes.data.data)
    } catch (err) {
      console.error('Failed to fetch IB data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generate dynamic referral link based on current origin (auto-updates with port/domain changes)
  const getDynamicReferralLink = () => {
    const referralCode = profile?.referralCode || profile?.ibId
    if (!referralCode) return ''
    return `${window.location.origin}/register?ref=${referralCode}`
  }

  const referralLink = getDynamicReferralLink()

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    if (!confirm(`Request upgrade to ${level.name} level? Admin will review your request.`)) return
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>IB Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Introducing Broker • {profile?.ibId}
          </p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
          <RefreshCw size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* Commission & Referral Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Commission Rate Card */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Your Commission Rate</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>${profile?.effectiveCommission || profile?.customCommission?.perLot || 2}<span className="text-lg font-normal">/lot</span></p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Level: <span className="font-semibold" style={{ color: profile?.levelColor || '#3b82f6' }}>{profile?.levelName || 'Standard'}</span>
                {profile?.customCommission?.enabled && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">Custom Rate</span>}
              </p>
            </div>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${profile?.levelColor || '#3b82f6'}20` }}>
              <DollarSign size={28} style={{ color: profile?.levelColor || '#3b82f6' }} />
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Earn commission on every trade your referrals make. Contact support to upgrade your level.
          </p>
        </div>

        {/* Referral Link Card */}
        <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 to-purple-600">
          <p className="text-blue-100 text-sm mb-1">Your Referral Link</p>
          <p className="text-white font-mono text-sm break-all mb-2">{referralLink}</p>
          <p className="text-blue-200 text-xs mb-3">
            Code: <span className="font-bold text-white">{profile?.referralCode || profile?.ibId}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(referralLink)}
              className="flex-1 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm flex items-center justify-center gap-2"
            >
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Join Hcfinvest', url: referralLink })
                }
              }}
              className="py-2 px-4 rounded-xl bg-white/20 hover:bg-white/30 text-white"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Level Progression Card */}
      <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Award size={20} /> Commission Levels
          </h3>
          <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-500">
            Auto-Upgrade Enabled
          </span>
        </div>
        
        {/* Progress to Next Level */}
        {profile?.nextLevel && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Progress to {profile.nextLevel.name}</span>
              <span className="text-sm font-semibold" style={{ color: profile.nextLevel.color }}>{profile.nextLevel.progressPercent}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${profile.nextLevel.progressPercent}%`, backgroundColor: profile.nextLevel.color }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {profile.nextLevel.referralsNeeded > 0 
                ? `${profile.nextLevel.referralsNeeded} more referrals needed for ${profile.nextLevel.name} (${profile.nextLevel.minReferrals} total required)`
                : `Congratulations! You've reached the requirements for ${profile.nextLevel.name}. Level will upgrade automatically.`
              }
            </p>
          </div>
        )}

        {/* All Levels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {profile?.allLevels?.map((level) => (
            <div 
              key={level.level}
              className={`p-4 rounded-xl relative ${level.isCurrentLevel ? 'ring-2' : ''}`}
              style={{ 
                backgroundColor: level.isCurrentLevel ? `${level.color}15` : 'var(--bg-hover)',
                borderColor: level.isCurrentLevel ? level.color : 'transparent',
                ringColor: level.color
              }}
            >
              {level.isCurrentLevel && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                  Current
                </span>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${level.color}30` }}>
                  {level.isUnlocked ? <Unlock size={14} style={{ color: level.color }} /> : <Lock size={14} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <span className="font-semibold text-sm" style={{ color: level.isUnlocked ? level.color : 'var(--text-muted)' }}>{level.name}</span>
              </div>
              <p className="text-xl font-bold mb-1" style={{ color: level.isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                ${level.commissionPerLot}<span className="text-xs font-normal">/lot</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {level.minReferrals > 0 ? `${level.minReferrals}+ referrals` : 'Default'}
              </p>
              {!level.isCurrentLevel && level.level > profile.commissionLevel && (
                <div className="mt-2 py-1.5 px-2 rounded-lg text-xs text-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  {level.isUnlocked 
                    ? <span className="text-green-500 font-medium">✓ Qualified</span>
                    : <span style={{ color: 'var(--text-muted)' }}>Need {level.minReferrals - (profile?.stats?.totalReferrals || 0)} more</span>
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
              <Users size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Referrals</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.totalReferrals || 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10">
              <UserPlus size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active Traders</p>
              <p className="text-xl font-bold" style={{ color: '#22c55e' }}>{stats?.activeReferrals || 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10">
              <TrendingUp size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trading Volume</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.totalTradingVolume?.toFixed(2) || 0} lots</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-500/10">
              <DollarSign size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Deposits</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>${stats?.totalDeposits?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Wallet size={20} /> IB Wallet
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Available Balance</p>
            <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>${stats?.availableBalance?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Earned</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>${stats?.totalCommissionEarned?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending Withdrawals</p>
            <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>${stats?.pendingWithdrawals?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Withdrawn</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>${stats?.totalWithdrawn?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Amount to withdraw"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl"
            style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleWithdraw}
            disabled={submitting || !withdrawAmount}
            className="px-6 py-3 rounded-xl bg-green-500 text-white font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <ArrowDownToLine size={18} />
            {submitting ? 'Processing...' : 'Transfer to Wallet'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className="px-5 py-2 rounded-xl font-medium"
          style={{ backgroundColor: activeTab === 'overview' ? 'var(--accent-blue)' : 'var(--bg-card)', color: activeTab === 'overview' ? '#fff' : 'var(--text-secondary)' }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className="px-5 py-2 rounded-xl font-medium"
          style={{ backgroundColor: activeTab === 'referrals' ? 'var(--accent-blue)' : 'var(--bg-card)', color: activeTab === 'referrals' ? '#fff' : 'var(--text-secondary)' }}
        >
          Referrals ({referrals.length})
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className="px-5 py-2 rounded-xl font-medium"
          style={{ backgroundColor: activeTab === 'commissions' ? 'var(--accent-blue)' : 'var(--bg-card)', color: activeTab === 'commissions' ? '#fff' : 'var(--text-secondary)' }}
        >
          Commissions
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className="px-5 py-2 rounded-xl font-medium"
          style={{ backgroundColor: activeTab === 'withdrawals' ? 'var(--accent-blue)' : 'var(--bg-card)', color: activeTab === 'withdrawals' ? '#fff' : 'var(--text-secondary)' }}
        >
          Withdrawals
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Commission Model */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Your Commission Model</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--text-muted)' }}>Commission Level:</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: `${profile?.levelColor || '#3b82f6'}20`, color: profile?.levelColor || '#3b82f6' }}>
                  {profile?.levelName || 'Standard'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--text-muted)' }}>Commission Rate:</span>
                <span className="text-xl font-bold" style={{ color: '#22c55e' }}>
                  ${profile?.effectiveCommission || 2}/lot
                </span>
              </div>
              {profile?.customCommission?.enabled && (
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--text-muted)' }}>Custom Rate:</span>
                  <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-500">Active</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${profile?.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {profile?.status}
                </span>
              </div>
              <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Earn ${profile?.effectiveCommission || 2} for every lot traded by your referrals. Contact support to upgrade your level.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Commissions */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Commissions</h3>
            {commissions.length === 0 ? (
              <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>No commissions yet</p>
            ) : (
              <div className="space-y-3">
                {commissions.slice(0, 5).map((c) => (
                  <div key={c._id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {c.sourceUserId?.firstName} {c.sourceUserId?.lastName}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {c.sourceType === 'trade' ? `${c.symbol} • ${c.lots} lots` : c.sourceType}
                      </p>
                    </div>
                    <span className="font-bold" style={{ color: '#22c55e' }}>+${c.commissionAmount?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {referrals.length === 0 ? (
            <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No referrals yet. Share your link to start earning!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Registered</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>First Deposit</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Volume</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Commission</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.referredUserId?.firstName} {r.referredUserId?.lastName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.referredUserId?.email}</p>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(r.registeredAt).toLocaleDateString()}</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>${r.stats?.firstDeposit || 0}</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{r.stats?.totalTradingVolume?.toFixed(2) || 0} lots</td>
                      <td className="py-4 px-4 text-sm font-semibold" style={{ color: '#22c55e' }}>${r.stats?.commissionGenerated?.toFixed(2) || 0}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Commissions Tab */}
      {activeTab === 'commissions' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {commissions.length === 0 ? (
            <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No commission history yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Source User</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Details</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleString()}</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{c.sourceUserId?.firstName} {c.sourceUserId?.lastName}</td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-lg text-xs capitalize" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                          {c.sourceType?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {c.sourceType === 'trade' ? `${c.symbol} • ${c.lots} lots` : c.sourceType === 'first_deposit' ? `$${c.depositAmount}` : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold" style={{ color: '#22c55e' }}>+${c.commissionAmount?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === 'withdrawals' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {withdrawals.length === 0 ? (
            <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No withdrawal history yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Amount</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Method</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(w.createdAt).toLocaleString()}</td>
                      <td className="py-4 px-4 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>${w.amount?.toFixed(2)}</td>
                      <td className="py-4 px-4 text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{w.method}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          w.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                          w.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          w.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default IBDashboard
