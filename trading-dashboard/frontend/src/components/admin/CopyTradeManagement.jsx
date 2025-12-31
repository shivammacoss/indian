import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Eye,
  Edit,
  Ban,
  Users,
  TrendingUp,
  DollarSign,
  Award,
  Star,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  X,
  UserCheck,
  AlertTriangle
} from 'lucide-react'
import axios from 'axios'

const CopyTradeManagement = () => {
  const [activeTab, setActiveTab] = useState('requests')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [masters, setMasters] = useState([])
  const [followers, setFollowers] = useState([])
  const [commissions, setCommissions] = useState([])
  const [stats, setStats] = useState({})
  const [selectedItem, setSelectedItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [reqRes, masterRes, followerRes, commRes, statsRes] = await Promise.all([
        axios.get('/api/admin/copy-trade/requests', getAuthHeader()),
        axios.get('/api/admin/copy-trade/masters', getAuthHeader()),
        axios.get('/api/admin/copy-trade/followers', getAuthHeader()),
        axios.get('/api/admin/copy-trade/commissions?limit=50', getAuthHeader()),
        axios.get('/api/admin/copy-trade/stats', getAuthHeader())
      ])
      if (reqRes.data.success) setRequests(reqRes.data.data)
      if (masterRes.data.success) setMasters(masterRes.data.data)
      if (followerRes.data.success) setFollowers(followerRes.data.data)
      if (commRes.data.success) setCommissions(commRes.data.data)
      if (statsRes.data.success) setStats(statsRes.data.data)
    } catch (err) {
      console.error('Failed to fetch copy trade data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async (request) => {
    if (!confirm('Approve this trade master request?')) return
    try {
      setActionLoading(request._id)
      await axios.put(`/api/admin/copy-trade/requests/${request._id}/approve`, {}, getAuthHeader())
      alert('Request approved!')
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectRequest = async () => {
    if (!selectedItem) return
    try {
      setActionLoading(selectedItem._id)
      await axios.put(`/api/admin/copy-trade/requests/${selectedItem._id}/reject`, { rejectionReason: rejectReason }, getAuthHeader())
      setShowRejectModal(false)
      setRejectReason('')
      setSelectedItem(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspendMaster = async (master) => {
    const action = master.status === 'suspended' ? 'activate' : 'suspend'
    if (!confirm(`${action} this trade master?`)) return
    try {
      setActionLoading(master._id)
      await axios.put(`/api/admin/copy-trade/masters/${master._id}/suspend`, {}, getAuthHeader())
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update')
    } finally {
      setActionLoading(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')

  const filteredMasters = masters.filter(m =>
    m.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.masterId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
              <Clock size={20} style={{ color: '#fbbf24' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pending Requests</p>
              <p className="text-xl font-bold" style={{ color: '#fbbf24' }}>{pendingRequests.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <Award size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trade Masters</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.activeMasters || 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <Users size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active Followers</p>
              <p className="text-xl font-bold" style={{ color: '#3b82f6' }}>{stats.activeFollows || 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <Copy size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Trades</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalTrades || 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <DollarSign size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Commissions</p>
              <p className="text-xl font-bold" style={{ color: '#22c55e' }}>${(stats.totalCommissions || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('requests')}
          className="px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          style={{
            backgroundColor: activeTab === 'requests' ? '#fbbf24' : 'var(--bg-card)',
            color: activeTab === 'requests' ? '#000' : 'var(--text-secondary)',
            border: activeTab === 'requests' ? 'none' : '1px solid var(--border-color)'
          }}
        >
          <Clock size={16} /> Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
        </button>
        <button
          onClick={() => setActiveTab('masters')}
          className="px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          style={{
            backgroundColor: activeTab === 'masters' ? 'var(--accent-blue)' : 'var(--bg-card)',
            color: activeTab === 'masters' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'masters' ? 'none' : '1px solid var(--border-color)'
          }}
        >
          <Award size={16} /> Masters
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          className="px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          style={{
            backgroundColor: activeTab === 'followers' ? '#22c55e' : 'var(--bg-card)',
            color: activeTab === 'followers' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'followers' ? 'none' : '1px solid var(--border-color)'
          }}
        >
          <Users size={16} /> Followers
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className="px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          style={{
            backgroundColor: activeTab === 'commissions' ? '#8b5cf6' : 'var(--bg-card)',
            color: activeTab === 'commissions' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'commissions' ? 'none' : '1px solid var(--border-color)'
          }}
        >
          <DollarSign size={16} /> Commissions
        </button>
      </div>

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {requests.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No requests found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Strategy</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Experience</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Commission</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{req.userId?.firstName} {req.userId?.lastName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{req.userId?.email}</p>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{req.strategy}</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{req.experienceYears} years</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{req.preferredCommissionValue}% profit share</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-4">
                        {req.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleApproveRequest(req)} disabled={actionLoading === req._id} className="p-2 rounded-lg bg-green-500/10 disabled:opacity-50" title="Approve">
                              {actionLoading === req._id ? <Loader2 className="animate-spin" size={16} style={{ color: '#22c55e' }} /> : <CheckCircle size={16} style={{ color: '#22c55e' }} />}
                            </button>
                            <button onClick={() => { setSelectedItem(req); setShowRejectModal(true); }} className="p-2 rounded-lg bg-red-500/10" title="Reject">
                              <XCircle size={16} style={{ color: '#ef4444' }} />
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

      {/* Masters Tab */}
      {activeTab === 'masters' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {filteredMasters.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No trade masters found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Master</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Strategy</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Followers</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Win Rate</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Commission</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMasters.map((m) => (
                    <tr key={m._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold">
                            {m.displayName?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                              {m.displayName} {m.isVerified && <CheckCircle size={14} className="text-blue-500" />}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.masterId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{m.strategyType}</td>
                      <td className="py-4 px-4 text-sm font-semibold" style={{ color: '#3b82f6' }}>{m.stats?.activeFollowers || 0}</td>
                      <td className="py-4 px-4 text-sm font-semibold" style={{ color: '#22c55e' }}>{m.stats?.winRate || 0}%</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{m.commissionValue}%</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${m.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleSuspendMaster(m)} disabled={actionLoading === m._id} className={`p-2 rounded-lg ${m.status === 'suspended' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {m.status === 'suspended' ? <UserCheck size={16} style={{ color: '#22c55e' }} /> : <Ban size={16} style={{ color: '#ef4444' }} />}
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

      {/* Followers Tab */}
      {activeTab === 'followers' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {followers.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No followers found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Follower</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Following</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Copy Mode</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Trades Copied</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total PnL</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {followers.map((f) => (
                    <tr key={f._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.userId?.firstName} {f.userId?.lastName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.userId?.email}</p>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{f.masterId?.displayName || f.masterId?.masterId}</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{f.copyMode} {f.copyMode === 'fixed_lot' ? `(${f.fixedLot})` : `(${f.multiplier}x)`}</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{f.stats?.totalCopiedTrades || 0}</td>
                      <td className="py-4 px-4 text-sm font-semibold" style={{ color: (f.stats?.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                        ${(f.stats?.totalPnL || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${f.status === 'active' ? 'bg-green-500/10 text-green-500' : f.status === 'paused' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                          {f.status}
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
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Master</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Follower</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Trade PnL</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Commission</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{c.masterUserId?.firstName} {c.masterUserId?.lastName}</td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{c.followerUserId?.firstName} {c.followerUserId?.lastName}</td>
                      <td className="py-4 px-4 text-sm font-semibold" style={{ color: c.tradePnL >= 0 ? '#22c55e' : '#ef4444' }}>
                        ${c.tradePnL?.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold" style={{ color: '#22c55e' }}>${c.commissionAmount?.toFixed(2)}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Reject Request</h3>
              <button onClick={() => { setShowRejectModal(false); setSelectedItem(null); }}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl mb-4 resize-none"
              style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleRejectRequest} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white disabled:opacity-50">
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CopyTradeManagement
