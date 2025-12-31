import React, { useState, useEffect } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Clock, Loader2, X, Building2, Smartphone, Copy, Check, Upload, Plus, Trash2, ChevronDown, Globe, DollarSign } from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../../context/ThemeContext'

// Default exchange rates (will be fetched from API)
const DEFAULT_EXCHANGE_RATES = {
  USD: 1, INR: 83, EUR: 0.92, GBP: 0.79, AUD: 1.53,
  CAD: 1.36, JPY: 149.50, SGD: 1.34, AED: 3.67, CNY: 7.24
}

const CURRENCY_SYMBOLS = {
  USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$',
  CAD: 'C$', JPY: '¥', SGD: 'S$', AED: 'د.إ', CNY: '¥'
}

const MobileWallet = () => {
  const { isDark } = useTheme()
  const bgPrimary = isDark ? '#000000' : '#f5f5f7'
  const bgCard = isDark ? '#0d0d0d' : '#fff'
  const bgInput = isDark ? '#1a1a1a' : '#f2f2f7'
  const borderColor = isDark ? '#1a1a1a' : '#e5e5ea'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? '#6b7280' : '#8e8e93'
  const [activeTab, setActiveTab] = useState('deposit')
  const [balance, setBalance] = useState(0)
  const [bankSettings, setBankSettings] = useState(null)
  const [userBankAccounts, setUserBankAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState('')
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_EXCHANGE_RATES)

  // Deposit form - same as web
  const [depositAmount, setDepositAmount] = useState('')
  const [depositCurrency, setDepositCurrency] = useState('INR')
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('bank')
  const [utrNumber, setUtrNumber] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [screenshot, setScreenshot] = useState('')

  // Withdrawal form - same as web
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedBankAccount, setSelectedBankAccount] = useState('')
  const [showAddBank, setShowAddBank] = useState(false)
  const [newBankAccount, setNewBankAccount] = useState({
    type: 'bank', bankName: '', accountNumber: '', accountHolderName: '', ifscCode: '', upiId: ''
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  const getUSDAmount = (amount, currency) => {
    if (!amount || isNaN(amount)) return 0
    return parseFloat(amount) / (exchangeRates[currency] || 1)
  }

  const usdEquivalent = getUSDAmount(depositAmount, depositCurrency)

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
        axios.get('/api/wallet/currency-rates') // Public endpoint
      ])

      if (balanceRes.data.success) setBalance(balanceRes.data.data.balance)
      if (settingsRes.data.success) setBankSettings(settingsRes.data.data)
      if (accountsRes.data.success) setUserBankAccounts(accountsRes.data.data || [])
      if (transRes.data.success) setTransactions(transRes.data.data || [])
      if (ratesRes.data.success) {
        setExchangeRates(prev => ({ ...prev, INR: ratesRes.data.data.depositRate || 83 }))
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
      reader.onloadend = () => setScreenshot(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return alert('Enter valid amount')
    try {
      setSubmitting(true)
      const res = await axios.post('/api/wallet/deposit', {
        amount: usdEquivalent,
        originalAmount: parseFloat(depositAmount),
        originalCurrency: depositCurrency,
        exchangeRate: exchangeRates[depositCurrency],
        paymentMethod, utrNumber, transactionId, screenshot
      }, getAuthHeader())

      if (res.data.success) {
        alert('Deposit request submitted!')
        setDepositAmount(''); setUtrNumber(''); setTransactionId(''); setScreenshot('')
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return alert('Enter valid amount')
    if (!selectedBankAccount) return alert('Select a bank account')
    try {
      setSubmitting(true)
      const res = await axios.post('/api/wallet/withdraw', {
        amount: parseFloat(withdrawAmount),
        withdrawalMethod: 'bank',
        bankAccountId: selectedBankAccount
      }, getAuthHeader())

      if (res.data.success) {
        alert('Withdrawal request submitted!')
        setWithdrawAmount('')
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddBankAccount = async () => {
    try {
      setSubmitting(true)
      const res = await axios.post('/api/wallet/bank-accounts', newBankAccount, getAuthHeader())
      if (res.data.success) {
        setUserBankAccounts([...userBankAccounts, res.data.data])
        setShowAddBank(false)
        setNewBankAccount({ type: 'bank', bankName: '', accountNumber: '', accountHolderName: '', ifscCode: '', upiId: '' })
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBankAccount = async (id) => {
    if (!confirm('Delete this account?')) return
    try {
      await axios.delete(`/api/wallet/bank-accounts/${id}`, getAuthHeader())
      setUserBankAccounts(userBankAccounts.filter(a => a._id !== id))
    } catch (err) {
      alert('Failed to delete')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#22c55e'
      case 'pending': return '#fbbf24'
      case 'rejected': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgPrimary }}>
        <Loader2 className="animate-spin" size={24} color={textSecondary} />
      </div>
    )
  }

  const tabs = [
    { id: 'deposit', label: 'Deposit', icon: ArrowDownCircle, color: '#22c55e' },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpCircle, color: '#ef4444' },
    { id: 'history', label: 'History', icon: Clock, color: '#3b82f6' }
  ]

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: bgPrimary }}>
      {/* Balance */}
      <div className="p-4" style={{ backgroundColor: bgCard }}>
        <p className="text-xs mb-1" style={{ color: textSecondary }}>Available Balance</p>
        <p className="text-2xl font-bold" style={{ color: textPrimary }}>${balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 py-2" style={{ backgroundColor: bgCard, borderBottom: `1px solid ${borderColor}` }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium"
            style={{ 
              backgroundColor: activeTab === tab.id ? tab.color : bgInput,
              color: activeTab === tab.id ? (tab.id === 'deposit' ? '#000' : '#fff') : textSecondary
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* DEPOSIT TAB */}
        {activeTab === 'deposit' && (
          <div className="space-y-4">
            {/* Payment Method */}
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod('bank')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs"
                style={{ backgroundColor: paymentMethod === 'bank' ? 'rgba(59, 130, 246, 0.2)' : bgInput, color: paymentMethod === 'bank' ? '#3b82f6' : textSecondary, border: paymentMethod === 'bank' ? '1px solid #3b82f6' : `1px solid ${borderColor}` }}
              >
                <Building2 size={16} /> Bank
              </button>
              <button
                onClick={() => setPaymentMethod('upi')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs"
                style={{ backgroundColor: paymentMethod === 'upi' ? 'rgba(139, 92, 246, 0.2)' : bgInput, color: paymentMethod === 'upi' ? '#8b5cf6' : textSecondary, border: paymentMethod === 'upi' ? '1px solid #8b5cf6' : `1px solid ${borderColor}` }}
              >
                <Smartphone size={16} /> UPI
              </button>
            </div>

            {/* Bank Settings Display */}
            {bankSettings && (
              <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <p className="text-xs font-medium" style={{ color: textPrimary }}>Payment Details</p>
                {paymentMethod === 'bank' && (
                  <>
                    {bankSettings.bankName && (
                      <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: bgInput }}>
                        <div><p className="text-xs" style={{ color: textSecondary }}>Bank</p><p className="text-sm" style={{ color: textPrimary }}>{bankSettings.bankName}</p></div>
                        <button onClick={() => copyToClipboard(bankSettings.bankName, 'bank')} className="p-1">{copied === 'bank' ? <Check size={14} color="#22c55e" /> : <Copy size={14} color={textSecondary} />}</button>
                      </div>
                    )}
                    {bankSettings.accountNumber && (
                      <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: bgInput }}>
                        <div><p className="text-xs" style={{ color: textSecondary }}>Account No.</p><p className="text-sm font-mono" style={{ color: textPrimary }}>{bankSettings.accountNumber}</p></div>
                        <button onClick={() => copyToClipboard(bankSettings.accountNumber, 'acc')} className="p-1">{copied === 'acc' ? <Check size={14} color="#22c55e" /> : <Copy size={14} color={textSecondary} />}</button>
                      </div>
                    )}
                    {bankSettings.ifscCode && (
                      <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: bgInput }}>
                        <div><p className="text-xs" style={{ color: textSecondary }}>IFSC</p><p className="text-sm font-mono" style={{ color: textPrimary }}>{bankSettings.ifscCode}</p></div>
                        <button onClick={() => copyToClipboard(bankSettings.ifscCode, 'ifsc')} className="p-1">{copied === 'ifsc' ? <Check size={14} color="#22c55e" /> : <Copy size={14} color={textSecondary} />}</button>
                      </div>
                    )}
                  </>
                )}
                {paymentMethod === 'upi' && bankSettings.upiId && (
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: bgInput }}>
                    <div><p className="text-xs" style={{ color: textSecondary }}>UPI ID</p><p className="text-sm font-mono" style={{ color: textPrimary }}>{bankSettings.upiId}</p></div>
                    <button onClick={() => copyToClipboard(bankSettings.upiId, 'upi')} className="p-1">{copied === 'upi' ? <Check size={14} color="#22c55e" /> : <Copy size={14} color={textSecondary} />}</button>
                  </div>
                )}
              </div>
            )}

            {/* Currency Selection */}
            <div>
              <p className="text-xs mb-2" style={{ color: textSecondary }}>Currency</p>
              <button onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)} className="w-full flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: bgInput, border: `1px solid ${borderColor}` }}>
                <div className="flex items-center gap-2">
                  <Globe size={16} color="#3b82f6" />
                  <span style={{ color: textPrimary }}>{depositCurrency} ({CURRENCY_SYMBOLS[depositCurrency]})</span>
                </div>
                <ChevronDown size={16} color={textSecondary} />
              </button>
              {showCurrencyDropdown && (
                <div className="mt-2 rounded-lg max-h-48 overflow-y-auto" style={{ backgroundColor: bgInput, border: `1px solid ${borderColor}` }}>
                  {Object.keys(exchangeRates).map(cur => (
                    <button key={cur} onClick={() => { setDepositCurrency(cur); setShowCurrencyDropdown(false); }} className="w-full flex justify-between p-3 text-sm" style={{ color: depositCurrency === cur ? '#22c55e' : textPrimary }}>
                      <span>{cur} ({CURRENCY_SYMBOLS[cur]})</span>
                      <span style={{ color: textSecondary }}>1 USD = {exchangeRates[cur]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <p className="text-xs mb-2" style={{ color: textSecondary }}>Amount ({CURRENCY_SYMBOLS[depositCurrency]})</p>
              <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Enter amount" className="w-full p-3 rounded-lg" style={{ backgroundColor: bgInput, color: textPrimary, border: `1px solid ${borderColor}` }} />
            </div>

            {/* USD Conversion */}
            {depositAmount && parseFloat(depositAmount) > 0 && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: textSecondary }}>You receive (USD)</span>
                  <span className="text-lg font-bold" style={{ color: '#22c55e' }}>${usdEquivalent.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* UTR */}
            <div>
              <p className="text-xs mb-2" style={{ color: textSecondary }}>UTR / Reference</p>
              <input type="text" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} placeholder="Enter UTR number" className="w-full p-3 rounded-lg" style={{ backgroundColor: bgInput, color: textPrimary, border: `1px solid ${borderColor}` }} />
            </div>

            {/* Screenshot */}
            <div>
              <p className="text-xs mb-2" style={{ color: textSecondary }}>Payment Screenshot</p>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="mobile-screenshot" />
              <label htmlFor="mobile-screenshot" className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed cursor-pointer" style={{ borderColor: borderColor, color: textSecondary }}>
                <Upload size={16} />
                {screenshot ? 'Uploaded ✓' : 'Upload Screenshot'}
              </label>
              {screenshot && <img src={screenshot} alt="Screenshot" className="w-full h-24 object-cover rounded-lg mt-2" />}
            </div>

            <button onClick={handleDeposit} disabled={submitting} className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2" style={{ backgroundColor: '#22c55e', color: '#000' }}>
              {submitting && <Loader2 className="animate-spin" size={16} />}
              Submit Deposit
            </button>
          </div>
        )}

        {/* WITHDRAW TAB */}
        {activeTab === 'withdraw' && (
          <div className="space-y-4">
            {/* Bank Accounts */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: textPrimary }}>Your Bank Accounts</p>
              <button onClick={() => setShowAddBank(true)} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs" style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
                <Plus size={14} /> Add
              </button>
            </div>

            {userBankAccounts.length === 0 ? (
              <p className="text-center py-4 text-sm" style={{ color: textSecondary }}>No bank accounts. Add one to withdraw.</p>
            ) : (
              <div className="space-y-2">
                {userBankAccounts.map(acc => (
                  <div key={acc._id} onClick={() => setSelectedBankAccount(acc._id)} className="p-3 rounded-lg cursor-pointer" style={{ backgroundColor: bgCard, border: selectedBankAccount === acc._id ? '2px solid #3b82f6' : `1px solid ${borderColor}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {acc.type === 'bank' ? <Building2 size={16} color="#3b82f6" /> : <Smartphone size={16} color="#8b5cf6" />}
                        <div>
                          <p className="text-sm" style={{ color: textPrimary }}>{acc.type === 'bank' ? acc.bankName : 'UPI'}</p>
                          <p className="text-xs" style={{ color: textSecondary }}>{acc.type === 'bank' ? `****${acc.accountNumber?.slice(-4)}` : acc.upiId}</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteBankAccount(acc._id); }}><Trash2 size={14} color="#ef4444" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Available */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
              <p className="text-xs" style={{ color: textSecondary }}>Available for withdrawal</p>
              <p className="text-xl font-bold" style={{ color: textPrimary }}>${balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            {/* Amount */}
            <div>
              <p className="text-xs mb-2" style={{ color: textSecondary }}>Amount ($)</p>
              <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Enter amount" max={balance} className="w-full p-3 rounded-lg" style={{ backgroundColor: bgInput, color: textPrimary, border: `1px solid ${borderColor}` }} />
            </div>

            <button onClick={handleWithdraw} disabled={submitting || !selectedBankAccount} className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2" style={{ backgroundColor: '#ef4444', color: '#fff' }}>
              {submitting && <Loader2 className="animate-spin" size={16} />}
              Request Withdrawal
            </button>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: textSecondary }}>No transactions yet</p>
            ) : transactions.map(tx => (
              <div key={tx._id} className="p-3 rounded-lg" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {tx.type === 'deposit' ? <ArrowDownCircle size={16} color="#22c55e" /> : <ArrowUpCircle size={16} color="#ef4444" />}
                    <span className="text-sm capitalize" style={{ color: textPrimary }}>{tx.type}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: `${getStatusColor(tx.status)}20`, color: getStatusColor(tx.status) }}>{tx.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium" style={{ color: tx.type === 'deposit' ? '#22c55e' : '#ef4444' }}>{tx.type === 'deposit' ? '+' : '-'}${tx.amount?.toFixed(2)}</span>
                  <span className="text-xs" style={{ color: textSecondary }}>{new Date(tx.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Bank Modal */}
      {showAddBank && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full p-4 rounded-t-2xl max-h-[80vh] overflow-y-auto" style={{ backgroundColor: isDark ? '#1c1c1e' : '#fff' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: textPrimary }}>Add Bank Account</h3>
              <button onClick={() => setShowAddBank(false)}><X size={20} color={textSecondary} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setNewBankAccount({ ...newBankAccount, type: 'bank' })} className="flex-1 py-2 rounded-lg text-sm" style={{ backgroundColor: newBankAccount.type === 'bank' ? '#3b82f6' : bgInput, color: newBankAccount.type === 'bank' ? '#fff' : textPrimary }}>Bank</button>
                <button onClick={() => setNewBankAccount({ ...newBankAccount, type: 'upi' })} className="flex-1 py-2 rounded-lg text-sm" style={{ backgroundColor: newBankAccount.type === 'upi' ? '#8b5cf6' : bgInput, color: newBankAccount.type === 'upi' ? '#fff' : textPrimary }}>UPI</button>
              </div>
              {newBankAccount.type === 'bank' ? (
                <>
                  <input type="text" placeholder="Bank Name" value={newBankAccount.bankName} onChange={(e) => setNewBankAccount({ ...newBankAccount, bankName: e.target.value })} className="w-full p-3 rounded-lg" style={{ backgroundColor: bgInput, color: textPrimary, border: `1px solid ${borderColor}` }} />
                  <input type="text" placeholder="Account Number" value={newBankAccount.accountNumber} onChange={(e) => setNewBankAccount({ ...newBankAccount, accountNumber: e.target.value })} className="w-full p-3 rounded-lg" style={{ backgroundColor: bgInput, color: textPrimary, border: `1px solid ${borderColor}` }} />
                  <input type="text" placeholder="Account Holder Name" value={newBankAccount.accountHolderName} onChange={(e) => setNewBankAccount({ ...newBankAccount, accountHolderName: e.target.value })} className="w-full p-3 rounded-lg" style={{ backgroundColor: bgInput, color: textPrimary, border: `1px solid ${borderColor}` }} />
                  <input type="text" placeholder="IFSC Code" value={newBankAccount.ifscCode} onChange={(e) => setNewBankAccount({ ...newBankAccount, ifscCode: e.target.value })} className="w-full p-3 rounded-lg" style={{ backgroundColor: bgInput, color: textPrimary, border: `1px solid ${borderColor}` }} />
                </>
              ) : (
                <input type="text" placeholder="UPI ID" value={newBankAccount.upiId} onChange={(e) => setNewBankAccount({ ...newBankAccount, upiId: e.target.value })} className="w-full p-3 rounded-lg" style={{ backgroundColor: bgInput, color: textPrimary, border: `1px solid ${borderColor}` }} />
              )}
              <button onClick={handleAddBankAccount} disabled={submitting} className="w-full py-3 rounded-xl font-medium" style={{ backgroundColor: '#22c55e', color: '#000' }}>
                {submitting ? 'Adding...' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileWallet
