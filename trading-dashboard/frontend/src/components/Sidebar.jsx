import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Home, 
  Users, 
  ClipboardList, 
  Headphones,
  Wallet,
  Sun,
  Moon,
  UserPlus,
  UserCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const Sidebar = ({ activeView, setActiveView }) => {
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isChallengeMode, setIsChallengeMode] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [challengeRules, setChallengeRules] = useState(null)

  // Check if trading with challenge account
  useEffect(() => {
    const checkChallengeMode = () => {
      const activeChallengeId = localStorage.getItem('activeChallengeId')
      const activeAccount = localStorage.getItem('activeTradingAccount')
      if (activeChallengeId && activeAccount) {
        try {
          const account = JSON.parse(activeAccount)
          if (account.isChallenge) {
            setIsChallengeMode(true)
            setChallengeRules(account.challengeRules)
            return
          }
        } catch (e) {}
      }
      setIsChallengeMode(false)
      setChallengeRules(null)
    }
    checkChallengeMode()
    window.addEventListener('storage', checkChallengeMode)
    return () => window.removeEventListener('storage', checkChallengeMode)
  }, [location.pathname])

  const handleNavigation = (view, path) => {
    setActiveView(view)
    navigate(path)
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', id: 'home', path: '/home', onClick: () => handleNavigation('home', '/home') },
    { icon: Layers, label: 'Accounts', id: 'accounts', path: '/accounts', onClick: () => handleNavigation('accounts', '/accounts') },
    { icon: ClipboardList, label: 'Orders', id: 'orders', path: '/orders', onClick: () => handleNavigation('orders', '/orders') },
    { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet', onClick: () => handleNavigation('wallet', '/wallet') },
    { icon: Users, label: 'Copy Trading', id: 'copy', path: '/copytrade', onClick: () => handleNavigation('copy', '/copytrade') },
    { icon: UserPlus, label: 'IB Dashboard', id: 'ib', path: '/ib', onClick: () => handleNavigation('ib', '/ib') },
    { icon: UserCircle, label: 'Profile', id: 'profile', path: '/profile', onClick: () => handleNavigation('profile', '/profile') },
    { icon: Headphones, label: 'Support', id: 'support', path: '/support', onClick: () => handleNavigation('support', '/support') },
  ]

  const isActive = (item) => {
    if (item.path && location.pathname === item.path) return true
    if (item.id === 'home') return activeView === 'home' || location.pathname === '/home'
    if (item.id === 'accounts') return activeView === 'accounts' || location.pathname === '/accounts' || location.pathname === '/trade' || location.pathname === '/indian-trade'
    if (item.id === 'wallet') return activeView === 'wallet' || location.pathname === '/wallet'
    if (item.id === 'copy') return activeView === 'copy' || location.pathname === '/copytrade'
    if (item.id === 'ib') return activeView === 'ib' || location.pathname === '/ib'
    if (item.id === 'orders') return activeView === 'orders' || location.pathname === '/orders'
    if (item.id === 'profile') return activeView === 'profile' || location.pathname === '/profile'
    if (item.id === 'support') return activeView === 'support' || location.pathname === '/support'
    return false
  }

  return (
    <div 
      className={`${isCollapsed ? 'w-16' : 'w-56'} flex flex-col py-4 transition-all duration-300`}
      style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderRight: '1px solid var(--border-color)' 
      }}
    >
      {/* Logo - Toggle Button */}
      <div className={`mb-6 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`${isCollapsed ? 'w-10 h-10' : 'w-full h-10'} rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center gap-2 font-bold text-white text-sm transition-all hover:opacity-90`}
        >
          <span>B4X</span>
          {!isCollapsed && (
            <ChevronLeft size={16} className="ml-auto" />
          )}
        </button>
      </div>
      
      {/* Menu Items */}
      <div className={`flex-1 flex flex-col gap-1 ${isCollapsed ? 'px-3' : 'px-3'}`}>
        {menuItems.map((item, index) => {
          const active = isActive(item)
          return (
            <button
              key={index}
              onClick={item.onClick}
              className={`${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-10 px-3 justify-start'} rounded-lg flex items-center gap-3 transition-all`}
              style={{
                backgroundColor: active ? 'var(--bg-hover)' : 'transparent',
                color: active ? 'var(--accent-green)' : 'var(--text-secondary)'
              }}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Bottom Items */}
      <div className={`flex flex-col gap-2 ${isCollapsed ? 'px-3' : 'px-3'}`}>
        {/* Challenge Rules Button - Only shows during challenge trading */}
        {isChallengeMode && location.pathname === '/trade' && (
          <button 
            onClick={() => setShowRulesModal(true)}
            className={`${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-10 px-3 justify-start'} rounded-lg flex items-center gap-3 transition-all hover:opacity-80 mb-2`}
            style={{
              backgroundColor: '#f59e0b20',
              color: '#f59e0b'
            }}
            title={isCollapsed ? 'Challenge Rules' : ''}
          >
            <Shield size={20} className="flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">Challenge Rules</span>
            )}
          </button>
        )}

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className={`${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-10 px-3 justify-start'} rounded-lg flex items-center gap-3 transition-all hover:opacity-80`}
          style={{
            backgroundColor: 'var(--bg-hover)',
            color: isDark ? '#fbbf24' : '#3b82f6'
          }}
          title={isCollapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : ''}
        >
          {isDark ? <Sun size={20} className="flex-shrink-0" /> : <Moon size={20} className="flex-shrink-0" />}
          {!isCollapsed && (
            <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>
      </div>

      {/* Challenge Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-md p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Shield size={24} className="text-orange-500" />
                Challenge Rules
              </h2>
              <button onClick={() => setShowRulesModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Max Daily Drawdown</div>
                <div className="text-lg font-bold text-red-500">{challengeRules?.maxDailyDrawdown || 5}%</div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Max Total Drawdown</div>
                <div className="text-lg font-bold text-red-500">{challengeRules?.maxTotalDrawdown || 10}%</div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Weekend Holding</div>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {challengeRules?.weekendHoldingAllowed ? '✓ Allowed' : '✕ Not Allowed'}
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>News Trading</div>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {challengeRules?.newsTrading ? '✓ Allowed' : '✕ Not Allowed'}
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>EA/Bots</div>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {challengeRules?.eaAllowed ? '✓ Allowed' : '✕ Not Allowed'}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-orange-500/20 text-orange-500 text-sm">
              ⚠️ Violating any rule will result in immediate challenge failure and all trades will be closed.
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full mt-4 py-3 rounded-xl bg-blue-600 text-white font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
