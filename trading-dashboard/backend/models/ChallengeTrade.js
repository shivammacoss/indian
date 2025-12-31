const mongoose = require('mongoose');

/**
 * Challenge Trade Model
 * Tracks all trades made within challenge accounts
 * Separate from regular trades for better rule enforcement
 */
const challengeTradeSchema = new mongoose.Schema({
  userChallenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserChallenge',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Trade details
  symbol: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  volume: {
    type: Number, // Lots
    required: true
  },
  openPrice: {
    type: Number,
    required: true
  },
  closePrice: {
    type: Number
  },
  stopLoss: {
    type: Number
  },
  takeProfit: {
    type: Number
  },
  // Status
  status: {
    type: String,
    enum: ['open', 'closed', 'cancelled'],
    default: 'open'
  },
  // P/L
  profit: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  swap: {
    type: Number,
    default: 0
  },
  netProfit: {
    type: Number,
    default: 0
  },
  // Balance/Equity at trade time
  balanceAtOpen: {
    type: Number,
    required: true
  },
  equityAtOpen: {
    type: Number,
    required: true
  },
  balanceAtClose: {
    type: Number
  },
  equityAtClose: {
    type: Number
  },
  // Drawdown at trade time
  dailyDrawdownAtOpen: {
    type: Number,
    default: 0
  },
  totalDrawdownAtOpen: {
    type: Number,
    default: 0
  },
  // Timestamps
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date
  },
  // Close reason
  closeReason: {
    type: String,
    enum: ['manual', 'stop_loss', 'take_profit', 'margin_call', 'rule_violation', 'challenge_failed', 'admin'],
    default: 'manual'
  },
  // Phase when trade was made
  phase: {
    type: Number,
    required: true
  },
  // Trade duration
  durationSeconds: {
    type: Number
  },
  // Pips gained/lost
  pips: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate pips based on symbol
challengeTradeSchema.methods.calculatePips = function() {
  if (!this.closePrice || !this.openPrice) return 0;
  
  const priceDiff = this.type === 'buy' 
    ? this.closePrice - this.openPrice 
    : this.openPrice - this.closePrice;
  
  // Determine pip value based on symbol
  let pipMultiplier = 10000; // Default for most pairs
  if (this.symbol.includes('JPY')) {
    pipMultiplier = 100;
  } else if (this.symbol.includes('XAU')) {
    pipMultiplier = 10;
  } else if (this.symbol.includes('BTC') || this.symbol.includes('ETH')) {
    pipMultiplier = 1;
  }
  
  return priceDiff * pipMultiplier;
};

// Indexes
challengeTradeSchema.index({ userChallenge: 1, status: 1 });
challengeTradeSchema.index({ user: 1, openedAt: -1 });
challengeTradeSchema.index({ userChallenge: 1, openedAt: -1 });
challengeTradeSchema.index({ status: 1, closedAt: -1 });

module.exports = mongoose.model('ChallengeTrade', challengeTradeSchema);
