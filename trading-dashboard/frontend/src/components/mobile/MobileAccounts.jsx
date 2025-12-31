import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, TrendingUp, Wallet, ArrowRightLeft, ExternalLink, 
  Star, Zap, Crown, Diamond, User, GraduationCap, 
  ChevronRight, AlertCircle, Check, X, RefreshCw,
  Copy, ChevronDown, FileText, Upload, Camera, Trophy
} from 'lucide-react'

const MobileAccounts = ({ onOpenTrading }) => {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [accountTypes, setAccountTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('accounts')
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showKycModal, setShowKycModal] = useState(false)
  const [selectedAccountType, setSelectedAccountType] = useState(null)
  const [user, setUser] = useState(null)
  const [creating, setCreating] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [submittingKyc, setSubmittingKyc] = useState(false)
  
  const [transferForm, setTransferForm] = useState({
    fromType: 'wallet',
    fromAccountId: '',
    toType: 'trading_account',
    toAccountId: '',
    amount: ''
  })
  
  const [newAccountForm, setNewAccountForm] = useState({
    leverage: 100,
    currency: 'USD',
    isDemo: false
  })
  
  const [kycForm, setKycForm] = useState({
    idType: 'national_id',
    idNumber: '',
    idFrontImage: '',
    idBackImage: '',
    selfieImage: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    }
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [accountsRes, typesRes, userRes] = await Promise.all([
        axios.get('/api/trading-accounts', getAuthHeader()),
        axios.get('/api/account-types'),
        axios.get('/api/auth/me', getAuthHeader())
      ])
      
      if (accountsRes.data.success) setAccounts(accountsRes.data.data)
      if (typesRes.data.success) setAccountTypes(typesRes.data.data)
      if (userRes.data.success) setUser(userRes.data.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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

  const handleCreateAccount = async () => {
    if (!selectedAccountType) return
    
    try {
      setCreating(true)
      const res = await axios.post('/api/trading-accounts', {
        accountTypeId: selectedAccountType._id,
        leverage: newAccountForm.leverage,
        currency: newAccountForm.currency,
        isDemo: newAccountForm.isDemo
      }, getAuthHeader())
      
      if (res.data.success) {
        alert(res.data.message)
        setShowNewAccountModal(false)
        setSelectedAccountType(null)
        fetchData()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating account')
    } finally {
      setCreating(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferForm.amount || parseFloat(transferForm.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    
    try {
      setTransferring(true)
      const res = await axios.post('/api/trading-accounts/transfer', {
        fromType: transferForm.fromType,
        fromAccountId: transferForm.fromAccountId,
        toType: transferForm.toType,
        toAccountId: transferForm.toAccountId,
        amount: parseFloat(transferForm.amount)
      }, getAuthHeader())
      
      if (res.data.success) {
        alert(res.data.message)
        setShowTransferModal(false)
        setTransferForm({
          fromType: 'wallet',
          fromAccountId: '',
          toType: 'trading_account',
          toAccountId: '',
          amount: ''
        })
        fetchData()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Transfer failed')
    } finally {
      setTransferring(false)
    }
  }

  const handleKycSubmit = async () => {
    if (!kycForm.idNumber || !kycForm.idFrontImage) {
      alert('Please fill in required fields and upload ID front image')
      return
    }
    
    try {
      setSubmittingKyc(true)
      const res = await axios.post('/api/kyc/submit', kycForm, getAuthHeader())
      
      if (res.data.success) {
        alert(res.data.message)
        setShowKycModal(false)
        fetchData()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'KYC submission failed')
    } finally {
      setSubmittingKyc(false)
    }
  }

  const handleFileUpload = (field) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setKycForm({ ...kycForm, [field]: reader.result })
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const liveAccountTypes = accountTypes.filter(t => !t.isDemo)
  const demoAccountType = accountTypes.find(t => t.isDemo)
  const liveAccounts = accounts.filter(a => !a.isDemo)
  const demoAccounts = accounts.filter(a => a.isDemo)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Trading Accounts</h1>
      </div>

      {/* Wallet Balance Card - Compact */}
      <div className="mx-4 mb-3">
        <div 
          className="p-3 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-[10px]">Wallet Balance</p>
              <p className="text-xl font-bold text-white">
                ${user?.balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <Wallet size={22} className="text-white/80" />
          </div>
        </div>
      </div>

      {/* KYC Status - Compact */}
      {!user?.kycVerified && (
        <div className="mx-4 mb-3">
          <div 
            className="p-2.5 rounded-lg flex items-center gap-2"
            style={{ 
              backgroundColor: user?.kycStatus === 'pending' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${user?.kycStatus === 'pending' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            <AlertCircle size={18} style={{ color: user?.kycStatus === 'pending' ? '#eab308' : '#ef4444' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: user?.kycStatus === 'pending' ? '#eab308' : '#ef4444' }}>
                {user?.kycStatus === 'pending' ? 'KYC Pending Review' : 'KYC Required'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {user?.kycStatus === 'pending' ? 'Wait for admin approval' : 'Verify to open live accounts'}
              </p>
            </div>
            {user?.kycStatus !== 'pending' && (
              <button
                onClick={() => setShowKycModal(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium"
              >
                Verify
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs - Compact */}
      <div className="px-4 mb-3">
        <div className="flex gap-1.5 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {['accounts', 'transfer'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab ? 'bg-blue-600 text-white' : ''
              }`}
              style={{ color: activeTab !== tab ? 'var(--text-secondary)' : undefined }}
            >
              {tab === 'accounts' ? 'Accounts' : 'Transfer'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'accounts' ? (
        <>
          {/* Quick Actions - Compact */}
          <div className="px-4 mb-3 flex gap-2">
            <button
              onClick={() => setShowNewAccountModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
            >
              <Plus size={14} />
              Open
            </button>
            <button
              onClick={() => navigate('/prop-firm')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium"
              style={{ backgroundColor: '#f59e0b', color: 'white' }}
            >
              <Trophy size={14} />
              Challenge
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <ArrowRightLeft size={14} />
              Transfer
            </button>
          </div>

          {/* Live Accounts - Horizontal Scroll */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold mb-3 px-4" style={{ color: 'var(--text-secondary)' }}>
              Live Accounts ({liveAccounts.length})
            </h2>
            
            {liveAccounts.length === 0 ? (
              <div className="px-4">
                <div 
                  className="text-center py-8 rounded-xl border-2 border-dashed"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <TrendingUp size={32} className="mx-auto text-gray-500 mb-2" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No live accounts</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                {liveAccounts.map((account) => {
                  const IconComponent = getIconComponent(account.accountType?.color)
                  return (
                    <div
                      key={account._id}
                      className="p-4 rounded-xl flex-shrink-0"
                      style={{ backgroundColor: 'var(--bg-secondary)', width: '280px', scrollSnapAlign: 'start' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${account.accountType?.color}20` }}
                          >
                            <IconComponent size={16} style={{ color: account.accountType?.color }} />
                          </div>
                          <div>
                            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                              {account.accountType?.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {account.accountNumber}
                            </p>
                          </div>
                        </div>
                        <span 
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            account.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {account.status}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Balance</p>
                        <p className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                          ${account.balance?.toFixed(2)}
                        </p>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                          Leverage: 1:{account.leverage}
                        </p>
                        <button
                          onClick={() => onOpenTrading && onOpenTrading(account)}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold"
                        >
                          <ExternalLink size={14} />
                          WebTrader
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Demo Accounts - Horizontal Scroll */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold mb-3 px-4" style={{ color: 'var(--text-secondary)' }}>
              Demo Accounts ({demoAccounts.length})
            </h2>
            
            {demoAccounts.length === 0 ? (
              <div className="px-4">
                <button
                  onClick={() => {
                    if (demoAccountType) {
                      setSelectedAccountType(demoAccountType)
                      setNewAccountForm({ ...newAccountForm, isDemo: true })
                      setShowNewAccountModal(true)
                    }
                  }}
                  className="w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                >
                  <Plus size={18} />
                  <span className="text-sm">Create Demo Account</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                {demoAccounts.map((account) => (
                  <div
                    key={account._id}
                    className="p-4 rounded-xl flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-secondary)', width: '240px', scrollSnapAlign: 'start' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap size={18} className="text-gray-500" />
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        Demo - {account.accountNumber}
                      </p>
                    </div>
                    <p className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                      ${account.balance?.toFixed(2)}
                    </p>
                    <button
                      onClick={() => onOpenTrading && onOpenTrading(account)}
                      className="w-full px-3 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                    >
                      Practice
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Transfer Tab */
        <div className="px-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Transfer Funds</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>From</label>
                <select
                  value={transferForm.fromType === 'wallet' ? 'wallet' : transferForm.fromAccountId}
                  onChange={(e) => {
                    if (e.target.value === 'wallet') {
                      setTransferForm({ ...transferForm, fromType: 'wallet', fromAccountId: '' })
                    } else {
                      setTransferForm({ ...transferForm, fromType: 'trading_account', fromAccountId: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="wallet">Wallet (${user?.balance?.toFixed(2)})</option>
                  {accounts.filter(a => a.status === 'active' && !a.isDemo).map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountNumber} (${acc.balance?.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>To</label>
                <select
                  value={transferForm.toType === 'wallet' ? 'wallet' : transferForm.toAccountId}
                  onChange={(e) => {
                    if (e.target.value === 'wallet') {
                      setTransferForm({ ...transferForm, toType: 'wallet', toAccountId: '' })
                    } else {
                      setTransferForm({ ...transferForm, toType: 'trading_account', toAccountId: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="wallet">Wallet</option>
                  {accounts.filter(a => a.status === 'active' && !a.isDemo).map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountNumber} (${acc.balance?.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Amount (USD)</label>
                <input
                  type="number"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <button
                onClick={handleTransfer}
                disabled={transferring || !transferForm.amount}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50"
              >
                {transferring ? <RefreshCw size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
                {transferring ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Account Modal */}
      {showNewAccountModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div 
            className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="sticky top-0 px-4 py-3 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {selectedAccountType ? 'Configure Account' : 'Choose Account Type'}
              </h2>
              <button onClick={() => { setShowNewAccountModal(false); setSelectedAccountType(null) }}>
                <X size={24} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="p-4">
              {!selectedAccountType ? (
                <div className="space-y-3">
                  {/* Demo Option */}
                  {demoAccountType && (
                    <button
                      onClick={() => {
                        setSelectedAccountType(demoAccountType)
                        setNewAccountForm({ ...newAccountForm, isDemo: true, leverage: demoAccountType.maxLeverage })
                      }}
                      className="w-full p-4 rounded-xl text-left"
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap size={20} className="text-gray-400" />
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Demo Account</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Practice with $10,000 virtual funds</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Live Options */}
                  {liveAccountTypes.map((type) => {
                    const IconComponent = getIconComponent(type.color)
                    return (
                      <button
                        key={type._id}
                        onClick={() => {
                          setSelectedAccountType(type)
                          setNewAccountForm({ ...newAccountForm, isDemo: false, leverage: type.maxLeverage })
                        }}
                        className="w-full p-4 rounded-xl text-left"
                        style={{ backgroundColor: 'var(--bg-hover)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${type.color}20` }}>
                            <IconComponent size={18} style={{ color: type.color }} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{type.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              Min ${type.minDeposit} • 1:{type.maxLeverage} • {type.spreadMarkup} pips
                            </p>
                          </div>
                          <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Type */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedAccountType.name} {selectedAccountType.isDemo ? '(Demo)' : 'Account'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {selectedAccountType.isDemo ? 'Virtual $10,000' : `Min deposit: $${selectedAccountType.minDeposit}`}
                    </p>
                  </div>

                  {/* Leverage */}
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Leverage</label>
                    <select
                      value={newAccountForm.leverage}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, leverage: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm"
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      {[10, 25, 50, 100, 200, 300, 400, 500].filter(l => l <= selectedAccountType.maxLeverage).map(l => (
                        <option key={l} value={l}>1:{l}</option>
                      ))}
                    </select>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Currency</label>
                    <select
                      value={newAccountForm.currency}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, currency: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm"
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setSelectedAccountType(null)}
                      className="flex-1 py-3 rounded-xl font-medium"
                      style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCreateAccount}
                      disabled={creating}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50"
                    >
                      {creating ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KYC Modal */}
      {showKycModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div 
            className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="sticky top-0 px-4 py-3 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>KYC Verification</h2>
              <button onClick={() => setShowKycModal(false)}>
                <X size={24} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* ID Type */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>ID Type *</label>
                <select
                  value={kycForm.idType}
                  onChange={(e) => setKycForm({ ...kycForm, idType: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="national_id">National ID</option>
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                </select>
              </div>

              {/* ID Number */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>ID Number *</label>
                <input
                  type="text"
                  value={kycForm.idNumber}
                  onChange={(e) => setKycForm({ ...kycForm, idNumber: e.target.value })}
                  placeholder="Enter your ID number"
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Date of Birth</label>
                <input
                  type="date"
                  value={kycForm.dateOfBirth}
                  onChange={(e) => setKycForm({ ...kycForm, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Document Uploads */}
              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Documents</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* ID Front */}
                  <button
                    onClick={() => handleFileUpload('idFrontImage')}
                    className="aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1"
                    style={{ borderColor: kycForm.idFrontImage ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                  >
                    {kycForm.idFrontImage ? (
                      <Check size={24} className="text-green-500" />
                    ) : (
                      <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>ID Front *</span>
                  </button>

                  {/* ID Back */}
                  <button
                    onClick={() => handleFileUpload('idBackImage')}
                    className="aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1"
                    style={{ borderColor: kycForm.idBackImage ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                  >
                    {kycForm.idBackImage ? (
                      <Check size={24} className="text-green-500" />
                    ) : (
                      <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>ID Back</span>
                  </button>

                  {/* Selfie */}
                  <button
                    onClick={() => handleFileUpload('selfieImage')}
                    className="aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1"
                    style={{ borderColor: kycForm.selfieImage ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                  >
                    {kycForm.selfieImage ? (
                      <Check size={24} className="text-green-500" />
                    ) : (
                      <Camera size={24} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Selfie</span>
                  </button>

                  {/* Address Proof */}
                  <button
                    onClick={() => handleFileUpload('addressProof')}
                    className="aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1"
                    style={{ borderColor: kycForm.addressProof ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                  >
                    {kycForm.addressProof ? (
                      <Check size={24} className="text-green-500" />
                    ) : (
                      <FileText size={24} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Address Proof</span>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleKycSubmit}
                disabled={submittingKyc || !kycForm.idNumber || !kycForm.idFrontImage}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50"
              >
                {submittingKyc ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                {submittingKyc ? 'Submitting...' : 'Submit for Review'}
              </button>

              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Your documents will be reviewed by admin within 24-48 hours
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileAccounts
