import React from 'react'
import { X, Users2, Copy, Headphones, User, LogOut, Moon, Sun, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'

const MobileMore = ({ onClose, onNavigate }) => {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  const menuItems = [
    { id: 'ib', label: 'IB Program', icon: Users2, desc: 'Refer & earn' },
    { id: 'copy', label: 'Copy Trade', icon: Copy, desc: 'Follow traders' },
    { id: 'support', label: 'Support', icon: Headphones, desc: 'Get help' },
    { id: 'profile', label: 'Profile', icon: User, desc: 'Settings' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      
      {/* Menu Panel - iOS style */}
      <div 
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl px-4 pt-3 pb-6 ios-sheet"
        style={{ 
          backgroundColor: isDark ? '#1c1c1e' : '#fff',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))'
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: isDark ? '#3a3a3c' : '#e5e5ea' }}></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold" style={{ color: isDark ? '#fff' : '#000' }}>More</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full"
            style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }}
          >
            <X size={16} color={isDark ? '#8e8e93' : '#6b6b6b'} />
          </button>
        </div>

        {/* Menu Items - Compact */}
        <div className="space-y-1.5 mb-3">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl active:opacity-70"
              style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: isDark ? '#3a3a3c' : '#e5e5ea' }}
                >
                  <item.icon size={16} color="#3b82f6" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: isDark ? '#fff' : '#000' }}>{item.label}</p>
                  <p className="text-[10px]" style={{ color: isDark ? '#8e8e93' : '#6b6b6b' }}>{item.desc}</p>
                </div>
              </div>
              <ChevronRight size={16} color={isDark ? '#8e8e93' : '#6b6b6b'} />
            </button>
          ))}
        </div>

        {/* Actions - Compact */}
        <div className="flex gap-2">
          <button 
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-70"
            style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }}
          >
            {isDark ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="#6b6b6b" />}
            <span className="text-xs font-medium" style={{ color: isDark ? '#fff' : '#000' }}>
              {isDark ? 'Light' : 'Dark'}
            </span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-70"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <LogOut size={14} color="#ef4444" />
            <span className="text-xs font-medium" style={{ color: '#ef4444' }}>Logout</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes ios-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .ios-sheet {
          animation: ios-sheet-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  )
}

export default MobileMore
