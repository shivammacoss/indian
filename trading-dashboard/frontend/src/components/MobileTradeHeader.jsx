import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Wallet } from 'lucide-react'

const MobileTradeHeader = ({ equity = 0 }) => {
  const navigate = useNavigate()

  return (
    <div 
      className="flex items-center justify-between px-4 py-3 md:hidden"
      style={{ 
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)'
      }}
    >
      <button 
        onClick={() => navigate('/home')}
        className="p-2 rounded-xl"
        style={{ backgroundColor: 'var(--bg-hover)' }}
      >
        <Home size={20} style={{ color: 'var(--text-secondary)' }} />
      </button>
      
      <div className="text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Equity</p>
        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          ${equity.toFixed(2)}
        </p>
      </div>
      
      <button 
        onClick={() => navigate('/wallet')}
        className="p-2 rounded-xl"
        style={{ backgroundColor: 'var(--bg-hover)' }}
      >
        <Wallet size={20} style={{ color: 'var(--accent-green)' }} />
      </button>
    </div>
  )
}

export default MobileTradeHeader
