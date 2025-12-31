import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Save,
  DollarSign,
  Percent,
  TrendingUp,
  Clock,
  Globe,
  Layers,
  User,
  X,
  Loader2,
  Check
} from 'lucide-react'
import axios from 'axios'

const ChargesManagement = () => {
  const [activeTab, setActiveTab] = useState('global')
  const [charges, setCharges] = useState([])
  const [symbols, setSymbols] = useState([])
  const [users, setUsers] = useState([])
  const [accountTypes, setAccountTypes] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCharge, setEditingCharge] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    scopeType: 'global',
    segment: '',
    symbol: '',
    userId: '',
    accountTypeId: '',
    spreadPips: 0,
    commissionPerLot: 0,
    description: ''
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
      const [chargesRes, statsRes, symbolsRes] = await Promise.all([
        axios.get('/api/admin/charges', getAuthHeader()),
        axios.get('/api/admin/charges/stats', getAuthHeader()),
        axios.get('/api/admin/charges/symbols', getAuthHeader())
      ])
      if (chargesRes.data.success) setCharges(chargesRes.data.data)
      if (statsRes.data.success) setStats(statsRes.data.data)
      if (symbolsRes.data.success) setSymbols(symbolsRes.data.data)
      
      // Fetch users and account types separately
      try {
        const [usersRes, accTypesRes] = await Promise.all([
          axios.get('/api/admin/users?limit=100', getAuthHeader()),
          axios.get('/api/admin/account-types', getAuthHeader())
        ])
        if (usersRes.data.success) {
          setUsers(usersRes.data.data?.users || usersRes.data.data || [])
        }
        if (accTypesRes.data.success) {
          setAccountTypes(accTypesRes.data.data || [])
        }
      } catch (userErr) {
        console.error('Failed to fetch users/account types:', userErr)
        setUsers([])
        setAccountTypes([])
      }
    } catch (err) {
      console.error('Failed to fetch charges:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingCharge) {
        await axios.put(`/api/admin/charges/${editingCharge._id}`, form, getAuthHeader())
      } else {
        await axios.post('/api/admin/charges', form, getAuthHeader())
      }
      setShowAddModal(false)
      setEditingCharge(null)
      resetForm()
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save charge')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this charge setting?')) return
    try {
      await axios.delete(`/api/admin/charges/${id}`, getAuthHeader())
      fetchData()
    } catch (err) {
      alert('Failed to delete charge')
    }
  }

  const handleEdit = (charge) => {
    setEditingCharge(charge)
    setForm({
      scopeType: charge.scopeType,
      segment: charge.segment || '',
      symbol: charge.symbol || '',
      userId: charge.userId?._id || '',
      accountTypeId: charge.accountTypeId?._id || charge.accountTypeId || '',
      spreadPips: charge.spreadPips || 0,
      commissionPerLot: charge.commissionPerLot || 0,
      description: charge.description || ''
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setForm({
      scopeType: 'global',
      segment: '',
      symbol: '',
      userId: '',
      accountTypeId: '',
      spreadPips: 0,
      commissionPerLot: 0,
      description: ''
    })
  }

  const filteredCharges = charges.filter(c => {
    if (activeTab === 'global') return c.scopeType === 'global'
    if (activeTab === 'accountType') return c.scopeType === 'accountType'
    if (activeTab === 'segment') return c.scopeType === 'segment'
    if (activeTab === 'symbol') return c.scopeType === 'symbol'
    if (activeTab === 'user') return c.scopeType === 'user'
    return true
  })

  const getScopeLabel = (charge) => {
    if (charge.scopeType === 'global') return 'All Instruments'
    if (charge.scopeType === 'accountType') {
      const accType = accountTypes.find(a => a._id === charge.accountTypeId || a._id === charge.accountTypeId?._id)
      return accType?.name || 'Account Type'
    }
    if (charge.scopeType === 'segment') return charge.segment?.toUpperCase()
    if (charge.scopeType === 'symbol') return charge.symbol
    if (charge.scopeType === 'user') return charge.userId?.email || 'User'
    return '-'
  }

  const tabs = [
    { id: 'global', label: 'Global', icon: Globe, count: stats.global || 0 },
    { id: 'accountType', label: 'Account Type', icon: Layers, count: stats.accountType || 0 },
    { id: 'segment', label: 'Segment', icon: TrendingUp, count: stats.segment || 0 },
    { id: 'symbol', label: 'Symbol', icon: DollarSign, count: stats.symbol || 0 },
    { id: 'user', label: 'User', icon: User, count: stats.user || 0 },
  ]

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map(tab => (
          <div key={tab.id} className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <tab.icon size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tab.label} Settings</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{tab.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-6 py-2 rounded-xl text-sm font-medium capitalize transition-colors flex items-center gap-2"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--bg-card)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                border: activeTab === tab.id ? 'none' : '1px solid var(--border-color)'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { resetForm(); setForm(f => ({ ...f, scopeType: activeTab })); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-blue-500 text-white hover:bg-blue-600"
        >
          <Plus size={16} />
          Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Charge
        </button>
      </div>

      {/* Charges Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Scope</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Spread (pips)</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Commission/Lot</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Fee %</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Min/Max Fee</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Swap Long/Short</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCharges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No {activeTab} charges configured. Click "Add" to create one.
                  </td>
                </tr>
              ) : (
                filteredCharges.map((charge) => (
                  <tr key={charge._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{getScopeLabel(charge)}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{charge.description || charge.scopeType}</div>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold" style={{ color: '#fbbf24' }}>{charge.spreadPips}</td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>${charge.commissionPerLot}</td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{charge.feePercentage}%</td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>${charge.minFee} / ${charge.maxFee || '∞'}</td>
                    <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>{charge.swapLong} / {charge.swapShort}</td>
                    <td className="py-4 px-4">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: charge.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: charge.isActive ? '#22c55e' : '#ef4444'
                        }}
                      >
                        {charge.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(charge)} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                          <Edit size={16} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                        <button onClick={() => handleDelete(charge._id)} className="p-2 rounded-lg hover:bg-red-500/10">
                          <Trash2 size={16} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingCharge ? 'Edit Charge Setting' : 'Add New Charge Setting'}
              </h3>
              <button onClick={() => { setShowAddModal(false); setEditingCharge(null); }}>
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Scope Type */}
              {!editingCharge && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Scope Type</label>
                  <div className="grid grid-cols-5 gap-2">
                    {['global', 'accountType', 'segment', 'symbol', 'user'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, scopeType: type })}
                        className="py-2 px-3 rounded-xl text-xs font-medium capitalize"
                        style={{
                          backgroundColor: form.scopeType === type ? 'var(--accent-blue)' : 'var(--bg-hover)',
                          color: form.scopeType === type ? '#fff' : 'var(--text-secondary)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {type === 'accountType' ? 'Account' : type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Type selector */}
              {form.scopeType === 'accountType' && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Account Type</label>
                  <select
                    value={form.accountTypeId}
                    onChange={(e) => setForm({ ...form, accountTypeId: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select account type...</option>
                    {accountTypes.map(accType => (
                      <option key={accType._id} value={accType._id}>
                        {accType.name} ({accType.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Segment selector */}
              {form.scopeType === 'segment' && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Segment</label>
                  <select
                    value={form.segment}
                    onChange={(e) => setForm({ ...form, segment: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select segment...</option>
                    <option value="forex">Forex</option>
                    <option value="crypto">Crypto</option>
                    <option value="metals">Metals</option>
                    <option value="indices">Indices</option>
                  </select>
                </div>
              )}

              {/* Symbol selector */}
              {form.scopeType === 'symbol' && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Symbol</label>
                  <select
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select symbol...</option>
                    {symbols.map(s => (
                      <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* User selector */}
              {form.scopeType === 'user' && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Select User</label>
                  <select
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.email} - {user.firstName} {user.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Spread & Commission */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Spread (pips)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.spreadPips}
                    onChange={(e) => setForm({ ...form, spreadPips: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Commission Per Lot ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.commissionPerLot}
                    onChange={(e) => setForm({ ...form, commissionPerLot: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., VIP user discount"
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingCharge(null); }}
                  className="flex-1 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editingCharge ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChargesManagement
