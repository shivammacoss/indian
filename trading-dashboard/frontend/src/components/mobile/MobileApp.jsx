import React, { useState } from 'react'
import { Home, TrendingUp, Wallet, Menu, X, ArrowLeft, Users } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import MobileHome from './MobileHome'
import MobileTrade from './MobileTrade'
import MobileWallet from './MobileWallet'
import MobileMore from './MobileMore'
import MobileIB from './MobileIB'
import MobileCopyTrade from './MobileCopyTrade'
import MobileSupport from './MobileSupport'
import MobileProfile from './MobileProfile'
import MobileAccounts from './MobileAccounts'

const MobileApp = () => {
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('home')
  const [showMore, setShowMore] = useState(false)

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'accounts', label: 'Account', icon: Users },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'more', label: 'More', icon: Menu },
  ]

  const morePages = ['ib', 'copy', 'support', 'profile']

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <MobileHome />
      case 'accounts':
        return <MobileAccounts onOpenTrading={(account) => {
          localStorage.setItem('activeTradingAccount', JSON.stringify(account))
          setActiveTab('trade')
        }} />
      case 'trade':
        return <MobileTrade onBack={() => setActiveTab('accounts')} />
      case 'wallet':
        return <MobileWallet />
      case 'ib':
        return <MobileIB onBack={() => setActiveTab('home')} />
      case 'copy':
        return <MobileCopyTrade onBack={() => setActiveTab('home')} />
      case 'support':
        return <MobileSupport onBack={() => setActiveTab('home')} />
      case 'profile':
        return <MobileProfile onBack={() => setActiveTab('home')} />
      default:
        return <MobileHome />
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col" style={{ backgroundColor: isDark ? '#000000' : '#f5f5f7' }}>
      {/* Main Content - with padding for bottom nav */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ 
          paddingBottom: !['trade', 'ib', 'copy', 'support', 'profile'].includes(activeTab) ? '70px' : '0'
        }}
      >
        {renderContent()}
      </div>

      {/* Bottom Navigation - Fixed at bottom, visible on all phones */}
      {!['trade', 'ib', 'copy', 'support', 'profile'].includes(activeTab) && (
        <nav 
          className="mobile-bottom-nav flex items-center justify-around"
          style={{ 
            backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
            borderTop: `1px solid ${isDark ? '#2c2c2e' : '#e5e5ea'}`,
            paddingTop: '10px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 8px))',
            minHeight: '65px'
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'more') {
                  setShowMore(true)
                } else {
                  setActiveTab(tab.id)
                }
              }}
              className="flex flex-col items-center justify-center flex-1"
              style={{ minHeight: '50px' }}
            >
              <tab.icon 
                size={20} 
                color={activeTab === tab.id ? '#3b82f6' : (isDark ? '#8e8e93' : '#6b6b6b')}
              />
              <span 
                className="text-[10px] mt-0.5"
                style={{ color: activeTab === tab.id ? '#3b82f6' : (isDark ? '#8e8e93' : '#6b6b6b') }}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      )}

      {/* More Menu Overlay */}
      {showMore && (
        <MobileMore onClose={() => setShowMore(false)} onNavigate={(view) => {
          setShowMore(false)
          setActiveTab(view)
        }} />
      )}
    </div>
  )
}

export default MobileApp
