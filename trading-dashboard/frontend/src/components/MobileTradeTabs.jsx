import React from 'react'
import { ArrowUpDown, LineChart, TrendingUp, Clock } from 'lucide-react'

const MobileTradeTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'markets', label: 'Markets', icon: ArrowUpDown },
    { id: 'charts', label: 'Charts', icon: LineChart },
    { id: 'trade', label: 'Trade', icon: TrendingUp },
    { id: 'history', label: 'History', icon: Clock },
  ]

  return (
    <div 
      className="flex items-center justify-around md:hidden"
      style={{ 
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)'
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="flex flex-col items-center gap-1 px-4 py-3 flex-1"
          style={{
            borderBottom: activeTab === tab.id ? '2px solid var(--accent-green)' : '2px solid transparent'
          }}
        >
          <tab.icon 
            size={20} 
            style={{ 
              color: activeTab === tab.id ? 'var(--accent-green)' : 'var(--text-muted)'
            }} 
          />
          <span 
            className="text-xs font-medium"
            style={{ 
              color: activeTab === tab.id ? 'var(--accent-green)' : 'var(--text-muted)'
            }}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  )
}

export default MobileTradeTabs
