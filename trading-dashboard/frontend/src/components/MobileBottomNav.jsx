import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Home, 
  TrendingUp, 
  Wallet, 
  MoreHorizontal,
  Users2,
  Copy,
  Headphones,
  User,
  X,
  ChevronRight
} from 'lucide-react'

const MobileBottomNav = ({ activeView, setActiveView, onTradeClick }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const mainNavItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/home' },
    { id: 'chart', label: 'Trade', icon: TrendingUp, path: '/trade' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, path: '/wallet' },
    { id: 'more', label: 'More', icon: MoreHorizontal, path: null },
  ]

  const moreMenuItems = [
    { id: 'ib', label: 'IB Program', icon: Users2, path: '/ib' },
    { id: 'copy', label: 'Copy Trade', icon: Copy, path: '/copytrade' },
    { id: 'support', label: 'Support', icon: Headphones, path: '/support' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ]

  const handleNavClick = (item) => {
    if (item.id === 'more') {
      setShowMoreMenu(true)
    } else {
      setActiveView(item.id)
      if (item.path) navigate(item.path)
      if (item.id === 'chart' && onTradeClick) onTradeClick()
    }
  }

  const handleMoreItemClick = (item) => {
    setActiveView(item.id)
    if (item.path) navigate(item.path)
    setShowMoreMenu(false)
  }

  const isActive = (id) => {
    if (id === 'chart') return activeView === 'chart' || location.pathname === '/trade'
    if (id === 'home') return activeView === 'home' || location.pathname === '/home'
    if (id === 'wallet') return activeView === 'wallet' || location.pathname === '/wallet'
    return activeView === id
  }

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowMoreMenu(false)}
          />
          
          {/* Menu Panel */}
          <div 
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 pb-8 animate-slide-up"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>More</h3>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-2 rounded-full"
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                <X size={20} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            
            <div className="space-y-2">
              {moreMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMoreItemClick(item)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl transition-colors"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                    >
                      <item.icon size={20} style={{ color: 'var(--accent-green)' }} />
                    </div>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                  </div>
                  <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Fixed for all phone sizes */}
      <nav 
        className="mobile-bottom-nav flex items-center justify-around"
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          borderTop: '1px solid var(--border-color)',
          paddingTop: '10px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 8px))',
          minHeight: '65px'
        }}
      >
        {mainNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
            style={{ minHeight: '50px' }}
          >
            <item.icon 
              size={20} 
              style={{ 
                color: isActive(item.id) ? 'var(--accent-green)' : 'var(--text-muted)'
              }} 
            />
            <span 
              className="text-[10px] font-medium"
              style={{ 
                color: isActive(item.id) ? 'var(--accent-green)' : 'var(--text-muted)'
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Add CSS for animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .pb-safe {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </>
  )
}

export default MobileBottomNav
