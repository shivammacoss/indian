import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Wallet,
  Users2,
  Receipt,
  Copy,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  LogOut,
  Settings,
  Moon,
  Sun,
  Building2,
  Headphones,
  Layers,
  Shield,
  Trophy
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const AdminLayout = ({ children, activeSection, setActiveSection }) => {
  const { isDark, toggleTheme } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('admin')
    navigate('/admin/login')
  }

  const menuItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard, path: '/admin/overview' },
    { id: 'users', label: 'User Management', icon: Users, path: '/admin/users' },
    { id: 'trades', label: 'Trade Management', icon: TrendingUp, path: '/admin/trades' },
    { id: 'funds', label: 'Fund Management', icon: Wallet, path: '/admin/funds' },
    { id: 'bank', label: 'Bank Settings', icon: Building2, path: '/admin/bank' },
    { id: 'ib', label: 'IB Management', icon: Users2, path: '/admin/ib' },
    { id: 'charges', label: 'Forex Charges', icon: Receipt, path: '/admin/charges' },
    { id: 'indiancharges', label: 'Indian Charges', icon: Receipt, path: '/admin/indiancharges' },
    { id: 'copytrade', label: 'Copy Trade Management', icon: Copy, path: '/admin/copytrade' },
    { id: 'propfirm', label: 'Prop Firm Challenges', icon: Trophy, path: '/admin/propfirm' },
    { id: 'accounttypes', label: 'Account Types', icon: Layers, path: '/admin/accounttypes' },
    { id: 'kyc', label: 'KYC Verification', icon: Shield, path: '/admin/kyc' },
    { id: 'support', label: 'Support Tickets', icon: Headphones, path: '/admin/support' },
  ]

  const handleNavigation = (item) => {
    setActiveSection(item.id)
    navigate(item.path)
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div 
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex flex-col transition-all duration-300`}
        style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                B4X
              </div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Admin Panel</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg transition-colors hover:bg-opacity-80"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              style={{
                backgroundColor: activeSection === item.id ? 'var(--accent-blue)' : 'transparent',
                color: activeSection === item.id ? '#ffffff' : 'var(--text-secondary)'
              }}
              title={sidebarCollapsed ? item.label : ''}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            style={{ color: 'var(--text-secondary)' }}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            {!sidebarCollapsed && <span className="text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <Settings size={20} />
            {!sidebarCollapsed && <span className="text-sm">Settings</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:text-red-500 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header 
          className="h-16 flex items-center justify-between px-6"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Notifications */}
            <button 
              className="relative p-2 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Admin Profile */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                A
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Admin</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
