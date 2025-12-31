import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Save,
  IndianRupee,
  Percent,
  TrendingUp,
  Globe,
  Layers,
  X,
  Loader2,
  Check,
  RefreshCw,
  Settings
} from 'lucide-react'
import axios from 'axios'

const IndianChargesManagement = () => {
  const [charges, setCharges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCharge, setEditingCharge] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    scopeType: 'global',
    segment: '',
    symbol: '',
    productType: 'ALL',
    chargeType: 'per_lot',
    brokerage: 20,
    sttPercentage: 0.025,
    transactionChargePercentage: 0.00325,
    gstPercentage: 18,
    sebiChargePercentage: 0.0001,
    stampDutyPercentage: 0.003,
    flatCharge: 0,
    leverage: { MIS: 5, CNC: 1, NRML: 2.5 },
    description: ''
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  useEffect(() => {
    fetchCharges()
  }, [])

  const fetchCharges = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/indian-charges', getAuthHeader())
      if (res.data.success) {
        setCharges(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch Indian charges:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingCharge) {
        await axios.put(`/api/admin/indian-charges/${editingCharge._id}`, form, getAuthHeader())
      } else {
        await axios.post('/api/admin/indian-charges', form, getAuthHeader())
      }
      setShowAddModal(false)
      setEditingCharge(null)
      resetForm()
      fetchCharges()
    } catch (err) {
      console.error('Failed to save charge:', err)
      alert(err.response?.data?.message || 'Failed to save charge')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this charge configuration?')) return
    try {
      await axios.delete(`/api/admin/indian-charges/${id}`, getAuthHeader())
      fetchCharges()
    } catch (err) {
      console.error('Failed to delete charge:', err)
      alert(err.response?.data?.message || 'Failed to delete')
    }
  }

  const handleEdit = (charge) => {
    setForm({
      name: charge.name || '',
      scopeType: charge.scopeType || 'global',
      segment: charge.segment || '',
      symbol: charge.symbol || '',
      productType: charge.productType || 'ALL',
      chargeType: charge.chargeType || 'per_lot',
      brokerage: charge.brokerage || 0,
      sttPercentage: charge.sttPercentage || 0,
      transactionChargePercentage: charge.transactionChargePercentage || 0,
      gstPercentage: charge.gstPercentage || 18,
      sebiChargePercentage: charge.sebiChargePercentage || 0,
      stampDutyPercentage: charge.stampDutyPercentage || 0,
      flatCharge: charge.flatCharge || 0,
      leverage: charge.leverage || { MIS: 5, CNC: 1, NRML: 2.5 },
      description: charge.description || ''
    })
    setEditingCharge(charge)
    setShowAddModal(true)
  }

  const resetForm = () => {
    setForm({
      name: '',
      scopeType: 'global',
      segment: '',
      symbol: '',
      productType: 'ALL',
      chargeType: 'per_lot',
      brokerage: 20,
      sttPercentage: 0.025,
      transactionChargePercentage: 0.00325,
      gstPercentage: 18,
      sebiChargePercentage: 0.0001,
      stampDutyPercentage: 0.003,
      flatCharge: 0,
      leverage: { MIS: 5, CNC: 1, NRML: 2.5 },
      description: ''
    })
  }

  const seedDefaults = async () => {
    if (!window.confirm('This will create default charge configurations. Continue?')) return
    try {
      setLoading(true)
      await axios.post('/api/admin/indian-charges/seed-defaults', {}, getAuthHeader())
      fetchCharges()
    } catch (err) {
      console.error('Failed to seed defaults:', err)
      alert(err.response?.data?.message || 'Failed to seed defaults')
    } finally {
      setLoading(false)
    }
  }

  const segments = ['NSE', 'NFO', 'MCX', 'BFO', 'CDS', 'BSE']
  const productTypes = ['ALL', 'MIS', 'CNC', 'NRML']
  const chargeTypes = ['per_lot', 'per_execution', 'percentage']

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <IndianRupee className="text-orange-500" />
            Indian Market Charges
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Configure brokerage, taxes, and leverage for Indian market trading
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={seedDefaults}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={16} />
            Seed Defaults
          </button>
          <button
            onClick={() => { resetForm(); setEditingCharge(null); setShowAddModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            <Plus size={16} />
            Add Charge Config
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Globe className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Global Configs</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {charges.filter(c => c.scopeType === 'global').length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Layers className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Segment Configs</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {charges.filter(c => c.scopeType === 'segment').length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="text-purple-500" size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Symbol Configs</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {charges.filter(c => c.scopeType === 'symbol').length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Settings className="text-orange-500" size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Configs</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {charges.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charges Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Charge Configurations</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading charges...</p>
          </div>
        ) : charges.length === 0 ? (
          <div className="p-8 text-center">
            <IndianRupee className="mx-auto mb-2 opacity-30" size={48} />
            <p style={{ color: 'var(--text-muted)' }}>No charge configurations found</p>
            <button onClick={seedDefaults} className="mt-4 text-orange-500 hover:underline text-sm">
              Click to seed default configurations
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Scope</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Brokerage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>STT %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>GST %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Leverage (MIS/CNC/NRML)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr key={charge._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{charge.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{charge.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        charge.scopeType === 'global' ? 'bg-blue-500/20 text-blue-400' :
                        charge.scopeType === 'segment' ? 'bg-green-500/20 text-green-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {charge.scopeType === 'global' ? 'Global' : 
                         charge.scopeType === 'segment' ? charge.segment : charge.symbol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{charge.productType}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                      ₹{charge.brokerage} / {charge.chargeType.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{charge.sttPercentage}%</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{charge.gstPercentage}%</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <span className="text-blue-400">{charge.leverage?.MIS || 5}x</span> / 
                      <span className="text-green-400">{charge.leverage?.CNC || 1}x</span> / 
                      <span className="text-purple-400">{charge.leverage?.NRML || 2.5}x</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${charge.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {charge.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(charge)} className="p-1.5 rounded hover:bg-blue-500/20 text-blue-400 mr-1">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(charge._id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingCharge ? 'Edit Charge Configuration' : 'Add Charge Configuration'}
              </h3>
              <button onClick={() => { setShowAddModal(false); setEditingCharge(null); resetForm() }}>
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  placeholder="e.g., NSE Equity Intraday"
                />
              </div>

              {/* Scope Type */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Scope Type</label>
                  <select
                    value={form.scopeType}
                    onChange={(e) => setForm({ ...form, scopeType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  >
                    <option value="global">Global</option>
                    <option value="segment">Segment</option>
                    <option value="symbol">Symbol</option>
                  </select>
                </div>
                
                {form.scopeType === 'segment' && (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Segment</label>
                    <select
                      value={form.segment}
                      onChange={(e) => setForm({ ...form, segment: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    >
                      <option value="">Select Segment</option>
                      {segments.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                
                {form.scopeType === 'symbol' && (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Symbol</label>
                    <input
                      type="text"
                      value={form.symbol}
                      onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      placeholder="e.g., RELIANCE"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Product Type</label>
                  <select
                    value={form.productType}
                    onChange={(e) => setForm({ ...form, productType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  >
                    {productTypes.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Charge Type & Brokerage */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Charge Type</label>
                  <select
                    value={form.chargeType}
                    onChange={(e) => setForm({ ...form, chargeType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  >
                    {chargeTypes.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Brokerage (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.brokerage}
                    onChange={(e) => setForm({ ...form, brokerage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Tax Percentages */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>STT %</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.sttPercentage}
                    onChange={(e) => setForm({ ...form, sttPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Transaction %</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.transactionChargePercentage}
                    onChange={(e) => setForm({ ...form, transactionChargePercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>GST %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.gstPercentage}
                    onChange={(e) => setForm({ ...form, gstPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>SEBI %</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.sebiChargePercentage}
                    onChange={(e) => setForm({ ...form, sebiChargePercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Stamp Duty %</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.stampDutyPercentage}
                    onChange={(e) => setForm({ ...form, stampDutyPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Flat Charge (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.flatCharge}
                    onChange={(e) => setForm({ ...form, flatCharge: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Leverage Settings */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Leverage Settings (Higher = Less Margin Required)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs mb-1 text-blue-400">MIS (Intraday)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        value={form.leverage.MIS}
                        onChange={(e) => setForm({ ...form, leverage: { ...form.leverage, MIS: parseFloat(e.target.value) || 1 } })}
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>x</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {(100 / form.leverage.MIS).toFixed(1)}% margin
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-green-400">CNC (Delivery)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        value={form.leverage.CNC}
                        onChange={(e) => setForm({ ...form, leverage: { ...form.leverage, CNC: parseFloat(e.target.value) || 1 } })}
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>x</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {(100 / form.leverage.CNC).toFixed(1)}% margin
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-purple-400">NRML (Carryforward)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        value={form.leverage.NRML}
                        onChange={(e) => setForm({ ...form, leverage: { ...form.leverage, NRML: parseFloat(e.target.value) || 1 } })}
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>x</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {(100 / form.leverage.NRML).toFixed(1)}% margin
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  placeholder="Optional description..."
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingCharge(null); resetForm() }}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
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

export default IndianChargesManagement
