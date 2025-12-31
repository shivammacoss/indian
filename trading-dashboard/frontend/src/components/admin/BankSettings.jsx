import React, { useState, useEffect } from 'react'
import {
  Building2,
  Smartphone,
  Save,
  Upload,
  X,
  Loader2,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Check,
  Eye,
  EyeOff
} from 'lucide-react'
import axios from 'axios'

const BankSettings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('banks')
  const [settings, setSettings] = useState({
    bankAccounts: [],
    upiAccounts: [],
    paymentInstructions: '',
    minDeposit: 100,
    maxDeposit: 100000,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    isActive: true
  })
  
  // Add/Edit Bank Modal
  const [showBankModal, setShowBankModal] = useState(false)
  const [editingBank, setEditingBank] = useState(null)
  const [bankForm, setBankForm] = useState({
    bankName: '', accountNumber: '', accountHolderName: '', ifscCode: '', bankBranch: '', isActive: true
  })
  
  // Add/Edit UPI Modal
  const [showUpiModal, setShowUpiModal] = useState(false)
  const [editingUpi, setEditingUpi] = useState(null)
  const [upiForm, setUpiForm] = useState({
    upiId: '', upiName: '', qrCode: '', isActive: true
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/wallet/bank-settings', getAuthHeader())
      if (res.data.success) {
        setSettings({
          ...res.data.data,
          bankAccounts: res.data.data.bankAccounts || [],
          upiAccounts: res.data.data.upiAccounts || []
        })
      }
    } catch (err) {
      console.error('Failed to fetch bank settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await axios.put('/api/admin/wallet/bank-settings', settings, getAuthHeader())
      if (res.data.success) {
        alert('Bank settings saved successfully!')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Bank Account handlers
  const openAddBank = () => {
    setEditingBank(null)
    setBankForm({ bankName: '', accountNumber: '', accountHolderName: '', ifscCode: '', bankBranch: '', isActive: true })
    setShowBankModal(true)
  }
  
  const openEditBank = (bank, index) => {
    setEditingBank(index)
    setBankForm({ ...bank })
    setShowBankModal(true)
  }
  
  const saveBank = () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolderName || !bankForm.ifscCode) {
      return alert('Please fill all required fields')
    }
    const newBanks = [...settings.bankAccounts]
    if (editingBank !== null) {
      newBanks[editingBank] = bankForm
    } else {
      newBanks.push(bankForm)
    }
    setSettings({ ...settings, bankAccounts: newBanks })
    setShowBankModal(false)
  }
  
  const deleteBank = (index) => {
    if (!confirm('Delete this bank account?')) return
    const newBanks = settings.bankAccounts.filter((_, i) => i !== index)
    setSettings({ ...settings, bankAccounts: newBanks })
  }
  
  const toggleBankStatus = (index) => {
    const newBanks = [...settings.bankAccounts]
    newBanks[index].isActive = !newBanks[index].isActive
    setSettings({ ...settings, bankAccounts: newBanks })
  }

  // UPI handlers
  const openAddUpi = () => {
    setEditingUpi(null)
    setUpiForm({ upiId: '', upiName: '', qrCode: '', isActive: true })
    setShowUpiModal(true)
  }
  
  const openEditUpi = (upi, index) => {
    setEditingUpi(index)
    setUpiForm({ ...upi })
    setShowUpiModal(true)
  }
  
  const saveUpi = () => {
    if (!upiForm.upiId) return alert('Please enter UPI ID')
    const newUpis = [...settings.upiAccounts]
    if (editingUpi !== null) {
      newUpis[editingUpi] = upiForm
    } else {
      newUpis.push(upiForm)
    }
    setSettings({ ...settings, upiAccounts: newUpis })
    setShowUpiModal(false)
  }
  
  const deleteUpi = (index) => {
    if (!confirm('Delete this UPI?')) return
    const newUpis = settings.upiAccounts.filter((_, i) => i !== index)
    setSettings({ ...settings, upiAccounts: newUpis })
  }
  
  const toggleUpiStatus = (index) => {
    const newUpis = [...settings.upiAccounts]
    newUpis[index].isActive = !newUpis[index].isActive
    setSettings({ ...settings, upiAccounts: newUpis })
  }
  
  const handleQRUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setUpiForm({ ...upiForm, qrCode: reader.result })
      reader.readAsDataURL(file)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Bank Settings</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Configure payment details visible to users for deposits</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('banks')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
          style={{ backgroundColor: activeTab === 'banks' ? '#3b82f6' : 'var(--bg-card)', color: activeTab === 'banks' ? '#fff' : 'var(--text-secondary)', border: activeTab === 'banks' ? 'none' : '1px solid var(--border-color)' }}
        >
          <Building2 size={18} /> Bank Accounts ({settings.bankAccounts?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('upi')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
          style={{ backgroundColor: activeTab === 'upi' ? '#8b5cf6' : 'var(--bg-card)', color: activeTab === 'upi' ? '#fff' : 'var(--text-secondary)', border: activeTab === 'upi' ? 'none' : '1px solid var(--border-color)' }}
        >
          <Smartphone size={18} /> UPI Accounts ({settings.upiAccounts?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('limits')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
          style={{ backgroundColor: activeTab === 'limits' ? '#22c55e' : 'var(--bg-card)', color: activeTab === 'limits' ? '#fff' : 'var(--text-secondary)', border: activeTab === 'limits' ? 'none' : '1px solid var(--border-color)' }}
        >
          <DollarSign size={18} /> Limits & Instructions
        </button>
      </div>

      {/* Bank Accounts Tab */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Bank Accounts</h3>
            <button onClick={openAddBank} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium">
              <Plus size={18} /> Add Bank
            </button>
          </div>
          
          {settings.bankAccounts?.length === 0 ? (
            <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <Building2 size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No bank accounts added yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {settings.bankAccounts.map((bank, index) => (
                <div key={index} className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', opacity: bank.isActive ? 1 : 0.6 }}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{bank.bankName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${bank.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {bank.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>A/C: {bank.accountNumber}</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Name: {bank.accountHolderName}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>IFSC: {bank.ifscCode} | Branch: {bank.bankBranch || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleBankStatus(index)} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        {bank.isActive ? <EyeOff size={16} style={{ color: 'var(--text-muted)' }} /> : <Eye size={16} style={{ color: '#22c55e' }} />}
                      </button>
                      <button onClick={() => openEditBank(bank, index)} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <Edit size={16} style={{ color: '#3b82f6' }} />
                      </button>
                      <button onClick={() => deleteBank(index)} className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <Trash2 size={16} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* UPI Tab */}
      {activeTab === 'upi' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>UPI Accounts</h3>
            <button onClick={openAddUpi} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white font-medium">
              <Plus size={18} /> Add UPI
            </button>
          </div>
          
          {settings.upiAccounts?.length === 0 ? (
            <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <Smartphone size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No UPI accounts added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {settings.upiAccounts.map((upi, index) => (
                <div key={index} className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', opacity: upi.isActive ? 1 : 0.6 }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{upi.upiName || 'UPI'}</h4>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{upi.upiId}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${upi.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {upi.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {upi.qrCode && <img src={upi.qrCode} alt="QR" className="w-full h-32 object-contain rounded-lg mb-3" style={{ backgroundColor: 'var(--bg-hover)' }} />}
                  <div className="flex gap-2">
                    <button onClick={() => toggleUpiStatus(index)} className="flex-1 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                      {upi.isActive ? <EyeOff size={16} className="mx-auto" style={{ color: 'var(--text-muted)' }} /> : <Eye size={16} className="mx-auto" style={{ color: '#22c55e' }} />}
                    </button>
                    <button onClick={() => openEditUpi(upi, index)} className="flex-1 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                      <Edit size={16} className="mx-auto" style={{ color: '#8b5cf6' }} />
                    </button>
                    <button onClick={() => deleteUpi(index)} className="flex-1 p-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                      <Trash2 size={16} className="mx-auto" style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Limits Tab */}
      {activeTab === 'limits' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                <DollarSign size={20} style={{ color: '#22c55e' }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Transaction Limits</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Min Deposit ($)</label>
                <input type="number" value={settings.minDeposit} onChange={(e) => setSettings({ ...settings, minDeposit: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Max Deposit ($)</label>
                <input type="number" value={settings.maxDeposit} onChange={(e) => setSettings({ ...settings, maxDeposit: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Min Withdrawal ($)</label>
                <input type="number" value={settings.minWithdrawal} onChange={(e) => setSettings({ ...settings, minWithdrawal: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Max Withdrawal ($)</label>
                <input type="number" value={settings.maxWithdrawal} onChange={(e) => setSettings({ ...settings, maxWithdrawal: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
                <AlertCircle size={20} style={{ color: '#fbbf24' }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Payment Instructions</h3>
            </div>
            <textarea value={settings.paymentInstructions} onChange={(e) => setSettings({ ...settings, paymentInstructions: e.target.value })} placeholder="Enter any instructions for users making deposits..." rows={5} className="w-full px-4 py-3 rounded-xl resize-none" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      )}

      {/* Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{editingBank !== null ? 'Edit' : 'Add'} Bank Account</h3>
              <button onClick={() => setShowBankModal(false)}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Bank Name *</label>
                <input type="text" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="e.g., State Bank of India" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Account Number *</label>
                <input type="text" value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} placeholder="Enter account number" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Account Holder Name *</label>
                <input type="text" value={bankForm.accountHolderName} onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })} placeholder="Name on account" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>IFSC Code *</label>
                  <input type="text" value={bankForm.ifscCode} onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })} placeholder="SBIN0001234" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Branch</label>
                  <input type="text" value={bankForm.bankBranch} onChange={(e) => setBankForm({ ...bankForm, bankBranch: e.target.value })} placeholder="Branch name" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <button onClick={saveBank} className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium flex items-center justify-center gap-2">
                <Check size={18} /> {editingBank !== null ? 'Update' : 'Add'} Bank Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPI Modal */}
      {showUpiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{editingUpi !== null ? 'Edit' : 'Add'} UPI Account</h3>
              <button onClick={() => setShowUpiModal(false)}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>UPI ID *</label>
                <input type="text" value={upiForm.upiId} onChange={(e) => setUpiForm({ ...upiForm, upiId: e.target.value })} placeholder="e.g., yourname@upi" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Display Name (optional)</label>
                <input type="text" value={upiForm.upiName} onChange={(e) => setUpiForm({ ...upiForm, upiName: e.target.value })} placeholder="e.g., GPay, PhonePe, Paytm" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>QR Code (optional)</label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleQRUpload} className="hidden" id="upi-qr-upload" />
                    <label htmlFor="upi-qr-upload" className="flex items-center justify-center gap-2 w-full py-4 rounded-xl cursor-pointer border-2 border-dashed" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                      <Upload size={20} /> Upload QR
                    </label>
                  </div>
                  {upiForm.qrCode && (
                    <div className="relative">
                      <img src={upiForm.qrCode} alt="QR" className="w-20 h-20 rounded-lg object-cover" />
                      <button onClick={() => setUpiForm({ ...upiForm, qrCode: '' })} className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white"><X size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={saveUpi} className="w-full py-3 rounded-xl bg-purple-500 text-white font-medium flex items-center justify-center gap-2">
                <Check size={18} /> {editingUpi !== null ? 'Update' : 'Add'} UPI Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BankSettings
