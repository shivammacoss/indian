import React, { useState, useEffect } from 'react'
import {
  Users,
  TrendingUp,
  Shield,
  Star,
  Award,
  ChevronRight,
  X,
  UserPlus,
  UserMinus,
  Pause,
  Play,
  Settings,
  DollarSign,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  Filter,
  Clock,
  Percent
} from 'lucide-react'
import axios from 'axios'

const CopyTrade = () => {
  const [activeTab, setActiveTab] = useState('masters')
  const [masters, setMasters] = useState([])
  const [myFollows, setMyFollows] = useState([])
  const [myMasterStatus, setMyMasterStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('followers')
  const [riskFilter, setRiskFilter] = useState('all')
  
  // Modals
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedMaster, setSelectedMaster] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [tradingAccounts, setTradingAccounts] = useState([])

  // Follow form state
  const [followForm, setFollowForm] = useState({
    tradingAccountId: '',
    copyMode: 'multiplier',
    fixedLot: 0.01,
    multiplier: 1.0,
    maxDailyLossPercent: 10,
    maxDrawdownPercent: 30,
    maxLotSize: 5,
    stopCopyOnDrawdown: true
  })

  // Request form state
  const [requestForm, setRequestForm] = useState({
    experienceYears: 1,
    strategy: '',
    description: '',
    minCapital: 1000,
    preferredCommissionType: 'profit_share',
    preferredCommissionValue: 20,
    riskLevel: 'Medium',
    riskDisclosureAccepted: false,
    termsAccepted: false
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
      const [mastersRes, followsRes, statusRes, accountsRes] = await Promise.all([
        axios.get(`/api/copy-trade/masters?sort=${sortBy}${riskFilter !== 'all' ? `&riskLevel=${riskFilter}` : ''}`, getAuthHeader()),
        axios.get('/api/copy-trade/my-follows', getAuthHeader()),
        axios.get('/api/copy-trade/my-master-status', getAuthHeader()),
        axios.get('/api/trading-accounts', getAuthHeader())
      ])

      if (mastersRes.data.success) setMasters(mastersRes.data.data)
      if (followsRes.data.success) setMyFollows(followsRes.data.data)
      if (statusRes.data.success) setMyMasterStatus(statusRes.data.data)
      if (accountsRes.data.success) {
        const activeAccounts = accountsRes.data.data.filter(acc => acc.status === 'active' && !acc.isDemo)
        setTradingAccounts(activeAccounts)
        // Set default account if available
        if (activeAccounts.length > 0 && !followForm.tradingAccountId) {
          setFollowForm(prev => ({ ...prev, tradingAccountId: activeAccounts[0]._id }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch copy trade data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get selected account details
  const getSelectedAccount = () => {
    return tradingAccounts.find(acc => acc._id === followForm.tradingAccountId)
  }

  // Refresh accounts when modal opens
  const openFollowModal = async (master) => {
    setSelectedMaster(master)
    setShowFollowModal(true)
    // Refresh trading accounts to get latest balances
    try {
      const accountsRes = await axios.get('/api/trading-accounts', getAuthHeader())
      if (accountsRes.data.success) {
        const activeAccounts = accountsRes.data.data.filter(acc => acc.status === 'active' && !acc.isDemo)
        setTradingAccounts(activeAccounts)
        if (activeAccounts.length > 0 && !followForm.tradingAccountId) {
          setFollowForm(prev => ({ ...prev, tradingAccountId: activeAccounts[0]._id }))
        }
      }
    } catch (err) {
      console.error('Failed to refresh accounts:', err)
    }
  }

  const handleFollow = async () => {
    if (!selectedMaster) return
    
    // Validate account selection
    const selectedAccount = getSelectedAccount()
    if (!selectedAccount) {
      alert('Please select a trading account')
      return
    }
    
    // Check minimum balance on frontend (with tolerance for exact match)
    const accountBal = parseFloat(selectedAccount.balance) || 0
    const minRequired = parseFloat(selectedMaster.minCopyAmount) || 0
    if (accountBal < minRequired - 0.01) {
      alert(`Selected account has insufficient balance. Minimum required: $${minRequired.toFixed(2)}, Account balance: $${accountBal.toFixed(2)}`)
      return
    }
    
    try {
      setSubmitting(true)
      const res = await axios.post(`/api/copy-trade/follow/${selectedMaster._id}`, followForm, getAuthHeader())
      if (res.data.success) {
        alert('Now following trade master!')
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

  const handleUnfollow = async (masterId) => {
    if (!confirm('Stop following this master?')) return
    try {
      await axios.delete(`/api/copy-trade/follow/${masterId}`, getAuthHeader())
      fetchData()
    } catch (err) {
      alert('Failed to unfollow')
    }
  }

  const handlePauseResume = async (masterId, currentStatus) => {
    try {
      await axios.put(`/api/copy-trade/follow/${masterId}/pause`, {}, getAuthHeader())
      fetchData()
    } catch (err) {
      alert('Failed to update')
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Copy Trading</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Follow expert traders and copy their trades automatically</p>
        </div>
        {!myMasterStatus?.isMaster && myMasterStatus?.latestRequest?.status !== 'pending' && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium"
          >
            <Award size={18} /> Become a Master
          </button>
        )}
        {myMasterStatus?.latestRequest?.status === 'pending' && (
          <span className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-500 font-medium text-sm">
            Request Pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('masters')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all`}
          style={{ backgroundColor: activeTab === 'masters' ? 'var(--accent-blue)' : 'var(--bg-card)', color: activeTab === 'masters' ? '#fff' : 'var(--text-secondary)' }}
        >
          <Users size={18} /> Trade Masters
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all`}
          style={{ backgroundColor: activeTab === 'following' ? 'var(--accent-green)' : 'var(--bg-card)', color: activeTab === 'following' ? '#fff' : 'var(--text-secondary)' }}
        >
          <UserPlus size={18} /> My Follows ({myFollows.length})
        </button>
        {myMasterStatus?.isMaster && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all`}
            style={{ backgroundColor: activeTab === 'dashboard' ? '#8b5cf6' : 'var(--bg-card)', color: activeTab === 'dashboard' ? '#fff' : 'var(--text-secondary)' }}
          >
            <BarChart3 size={18} /> Master Dashboard
          </button>
        )}
      </div>

      {/* Trade Masters Tab */}
      {activeTab === 'masters' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search masters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="followers">Most Followers</option>
              <option value="profit">Highest Profit</option>
              <option value="winrate">Best Win Rate</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-4 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="all">All Risk Levels</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
          </div>

          {/* Masters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMasters.length === 0 ? (
              <div className="col-span-full text-center py-12" style={{ color: 'var(--text-muted)' }}>
                No trade masters found
              </div>
            ) : filteredMasters.map((master) => (
              <div key={master._id} className="rounded-2xl p-5 transition-all hover:scale-[1.02]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {master.displayName?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{master.displayName}</h3>
                        {master.isVerified && <CheckCircle size={14} className="text-blue-500" />}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{master.masterId}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: `${getRiskColor(master.riskLevel)}20`, color: getRiskColor(master.riskLevel) }}>
                    {master.riskLevel}
                  </span>
                </div>

                {/* Strategy */}
                <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  {master.strategyType}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <p className="text-lg font-bold" style={{ color: '#22c55e' }}>{master.stats?.winRate || 0}%</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Rate</p>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{master.stats?.activeFollowers || 0}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Followers</p>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <p className="text-lg font-bold" style={{ color: master.stats?.profit30Days >= 0 ? '#22c55e' : '#ef4444' }}>
                      {master.stats?.profit30Days >= 0 ? '+' : ''}{master.stats?.profit30Days || 0}%
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>30D Profit</p>
                  </div>
                </div>

                {/* Commission */}
                <div className="flex items-center justify-between mb-4 text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Commission:</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {master.commissionType === 'profit_share' ? `${master.commissionValue}% profit share` :
                     master.commissionType === 'per_lot' ? `$${master.commissionValue}/lot` :
                     `$${master.subscriptionFee}/month`}
                  </span>
                </div>

                {/* Action Button */}
                {master.isFollowing ? (
                  <button
                    className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                    disabled
                  >
                    <CheckCircle size={18} /> Following
                  </button>
                ) : (
                  <button
                    onClick={() => openFollowModal(master)}
                    className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
                  >
                    <UserPlus size={18} /> Follow Master
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* My Follows Tab */}
      {activeTab === 'following' && (
        <div className="space-y-4">
          {myFollows.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>You're not following any trade masters yet</p>
              <button
                onClick={() => setActiveTab('masters')}
                className="mt-4 px-6 py-2 rounded-xl bg-blue-500 text-white font-medium"
              >
                Browse Masters
              </button>
            </div>
          ) : myFollows.map((follow) => (
            <div key={follow._id} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {follow.masterId?.displayName?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{follow.masterId?.displayName}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{follow.masterId?.strategyType}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>Mode: <strong>{follow.copyMode}</strong></span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {follow.copyMode === 'fixed_lot' ? `Lot: ${follow.fixedLot}` : `Multiplier: ${follow.multiplier}x`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Stats */}
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: follow.stats?.totalPnL >= 0 ? '#22c55e' : '#ef4444' }}>
                      {follow.stats?.totalPnL >= 0 ? '+' : ''}${follow.stats?.totalPnL?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{follow.stats?.totalCopiedTrades || 0} trades copied</p>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${follow.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {follow.status}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePauseResume(follow.masterId._id, follow.status)}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                      title={follow.status === 'active' ? 'Pause' : 'Resume'}
                    >
                      {follow.status === 'active' ? <Pause size={18} style={{ color: '#fbbf24' }} /> : <Play size={18} style={{ color: '#22c55e' }} />}
                    </button>
                    <button
                      onClick={() => handleUnfollow(follow.masterId._id)}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                      title="Stop Following"
                    >
                      <UserMinus size={18} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Master Dashboard Tab */}
      {activeTab === 'dashboard' && myMasterStatus?.isMaster && (
        <MasterDashboard masterProfile={myMasterStatus.masterProfile} />
      )}

      {/* Follow Modal */}
      {showFollowModal && selectedMaster && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Follow {selectedMaster.displayName}</h3>
              <button onClick={() => setShowFollowModal(false)}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>

            <div className="space-y-4">
              {/* Trading Account Selection */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Select Trading Account <span className="text-red-400">*</span>
                </label>
                {tradingAccounts.length > 0 ? (
                  <>
                    <select
                      value={followForm.tradingAccountId}
                      onChange={(e) => setFollowForm({ ...followForm, tradingAccountId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      {tradingAccounts.map(acc => (
                        <option key={acc._id} value={acc._id}>
                          {acc.accountNumber} - ${acc.balance?.toFixed(2)} ({acc.accountType?.name || 'Standard'})
                        </option>
                      ))}
                    </select>
                    
                    {/* Show selected account balance vs minimum required */}
                    {getSelectedAccount() && (
                      <div className={`mt-3 p-3 rounded-xl ${
                        getSelectedAccount()?.balance >= selectedMaster?.minCopyAmount 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Account Balance:</span>
                          <span className="font-bold text-lg" style={{ color: getSelectedAccount()?.balance >= selectedMaster?.minCopyAmount ? '#22c55e' : '#ef4444' }}>
                            ${getSelectedAccount()?.balance?.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Minimum Required:</span>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            ${selectedMaster?.minCopyAmount?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        {getSelectedAccount()?.balance >= selectedMaster?.minCopyAmount ? (
                          <p className="text-xs mt-2 text-green-400">✓ Account meets minimum requirement</p>
                        ) : (
                          <p className="text-xs mt-2 text-red-400">✗ Insufficient balance. Transfer more funds to this account.</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    No active trading accounts found. Please create a live trading account first.
                  </div>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Copy trades will be executed in this account
                </p>
              </div>

              {/* Copy Mode */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Copy Mode</label>
                <select
                  value={followForm.copyMode}
                  onChange={(e) => setFollowForm({ ...followForm, copyMode: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="fixed_lot">Fixed Lot</option>
                  <option value="multiplier">Multiplier</option>
                  <option value="balance_ratio">Balance Ratio</option>
                </select>
              </div>

              {/* Fixed Lot / Multiplier */}
              {followForm.copyMode === 'fixed_lot' && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Fixed Lot Size</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={followForm.fixedLot}
                    onChange={(e) => setFollowForm({ ...followForm, fixedLot: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              )}

              {followForm.copyMode === 'multiplier' && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Multiplier (e.g., 0.5 = half, 2 = double)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={followForm.multiplier}
                    onChange={(e) => setFollowForm({ ...followForm, multiplier: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              )}

              {/* Risk Management */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Max Daily Loss %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={followForm.maxDailyLossPercent}
                    onChange={(e) => setFollowForm({ ...followForm, maxDailyLossPercent: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Max Drawdown %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={followForm.maxDrawdownPercent}
                    onChange={(e) => setFollowForm({ ...followForm, maxDrawdownPercent: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Max Lot Size</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={followForm.maxLotSize}
                  onChange={(e) => setFollowForm({ ...followForm, maxLotSize: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={followForm.stopCopyOnDrawdown}
                  onChange={(e) => setFollowForm({ ...followForm, stopCopyOnDrawdown: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span style={{ color: 'var(--text-secondary)' }}>Auto-pause on drawdown limit</span>
              </label>

              {/* Warning */}
              <div className="p-3 rounded-xl flex items-start gap-3" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
                <AlertTriangle size={20} style={{ color: '#fbbf24' }} />
                <p className="text-sm" style={{ color: '#fbbf24' }}>Copy trading involves risk. Past performance doesn't guarantee future results.</p>
              </div>

              <button
                onClick={handleFollow}
                disabled={submitting || !followForm.tradingAccountId || tradingAccounts.length === 0 || ((parseFloat(getSelectedAccount()?.balance) || 0) < (parseFloat(selectedMaster?.minCopyAmount) || 0) - 0.01)}
                className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Following...' : ((parseFloat(getSelectedAccount()?.balance) || 0) < (parseFloat(selectedMaster?.minCopyAmount) || 0) - 0.01 ? 'Insufficient Balance' : 'Start Copying')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Master Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Become a Trade Master</h3>
              <button onClick={() => setShowRequestModal(false)}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    value={requestForm.experienceYears}
                    onChange={(e) => setRequestForm({ ...requestForm, experienceYears: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Min Copy Amount ($)</label>
                  <input
                    type="number"
                    min="100"
                    value={requestForm.minCapital}
                    onChange={(e) => setRequestForm({ ...requestForm, minCapital: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Trading Strategy</label>
                <input
                  type="text"
                  placeholder="e.g., Forex Scalping, Swing Trading"
                  value={requestForm.strategy}
                  onChange={(e) => setRequestForm({ ...requestForm, strategy: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  placeholder="Describe your trading approach..."
                  rows={3}
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl resize-none"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Commission Type</label>
                  <select
                    value={requestForm.preferredCommissionType}
                    onChange={(e) => setRequestForm({ ...requestForm, preferredCommissionType: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="profit_share">Profit Share %</option>
                    <option value="per_lot">Per Lot Fee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Commission Value</label>
                  <input
                    type="number"
                    min="1"
                    value={requestForm.preferredCommissionValue}
                    onChange={(e) => setRequestForm({ ...requestForm, preferredCommissionValue: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Risk Level</label>
                <select
                  value={requestForm.riskLevel}
                  onChange={(e) => setRequestForm({ ...requestForm, riskLevel: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestForm.riskDisclosureAccepted}
                  onChange={(e) => setRequestForm({ ...requestForm, riskDisclosureAccepted: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span style={{ color: 'var(--text-secondary)' }}>I accept the risk disclosure and terms</span>
              </label>

              <button
                onClick={handleRequestMaster}
                disabled={submitting || !requestForm.strategy || !requestForm.riskDisclosureAccepted}
                className="w-full py-3 rounded-xl font-semibold text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Master Dashboard Component
const MasterDashboard = ({ masterProfile }) => {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState('')

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
      const res = await axios.post('/api/copy-trade/master/withdraw-commission', { amount: parseFloat(withdrawAmount) }, getAuthHeader())
      if (res.data.success) {
        alert(res.data.message)
        setWithdrawAmount('')
        fetchDashboard()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to withdraw')
    }
  }

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="animate-spin mx-auto" size={32} /></div>
  }

  const profile = dashboardData?.profile || masterProfile

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active Followers</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile?.stats?.activeFollowers || 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Win Rate</p>
          <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{profile?.stats?.winRate || 0}%</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Trades</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile?.stats?.totalTrades || 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total PnL</p>
          <p className="text-2xl font-bold" style={{ color: profile?.stats?.totalPnL >= 0 ? '#22c55e' : '#ef4444' }}>
            ${profile?.stats?.totalPnL?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Commission Card */}
      <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Commission Earnings</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Earned</p>
            <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>${profile?.stats?.totalCommissionEarned?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Available to Withdraw</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>${profile?.stats?.availableCommission?.toFixed(2) || '0.00'}</p>
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                placeholder="Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <button onClick={handleWithdraw} className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium">
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Followers List */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Your Followers ({dashboardData?.followers?.length || 0})</h3>
        {!dashboardData?.followers?.length ? (
          <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No followers yet</p>
        ) : (
          <div className="space-y-3">
            {dashboardData.followers.map((f) => (
              <div key={f._id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {f.userId?.firstName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{f.userId?.firstName} {f.userId?.lastName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.copyMode} • {f.copyMode === 'fixed_lot' ? `${f.fixedLot} lot` : `${f.multiplier}x`}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${f.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CopyTrade
