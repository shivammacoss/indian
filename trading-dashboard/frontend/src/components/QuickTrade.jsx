import React from 'react'

const QuickTrade = ({ symbol, onOpenOrder, showOrderPanel }) => {
  return (
    <div className="absolute top-4 right-4 z-20">
      <button 
        onClick={onOpenOrder}
        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
          showOrderPanel 
            ? 'bg-dark-600 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        Trade
      </button>
    </div>
  )
}

export default QuickTrade
