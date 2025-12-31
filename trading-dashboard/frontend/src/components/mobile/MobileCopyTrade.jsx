import React, { useState, useEffect } from 'react'
import { ArrowLeft, Users, TrendingUp, Loader2, Star, UserPlus, UserMinus, Settings, X, Play, Pause, Search, Filter, Award, CheckCircle, AlertTriangle, BarChart3, DollarSign, Wallet } from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../../context/ThemeContext'

const MobileCopyTrade = ({ onBack }) => {
  const { isDark } = useTheme()
  
  // Theme colors
  const bgPrimary = isDark ? '#000000' : '#f5f5f7'
  const bgCard = isDark ? '#0d0d0d' : '#ffffff'
  const bgSecondary = isDark ? '#1a1a1a' : '#f2f2f7'
  const borderColor = isDark ? '#1a1a1a' : '#e5e5ea'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? '#6b7280' : '#8e8e93'
  const [activeTab, setActiveTab] = useState('masters')
  const [masters, setMasters] = useState([])
  const [myFollows, setMyFollows] = useState([])
  const [myMasterStatus, setMyMasterStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedMaster, setSelectedMaster] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('followers')
  const [riskFilter, setRiskFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const [followForm, setFollowForm] = useState({
    copyMode: 'multiplier',
    fixedLot: 0.01,
    multiplier: 1.0,
    maxDailyLossPercent: 10,
    maxDrawdownPercent: 30,
    maxLotSize: 5,
    stopCopyOnDrawdown: true
  })

  const [requestForm, setRequestForm] = useState({
    experienceYears: 1,
    strategy: '',
    description: '',
    minCapital: 1000,
    preferredCommissionType: 'profit_share',
    preferredCommissionValue: 20,
    riskLevel: 'Medium',
    riskDisclosureAccepted: false
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchData()
  }, [sortBy, riskFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [mastersRes, followsRes, statusRes] = await Promise.all([
        axios.get(`/api/copy-trade/masters?sort=${sortBy}${riskFilter !== 'all' ? `&riskLevel=${riskFilter}` : ''}`, getAuthHeader()),
        axios.get('/api/copy-trade/my-follows', getAuthHeader()),
        axios.get('/api/copy-trade/my-master-status', getAuthHeader())
      ])

      if (mastersRes.data.success) setMasters(mastersRes.data.data || [])
      if (followsRes.data.success) setMyFollows(followsRes.data.data || [])
      if (statusRes.data.success) setMyMasterStatus(statusRes.data.data)
    } catch (err) {
      console.error('Failed to fetch copy trade data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Low': return '#22c55e'
      case 'Medium': return '#fbbf24'
      case 'High': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const filteredMasters = masters.filter(m => 
    m.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.strategyType?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleFollow = async () => {
    if (!selectedMaster) return
    try {
      setSubmitting(true)
      const res = await axios.post(`/api/copy-trade/follow/${selectedMaster._id}`, followForm, getAuthHeader())
      if (res.data.success) {
        alert('Successfully started following!')
        setShowFollowModal(false)
        setSelectedMaster(null)
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to follow')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnfollow = async (followId) => {
    if (!confirm('Stop copying this master?')) return
    try {
      await axios.delete(`/api/copy-trade/unfollow/${followId}`, getAuthHeader())
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unfollow')
    }
  }

  const handleTogglePause = async (followId, currentStatus) => {
    try {
      const action = currentStatus === 'active' ? 'pause' : 'resume'
      await axios.put(`/api/copy-trade/follow/${followId}/${action}`, {}, getAuthHeader())
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update')
    }
  }

  const handleRequestMaster = async () => {
    if (!requestForm.riskDisclosureAccepted) {
      alert('Please accept the risk disclosure')
      return
    }
    try {
      setSubmitting(true)
      const res = await axios.post('/api/copy-trade/request-master', {
        ...requestForm,
        riskDisclosureAccepted: 'true',
        termsAccepted: 'true'
      }, getAuthHeader())
      if (res.data.success) {
        alert('Request submitted! Awaiting admin approval.')
        setShowRequestModal(false)
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
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
    { id: 'masters', label: 'Masters' },
    { id: 'following', label: `Following (${myFollows.length})` },
    ...(myMasterStatus?.isMaster ? [{ id: 'dashboard', label: 'Dashboard' }] : [])
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
            <h1 className="text-lg font-semibold" style={{ color: textPrimary }}>Copy Trade</h1>
            <p className="text-xs" style={{ color: textSecondary }}>Follow expert traders</p>
          </div>
        </div>
        {!myMasterStatus?.isMaster && myMasterStatus?.latestRequest?.status !== 'pending' && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500"
          >
            <Award size={16} color="#fff" />
          </button>
        )}
        {myMasterStatus?.latestRequest?.status === 'pending' && (
          <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-500">Pending</span>
        )}
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
        {activeTab === 'masters' && (
          <>
            {/* Search and Filters */}
            <div className="mb-4 space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: textSecondary }} />
                <input
                  type="text"
                  placeholder="Search masters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: textPrimary }}
                />
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                  style={{ backgroundColor: showFilters ? '#22c55e' : 'transparent' }}
                >
                  <Filter size={16} color={showFilters ? '#000' : textSecondary} />
                </button>
              </div>
              {showFilters && (
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 p-2 rounded-lg text-xs"
                    style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: textPrimary }}
                  >
                    <option value="followers">Most Followers</option>
                    <option value="profit">Highest Profit</option>
                    <option value="winrate">Best Win Rate</option>
                  </select>
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="flex-1 p-2 rounded-lg text-xs"
                    style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}`, color: textPrimary }}
                  >
                    <option value="all">All Risk</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {filteredMasters.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} color={textSecondary} className="mx-auto mb-2" />
                  <p className="text-sm" style={{ color: textSecondary }}>No masters found</p>
                </div>
              ) : filteredMasters.map(master => (
                <div key={master._id} className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {master.displayName?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium" style={{ color: textPrimary }}>{master.displayName}</p>
                          {master.isVerified && <CheckCircle size={12} color="#3b82f6" />}
                        </div>
                        <p className="text-xs" style={{ color: textSecondary }}>{master.strategyType || 'General'}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${getRiskColor(master.riskLevel)}20`, color: getRiskColor(master.riskLevel) }}>
                      {master.riskLevel}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: bgSecondary }}>
                      <p className="text-sm font-bold" style={{ color: '#22c55e' }}>{master.stats?.winRate || 0}%</p>
                      <p className="text-xs" style={{ color: textSecondary }}>Win Rate</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: bgSecondary }}>
                      <p className="text-sm font-bold" style={{ color: textPrimary }}>{master.stats?.activeFollowers || 0}</p>
                      <p className="text-xs" style={{ color: textSecondary }}>Followers</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: bgSecondary }}>
                      <p className="text-sm font-bold" style={{ color: (master.stats?.profit30Days || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                        {(master.stats?.profit30Days || 0) >= 0 ? '+' : ''}{master.stats?.profit30Days || 0}%
                      </p>
                      <p className="text-xs" style={{ color: textSecondary }}>30D Profit</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span style={{ color: textSecondary }}>Commission:</span>
                    <span style={{ color: textPrimary }}>
                      {master.commissionType === 'profit_share' ? `${master.commissionValue}% profit` :
                       master.commissionType === 'per_lot' ? `$${master.commissionValue}/lot` :
                       `$${master.subscriptionFee}/mo`}
                    </span>
                  </div>
                  {master.isFollowing ? (
                    <button className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1" style={{ backgroundColor: '#1a1a1a', color: '#6b7280' }} disabled>
                      <CheckCircle size={14} /> Following
                    </button>
                  ) : (
                    <button
                      onClick={() => { setSelectedMaster(master); setShowFollowModal(true); }}
                      className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                    >
                      <UserPlus size={14} /> Follow Master
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'following' && (
          <div className="space-y-2">
            {myFollows.length === 0 ? (
              <div className="text-center py-8">
                <Users size={32} color="#6b7280" className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: '#6b7280' }}>Not following anyone</p>
                <button
                  onClick={() => setActiveTab('masters')}
                  className="mt-3 px-4 py-2 rounded-lg text-xs font-medium bg-blue-500 text-white"
                >
                  Browse Masters
                </button>
              </div>
            ) : myFollows.map(follow => (
              <div key={follow._id} className="p-3 rounded-xl" style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {follow.masterId?.displayName?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#fff' }}>{follow.masterId?.displayName || 'Master'}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{follow.masterId?.strategyType}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {follow.copyMode} • {follow.copyMode === 'fixed_lot' ? `${follow.fixedLot} lots` : `${follow.multiplier}x`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: (follow.stats?.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                      {(follow.stats?.totalPnL || 0) >= 0 ? '+' : ''}${follow.stats?.totalPnL?.toFixed(2) || '0.00'}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ 
                      backgroundColor: follow.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)', 
                      color: follow.status === 'active' ? '#22c55e' : '#fbbf24' 
                    }}>
                      {follow.status}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#6b7280' }}>
                    {follow.stats?.totalCopiedTrades || 0} trades copied
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTogglePause(follow._id, follow.status)}
                      className="p-1.5 rounded"
                      style={{ backgroundColor: '#1a1a1a' }}
                      title={follow.status === 'active' ? 'Pause' : 'Resume'}
                    >
                      {follow.status === 'active' ? <Pause size={14} color="#fbbf24" /> : <Play size={14} color="#22c55e" />}
                    </button>
                    <button
                      onClick={() => handleUnfollow(follow._id)}
                      className="p-1.5 rounded"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                      title="Stop Following"
                    >
                      <UserMinus size={14} color="#ef4444" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'dashboard' && myMasterStatus?.isMaster && (
          <MobileMasterDashboard masterProfile={myMasterStatus.masterProfile} />
        )}
      </div>

      {/* Follow Modal */}
      {showFollowModal && selectedMaster && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full p-4 rounded-t-2xl max-h-[85vh] overflow-y-auto" style={{ backgroundColor: '#0d0d0d' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#fff' }}>Follow {selectedMaster.displayName}</h3>
              <button onClick={() => setShowFollowModal(false)} className="p-2 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                <X size={18} color="#9ca3af" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Copy Mode</p>
                <select
                  value={followForm.copyMode}
                  onChange={(e) => setFollowForm({ ...followForm, copyMode: e.target.value })}
                  className="w-full p-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                >
                  <option value="fixed_lot">Fixed Lot</option>
                  <option value="multiplier">Multiplier</option>
                  <option value="balance_ratio">Balance Ratio</option>
                </select>
              </div>

              {followForm.copyMode === 'fixed_lot' && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Fixed Lot Size</p>
                  <input
                    type="number"
                    value={followForm.fixedLot}
                    onChange={(e) => setFollowForm({ ...followForm, fixedLot: parseFloat(e.target.value) || 0.01 })}
                    className="w-full p-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                    step="0.01"
                    min="0.01"
                  />
                </div>
              )}

              {followForm.copyMode === 'multiplier' && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Multiplier (e.g., 0.5 = half, 2 = double)</p>
                  <input
                    type="number"
                    value={followForm.multiplier}
                    onChange={(e) => setFollowForm({ ...followForm, multiplier: parseFloat(e.target.value) || 1 })}
                    className="w-full p-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                    step="0.1"
                    min="0.1"
                    max="10"
                  />
                </div>
              )}

              {/* Risk Management */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Max Daily Loss %</p>
                  <input
                    type="number"
                    value={followForm.maxDailyLossPercent}
                    onChange={(e) => setFollowForm({ ...followForm, maxDailyLossPercent: parseInt(e.target.value) || 10 })}
                    className="w-full p-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Max Drawdown %</p>
                  <input
                    type="number"
                    value={followForm.maxDrawdownPercent}
                    onChange={(e) => setFollowForm({ ...followForm, maxDrawdownPercent: parseInt(e.target.value) || 30 })}
                    className="w-full p-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                    min="1"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Max Lot Size</p>
                <input
                  type="number"
                  value={followForm.maxLotSize}
                  onChange={(e) => setFollowForm({ ...followForm, maxLotSize: parseFloat(e.target.value) || 5 })}
                  className="w-full p-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                  step="0.1"
                  min="0.01"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={followForm.stopCopyOnDrawdown}
                  onChange={(e) => setFollowForm({ ...followForm, stopCopyOnDrawdown: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs" style={{ color: '#9ca3af' }}>Auto-pause on drawdown limit</span>
              </label>

              {/* Warning */}
              <div className="p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
                <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
                <p className="text-xs" style={{ color: '#fbbf24' }}>Copy trading involves risk. Past performance doesn't guarantee future results.</p>
              </div>
            </div>

            <button
              onClick={handleFollow}
              disabled={submitting}
              className="w-full py-3 rounded-xl mt-4 flex items-center justify-center gap-2 font-semibold"
              style={{ backgroundColor: '#22c55e', color: '#000' }}
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
              Start Copying
            </button>
          </div>
        </div>
      )}

      {/* Request Master Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full p-4 rounded-t-2xl max-h-[85vh] overflow-y-auto" style={{ backgroundColor: '#0d0d0d' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#fff' }}>Become a Trade Master</h3>
              <button onClick={() => setShowRequestModal(false)} className="p-2 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                <X size={18} color="#9ca3af" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Years of Experience</p>
                  <input
                    type="number"
                    value={requestForm.experienceYears}
                    onChange={(e) => setRequestForm({ ...requestForm, experienceYears: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                    min="0"
                  />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Min Copy Amount ($)</p>
                  <input
                    type="number"
                    value={requestForm.minCapital}
                    onChange={(e) => setRequestForm({ ...requestForm, minCapital: parseInt(e.target.value) || 1000 })}
                    className="w-full p-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                    min="100"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Trading Strategy</p>
                <input
                  type="text"
                  placeholder="e.g., Forex Scalping, Swing Trading"
                  value={requestForm.strategy}
                  onChange={(e) => setRequestForm({ ...requestForm, strategy: e.target.value })}
                  className="w-full p-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                />
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Description</p>
                <textarea
                  placeholder="Describe your trading approach..."
                  rows={3}
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  className="w-full p-2 rounded-lg text-sm resize-none"
                  style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Commission Type</p>
                  <select
                    value={requestForm.preferredCommissionType}
                    onChange={(e) => setRequestForm({ ...requestForm, preferredCommissionType: e.target.value })}
                    className="w-full p-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                  >
                    <option value="profit_share">Profit Share %</option>
                    <option value="per_lot">Per Lot Fee</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Commission Value</p>
                  <input
                    type="number"
                    value={requestForm.preferredCommissionValue}
                    onChange={(e) => setRequestForm({ ...requestForm, preferredCommissionValue: parseInt(e.target.value) || 20 })}
                    className="w-full p-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Risk Level</p>
                <select
                  value={requestForm.riskLevel}
                  onChange={(e) => setRequestForm({ ...requestForm, riskLevel: e.target.value })}
                  className="w-full p-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #262626' }}
                >
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestForm.riskDisclosureAccepted}
                  onChange={(e) => setRequestForm({ ...requestForm, riskDisclosureAccepted: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs" style={{ color: '#9ca3af' }}>I accept the risk disclosure and terms</span>
              </label>
            </div>

            <button
              onClick={handleRequestMaster}
              disabled={submitting || !requestForm.strategy || !requestForm.riskDisclosureAccepted}
              className="w-full py-3 rounded-xl mt-4 flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <Award size={16} />}
              Submit Application
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Mobile Master Dashboard Component
const MobileMasterDashboard = ({ masterProfile }) => {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('/api/copy-trade/master/dashboard', getAuthHeader())
      if (res.data.success) setDashboardData(res.data.data)
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return
    try {
      setSubmitting(true)
      const res = await axios.post('/api/copy-trade/master/withdraw-commission', { amount: parseFloat(withdrawAmount) }, getAuthHeader())
      if (res.data.success) {
        alert(res.data.message)
        setWithdrawAmount('')
        fetchDashboard()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to withdraw')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" size={24} color="#6b7280" /></div>
  }

  const profile = dashboardData?.profile || masterProfile

  const { isDark } = useTheme()
  const bgCard = isDark ? '#0d0d0d' : '#fff'
  const bgInput = isDark ? '#1a1a1a' : '#f2f2f7'
  const borderColor = isDark ? '#1a1a1a' : '#e5e5ea'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? '#6b7280' : '#8e8e93'

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
          <p className="text-xs" style={{ color: textSecondary }}>Active Followers</p>
          <p className="text-xl font-bold" style={{ color: textPrimary }}>{profile?.stats?.activeFollowers || 0}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
          <p className="text-xs" style={{ color: textSecondary }}>Total Trades</p>
          <p className="text-xl font-bold" style={{ color: textPrimary }}>{profile?.stats?.totalTrades || 0}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
          <p className="text-xs" style={{ color: textSecondary }}>Win Rate</p>
          <p className="text-xl font-bold" style={{ color: '#22c55e' }}>{profile?.stats?.winRate || 0}%</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
          <p className="text-xs" style={{ color: textSecondary }}>Total Profit</p>
          <p className="text-xl font-bold" style={{ color: (profile?.stats?.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
            ${profile?.stats?.totalPnL?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Commission Wallet */}
      <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: textPrimary }}>
          <Wallet size={16} /> Commission Wallet
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs" style={{ color: textSecondary }}>Available</p>
            <p className="text-lg font-bold" style={{ color: '#22c55e' }}>${dashboardData?.wallet?.available?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: textSecondary }}>Total Earned</p>
            <p className="text-lg font-bold" style={{ color: textPrimary }}>${dashboardData?.wallet?.totalEarned?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Amount"
            className="flex-1 p-2 rounded-lg text-sm"
            style={{ backgroundColor: bgInput, color: textPrimary, border: `1px solid ${borderColor}` }}
          />
          <button
            onClick={handleWithdraw}
            disabled={submitting || !withdrawAmount}
            className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#22c55e', color: '#000' }}
          >
            {submitting ? <Loader2 className="animate-spin" size={14} /> : 'Withdraw'}
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: textPrimary }}>Your Profile</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span style={{ color: textSecondary }}>Display Name:</span>
            <span style={{ color: textPrimary }}>{profile?.displayName}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: textSecondary }}>Strategy:</span>
            <span style={{ color: textPrimary }}>{profile?.strategyType}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: textSecondary }}>Risk Level:</span>
            <span style={{ color: profile?.riskLevel === 'Low' ? '#22c55e' : profile?.riskLevel === 'Medium' ? '#fbbf24' : '#ef4444' }}>
              {profile?.riskLevel}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: textSecondary }}>Commission:</span>
            <span style={{ color: textPrimary }}>
              {profile?.commissionType === 'profit_share' ? `${profile?.commissionValue}% profit` : `$${profile?.commissionValue}/lot`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileCopyTrade
