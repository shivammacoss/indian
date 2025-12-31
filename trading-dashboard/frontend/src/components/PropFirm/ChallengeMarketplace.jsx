import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { 
  Trophy, Target, Clock, TrendingDown, DollarSign, 
  Check, Star, Zap, Shield, ChevronRight, Info,
  Percent, Calendar, Users, ArrowRight
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const ChallengeMarketplace = () => {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [challengeTypes, setChallengeTypes] = useState([])
  const [selectedType, setSelectedType] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [userBalance, setUserBalance] = useState(0)

  useEffect(() => {
    fetchChallengeTypes()
    fetchUserBalance()
  }, [])

  const fetchChallengeTypes = async () => {
    try {
      const res = await axios.get('/api/challenges/types')
      if (res.data.success) {
        setChallengeTypes(res.data.data)
        if (res.data.data.length > 0) {
          setSelectedType(res.data.data[0])
          if (res.data.data[0].accountSizes?.length > 0) {
            setSelectedSize(res.data.data[0].accountSizes[2]) // Default to middle size
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch challenge types:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserBalance = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setUserBalance(res.data.data.balance || 0)
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  const handlePurchase = async () => {
    if (!selectedType || !selectedSize) return

    const price = selectedSize.discountedPrice || selectedSize.price
    if (userBalance < price) {
      alert('Insufficient balance. Please deposit funds first.')
      return
    }

    setPurchasing(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/challenges/purchase', {
        challengeTypeId: selectedType._id,
        accountSize: selectedSize.size,
        paymentMethod: 'wallet'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        alert('Challenge purchased successfully! Go to Accounts → Challenge tab to view and trade.')
        navigate('/accounts')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to purchase challenge')
    } finally {
      setPurchasing(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
        <h1 className="text-xl md:text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Prop Firm Challenges
        </h1>
        <p className="text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
          Prove your trading skills and get funded up to $200,000
        </p>
      </div>

      {/* Challenge Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 md:mb-6 px-4 md:px-6">
        {challengeTypes.map((type) => (
          <button
            key={type._id}
            onClick={() => {
              setSelectedType(type)
              if (type.accountSizes?.length > 0) {
                setSelectedSize(type.accountSizes[2] || type.accountSizes[0])
              }
            }}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all text-sm md:text-base ${
              selectedType?._id === type._id
                ? 'ring-2 ring-offset-2'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: selectedType?._id === type._id ? type.color : 'var(--bg-card)',
              color: selectedType?._id === type._id ? 'white' : 'var(--text-primary)',
              ringColor: type.color
            }}
          >
            {type.type === 'two_step' && <Target size={18} />}
            {type.type === 'one_step' && <Zap size={18} />}
            {type.type === 'instant_funding' && <Trophy size={18} />}
            <span className="font-medium">{type.name}</span>
            {type.badge && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
                {type.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedType && (
        <div className="px-4 md:px-6 pb-6 w-full">
        <div className="flex flex-col lg:flex-row gap-4 w-full">
          {/* Left Column - Account Sizes */}
          <div className="flex-1 space-y-4">
            {/* Account Size Selection */}
            <div 
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Select Account Size
              </h3>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {selectedType.accountSizes?.map((size) => (
                  <button
                    key={size.size}
                    onClick={() => setSelectedSize(size)}
                    className={`p-3 md:p-4 rounded-xl text-center transition-all ${
                      selectedSize?.size === size.size
                        ? 'ring-2'
                        : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: selectedSize?.size === size.size 
                        ? `${selectedType.color}20` 
                        : 'var(--bg-hover)',
                      border: selectedSize?.size === size.size 
                        ? `2px solid ${selectedType.color}` 
                        : '2px solid transparent',
                      ringColor: selectedType.color
                    }}
                  >
                    <div className="text-base md:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(size.size)}
                    </div>
                    <div className="text-sm mt-1" style={{ color: selectedType.color }}>
                      {formatCurrency(size.discountedPrice || size.price)}
                    </div>
                    {size.discountedPrice && (
                      <div className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(size.price)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Phase Information */}
            {selectedType.phases?.length > 0 && (
              <div 
                className="rounded-2xl p-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Evaluation Phases
                </h3>
                <div className="space-y-3">
                  {selectedType.phases.map((phase, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-4 p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ backgroundColor: selectedType.color, color: 'white' }}
                      >
                        {phase.phaseNumber}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {phase.name}
                        </div>
                        <div className="flex flex-wrap gap-2 md:gap-3 mt-1 text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span className="flex items-center gap-1">
                            <Target size={14} />
                            {phase.profitTarget}% Target
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {phase.minimumTradingDays} Min Days
                          </span>
                          {phase.maximumTradingDays > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {phase.maximumTradingDays} Days Limit
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ))}
                  
                  {/* Funded Stage */}
                  <div 
                    className="flex items-center gap-4 p-3 rounded-xl"
                    style={{ backgroundColor: '#22c55e20' }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#22c55e', color: 'white' }}
                    >
                      <Trophy size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: '#22c55e' }}>
                        Funded Account
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {selectedType.payoutConfig?.profitSplit}% Profit Split • Trade with real capital
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Rules */}
            <div 
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Trading Rules
              </h3>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <TrendingDown size={18} className="text-red-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs md:text-sm truncate" style={{ color: 'var(--text-muted)' }}>Daily DD</div>
                    <div className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
                      {selectedType.riskRules?.maxDailyDrawdown}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <TrendingDown size={18} className="text-orange-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs md:text-sm truncate" style={{ color: 'var(--text-muted)' }}>Max DD</div>
                    <div className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
                      {selectedType.riskRules?.maxTotalDrawdown}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <Clock size={18} className="text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs md:text-sm truncate" style={{ color: 'var(--text-muted)' }}>Inactive</div>
                    <div className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
                      {selectedType.riskRules?.maxInactiveDays}d
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <Percent size={18} className="text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs md:text-sm truncate" style={{ color: 'var(--text-muted)' }}>Profit Split</div>
                    <div className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
                      {selectedType.payoutConfig?.profitSplit}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Rules */}
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedType.riskRules?.weekendHoldingAllowed && (
                  <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-500">
                    ✓ Weekend Holding
                  </span>
                )}
                {selectedType.riskRules?.newsTrading && (
                  <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-500">
                    ✓ News Trading
                  </span>
                )}
                {selectedType.riskRules?.eaAllowed && (
                  <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-500">
                    ✓ EA Allowed
                  </span>
                )}
                {selectedType.riskRules?.mandatorySL && (
                  <span className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-500">
                    ⚠ Mandatory SL
                  </span>
                )}
                {selectedType.riskRules?.trailingDrawdown && (
                  <span className="px-3 py-1 rounded-full text-xs bg-orange-500/20 text-orange-500">
                    ⚠ Trailing Drawdown
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="w-full lg:w-[320px] xl:w-[380px] flex-shrink-0">
            <div 
              className="rounded-2xl p-4 lg:sticky lg:top-4"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Order Summary
              </h3>

              {selectedSize && (
                <>
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Challenge Type</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {selectedType.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Account Size</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(selectedSize.size)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Phases</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {selectedType.totalPhases || 'Instant'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Profit Split</span>
                      <span className="font-medium text-green-500">
                        {selectedType.payoutConfig?.profitSplit}%
                      </span>
                    </div>
                    {selectedSize.refundable && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>Fee Refund</span>
                        <span className="font-medium text-green-500">
                          ✓ On Pass
                        </span>
                      </div>
                    )}
                  </div>

                  <div 
                    className="h-px my-4"
                    style={{ backgroundColor: 'var(--border-color)' }}
                  />

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Total
                    </span>
                    <span className="text-2xl font-bold" style={{ color: selectedType.color }}>
                      {formatCurrency(selectedSize.discountedPrice || selectedSize.price)}
                    </span>
                  </div>

                  <div className="text-sm mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Wallet Balance</span>
                      <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(userBalance)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || userBalance < (selectedSize.discountedPrice || selectedSize.price)}
                    className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: selectedType.color }}
                  >
                    {purchasing ? (
                      'Processing...'
                    ) : userBalance < (selectedSize.discountedPrice || selectedSize.price) ? (
                      'Insufficient Balance'
                    ) : (
                      <>
                        Start Challenge <ArrowRight size={18} className="inline ml-2" />
                      </>
                    )}
                  </button>

                  {userBalance < (selectedSize.discountedPrice || selectedSize.price) && (
                    <button
                      onClick={() => navigate('/wallet')}
                      className="w-full py-3 mt-2 rounded-xl font-medium transition-all"
                      style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                    >
                      Deposit Funds
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}

export default ChallengeMarketplace
