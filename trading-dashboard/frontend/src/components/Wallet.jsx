import React, { useState, useEffect } from 'react'
import {
  Wallet as WalletIcon,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Smartphone,
  Building2,
  Copy,
  Check,
  Upload,
  X,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  QrCode,
  RefreshCw,
  Globe,
  DollarSign
} from 'lucide-react'
import axios from 'axios'

// Default currency exchange rates (will be fetched from API)
const DEFAULT_EXCHANGE_RATES = {
  USD: 1,
  INR: 83,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  CAD: 1.36,
  JPY: 149.50,
  SGD: 1.34,
  AED: 3.67,
  CNY: 7.24
}

const CURRENCY_SYMBOLS = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  SGD: 'S$',
  AED: 'د.إ',
  CNY: '¥'
}

const Wallet = () => {
  const [activeTab, setActiveTab] = useState('deposit')
  const [balance, setBalance] = useState(0)
  const [bankSettings, setBankSettings] = useState(null)
  const [userBankAccounts, setUserBankAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState('')
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_EXCHANGE_RATES)
  const [selectedBankIndex, setSelectedBankIndex] = useState(0)
  const [selectedUpiIndex, setSelectedUpiIndex] = useState(0)
  
  // Deposit form
  const [depositAmount, setDepositAmount] = useState('')
  const [depositCurrency, setDepositCurrency] = useState('INR')
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('bank')
  const [utrNumber, setUtrNumber] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [screenshot, setScreenshot] = useState('')
  
  // Calculate USD equivalent using dynamic rates
  const getUSDAmount = (amount, currency) => {
    if (!amount || isNaN(amount)) return 0
    const rate = exchangeRates[currency] || 1
    return parseFloat(amount) / rate
  }
  
  const usdEquivalent = getUSDAmount(depositAmount, depositCurrency)
  
  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawalMethod, setWithdrawalMethod] = useState('bank')
  const [selectedBankAccount, setSelectedBankAccount] = useState('')
  const [showAddBank, setShowAddBank] = useState(false)
  const [newBankAccount, setNewBankAccount] = useState({
    type: 'bank',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    upiId: ''
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [balanceRes, settingsRes, accountsRes, transRes, ratesRes] = await Promise.all([
        axios.get('/api/wallet/balance', getAuthHeader()),
        axios.get('/api/wallet/bank-settings', getAuthHeader()),
        axios.get('/api/wallet/bank-accounts', getAuthHeader()),
        axios.get('/api/wallet/transactions?limit=20', getAuthHeader()),
        axios.get('/api/wallet/currency-rates') // Public endpoint - no auth needed
      ])

      if (balanceRes.data.success) setBalance(balanceRes.data.data.balance)
      if (settingsRes.data.success) setBankSettings(settingsRes.data.data)
      if (accountsRes.data.success) setUserBankAccounts(accountsRes.data.data)
      if (transRes.data.success) setTransactions(transRes.data.data)
      
      // Update exchange rates with dynamic values from admin settings
      if (ratesRes.data.success) {
        setExchangeRates(prev => ({
          ...prev,
          INR: ratesRes.data.data.depositRate || 83 // Use deposit rate for INR conversion
        }))
      }
    } catch (err) {
      console.error('Failed to fetch wallet data:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(''), 2000)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshot(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeposit = async (e) => {
    e.preventDefault()
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      setSubmitting(true)
      const res = await axios.post('/api/wallet/deposit', {
        amount: usdEquivalent, // Send USD equivalent
        originalAmount: parseFloat(depositAmount),
        originalCurrency: depositCurrency,
        exchangeRate: exchangeRates[depositCurrency],
        paymentMethod,
        utrNumber,
        transactionId,
        screenshot
      }, getAuthHeader())

      if (res.data.success) {
        alert('Deposit request submitted successfully!')
        setDepositAmount('')
        setUtrNumber('')
        setTransactionId('')
        setScreenshot('')
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit deposit request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (!selectedBankAccount && withdrawalMethod === 'bank') {
      alert('Please select a bank account')
      return
    }

    try {
      setSubmitting(true)
      const res = await axios.post('/api/wallet/withdraw', {
        amount: parseFloat(withdrawAmount),
        withdrawalMethod,
        bankAccountId: selectedBankAccount || undefined
      }, getAuthHeader())

      if (res.data.success) {
        alert('Withdrawal request submitted successfully!')
        setWithdrawAmount('')
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit withdrawal request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddBankAccount = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await axios.post('/api/wallet/bank-accounts', newBankAccount, getAuthHeader())
      if (res.data.success) {
        setUserBankAccounts([...userBankAccounts, res.data.data])
        setShowAddBank(false)
        setNewBankAccount({ type: 'bank', bankName: '', accountNumber: '', accountHolderName: '', ifscCode: '', upiId: '' })
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add bank account')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBankAccount = async (id) => {
    if (!confirm('Delete this bank account?')) return
    try {
      await axios.delete(`/api/wallet/bank-accounts/${id}`, getAuthHeader())
      setUserBankAccounts(userBankAccounts.filter(a => a._id !== id))
    } catch (err) {
      alert('Failed to delete bank account')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }
      case 'pending': return { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }
      case 'rejected': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
      default: return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Balance Card */}
      <div className="mb-6 p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Available Balance</p>
            <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <WalletIcon size={32} style={{ color: '#3b82f6' }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'deposit' ? 'text-white' : ''}`}
          style={{ backgroundColor: activeTab === 'deposit' ? '#22c55e' : 'var(--bg-card)', color: activeTab === 'deposit' ? '#fff' : 'var(--text-secondary)' }}
        >
          <ArrowDownCircle size={18} /> Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'withdraw' ? 'text-white' : ''}`}
          style={{ backgroundColor: activeTab === 'withdraw' ? '#ef4444' : 'var(--bg-card)', color: activeTab === 'withdraw' ? '#fff' : 'var(--text-secondary)' }}
        >
          <ArrowUpCircle size={20} /> Withdraw
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all`}
          style={{ backgroundColor: activeTab === 'history' ? 'var(--accent-blue)' : 'var(--bg-card)', color: activeTab === 'history' ? '#fff' : 'var(--text-secondary)' }}
        >
          <Clock size={20} /> History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <>
            {/* Payment Details */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Payment Details</h3>
              
              {/* Payment Method Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setPaymentMethod('bank')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium`}
                  style={{ backgroundColor: paymentMethod === 'bank' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-hover)', color: paymentMethod === 'bank' ? '#3b82f6' : 'var(--text-secondary)', border: paymentMethod === 'bank' ? '2px solid #3b82f6' : '2px solid transparent' }}
                >
                  <Building2 size={18} /> Bank Transfer
                </button>
                <button
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium`}
                  style={{ backgroundColor: paymentMethod === 'upi' ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-hover)', color: paymentMethod === 'upi' ? '#8b5cf6' : 'var(--text-secondary)', border: paymentMethod === 'upi' ? '2px solid #8b5cf6' : '2px solid transparent' }}
                >
                  <Smartphone size={18} /> UPI
                </button>
              </div>

              {bankSettings && (
                <div className="space-y-3">
                  {paymentMethod === 'bank' && (
                    <>
                      {/* Bank Account Selection */}
                      {bankSettings.bankAccounts?.length > 0 ? (
                        <>
                          {bankSettings.bankAccounts.filter(b => b.isActive).length > 1 && (
                            <div className="mb-3">
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Select Bank Account</p>
                              <div className="flex flex-wrap gap-2">
                                {bankSettings.bankAccounts.filter(b => b.isActive).map((bank, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedBankIndex(idx)}
                                    className="px-3 py-2 rounded-lg text-sm font-medium"
                                    style={{ 
                                      backgroundColor: selectedBankIndex === idx ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-hover)',
                                      color: selectedBankIndex === idx ? '#3b82f6' : 'var(--text-secondary)',
                                      border: selectedBankIndex === idx ? '1px solid #3b82f6' : '1px solid var(--border-color)'
                                    }}
                                  >
                                    {bank.bankName}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {(() => {
                            const activeBanks = bankSettings.bankAccounts.filter(b => b.isActive)
                            const selectedBank = activeBanks[selectedBankIndex] || activeBanks[0]
                            if (!selectedBank) return null
                            return (
                              <>
                                <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                                  <div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bank Name</p>
                                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedBank.bankName}</p>
                                  </div>
                                  <button onClick={() => copyToClipboard(selectedBank.bankName, 'bankName')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                                    {copied === 'bankName' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                                  </button>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                                  <div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Account Number</p>
                                    <p className="font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{selectedBank.accountNumber}</p>
                                  </div>
                                  <button onClick={() => copyToClipboard(selectedBank.accountNumber, 'accountNumber')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                                    {copied === 'accountNumber' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                                  </button>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                                  <div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Account Holder</p>
                                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedBank.accountHolderName}</p>
                                  </div>
                                  <button onClick={() => copyToClipboard(selectedBank.accountHolderName, 'holder')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                                    {copied === 'holder' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                                  </button>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                                  <div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>IFSC Code</p>
                                    <p className="font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{selectedBank.ifscCode}</p>
                                  </div>
                                  <button onClick={() => copyToClipboard(selectedBank.ifscCode, 'ifsc')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                                    {copied === 'ifsc' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                                  </button>
                                </div>
                              </>
                            )
                          })()}
                        </>
                      ) : bankSettings.bankName ? (
                        <>
                          <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                            <div>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bank Name</p>
                              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{bankSettings.bankName}</p>
                            </div>
                            <button onClick={() => copyToClipboard(bankSettings.bankName, 'bankName')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                              {copied === 'bankName' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                            </button>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                            <div>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Account Number</p>
                              <p className="font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{bankSettings.accountNumber}</p>
                            </div>
                            <button onClick={() => copyToClipboard(bankSettings.accountNumber, 'accountNumber')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                              {copied === 'accountNumber' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                            </button>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                            <div>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Account Holder</p>
                              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{bankSettings.accountHolderName}</p>
                            </div>
                            <button onClick={() => copyToClipboard(bankSettings.accountHolderName, 'holder')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                              {copied === 'holder' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                            </button>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                            <div>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>IFSC Code</p>
                              <p className="font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{bankSettings.ifscCode}</p>
                            </div>
                            <button onClick={() => copyToClipboard(bankSettings.ifscCode, 'ifsc')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                              {copied === 'ifsc' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>No bank accounts available</p>
                      )}
                    </>
                  )}

                  {paymentMethod === 'upi' && (
                    <>
                      {/* UPI Selection */}
                      {bankSettings.upiAccounts?.length > 0 ? (
                        <>
                          {bankSettings.upiAccounts.filter(u => u.isActive).length > 1 && (
                            <div className="mb-3">
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Select UPI</p>
                              <div className="flex flex-wrap gap-2">
                                {bankSettings.upiAccounts.filter(u => u.isActive).map((upi, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedUpiIndex(idx)}
                                    className="px-3 py-2 rounded-lg text-sm font-medium"
                                    style={{ 
                                      backgroundColor: selectedUpiIndex === idx ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-hover)',
                                      color: selectedUpiIndex === idx ? '#8b5cf6' : 'var(--text-secondary)',
                                      border: selectedUpiIndex === idx ? '1px solid #8b5cf6' : '1px solid var(--border-color)'
                                    }}
                                  >
                                    {upi.upiName || upi.upiId}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {(() => {
                            const activeUpis = bankSettings.upiAccounts.filter(u => u.isActive)
                            const selectedUpi = activeUpis[selectedUpiIndex] || activeUpis[0]
                            if (!selectedUpi) return null
                            return (
                              <>
                                <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                                  <div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>UPI ID</p>
                                    <p className="font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{selectedUpi.upiId}</p>
                                  </div>
                                  <button onClick={() => copyToClipboard(selectedUpi.upiId, 'upiId')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                                    {copied === 'upiId' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                                  </button>
                                </div>
                                {selectedUpi.qrCode && (
                                  <div className="flex flex-col items-center p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Scan QR Code</p>
                                    <img src={selectedUpi.qrCode} alt="QR Code" className="w-48 h-48 rounded-lg" />
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </>
                      ) : bankSettings.upiId ? (
                        <>
                          <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                            <div>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>UPI ID</p>
                              <p className="font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{bankSettings.upiId}</p>
                            </div>
                            <button onClick={() => copyToClipboard(bankSettings.upiId, 'upiId')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                              {copied === 'upiId' ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} style={{ color: 'var(--text-secondary)' }} />}
                            </button>
                          </div>
                          {bankSettings.qrCode && (
                            <div className="flex flex-col items-center p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Scan QR Code</p>
                              <img src={bankSettings.qrCode} alt="QR Code" className="w-48 h-48 rounded-lg" />
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>No UPI accounts available</p>
                      )}
                    </>
                  )}

                  {bankSettings.paymentInstructions && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                      <p className="text-sm" style={{ color: '#3b82f6' }}>{bankSettings.paymentInstructions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deposit Form */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Submit Deposit</h3>
              
              <form onSubmit={handleDeposit} className="space-y-4">
                {/* Currency Selection */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Select Currency</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <div className="flex items-center gap-3">
                        <Globe size={20} style={{ color: '#3b82f6' }} />
                        <span className="font-medium">{depositCurrency}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({CURRENCY_SYMBOLS[depositCurrency]})</span>
                      </div>
                      <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    
                    {showCurrencyDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                        {Object.keys(exchangeRates).map((currency) => (
                          <button
                            key={currency}
                            type="button"
                            onClick={() => {
                              setDepositCurrency(currency)
                              setShowCurrencyDropdown(false)
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-opacity-80 transition-colors"
                            style={{ backgroundColor: depositCurrency === currency ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{currency}</span>
                              <span style={{ color: 'var(--text-muted)' }}>({CURRENCY_SYMBOLS[currency]})</span>
                            </div>
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              1 USD = {exchangeRates[currency]} {currency}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Amount ({CURRENCY_SYMBOLS[depositCurrency]} {depositCurrency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium" style={{ color: 'var(--text-muted)' }}>
                      {CURRENCY_SYMBOLS[depositCurrency]}
                    </span>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Enter amount"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-lg font-medium"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* USD Conversion Display */}
                {depositAmount && parseFloat(depositAmount) > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign size={20} style={{ color: '#22c55e' }} />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>You will receive (USD)</span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                          ${usdEquivalent.toFixed(2)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Rate: 1 USD = {exchangeRates[depositCurrency]} {depositCurrency}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>UTR Number / Reference</label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter UTR or reference number"
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Transaction ID (Optional)</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID"
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Payment Screenshot</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="screenshot-upload"
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className="flex items-center justify-center gap-2 w-full py-4 rounded-xl cursor-pointer border-2 border-dashed"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      <Upload size={20} />
                      {screenshot ? 'Screenshot uploaded' : 'Upload Screenshot'}
                    </label>
                    {screenshot && (
                      <div className="mt-2 relative">
                        <img src={screenshot} alt="Screenshot" className="w-full h-32 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setScreenshot('')}
                          className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Deposit Request'}
                </button>
              </form>
            </div>
          </>
        )}

        {/* Withdrawal Tab */}
        {activeTab === 'withdraw' && (
          <>
            {/* Bank Accounts */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Your Bank Accounts</h3>
                <button
                  onClick={() => setShowAddBank(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white"
                >
                  <Plus size={16} /> Add New
                </button>
              </div>

              {userBankAccounts.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No bank accounts saved. Add one to withdraw.</p>
              ) : (
                <div className="space-y-3">
                  {userBankAccounts.map((account) => (
                    <div
                      key={account._id}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${selectedBankAccount === account._id ? 'ring-2 ring-blue-500' : ''}`}
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                      onClick={() => {
                        setSelectedBankAccount(account._id)
                        setWithdrawalMethod(account.type)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {account.type === 'bank' ? <Building2 size={20} style={{ color: '#3b82f6' }} /> : <Smartphone size={20} style={{ color: '#8b5cf6' }} />}
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {account.type === 'bank' ? account.bankName : 'UPI'}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              {account.type === 'bank' ? `****${account.accountNumber?.slice(-4)}` : account.upiId}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBankAccount(account._id); }}
                          className="p-2 rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 size={16} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Withdrawal Form */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Withdraw Funds</h3>
              
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Available for withdrawal</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Amount ($)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={`Min: $${bankSettings?.minWithdrawal || 100}`}
                    max={balance}
                    required
                    className="w-full px-4 py-3 rounded-xl text-lg font-medium"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedBankAccount || parseFloat(withdrawAmount) > balance}
                  className="w-full py-4 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Request Withdrawal'}
                </button>
              </form>
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="lg:col-span-2 rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Transaction History</h3>
            
            {transactions.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const statusStyle = getStatusColor(tx.status)
                  return (
                    <div key={tx._id} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          {tx.type === 'deposit' ? <ArrowDownCircle size={20} style={{ color: '#22c55e' }} /> : <ArrowUpCircle size={20} style={{ color: '#ef4444' }} />}
                        </div>
                        <div>
                          <p className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{tx.type}</p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold" style={{ color: tx.type === 'deposit' ? '#22c55e' : '#ef4444' }}>
                          {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString()}
                        </p>
                        <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Bank Modal */}
      {showAddBank && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Add Bank Account</h3>
              <button onClick={() => setShowAddBank(false)}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleAddBankAccount} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewBankAccount({...newBankAccount, type: 'bank'})} className={`flex-1 py-2 rounded-xl text-sm font-medium`} style={{ backgroundColor: newBankAccount.type === 'bank' ? '#3b82f6' : 'var(--bg-hover)', color: newBankAccount.type === 'bank' ? '#fff' : 'var(--text-secondary)' }}>Bank</button>
                <button type="button" onClick={() => setNewBankAccount({...newBankAccount, type: 'upi'})} className={`flex-1 py-2 rounded-xl text-sm font-medium`} style={{ backgroundColor: newBankAccount.type === 'upi' ? '#8b5cf6' : 'var(--bg-hover)', color: newBankAccount.type === 'upi' ? '#fff' : 'var(--text-secondary)' }}>UPI</button>
              </div>
              
              {newBankAccount.type === 'bank' ? (
                <>
                  <input type="text" placeholder="Bank Name" value={newBankAccount.bankName} onChange={(e) => setNewBankAccount({...newBankAccount, bankName: e.target.value})} required className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  <input type="text" placeholder="Account Number" value={newBankAccount.accountNumber} onChange={(e) => setNewBankAccount({...newBankAccount, accountNumber: e.target.value})} required className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  <input type="text" placeholder="Account Holder Name" value={newBankAccount.accountHolderName} onChange={(e) => setNewBankAccount({...newBankAccount, accountHolderName: e.target.value})} required className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  <input type="text" placeholder="IFSC Code" value={newBankAccount.ifscCode} onChange={(e) => setNewBankAccount({...newBankAccount, ifscCode: e.target.value})} required className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </>
              ) : (
                <input type="text" placeholder="UPI ID (e.g., name@upi)" value={newBankAccount.upiId} onChange={(e) => setNewBankAccount({...newBankAccount, upiId: e.target.value})} required className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              )}
              
              <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl font-medium bg-blue-500 text-white disabled:opacity-50">
                {submitting ? 'Adding...' : 'Add Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Wallet
