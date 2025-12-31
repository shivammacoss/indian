import React, { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Ban,
  CheckCircle,
  Download,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  X,
  Loader2,
  Key
} from 'lucide-react'
import axios from 'axios'

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, verifiedUsers: 0, inactiveUsers: 0 })
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showAccountsModal, setShowAccountsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', country: '', balance: 0, isVerified: false
  })
  const [newPassword, setNewPassword] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [tradingAccounts, setTradingAccounts] = useState([])
  const [editingAccount, setEditingAccount] = useState(null)
  const [accountTypes, setAccountTypes] = useState([])
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false)
  const [newAccountData, setNewAccountData] = useState({
    accountTypeId: '',
    leverage: 100,
    balance: 0,
    isDemo: false,
    nickname: ''
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`/api/admin/users?search=${searchTerm}&status=${filterStatus}`, getAuthHeader())
      if (res.data.success) {
        setUsers(res.data.data.users)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/users/stats/summary', getAuthHeader())
      if (res.data.success) {
        setStats(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [searchTerm, filterStatus])

  // Create user
  const handleCreateUser = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await axios.post('/api/admin/users', formData, getAuthHeader())
      if (res.data.success) {
        setShowCreateModal(false)
        setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '', country: '', balance: 0, isVerified: false })
        fetchUsers()
        fetchStats()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating user')
    } finally {
      setActionLoading(false)
    }
  }

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await axios.put(`/api/admin/users/${selectedUser._id}`, formData, getAuthHeader())
      if (res.data.success) {
        setShowEditModal(false)
        setSelectedUser(null)
        fetchUsers()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating user')
    } finally {
      setActionLoading(false)
    }
  }

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await axios.put(`/api/admin/users/${selectedUser._id}/password`, { newPassword }, getAuthHeader())
      if (res.data.success) {
        setShowPasswordModal(false)
        setSelectedUser(null)
        setNewPassword('')
        alert('Password changed successfully')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error changing password')
    } finally {
      setActionLoading(false)
    }
  }

  // Ban/Unban user
  const handleToggleBan = async (user) => {
    if (!confirm(`Are you sure you want to ${user.isActive ? 'ban' : 'unban'} this user?`)) return
    try {
      const res = await axios.put(`/api/admin/users/${user._id}/ban`, {}, getAuthHeader())
      if (res.data.success) {
        fetchUsers()
        fetchStats()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error')
    }
  }

  // Delete user
  const handleDeleteUser = async (user) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    try {
      const res = await axios.delete(`/api/admin/users/${user._id}`, getAuthHeader())
      if (res.data.success) {
        fetchUsers()
        fetchStats()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting user')
    }
  }

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      country: user.country || '',
      balance: user.balance || 0,
      isVerified: user.isVerified
    })
    setShowEditModal(true)
  }

  // Fetch trading accounts for a user
  const fetchTradingAccounts = async (userId) => {
    try {
      const res = await axios.get(`/api/admin/users/${userId}/trading-accounts`, getAuthHeader())
      if (res.data.success) {
        setTradingAccounts(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching trading accounts:', err)
    }
  }

  // Fetch account types
  const fetchAccountTypes = async () => {
    try {
      const res = await axios.get('/api/admin/account-types', getAuthHeader())
      if (res.data.success) {
        setAccountTypes(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching account types:', err)
    }
  }

  // Open accounts modal
  const openAccountsModal = (user) => {
    setSelectedUser(user)
    fetchTradingAccounts(user._id)
    fetchAccountTypes()
    setShowAccountsModal(true)
  }

  // Create trading account for user
  const handleCreateTradingAccount = async (e) => {
    e.preventDefault()
    if (!newAccountData.accountTypeId) {
      alert('Please select an account type')
      return
    }
    setActionLoading(true)
    try {
      const res = await axios.post(
        `/api/admin/users/${selectedUser._id}/trading-accounts`,
        newAccountData,
        getAuthHeader()
      )
      if (res.data.success) {
        fetchTradingAccounts(selectedUser._id)
        setShowCreateAccountForm(false)
        setNewAccountData({ accountTypeId: '', leverage: 100, balance: 0, isDemo: false, nickname: '' })
        alert('Trading account created successfully!')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating trading account')
    } finally {
      setActionLoading(false)
    }
  }

  // Update trading account leverage
  const handleUpdateAccount = async (accountId, updates) => {
    try {
      setActionLoading(true)
      const res = await axios.put(
        `/api/admin/users/${selectedUser._id}/trading-accounts/${accountId}`,
        updates,
        getAuthHeader()
      )
      if (res.data.success) {
        fetchTradingAccounts(selectedUser._id)
        setEditingAccount(null)
        alert('Account updated successfully')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating account')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = users

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }
      case 'Pending': return { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }
      case 'Suspended': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
      case 'Inactive': return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
      default: return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Download size={16} />
            Export
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Users</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{stats.totalUsers}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active Users</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#22c55e' }}>{stats.activeUsers}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Verified Users</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#fbbf24' }}>{stats.verifiedUsers}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Inactive</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#ef4444' }}>{stats.inactiveUsers}</p>
        </div>
      </div>

      {/* Users Table */}
      <div 
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Contact</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Balance</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Trades</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>KYC</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Joined</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center">
                    <Loader2 className="animate-spin mx-auto" size={24} style={{ color: 'var(--text-muted)' }} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No users found
                  </td>
                </tr>
              ) : filteredUsers.map((user) => {
                const status = user.isActive ? 'Active' : 'Inactive'
                const statusStyle = getStatusColor(status)
                const kycStyle = getStatusColor(user.isVerified ? 'Active' : 'Pending')
                return (
                  <tr key={user._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {user.firstName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ID: {user._id?.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                        <Mail size={12} /> {user.email}
                      </div>
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Phone size={12} /> {user.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>${(user.balance || 0).toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{user.country || 'N/A'}</td>
                    <td className="py-4 px-4">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: kycStyle.bg, color: kycStyle.color }}
                      >
                        {user.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(user)} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: 'var(--bg-hover)' }} title="Edit">
                          <Edit size={16} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                        <button onClick={() => openAccountsModal(user)} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} title="Trading Accounts & Leverage">
                          <DollarSign size={16} style={{ color: '#3b82f6' }} />
                        </button>
                        <button onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: 'var(--bg-hover)' }} title="Change Password">
                          <Key size={16} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                        <button onClick={() => handleToggleBan(user)} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: user.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }} title={user.isActive ? 'Ban' : 'Unban'}>
                          <Ban size={16} style={{ color: user.isActive ? '#ef4444' : '#22c55e' }} />
                        </button>
                        <button onClick={() => handleDeleteUser(user)} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }} title="Delete">
                          <Trash2 size={16} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Showing {filteredUsers.length} of {users.length} users</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>Previous</button>
            <button className="px-3 py-1 rounded-lg text-sm bg-blue-500 text-white">1</button>
            <button className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>2</button>
            <button className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>3</button>
            <button className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>Next</button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Create New User</h3>
              <button onClick={() => setShowCreateModal(false)}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                <input type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required minLength={6} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Country" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="number" placeholder="Initial Balance" value={formData.balance} onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={formData.isVerified} onChange={(e) => setFormData({...formData, isVerified: e.target.checked})} />
                Mark as Verified
              </label>
              <button type="submit" disabled={actionLoading} className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50">
                {actionLoading ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Edit User</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                <input type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Country" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="number" placeholder="Balance" value={formData.balance} onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={formData.isVerified} onChange={(e) => setFormData({...formData, isVerified: e.target.checked})} />
                Verified
              </label>
              <button type="submit" disabled={actionLoading} className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50">
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Change Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setSelectedUser(null); setNewPassword(''); }}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Change password for: {selectedUser.firstName} {selectedUser.lastName}</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input type="password" placeholder="New Password (min 6 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <button type="submit" disabled={actionLoading} className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50">
                {actionLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Trading Accounts Modal */}
      {showAccountsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Trading Accounts - {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowCreateAccountForm(!showCreateAccountForm)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#3b82f6', color: 'white' }}
                >
                  <Plus size={16} />
                  Create Account
                </button>
                <button onClick={() => { setShowAccountsModal(false); setSelectedUser(null); setEditingAccount(null); setShowCreateAccountForm(false); }}>
                  <X size={20} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* Create Account Form */}
            {showCreateAccountForm && (
              <form onSubmit={handleCreateTradingAccount} className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Create New Trading Account</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Account Type *</label>
                    <select
                      value={newAccountData.accountTypeId}
                      onChange={(e) => {
                        const selectedType = accountTypes.find(t => t._id === e.target.value)
                        setNewAccountData({ 
                          ...newAccountData, 
                          accountTypeId: e.target.value,
                          leverage: selectedType?.maxLeverage || 100,
                          nickname: selectedType ? `${selectedType.name} Account` : ''
                        })
                      }}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      required
                    >
                      <option value="">Select Account Type</option>
                      {accountTypes.filter(t => t.isActive).map(type => (
                        <option key={type._id} value={type._id}>
                          {type.name} - Min ${type.minDeposit} | 1:{type.maxLeverage}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Leverage (1-2000)</label>
                    <input
                      type="number"
                      value={newAccountData.leverage}
                      onChange={(e) => setNewAccountData({ ...newAccountData, leverage: parseInt(e.target.value) || 100 })}
                      min="1"
                      max="2000"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Initial Balance ($)</label>
                    <input
                      type="number"
                      value={newAccountData.balance}
                      onChange={(e) => setNewAccountData({ ...newAccountData, balance: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Nickname</label>
                    <input
                      type="text"
                      value={newAccountData.nickname}
                      onChange={(e) => setNewAccountData({ ...newAccountData, nickname: e.target.value })}
                      placeholder="e.g. Main Trading Account"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAccountData.isDemo}
                      onChange={(e) => setNewAccountData({ ...newAccountData, isDemo: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Demo Account</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#22c55e', color: 'white' }}
                  >
                    {actionLoading ? 'Creating...' : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateAccountForm(false)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            
            {tradingAccounts.length === 0 && !showCreateAccountForm ? (
              <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No trading accounts found. Click "Create Account" to add one.</p>
            ) : tradingAccounts.length > 0 && (
              <div className="space-y-4">
                {tradingAccounts.map(account => (
                  <div key={account._id} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{account.accountNumber}</span>
                        <span className="ml-2 text-xs px-2 py-1 rounded" style={{ backgroundColor: account.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: account.status === 'active' ? '#22c55e' : '#ef4444' }}>
                          {account.status}
                        </span>
                      </div>
                      <button 
                        onClick={() => setEditingAccount(editingAccount === account._id ? null : account._id)}
                        className="text-xs px-3 py-1 rounded-lg bg-blue-500 text-white"
                      >
                        {editingAccount === account._id ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Type: </span>
                        <span style={{ color: 'var(--text-primary)' }}>{account.accountType?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Balance: </span>
                        <span style={{ color: 'var(--text-primary)' }}>${account.balance?.toFixed(2)}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Leverage: </span>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>1:{account.leverage}</span>
                      </div>
                    </div>
                    
                    {editingAccount === account._id && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Leverage (1-2000)</label>
                            <input 
                              type="number" 
                              defaultValue={account.leverage}
                              min="1" 
                              max="2000"
                              id={`leverage-${account._id}`}
                              className="w-full px-3 py-2 rounded-lg text-sm"
                              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Balance</label>
                            <input 
                              type="number" 
                              defaultValue={account.balance}
                              step="0.01"
                              id={`balance-${account._id}`}
                              className="w-full px-3 py-2 rounded-lg text-sm"
                              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newLeverage = parseInt(document.getElementById(`leverage-${account._id}`).value)
                            const newBalance = parseFloat(document.getElementById(`balance-${account._id}`).value)
                            handleUpdateAccount(account._id, { leverage: newLeverage, balance: newBalance })
                          }}
                          disabled={actionLoading}
                          className="w-full py-2 rounded-lg bg-green-500 text-white font-medium text-sm disabled:opacity-50"
                        >
                          {actionLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
