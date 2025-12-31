import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Plus, Edit2, Trash2, Save, X, Star, TrendingUp, Zap, Crown, 
  Diamond, User, GraduationCap, Check, AlertCircle, RefreshCw,
  DollarSign, Percent, Settings
} from 'lucide-react'

const AccountTypeManagement = () => {
  const [accountTypes, setAccountTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    minDeposit: 100,
    maxLeverage: 100,
    spreadMarkup: 1.5,
    commission: 0,
    swapFree: false,
    features: [],
    tradingFee: 0,
    withdrawalFee: 0,
    minTradeSize: 0.01,
    maxTradeSize: 100,
    marginCallLevel: 100,
    stopOutLevel: 50,
    color: '#3b82f6',
    sortOrder: 0,
    isDemo: false,
    isActive: true
  })
  const [newFeature, setNewFeature] = useState('')

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  const fetchAccountTypes = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/account-types', getAuthHeader())
      if (res.data.success) {
        setAccountTypes(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching account types:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccountTypes()
  }, [])

  const handleSeedDefaults = async () => {
    if (!window.confirm('This will create default account types (Demo, Standard, Pro, Pro+, Elite, HNI). Continue?')) return
    
    try {
      const res = await axios.post('/api/admin/account-types/seed', {}, getAuthHeader())
      if (res.data.success) {
        alert(res.data.message)
        fetchAccountTypes()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error seeding account types')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingType) {
        const res = await axios.put(`/api/admin/account-types/${editingType._id}`, formData, getAuthHeader())
        if (res.data.success) {
          alert('Account type updated successfully')
        }
      } else {
        const res = await axios.post('/api/admin/account-types', formData, getAuthHeader())
        if (res.data.success) {
          alert('Account type created successfully')
        }
      }
      setShowModal(false)
      setEditingType(null)
      resetForm()
      fetchAccountTypes()
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving account type')
    }
  }

  const handleEdit = (type) => {
    setEditingType(type)
    setFormData({
      name: type.name,
      code: type.code,
      description: type.description || '',
      minDeposit: type.minDeposit,
      maxLeverage: type.maxLeverage,
      spreadMarkup: type.spreadMarkup,
      commission: type.commission,
      swapFree: type.swapFree,
      features: type.features || [],
      tradingFee: type.tradingFee || 0,
      withdrawalFee: type.withdrawalFee || 0,
      minTradeSize: type.minTradeSize,
      maxTradeSize: type.maxTradeSize,
      marginCallLevel: type.marginCallLevel,
      stopOutLevel: type.stopOutLevel,
      color: type.color,
      sortOrder: type.sortOrder,
      isDemo: type.isDemo,
      isActive: type.isActive
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account type?')) return
    
    try {
      const res = await axios.delete(`/api/admin/account-types/${id}`, getAuthHeader())
      if (res.data.success) {
        alert('Account type deleted successfully')
        fetchAccountTypes()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting account type')
    }
  }

  const handleToggleActive = async (type) => {
    try {
      await axios.put(`/api/admin/account-types/${type._id}`, { isActive: !type.isActive }, getAuthHeader())
      fetchAccountTypes()
    } catch (error) {
      alert('Error updating status')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      minDeposit: 100,
      maxLeverage: 100,
      spreadMarkup: 1.5,
      commission: 0,
      swapFree: false,
      features: [],
      tradingFee: 0,
      withdrawalFee: 0,
      minTradeSize: 0.01,
      maxTradeSize: 100,
      marginCallLevel: 100,
      stopOutLevel: 50,
      color: '#3b82f6',
      sortOrder: 0,
      isDemo: false,
      isActive: true
    })
  }

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({ ...formData, features: [...formData.features, newFeature.trim()] })
      setNewFeature('')
    }
  }

  const removeFeature = (index) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) })
  }

  const getIconComponent = (color) => {
    const icons = {
      '#6b7280': GraduationCap,
      '#3b82f6': User,
      '#8b5cf6': TrendingUp,
      '#ec4899': Zap,
      '#f59e0b': Crown,
      '#10b981': Diamond
    }
    return icons[color] || Star
  }

  const colorOptions = [
    { value: '#6b7280', label: 'Gray' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#10b981', label: 'Emerald' },
    { value: '#ef4444', label: 'Red' },
    { value: '#06b6d4', label: 'Cyan' }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Account Types</h1>
          <p className="text-gray-400 text-sm mt-1">Manage trading account types and their settings</p>
        </div>
        <div className="flex gap-3">
          {accountTypes.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              <RefreshCw size={18} />
              Seed Defaults
            </button>
          )}
          <button
            onClick={() => { resetForm(); setEditingType(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Plus size={18} />
            Add Account Type
          </button>
        </div>
      </div>

      {/* Account Types Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : accountTypes.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl">
          <Settings size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Account Types</h3>
          <p className="text-gray-400 mb-4">Create account types or seed default ones to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountTypes.map((type) => {
            const IconComponent = getIconComponent(type.color)
            return (
              <div
                key={type._id}
                className={`relative p-5 rounded-xl border transition-all ${
                  type.isActive 
                    ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' 
                    : 'bg-gray-900/50 border-gray-800 opacity-60'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2.5 rounded-xl"
                      style={{ backgroundColor: `${type.color}20` }}
                    >
                      <IconComponent size={22} style={{ color: type.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{type.name}</h3>
                      <p className="text-xs text-gray-500">{type.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(type)}
                      className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(type._id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-gray-900/50">
                    <p className="text-xs text-gray-500">Min Deposit</p>
                    <p className="font-semibold text-white">${type.minDeposit.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-900/50">
                    <p className="text-xs text-gray-500">Max Leverage</p>
                    <p className="font-semibold text-white">1:{type.maxLeverage}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-900/50">
                    <p className="text-xs text-gray-500">Spread</p>
                    <p className="font-semibold text-white">{type.spreadMarkup} pips</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-900/50">
                    <p className="text-xs text-gray-500">Commission</p>
                    <p className="font-semibold text-white">${type.commission}/lot</p>
                  </div>
                </div>

                {/* Features */}
                {type.features?.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {type.features.slice(0, 3).map((feature, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-300">
                          {feature}
                        </span>
                      ))}
                      {type.features.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-400">
                          +{type.features.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <span className="text-xs text-gray-500">
                    {type.accountCount || 0} accounts
                  </span>
                  <button
                    onClick={() => handleToggleActive(type)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      type.isActive 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {type.isActive ? <Check size={12} /> : <X size={12} />}
                    {type.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Demo Badge */}
                {type.isDemo && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gray-600 text-xs text-white font-medium">
                    Demo
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingType ? 'Edit Account Type' : 'New Account Type'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingType(null); resetForm() }}
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Standard"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g., STANDARD"
                    required
                    disabled={editingType}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500 resize-none"
                  rows={2}
                  placeholder="Account type description"
                />
              </div>

              {/* Trading Conditions */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <TrendingUp size={16} /> Trading Conditions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Min Deposit ($)</label>
                    <input
                      type="number"
                      value={formData.minDeposit}
                      onChange={(e) => setFormData({ ...formData, minDeposit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Leverage</label>
                    <input
                      type="number"
                      value={formData.maxLeverage}
                      onChange={(e) => setFormData({ ...formData, maxLeverage: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                      min="1"
                      max="2000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Spread (pips)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.spreadMarkup}
                      onChange={(e) => setFormData({ ...formData, spreadMarkup: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Commission ($/lot)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.commission}
                      onChange={(e) => setFormData({ ...formData, commission: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Risk Settings */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <AlertCircle size={16} /> Risk Settings
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Min Trade Size</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minTradeSize}
                      onChange={(e) => setFormData({ ...formData, minTradeSize: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                      min="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Trade Size</label>
                    <input
                      type="number"
                      value={formData.maxTradeSize}
                      onChange={(e) => setFormData({ ...formData, maxTradeSize: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Margin Call (%)</label>
                    <input
                      type="number"
                      value={formData.marginCallLevel}
                      onChange={(e) => setFormData({ ...formData, marginCallLevel: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Stop Out (%)</label>
                    <input
                      type="number"
                      value={formData.stopOutLevel}
                      onChange={(e) => setFormData({ ...formData, stopOutLevel: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Features</h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Add a feature..."
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-700 text-sm text-white">
                      {feature}
                      <button type="button" onClick={() => removeFeature(i)} className="ml-1 text-gray-400 hover:text-red-400">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Appearance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          formData.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                    min="0"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDemo}
                    onChange={(e) => setFormData({ ...formData, isDemo: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Demo Account Type</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.swapFree}
                    onChange={(e) => setFormData({ ...formData, swapFree: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Swap Free (Islamic)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Active</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingType(null); resetForm() }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <Save size={18} />
                  {editingType ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountTypeManagement
