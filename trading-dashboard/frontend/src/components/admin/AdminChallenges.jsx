import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Trophy, Target, Users, DollarSign, TrendingUp, TrendingDown,
  Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, RefreshCw, Filter, Search,
  AlertTriangle, Wallet, BarChart2
} from 'lucide-react'

const AdminChallenges = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [challengeTypes, setChallengeTypes] = useState([])
  const [challenges, setChallenges] = useState([])
  const [payouts, setPayouts] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [filter, setFilter] = useState({ status: '', type: '' })
  const [showEditTypeModal, setShowEditTypeModal] = useState(false)
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [typeFormData, setTypeFormData] = useState({
    name: '', description: '', badge: '', color: '#3b82f6',
    maxDailyDrawdown: 5, maxTotalDrawdown: 10, profitSplit: 80,
    payoutFrequency: 'biweekly',
    maxPositions: 1, minTimeBetweenTrades: 0, maxLotSize: 0,
    maxTotalTrades: 0, maxTradesPerDay: 0, mandatorySL: false, warnBeforeBlow: true,
    type: 'two_step', totalPhases: 2, accountSizes: [
      { size: 5000, price: 49 },
      { size: 10000, price: 99 },
      { size: 25000, price: 199 }
    ]
  })

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const headers = { Authorization: `Bearer ${token}` }

      if (activeTab === 'dashboard') {
        const res = await axios.get('/api/admin/challenges/dashboard', { headers })
        if (res.data.success) setDashboard(res.data.data)
      } else if (activeTab === 'types') {
        const res = await axios.get('/api/admin/challenges/types', { headers })
        if (res.data.success) setChallengeTypes(res.data.data)
      } else if (activeTab === 'challenges') {
        const params = new URLSearchParams()
        if (filter.status) params.append('status', filter.status)
        if (filter.type) params.append('challengeType', filter.type)
        const res = await axios.get(`/api/admin/challenges/challenges?${params}`, { headers })
        if (res.data.success) setChallenges(res.data.data)
      } else if (activeTab === 'payouts') {
        const res = await axios.get('/api/admin/challenges/payouts', { headers })
        if (res.data.success) setPayouts(res.data.data)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const handleToggleChallengeType = async (id) => {
    try {
      const token = localStorage.getItem('adminToken')
      await axios.patch(`/api/admin/challenges/types/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (err) {
      alert('Failed to toggle challenge type')
    }
  }

  const handleEditType = (type) => {
    setEditingType(type)
    setTypeFormData({
      name: type.name || '',
      description: type.description || '',
      badge: type.badge || '',
      color: type.color || '#3b82f6',
      maxDailyDrawdown: type.riskRules?.maxDailyDrawdown || 5,
      maxTotalDrawdown: type.riskRules?.maxTotalDrawdown || 10,
      profitSplit: type.payoutConfig?.profitSplit || 80,
      payoutFrequency: type.payoutConfig?.payoutFrequency || 'biweekly',
      maxPositions: type.riskRules?.maxPositions || 1,
      minTimeBetweenTrades: type.riskRules?.minTimeBetweenTrades || 0,
      maxLotSize: type.riskRules?.maxLotSize || 0,
      maxTotalTrades: type.riskRules?.maxTotalTrades || 0,
      maxTradesPerDay: type.riskRules?.maxTradesPerDay || 0,
      mandatorySL: type.riskRules?.mandatorySL || false,
      warnBeforeBlow: type.riskRules?.warnBeforeBlow !== false
    })
    setShowEditTypeModal(true)
  }

  const handleSaveType = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const updateData = {
        name: typeFormData.name,
        description: typeFormData.description,
        badge: typeFormData.badge,
        color: typeFormData.color,
        riskRules: {
          ...editingType.riskRules,
          maxDailyDrawdown: typeFormData.maxDailyDrawdown,
          maxTotalDrawdown: typeFormData.maxTotalDrawdown,
          maxPositions: typeFormData.maxPositions,
          minTimeBetweenTrades: typeFormData.minTimeBetweenTrades,
          maxLotSize: typeFormData.maxLotSize,
          maxTotalTrades: typeFormData.maxTotalTrades,
          maxTradesPerDay: typeFormData.maxTradesPerDay,
          mandatorySL: typeFormData.mandatorySL,
          warnBeforeBlow: typeFormData.warnBeforeBlow
        },
        payoutConfig: {
          ...editingType.payoutConfig,
          profitSplit: typeFormData.profitSplit,
          payoutFrequency: typeFormData.payoutFrequency
        }
      }
      await axios.put(`/api/admin/challenges/types/${editingType._id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowEditTypeModal(false)
      setEditingType(null)
      fetchData()
      alert('Challenge type updated successfully!')
    } catch (err) {
      alert('Failed to update challenge type')
    }
  }

  const handleCreateType = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const createData = {
        name: typeFormData.name,
        description: typeFormData.description,
        badge: typeFormData.badge,
        color: typeFormData.color,
        type: typeFormData.type,
        totalPhases: typeFormData.totalPhases,
        accountSizes: typeFormData.accountSizes,
        riskRules: {
          maxDailyDrawdown: typeFormData.maxDailyDrawdown,
          maxTotalDrawdown: typeFormData.maxTotalDrawdown,
          maxPositions: typeFormData.maxPositions,
          minTimeBetweenTrades: typeFormData.minTimeBetweenTrades,
          maxLotSize: typeFormData.maxLotSize,
          maxTotalTrades: typeFormData.maxTotalTrades,
          maxTradesPerDay: typeFormData.maxTradesPerDay,
          mandatorySL: typeFormData.mandatorySL,
          warnBeforeBlow: typeFormData.warnBeforeBlow
        },
        payoutConfig: {
          profitSplit: typeFormData.profitSplit,
          payoutFrequency: typeFormData.payoutFrequency
        }
      }
      await axios.post('/api/admin/challenges/types', createData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowCreateTypeModal(false)
      // Reset form
      setTypeFormData({
        name: '', description: '', badge: '', color: '#3b82f6',
        maxDailyDrawdown: 5, maxTotalDrawdown: 10, profitSplit: 80,
        payoutFrequency: 'biweekly',
        maxPositions: 1, minTimeBetweenTrades: 0, maxLotSize: 0,
        maxTotalTrades: 0, maxTradesPerDay: 0, mandatorySL: false, warnBeforeBlow: true,
        type: 'two_step', totalPhases: 2, accountSizes: [
          { size: 5000, price: 49 },
          { size: 10000, price: 99 },
          { size: 25000, price: 199 }
        ]
      })
      fetchData()
      alert('Challenge type created successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create challenge type')
    }
  }

  const handleUpdatePricing = async (typeId, sizeIndex, newPrice) => {
    try {
      const token = localStorage.getItem('adminToken')
      const type = challengeTypes.find(t => t._id === typeId)
      if (!type) return
      
      const updatedSizes = [...type.accountSizes]
      updatedSizes[sizeIndex].price = parseFloat(newPrice)
      
      await axios.put(`/api/admin/challenges/types/${typeId}`, {
        accountSizes: updatedSizes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (err) {
      alert('Failed to update pricing')
    }
  }

  const handleFailChallenge = async (id) => {
    if (!confirm('Are you sure you want to fail this challenge?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.post(`/api/admin/challenges/challenges/${id}/fail`, {
        reason: 'manual_termination',
        details: 'Manually failed by admin'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
      setShowChallengeModal(false)
    } catch (err) {
      alert('Failed to fail challenge')
    }
  }

  const handlePassPhase = async (id) => {
    if (!confirm('Are you sure you want to pass this phase?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.post(`/api/admin/challenges/challenges/${id}/pass-phase`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
      setShowChallengeModal(false)
    } catch (err) {
      alert('Failed to pass phase')
    }
  }

  const handleFundChallenge = async (id) => {
    if (!confirm('Are you sure you want to fund this challenge?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.post(`/api/admin/challenges/challenges/${id}/fund`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
      setShowChallengeModal(false)
    } catch (err) {
      alert('Failed to fund challenge')
    }
  }

  const handleApprovePayout = async (id) => {
    try {
      const token = localStorage.getItem('adminToken')
      await axios.post(`/api/admin/challenges/payouts/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (err) {
      alert('Failed to approve payout')
    }
  }

  const handleMarkPaid = async (id) => {
    try {
      const token = localStorage.getItem('adminToken')
      await axios.post(`/api/admin/challenges/payouts/${id}/paid`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (err) {
      alert('Failed to mark as paid')
    }
  }

  const handleRejectPayout = async (id) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.post(`/api/admin/challenges/payouts/${id}/reject`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (err) {
      alert('Failed to reject payout')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#3b82f6'
      case 'funded': return '#22c55e'
      case 'failed': return '#ef4444'
      case 'pending': return '#f59e0b'
      case 'approved': return '#3b82f6'
      case 'paid': return '#22c55e'
      case 'rejected': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'types', label: 'Challenge Types', icon: Target },
    { id: 'challenges', label: 'User Challenges', icon: Users },
    { id: 'payouts', label: 'Payouts', icon: Wallet }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Prop Firm Challenges</h1>
          <p className="text-gray-400">Manage challenge types, user challenges, and payouts</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && dashboard && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="text-green-500" size={24} />
                    <span className="text-gray-400">Total Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(dashboard.totalRevenue)}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="text-yellow-500" size={24} />
                    <span className="text-gray-400">Funded Accounts</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{dashboard.fundedAccounts}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="text-blue-500" size={24} />
                    <span className="text-gray-400">Funded Capital</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(dashboard.fundedCapital)}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="text-purple-500" size={24} />
                    <span className="text-gray-400">Pass Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{dashboard.passRate}%</p>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Challenges by Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(dashboard.statusCounts || {}).map(([status, count]) => (
                    <div key={status} className="bg-gray-700 rounded-lg p-3">
                      <div className="text-2xl font-bold" style={{ color: getStatusColor(status) }}>
                        {count}
                      </div>
                      <div className="text-sm text-gray-400 capitalize">{status}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Payouts */}
              {dashboard.pendingPayouts?.count > 0 && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-yellow-500" size={24} />
                    <div>
                      <p className="text-white font-semibold">
                        {dashboard.pendingPayouts.count} Pending Payouts
                      </p>
                      <p className="text-gray-300">
                        Total: {formatCurrency(dashboard.pendingPayouts.total)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Challenges */}
              <div className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Challenges</h3>
                <div className="space-y-2">
                  {dashboard.recentChallenges?.map((c) => (
                    <div key={c._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{c.user?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-400">{c.challengeType?.name} • {formatCurrency(c.accountSize)}</p>
                      </div>
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                        style={{ backgroundColor: `${getStatusColor(c.status)}30`, color: getStatusColor(c.status) }}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Challenge Types Tab */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              {/* Create Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setTypeFormData({
                      name: '', description: '', badge: '', color: '#3b82f6',
                      maxDailyDrawdown: 5, maxTotalDrawdown: 10, profitSplit: 80,
                      payoutFrequency: 'biweekly',
                      maxPositions: 1, minTimeBetweenTrades: 0, maxLotSize: 0,
                      maxTotalTrades: 0, maxTradesPerDay: 0, mandatorySL: false, warnBeforeBlow: true,
                      type: 'two_step', totalPhases: 2, accountSizes: [
                        { size: 5000, price: 49 },
                        { size: 10000, price: 99 },
                        { size: 25000, price: 199 }
                      ]
                    })
                    setShowCreateTypeModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus size={18} />
                  Create Challenge Type
                </button>
              </div>
              
              {challengeTypes.map((type) => (
                <div key={type._id} className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${type.color}30` }}
                      >
                        <Target size={24} style={{ color: type.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{type.name}</h3>
                          {type.badge && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/30 text-blue-400">
                              {type.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{type.description}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          <span>Type: {type.type.replace('_', ' ')}</span>
                          <span>Phases: {type.totalPhases}</span>
                          <span>Sizes: {type.accountSizes?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs ${type.isActive ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'}`}>
                        {type.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleEditType(type)}
                        className="p-2 rounded-lg hover:bg-gray-700"
                        title="Edit Challenge Type"
                      >
                        <Edit size={18} className="text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleToggleChallengeType(type._id)}
                        className="p-2 rounded-lg hover:bg-gray-700"
                      >
                        {type.isActive ? <XCircle size={18} className="text-red-400" /> : <CheckCircle size={18} className="text-green-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Account Sizes & Pricing</p>
                    <div className="flex flex-wrap gap-2">
                      {type.accountSizes?.map((size, idx) => (
                        <div key={idx} className="px-3 py-2 rounded-lg bg-gray-700">
                          <span className="text-white font-medium">{formatCurrency(size.size)}</span>
                          <span className="text-gray-400 ml-2">${size.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-gray-700 rounded-lg p-2">
                      <span className="text-gray-400">Daily DD:</span>
                      <span className="text-white ml-2">{type.riskRules?.maxDailyDrawdown}%</span>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-2">
                      <span className="text-gray-400">Max DD:</span>
                      <span className="text-white ml-2">{type.riskRules?.maxTotalDrawdown}%</span>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-2">
                      <span className="text-gray-400">Profit Split:</span>
                      <span className="text-white ml-2">{type.payoutConfig?.profitSplit}%</span>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-2">
                      <span className="text-gray-400">Payout:</span>
                      <span className="text-white ml-2 capitalize">{type.payoutConfig?.payoutFrequency}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User Challenges Tab */}
          {activeTab === 'challenges' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-3 mb-4">
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="funded">Funded</option>
                  <option value="failed">Failed</option>
                </select>
                <button
                  onClick={fetchData}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                >
                  Apply
                </button>
              </div>

              {/* Challenges List */}
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-4 text-gray-400 font-medium">User</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Challenge</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Balance</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Profit</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Phase</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challenges.map((c) => {
                      const profit = ((c.balance - c.initialBalance) / c.initialBalance) * 100
                      return (
                        <tr key={c._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                          <td className="p-4">
                            <p className="text-white font-medium">{c.user?.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-400">{c.user?.email}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-white">{c.challengeType?.name}</p>
                            <p className="text-sm text-gray-400">{c.accountNumber}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-white">{formatCurrency(c.balance)}</p>
                            <p className="text-sm text-gray-400">of {formatCurrency(c.accountSize)}</p>
                          </td>
                          <td className="p-4">
                            <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {profit >= 0 ? '+' : ''}{profit.toFixed(2)}%
                            </span>
                          </td>
                          <td className="p-4 text-white">
                            {c.currentPhase}/{c.challengeType?.totalPhases || 0}
                          </td>
                          <td className="p-4">
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                              style={{ backgroundColor: `${getStatusColor(c.status)}30`, color: getStatusColor(c.status) }}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setSelectedChallenge(c); setShowChallengeModal(true); }}
                                className="p-2 rounded-lg hover:bg-gray-600"
                              >
                                <Eye size={16} className="text-gray-400" />
                              </button>
                              {c.status === 'active' && (
                                <>
                                  <button
                                    onClick={() => handlePassPhase(c._id)}
                                    className="p-2 rounded-lg hover:bg-green-500/20"
                                    title="Pass Phase"
                                  >
                                    <CheckCircle size={16} className="text-green-400" />
                                  </button>
                                  <button
                                    onClick={() => handleFailChallenge(c._id)}
                                    className="p-2 rounded-lg hover:bg-red-500/20"
                                    title="Fail Challenge"
                                  >
                                    <XCircle size={16} className="text-red-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">User</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Account</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Trader Share</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Method</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="p-4">
                        <p className="text-white font-medium">{p.user?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-400">{p.user?.email}</p>
                      </td>
                      <td className="p-4 text-white">
                        {p.userChallenge?.accountNumber}
                      </td>
                      <td className="p-4 text-white">
                        {formatCurrency(p.requestedAmount)}
                      </td>
                      <td className="p-4 text-green-400">
                        {formatCurrency(p.traderShare)}
                        <span className="text-gray-400 text-sm ml-1">({p.profitSplit}%)</span>
                      </td>
                      <td className="p-4 text-white capitalize">
                        {p.paymentMethod}
                      </td>
                      <td className="p-4">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                          style={{ backgroundColor: `${getStatusColor(p.status)}30`, color: getStatusColor(p.status) }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {p.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprovePayout(p._id)}
                                className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectPayout(p._id)}
                                className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {(p.status === 'approved' || p.status === 'processing') && (
                            <button
                              onClick={() => handleMarkPaid(p._id)}
                              className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Challenge Detail Modal */}
      {showChallengeModal && selectedChallenge && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Challenge Details</h2>
                <button onClick={() => setShowChallengeModal(false)} className="text-gray-400 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Account Number</p>
                  <p className="text-white font-medium">{selectedChallenge.accountNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">User</p>
                  <p className="text-white font-medium">{selectedChallenge.user?.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Balance</p>
                  <p className="text-white font-medium">{formatCurrency(selectedChallenge.balance)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Account Size</p>
                  <p className="text-white font-medium">{formatCurrency(selectedChallenge.accountSize)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Daily Drawdown</p>
                  <p className="text-white font-medium">{(selectedChallenge.stats?.currentDailyDrawdown || 0).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Drawdown</p>
                  <p className="text-white font-medium">{(selectedChallenge.stats?.currentTotalDrawdown || 0).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Trades</p>
                  <p className="text-white font-medium">{selectedChallenge.stats?.totalTrades || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Win Rate</p>
                  <p className="text-white font-medium">{(selectedChallenge.stats?.winRate || 0).toFixed(1)}%</p>
                </div>
              </div>

              {selectedChallenge.status === 'active' && (
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handlePassPhase(selectedChallenge._id)}
                    className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium"
                  >
                    Pass Phase
                  </button>
                  <button
                    onClick={() => handleFundChallenge(selectedChallenge._id)}
                    className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-medium"
                  >
                    Fund Account
                  </button>
                  <button
                    onClick={() => handleFailChallenge(selectedChallenge._id)}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium"
                  >
                    Fail Challenge
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Challenge Type Modal */}
      {showEditTypeModal && editingType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Edit Challenge Type</h2>
                <button onClick={() => setShowEditTypeModal(false)} className="text-gray-400 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={typeFormData.name}
                    onChange={(e) => setTypeFormData({...typeFormData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={typeFormData.description}
                    onChange={(e) => setTypeFormData({...typeFormData, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Badge</label>
                    <input
                      type="text"
                      value={typeFormData.badge}
                      onChange={(e) => setTypeFormData({...typeFormData, badge: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      placeholder="e.g., Most Popular"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Color</label>
                    <input
                      type="color"
                      value={typeFormData.color}
                      onChange={(e) => setTypeFormData({...typeFormData, color: e.target.value})}
                      className="w-full h-10 rounded-lg bg-gray-700 border-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Daily Drawdown %</label>
                    <input
                      type="number"
                      value={typeFormData.maxDailyDrawdown}
                      onChange={(e) => setTypeFormData({...typeFormData, maxDailyDrawdown: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Drawdown %</label>
                    <input
                      type="number"
                      value={typeFormData.maxTotalDrawdown}
                      onChange={(e) => setTypeFormData({...typeFormData, maxTotalDrawdown: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Positions</label>
                    <input
                      type="number"
                      value={typeFormData.maxPositions}
                      onChange={(e) => setTypeFormData({...typeFormData, maxPositions: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      min="0"
                      placeholder="0 = unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Trade Gap (mins)</label>
                    <input
                      type="number"
                      value={Math.round(typeFormData.minTimeBetweenTrades / 60)}
                      onChange={(e) => setTypeFormData({...typeFormData, minTimeBetweenTrades: (parseInt(e.target.value) || 0) * 60})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      min="0"
                      placeholder="0 = no gap"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Lot Size</label>
                    <input
                      type="number"
                      step="0.01"
                      value={typeFormData.maxLotSize}
                      onChange={(e) => setTypeFormData({...typeFormData, maxLotSize: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      min="0"
                      placeholder="0 = unlimited"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Total Trades</label>
                    <input
                      type="number"
                      value={typeFormData.maxTotalTrades}
                      onChange={(e) => setTypeFormData({...typeFormData, maxTotalTrades: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      min="0"
                      placeholder="0 = unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Trades/Day</label>
                    <input
                      type="number"
                      value={typeFormData.maxTradesPerDay}
                      onChange={(e) => setTypeFormData({...typeFormData, maxTradesPerDay: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      min="0"
                      placeholder="0 = unlimited"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      id="mandatorySL"
                      checked={typeFormData.mandatorySL}
                      onChange={(e) => setTypeFormData({...typeFormData, mandatorySL: e.target.checked})}
                      className="w-5 h-5 rounded"
                    />
                    <label htmlFor="mandatorySL" className="text-white cursor-pointer">
                      Mandatory Stop Loss
                    </label>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      id="warnBeforeBlow"
                      checked={typeFormData.warnBeforeBlow}
                      onChange={(e) => setTypeFormData({...typeFormData, warnBeforeBlow: e.target.checked})}
                      className="w-5 h-5 rounded"
                    />
                    <label htmlFor="warnBeforeBlow" className="text-white cursor-pointer">
                      Warn Before Blow
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Profit Split %</label>
                    <input
                      type="number"
                      value={typeFormData.profitSplit}
                      onChange={(e) => setTypeFormData({...typeFormData, profitSplit: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Payout Frequency</label>
                    <select
                      value={typeFormData.payoutFrequency}
                      onChange={(e) => setTypeFormData({...typeFormData, payoutFrequency: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="pt-4 border-t border-gray-700">
                  <label className="block text-sm text-gray-400 mb-2">Account Sizes & Pricing</label>
                  <div className="space-y-2">
                    {editingType.accountSizes?.map((size, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-gray-700 rounded-lg">
                        <span className="text-white font-medium w-24">{formatCurrency(size.size)}</span>
                        <input
                          type="number"
                          defaultValue={size.price}
                          onBlur={(e) => handleUpdatePricing(editingType._id, idx, e.target.value)}
                          className="flex-1 px-3 py-1 rounded bg-gray-600 text-white border-none"
                          placeholder="Price"
                        />
                        <span className="text-gray-400">USD</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditTypeModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveType}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Challenge Type Modal */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Create Challenge Type</h2>
                <button onClick={() => setShowCreateTypeModal(false)} className="text-gray-400 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Name *</label>
                    <input
                      type="text"
                      value={typeFormData.name}
                      onChange={(e) => setTypeFormData({...typeFormData, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      placeholder="e.g., Two Step Challenge"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Badge</label>
                    <input
                      type="text"
                      value={typeFormData.badge}
                      onChange={(e) => setTypeFormData({...typeFormData, badge: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      placeholder="e.g., Most Popular"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={typeFormData.description}
                    onChange={(e) => setTypeFormData({...typeFormData, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                    rows={2}
                    placeholder="Brief description of this challenge type"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                    <select
                      value={typeFormData.type}
                      onChange={(e) => setTypeFormData({...typeFormData, type: e.target.value, totalPhases: e.target.value === 'one_step' ? 1 : e.target.value === 'two_step' ? 2 : 3})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                    >
                      <option value="one_step">One Step</option>
                      <option value="two_step">Two Step</option>
                      <option value="three_step">Three Step</option>
                      <option value="instant_funding">Instant Funding</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Phases</label>
                    <input
                      type="number"
                      value={typeFormData.totalPhases}
                      onChange={(e) => setTypeFormData({...typeFormData, totalPhases: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      min="1"
                      max="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Color</label>
                    <input
                      type="color"
                      value={typeFormData.color}
                      onChange={(e) => setTypeFormData({...typeFormData, color: e.target.value})}
                      className="w-full h-10 rounded-lg bg-gray-700 border-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-white font-medium mb-3">Risk Rules</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Max Daily Drawdown %</label>
                      <input
                        type="number"
                        value={typeFormData.maxDailyDrawdown}
                        onChange={(e) => setTypeFormData({...typeFormData, maxDailyDrawdown: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Max Total Drawdown %</label>
                      <input
                        type="number"
                        value={typeFormData.maxTotalDrawdown}
                        onChange={(e) => setTypeFormData({...typeFormData, maxTotalDrawdown: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Max Positions</label>
                      <input
                        type="number"
                        value={typeFormData.maxPositions}
                        onChange={(e) => setTypeFormData({...typeFormData, maxPositions: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Trade Gap (seconds)</label>
                      <input
                        type="number"
                        value={typeFormData.minTimeBetweenTrades}
                        onChange={(e) => setTypeFormData({...typeFormData, minTimeBetweenTrades: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Max Lot Size (0=unlimited)</label>
                      <input
                        type="number"
                        value={typeFormData.maxLotSize}
                        onChange={(e) => setTypeFormData({...typeFormData, maxLotSize: parseFloat(e.target.value) || 0})}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Max Total Trades (0=unlimited)</label>
                      <input
                        type="number"
                        value={typeFormData.maxTotalTrades}
                        onChange={(e) => setTypeFormData({...typeFormData, maxTotalTrades: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Max Trades/Day (0=unlimited)</label>
                      <input
                        type="number"
                        value={typeFormData.maxTradesPerDay}
                        onChange={(e) => setTypeFormData({...typeFormData, maxTradesPerDay: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="createMandatorySL"
                        checked={typeFormData.mandatorySL}
                        onChange={(e) => setTypeFormData({...typeFormData, mandatorySL: e.target.checked})}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="createMandatorySL" className="text-white">Mandatory SL</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 p-3 bg-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      id="createWarnBeforeBlow"
                      checked={typeFormData.warnBeforeBlow}
                      onChange={(e) => setTypeFormData({...typeFormData, warnBeforeBlow: e.target.checked})}
                      className="w-5 h-5 rounded"
                    />
                    <label htmlFor="createWarnBeforeBlow" className="text-white">Warn Before Blow (warn user on first rule violation)</label>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-white font-medium mb-3">Payout Config</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Profit Split %</label>
                      <input
                        type="number"
                        value={typeFormData.profitSplit}
                        onChange={(e) => setTypeFormData({...typeFormData, profitSplit: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Payout Frequency</label>
                      <select
                        value={typeFormData.payoutFrequency}
                        onChange={(e) => setTypeFormData({...typeFormData, payoutFrequency: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border-none"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium">Account Sizes & Pricing</h3>
                    <button
                      onClick={() => setTypeFormData({
                        ...typeFormData,
                        accountSizes: [...typeFormData.accountSizes, { size: 50000, price: 299 }]
                      })}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      + Add Size
                    </button>
                  </div>
                  <div className="space-y-2">
                    {typeFormData.accountSizes.map((size, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-gray-700 rounded-lg">
                        <input
                          type="number"
                          value={size.size}
                          onChange={(e) => {
                            const newSizes = [...typeFormData.accountSizes]
                            newSizes[idx].size = parseInt(e.target.value) || 0
                            setTypeFormData({...typeFormData, accountSizes: newSizes})
                          }}
                          className="flex-1 px-3 py-1 rounded bg-gray-600 text-white border-none"
                          placeholder="Account Size"
                        />
                        <span className="text-gray-400">$</span>
                        <input
                          type="number"
                          value={size.price}
                          onChange={(e) => {
                            const newSizes = [...typeFormData.accountSizes]
                            newSizes[idx].price = parseInt(e.target.value) || 0
                            setTypeFormData({...typeFormData, accountSizes: newSizes})
                          }}
                          className="w-24 px-3 py-1 rounded bg-gray-600 text-white border-none"
                          placeholder="Price"
                        />
                        <button
                          onClick={() => {
                            const newSizes = typeFormData.accountSizes.filter((_, i) => i !== idx)
                            setTypeFormData({...typeFormData, accountSizes: newSizes})
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateTypeModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateType}
                  disabled={!typeFormData.name}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50"
                >
                  Create Challenge Type
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminChallenges
