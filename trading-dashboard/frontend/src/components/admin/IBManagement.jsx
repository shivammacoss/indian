import React, { useState, useEffect } from 'react'
import {
  Search,
  Download,
  Plus,
  Eye,
  Edit,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Link,
  Loader2,
  X,
  Ban,
  CheckCircle,
  Clock,
  UserCheck,
  Settings,
  ArrowUp,
  Trash2,
  Save
} from 'lucide-react'
import axios from 'axios'

const IBManagement = () => {
  const [activeTab, setActiveTab] = useState('ibs')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [ibs, setIbs] = useState([])
  const [referrals, setReferrals] = useState([])
  const [commissions, setCommissions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [stats, setStats] = useState({})
  const [selectedIB, setSelectedIB] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  
  // Commission Settings
  const [commissionSettings, setCommissionSettings] = useState(null)
  const [upgradeRequests, setUpgradeRequests] = useState([])
  const [savingSettings, setSavingSettings] = useState(false)
  
  // Edit Form for IB
  const [editForm, setEditForm] = useState({
    commissionLevel: 1,
    customCommissionEnabled: false,
    customCommissionPerLot: 0,
    minWithdrawal: 50,
    commissionFrozen: false
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, ibsRes, referralsRes, commissionsRes, withdrawalsRes, settingsRes, upgradesRes] = await Promise.all([
        axios.get('/api/admin/ib/stats', getAuthHeader()),
        axios.get('/api/admin/ib/list', getAuthHeader()),
        axios.get('/api/admin/ib/referrals/all', getAuthHeader()),
        axios.get('/api/admin/ib/commissions/all', getAuthHeader()),
        axios.get('/api/admin/ib/withdrawals/all', getAuthHeader()),
        axios.get('/api/admin/ib/commission-settings', getAuthHeader()),
        axios.get('/api/admin/ib/upgrade-requests', getAuthHeader())
      ])
      if (statsRes.data.success) setStats(statsRes.data.data)
      if (ibsRes.data.success) setIbs(ibsRes.data.data)
      if (referralsRes.data.success) setReferrals(referralsRes.data.data)
      if (commissionsRes.data.success) setCommissions(commissionsRes.data.data)
      if (withdrawalsRes.data.success) setWithdrawals(withdrawalsRes.data.data)
      if (settingsRes.data.success) setCommissionSettings(settingsRes.data.data)
      if (upgradesRes.data.success) setUpgradeRequests(upgradesRes.data.data)
    } catch (err) {
      console.error('Failed to fetch IB data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSuspendIB = async (ib) => {
    const action = ib.status === 'suspended' ? 'activate' : 'suspend'
    if (!confirm(`${action} this IB?`)) return
    try {
      setActionLoading(ib._id)
      const res = await axios.put(`/api/admin/ib/${ib._id}/suspend`, {}, getAuthHeader())
      // Instant UI update
      setIbs(prev => prev.map(i => i._id === ib._id ? { ...i, status: ib.status === 'suspended' ? 'active' : 'suspended' } : i))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update')
    } finally {
      setActionLoading(null)
    }
  }

  const handleApproveWithdrawal = async (withdrawal) => {
    if (!confirm('Approve this withdrawal?')) return
    try {
      setActionLoading(withdrawal._id)
      await axios.put(`/api/admin/ib/withdrawals/${withdrawal._id}/approve`, {}, getAuthHeader())
      // Instant UI update
      setWithdrawals(prev => prev.map(w => w._id === withdrawal._id ? { ...w, status: 'completed' } : w))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectWithdrawal = async (withdrawal) => {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    try {
      setActionLoading(withdrawal._id)
      await axios.put(`/api/admin/ib/withdrawals/${withdrawal._id}/reject`, { reason }, getAuthHeader())
      // Instant UI update
      setWithdrawals(prev => prev.map(w => w._id === withdrawal._id ? { ...w, status: 'rejected' } : w))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  const openEditModal = (ib) => {
    setSelectedIB(ib)
    setEditForm({
      commissionLevel: ib.commissionLevel || 1,
      customCommissionEnabled: ib.customCommission?.enabled || false,
      customCommissionPerLot: ib.customCommission?.perLot || 0,
      minWithdrawal: ib.minWithdrawal || 50,
      commissionFrozen: ib.commissionFrozen || false
    })
    setShowEditModal(true)
  }

  const handleUpdateIB = async () => {
    if (!selectedIB) return
    try {
      setActionLoading(selectedIB._id)
      const res = await axios.put(`/api/admin/ib/${selectedIB._id}`, {
        commissionLevel: editForm.commissionLevel,
        customCommission: {
          enabled: editForm.customCommissionEnabled,
          perLot: editForm.customCommissionPerLot
        },
        minWithdrawal: editForm.minWithdrawal,
        commissionFrozen: editForm.commissionFrozen
      }, getAuthHeader())
      // Instant UI update
      if (res.data.data) {
        setIbs(prev => prev.map(ib => ib._id === selectedIB._id ? { ...ib, ...res.data.data } : ib))
      }
      setShowEditModal(false)
      setSelectedIB(null)
      alert('IB settings updated successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update IB')
    } finally {
      setActionLoading(null)
    }
  }
  
  const handleSaveCommissionSettings = async () => {
    try {
      setSavingSettings(true)
      await axios.put('/api/admin/ib/commission-settings', commissionSettings, getAuthHeader())
      alert('Commission settings saved!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }
  
  const handleApproveUpgrade = async (ibId) => {
    if (!confirm('Approve this upgrade request?')) return
    try {
      setActionLoading(ibId)
      const res = await axios.put(`/api/admin/ib/${ibId}/approve-upgrade`, {}, getAuthHeader())
      // Instant UI update - remove from upgrade requests list
      setUpgradeRequests(prev => prev.filter(r => r._id !== ibId))
      // Update IB in list if present
      if (res.data.data) {
        setIbs(prev => prev.map(ib => ib._id === ibId ? { ...ib, ...res.data.data } : ib))
      }
      alert('Upgrade approved!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }
  
  const handleRejectUpgrade = async (ibId) => {
    if (!confirm('Reject this upgrade request?')) return
    try {
      setActionLoading(ibId)
      await axios.put(`/api/admin/ib/${ibId}/reject-upgrade`, {}, getAuthHeader())
      // Instant UI update - remove from upgrade requests list
      setUpgradeRequests(prev => prev.filter(r => r._id !== ibId))
      alert('Upgrade rejected!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }
  
  const getLevelName = (levelNum) => {
    const level = commissionSettings?.levels?.find(l => l.level === levelNum)
    return level?.name || 'Standard'
  }
  
  const getLevelColor = (levelNum) => {
    const level = commissionSettings?.levels?.find(l => l.level === levelNum)
    return level?.color || '#6b7280'
  }
  
  const getEffectiveCommission = (ib) => {
    if (ib.customCommission?.enabled && ib.customCommission?.perLot > 0) {
      return ib.customCommission.perLot
    }
    const level = commissionSettings?.levels?.find(l => l.level === ib.commissionLevel)
    return level?.commissionPerLot || commissionSettings?.defaultCommissionPerLot || 2
  }

  const filteredIBs = ibs.filter(ib =>
    ib.ibId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ib.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ib.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <Users size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total IBs</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalIBs || 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <UserCheck size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active IBs</p>
              <p className="text-xl font-bold" style={{ color: '#22c55e' }}>{stats.activeIBs || 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <TrendingUp size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Referrals</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalReferrals || 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <DollarSign size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Commissions</p>
              <p className="text-xl font-bold" style={{ color: '#22c55e' }}>${(stats.totalCommissions || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
              <Clock size={20} style={{ color: '#fbbf24' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pending Withdrawals</p>
              <p className="text-xl font-bold" style={{ color: '#fbbf24' }}>{pendingWithdrawals.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveTab('ibs')} className="px-5 py-2 rounded-xl font-medium flex items-center gap-2" style={{ backgroundColor: activeTab === 'ibs' ? 'var(--accent-blue)' : 'var(--bg-card)', color: activeTab === 'ibs' ? '#fff' : 'var(--text-secondary)' }}>
          <Users size={16} /> All IBs
        </button>
        <button onClick={() => setActiveTab('settings')} className="px-5 py-2 rounded-xl font-medium flex items-center gap-2" style={{ backgroundColor: activeTab === 'settings' ? '#f59e0b' : 'var(--bg-card)', color: activeTab === 'settings' ? '#fff' : 'var(--text-secondary)' }}>
          <Settings size={16} /> Commission Levels
        </button>
        <button onClick={() => setActiveTab('upgrades')} className="px-5 py-2 rounded-xl font-medium flex items-center gap-2" style={{ backgroundColor: activeTab === 'upgrades' ? '#ec4899' : 'var(--bg-card)', color: activeTab === 'upgrades' ? '#fff' : 'var(--text-secondary)' }}>
          <ArrowUp size={16} /> Upgrade Requests {upgradeRequests.length > 0 && `(${upgradeRequests.length})`}
        </button>
        <button onClick={() => setActiveTab('commissions')} className="px-5 py-2 rounded-xl font-medium flex items-center gap-2" style={{ backgroundColor: activeTab === 'commissions' ? '#8b5cf6' : 'var(--bg-card)', color: activeTab === 'commissions' ? '#fff' : 'var(--text-secondary)' }}>
          <DollarSign size={16} /> Commission Logs
        </button>
        <button onClick={() => setActiveTab('withdrawals')} className="px-5 py-2 rounded-xl font-medium flex items-center gap-2" style={{ backgroundColor: activeTab === 'withdrawals' ? '#fbbf24' : 'var(--bg-card)', color: activeTab === 'withdrawals' ? '#000' : 'var(--text-secondary)' }}>
          <Clock size={16} /> Withdrawals {pendingWithdrawals.length > 0 && `(${pendingWithdrawals.length})`}
        </button>
      </div>

      {/* IBs Tab */}
      {activeTab === 'ibs' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {filteredIBs.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No IBs found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>IB</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Level</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Commission/Lot</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Referrals</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Earnings</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIBs.map((ib) => (
                    <tr key={ib._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ib.userId?.firstName} {ib.userId?.lastName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ib.ibId} • {ib.userId?.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${getLevelColor(ib.commissionLevel)}20`, color: getLevelColor(ib.commissionLevel) }}>
                          {getLevelName(ib.commissionLevel)}
                        </span>
                        {ib.customCommission?.enabled && <span className="ml-1 text-xs" style={{ color: '#f59e0b' }}>★</span>}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold" style={{ color: '#22c55e' }}>${getEffectiveCommission(ib)}/lot</td>
                      <td className="py-4 px-4 text-sm font-semibold" style={{ color: '#3b82f6' }}>{ib.stats?.totalReferrals || 0}</td>
                      <td className="py-4 px-4 text-sm font-semibold" style={{ color: '#22c55e' }}>${ib.wallet?.totalEarned?.toFixed(2) || 0}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ib.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {ib.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditModal(ib)} className="p-2 rounded-lg bg-blue-500/10" title="Edit Commission">
                            <Edit size={16} style={{ color: '#3b82f6' }} />
                          </button>
                          <button onClick={() => handleSuspendIB(ib)} disabled={actionLoading === ib._id} className={`p-2 rounded-lg ${ib.status === 'suspended' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {ib.status === 'suspended' ? <UserCheck size={16} style={{ color: '#22c55e' }} /> : <Ban size={16} style={{ color: '#ef4444' }} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Commission Settings Tab */}
      {activeTab === 'settings' && commissionSettings && (
        <div className="space-y-6">
          {/* Default Commission */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Global Default Commission</h3>
              <button onClick={handleSaveCommissionSettings} disabled={savingSettings} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50">
                {savingSettings ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save All
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Default Per-Lot Commission ($)</label>
                <input type="number" step="0.1" min="0" value={commissionSettings.defaultCommissionPerLot} onChange={(e) => setCommissionSettings({ ...commissionSettings, defaultCommissionPerLot: parseFloat(e.target.value) || 0 })} className="w-32 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <p className="text-sm mt-6" style={{ color: 'var(--text-muted)' }}>This rate applies to all new IBs and IBs without a custom level</p>
            </div>
          </div>

          {/* Commission Levels */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Commission Levels</h3>
              <button onClick={() => {
                const newLevel = { name: `Level ${commissionSettings.levels.length + 1}`, level: commissionSettings.levels.length + 1, commissionPerLot: 5, minReferrals: 0, description: '', color: '#3b82f6', isActive: true }
                setCommissionSettings({ ...commissionSettings, levels: [...commissionSettings.levels, newLevel] })
              }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 font-medium text-sm">
                <Plus size={16} /> Add Level
              </button>
            </div>
            <p className="text-xs mb-4 p-3 rounded-lg bg-blue-500/10 text-blue-500">
              <strong>Auto-Upgrade:</strong> IBs automatically upgrade to higher levels when they reach the "Min Referrals" requirement. Set 0 for default/entry level.
            </p>
            <div className="space-y-3">
              {commissionSettings.levels?.map((level, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', borderLeft: `4px solid ${level.color}` }}>
                  <div className="flex-1 grid grid-cols-6 gap-4">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
                      <input type="text" value={level.name} onChange={(e) => {
                        const newLevels = [...commissionSettings.levels]
                        newLevels[idx].name = e.target.value
                        setCommissionSettings({ ...commissionSettings, levels: newLevels })
                      }} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Level #</label>
                      <input type="number" min="1" value={level.level} onChange={(e) => {
                        const newLevels = [...commissionSettings.levels]
                        newLevels[idx].level = parseInt(e.target.value)
                        setCommissionSettings({ ...commissionSettings, levels: newLevels })
                      }} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>$/Lot</label>
                      <input type="number" step="0.1" min="0" value={level.commissionPerLot} onChange={(e) => {
                        const newLevels = [...commissionSettings.levels]
                        newLevels[idx].commissionPerLot = parseFloat(e.target.value)
                        setCommissionSettings({ ...commissionSettings, levels: newLevels })
                      }} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Min Referrals</label>
                      <input type="number" min="0" value={level.minReferrals || 0} onChange={(e) => {
                        const newLevels = [...commissionSettings.levels]
                        newLevels[idx].minReferrals = parseInt(e.target.value) || 0
                        setCommissionSettings({ ...commissionSettings, levels: newLevels })
                      }} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Color</label>
                      <input type="color" value={level.color} onChange={(e) => {
                        const newLevels = [...commissionSettings.levels]
                        newLevels[idx].color = e.target.value
                        setCommissionSettings({ ...commissionSettings, levels: newLevels })
                      }} className="w-full h-9 rounded-lg cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
                      <input type="text" value={level.description} onChange={(e) => {
                        const newLevels = [...commissionSettings.levels]
                        newLevels[idx].description = e.target.value
                        setCommissionSettings({ ...commissionSettings, levels: newLevels })
                      }} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} placeholder="Optional" />
                    </div>
                  </div>
                  <button onClick={() => {
                    if (commissionSettings.levels.length <= 1) return alert('Need at least one level')
                    const newLevels = commissionSettings.levels.filter((_, i) => i !== idx)
                    setCommissionSettings({ ...commissionSettings, levels: newLevels })
                  }} className="p-2 rounded-lg bg-red-500/10">
                    <Trash2 size={16} style={{ color: '#ef4444' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Requests Tab */}
      {activeTab === 'upgrades' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {upgradeRequests.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No pending upgrade requests</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>IB</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Current Level</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Requested Level</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Requested At</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Note</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upgradeRequests.map((ib) => (
                    <tr key={ib._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ib.userId?.firstName} {ib.userId?.lastName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ib.ibId}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${getLevelColor(ib.commissionLevel)}20`, color: getLevelColor(ib.commissionLevel) }}>
                          {ib.currentLevelName}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${getLevelColor(ib.upgradeRequest?.requestedLevel)}20`, color: getLevelColor(ib.upgradeRequest?.requestedLevel) }}>
                          {ib.requestedLevelName}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{ib.upgradeRequest?.requestedAt ? new Date(ib.upgradeRequest.requestedAt).toLocaleString() : '-'}</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{ib.upgradeRequest?.note || '-'}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleApproveUpgrade(ib._id)} disabled={actionLoading === ib._id} className="p-2 rounded-lg bg-green-500/10">
                            <CheckCircle size={16} style={{ color: '#22c55e' }} />
                          </button>
                          <button onClick={() => handleRejectUpgrade(ib._id)} disabled={actionLoading === ib._id} className="p-2 rounded-lg bg-red-500/10">
                            <X size={16} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {referrals.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No referrals found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Referred User</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>IB</th>
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
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{r.ibId?.ibId}</td>
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
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No commission logs found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>IB</th>
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
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{c.ibId?.ibId}</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{c.sourceUserId?.firstName} {c.sourceUserId?.lastName}</td>
                      <td className="py-4 px-4"><span className="px-2 py-1 rounded-lg text-xs capitalize" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{c.sourceType?.replace('_', ' ')}</span></td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{c.sourceType === 'trade' ? `${c.symbol} • ${c.lots} lots` : `$${c.depositAmount || 0}`}</td>
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
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No withdrawals found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>IB</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Amount</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Method</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(w.createdAt).toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{w.ibUserId?.firstName} {w.ibUserId?.lastName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{w.ibId?.ibId}</p>
                      </td>
                      <td className="py-4 px-4 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>${w.amount?.toFixed(2)}</td>
                      <td className="py-4 px-4 text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{w.method}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${w.status === 'completed' || w.status === 'approved' ? 'bg-green-500/10 text-green-500' : w.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {w.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleApproveWithdrawal(w)} disabled={actionLoading === w._id} className="p-2 rounded-lg bg-green-500/10">
                              <CheckCircle size={16} style={{ color: '#22c55e' }} />
                            </button>
                            <button onClick={() => handleRejectWithdrawal(w)} disabled={actionLoading === w._id} className="p-2 rounded-lg bg-red-500/10">
                              <X size={16} style={{ color: '#ef4444' }} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Commission Modal */}
      {showEditModal && selectedIB && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Edit IB Commission</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{selectedIB.ibId} - {selectedIB.userId?.firstName} {selectedIB.userId?.lastName}</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setSelectedIB(null); }}>
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Commission Level */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Commission Level</label>
                <select
                  value={editForm.commissionLevel}
                  onChange={(e) => setEditForm({ ...editForm, commissionLevel: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  {commissionSettings?.levels?.map((level) => (
                    <option key={level.level} value={level.level}>{level.name} - ${level.commissionPerLot}/lot</option>
                  ))}
                </select>
              </div>

              {/* Custom Commission Override */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: editForm.customCommissionEnabled ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-hover)' }}>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={editForm.customCommissionEnabled}
                    onChange={(e) => setEditForm({ ...editForm, customCommissionEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <span style={{ color: editForm.customCommissionEnabled ? '#f59e0b' : 'var(--text-primary)' }}>Custom Commission Override</span>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Set a custom rate that overrides the level</p>
                  </div>
                </label>
                {editForm.customCommissionEnabled && (
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Custom $/Lot</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editForm.customCommissionPerLot}
                      onChange={(e) => setEditForm({ ...editForm, customCommissionPerLot: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                )}
              </div>

              {/* Min Withdrawal */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Minimum Withdrawal ($)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={editForm.minWithdrawal}
                  onChange={(e) => setEditForm({ ...editForm, minWithdrawal: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Freeze Commission */}
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl" style={{ backgroundColor: editForm.commissionFrozen ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-hover)' }}>
                <input
                  type="checkbox"
                  checked={editForm.commissionFrozen}
                  onChange={(e) => setEditForm({ ...editForm, commissionFrozen: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span style={{ color: editForm.commissionFrozen ? '#ef4444' : 'var(--text-primary)' }}>Freeze Commission Earnings</span>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>IB won't earn any commission while frozen</p>
                </div>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowEditModal(false); setSelectedIB(null); }}
                  className="flex-1 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateIB}
                  disabled={actionLoading === selectedIB._id}
                  className="flex-1 py-3 rounded-xl font-medium bg-blue-500 text-white disabled:opacity-50"
                >
                  {actionLoading === selectedIB._id ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IBManagement
