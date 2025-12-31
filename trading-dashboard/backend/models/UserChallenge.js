const mongoose = require('mongoose');

/**
 * User Challenge Model
 * Tracks user's purchased challenges and their progress
 */
const userChallengeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challengeType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChallengeType',
    required: true
  },
  // Challenge account number (separate from regular trading accounts)
  accountNumber: {
    type: String,
    unique: true
  },
  // Account size purchased
  accountSize: {
    type: Number,
    required: true
  },
  // Initial balance (same as account size)
  initialBalance: {
    type: Number,
    required: true
  },
  // Current balance
  balance: {
    type: Number,
    required: true
  },
  // Current equity (balance + floating P/L)
  equity: {
    type: Number,
    required: true
  },
  // Highest balance achieved (for drawdown calculation)
  highestBalance: {
    type: Number,
    required: true
  },
  // Highest equity achieved (for drawdown calculation)
  highestEquity: {
    type: Number,
    required: true
  },
  // Daily starting balance (reset at server day start)
  dailyStartBalance: {
    type: Number,
    required: true
  },
  // Daily starting equity
  dailyStartEquity: {
    type: Number,
    required: true
  },
  // Trailing drawdown floor (for instant funding)
  trailingDrawdownFloor: {
    type: Number,
    default: 0
  },
  // Current phase
  currentPhase: {
    type: Number,
    default: 1
  },
  // Phase status
  phaseStatus: {
    type: String,
    enum: ['active', 'passed', 'failed'],
    default: 'active'
  },
  // Overall status
  status: {
    type: String,
    enum: ['active', 'phase_passed', 'funded', 'failed', 'cancelled', 'expired'],
    default: 'active'
  },
  // Failure reason (if failed)
  failureReason: {
    type: String,
    enum: [
      'max_daily_drawdown',
      'max_total_drawdown',
      'max_total_trades',
      'max_trades_per_day',
      'time_limit_exceeded',
      'inactivity',
      'rule_violation',
      'manual_termination',
      'cancelled_by_user',
      'payment_failed'
    ]
  },
  failureDetails: {
    type: String
  },
  failedAt: {
    type: Date
  },
  // Rule violation tracking (for warn before blow feature)
  ruleViolationWarned: {
    type: Boolean,
    default: false
  },
  lastViolationType: {
    type: String
  },
  violationCount: {
    type: Number,
    default: 0
  },
  // Trading statistics
  stats: {
    totalTrades: {
      type: Number,
      default: 0
    },
    winningTrades: {
      type: Number,
      default: 0
    },
    losingTrades: {
      type: Number,
      default: 0
    },
    totalProfit: {
      type: Number,
      default: 0
    },
    totalLoss: {
      type: Number,
      default: 0
    },
    totalVolume: {
      type: Number, // In lots
      default: 0
    },
    averageWin: {
      type: Number,
      default: 0
    },
    averageLoss: {
      type: Number,
      default: 0
    },
    largestWin: {
      type: Number,
      default: 0
    },
    largestLoss: {
      type: Number,
      default: 0
    },
    profitFactor: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    tradingDays: {
      type: Number,
      default: 0
    },
    tradingDaysList: [{
      type: Date
    }],
    // Drawdown tracking
    currentDailyDrawdown: {
      type: Number,
      default: 0
    },
    maxDailyDrawdownReached: {
      type: Number,
      default: 0
    },
    currentTotalDrawdown: {
      type: Number,
      default: 0
    },
    maxTotalDrawdownReached: {
      type: Number,
      default: 0
    }
  },
  // Phase progress
  phases: [{
    phaseNumber: Number,
    startDate: Date,
    endDate: Date,
    startBalance: Number,
    endBalance: Number,
    profitTarget: Number,
    profitAchieved: Number,
    tradingDays: Number,
    minimumTradingDays: Number,
    status: {
      type: String,
      enum: ['active', 'passed', 'failed'],
      default: 'active'
    },
    passedAt: Date,
    failedAt: Date,
    failureReason: String
  }],
  // Payment info
  payment: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    method: {
      type: String,
      enum: ['wallet', 'crypto', 'card', 'bank'],
      default: 'wallet'
    },
    transactionId: String,
    paidAt: Date,
    refunded: {
      type: Boolean,
      default: false
    },
    refundedAt: Date,
    refundAmount: Number
  },
  // Funded account info (when challenge is passed)
  fundedAccount: {
    isActive: {
      type: Boolean,
      default: false
    },
    fundedAt: Date,
    profitSplit: {
      type: Number,
      default: 80
    },
    totalPayouts: {
      type: Number,
      default: 0
    },
    lastPayoutAt: Date,
    // Scaling
    scalingLevel: {
      type: Number,
      default: 0
    },
    scaledAccountSize: Number,
    scaledAt: Date
  },
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastTradeAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  // Linked trading account (for actual trading)
  tradingAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount'
  },
  // Payout option selected by user
  payoutOption: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly'],
    default: 'biweekly'
  },
  // Trading limits (copied from challenge type at purchase)
  tradingLimits: {
    maxTradesPerDay: {
      type: Number,
      default: 0
    },
    maxTradesPerPhase: {
      type: Number,
      default: 0
    },
    allowMultiplePositions: {
      type: Boolean,
      default: true
    },
    autoSlEnabled: {
      type: Boolean,
      default: false
    },
    autoSlPercent: {
      type: Number,
      default: 2
    },
    autoTpEnabled: {
      type: Boolean,
      default: false
    },
    autoTpPercent: {
      type: Number,
      default: 4
    }
  },
  // Daily trade tracking
  dailyTradeCount: {
    type: Number,
    default: 0
  },
  dailyTradeDate: {
    type: String // Date string for comparison
  },
  // Phase trade tracking
  phaseTradeCount: {
    type: Number,
    default: 0
  },
  // Open positions count
  openPositionsCount: {
    type: Number,
    default: 0
  },
  // Notes (admin)
  adminNotes: {
    type: String
  }
}, {
  timestamps: true
});

// Generate unique challenge account number
userChallengeSchema.pre('save', async function(next) {
  if (!this.accountNumber) {
    const prefix = 'PROP';
    const count = await this.constructor.countDocuments();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.accountNumber = `${prefix}-${randomNum + count}`;
  }
  next();
});

// Calculate current profit percentage
userChallengeSchema.methods.getCurrentProfitPercent = function() {
  return ((this.balance - this.initialBalance) / this.initialBalance) * 100;
};

// Calculate daily drawdown percentage
userChallengeSchema.methods.getDailyDrawdownPercent = function() {
  const startValue = Math.max(this.dailyStartBalance, this.dailyStartEquity);
  const currentValue = Math.min(this.balance, this.equity);
  if (startValue <= 0) return 0;
  return ((startValue - currentValue) / startValue) * 100;
};

// Calculate total drawdown percentage
userChallengeSchema.methods.getTotalDrawdownPercent = function() {
  const highValue = Math.max(this.highestBalance, this.highestEquity);
  const currentValue = Math.min(this.balance, this.equity);
  if (highValue <= 0) return 0;
  return ((highValue - currentValue) / this.initialBalance) * 100;
};

// Check if profit target is met
userChallengeSchema.methods.isProfitTargetMet = function(targetPercent) {
  return this.getCurrentProfitPercent() >= targetPercent;
};

// Indexes
userChallengeSchema.index({ user: 1, status: 1 });
userChallengeSchema.index({ accountNumber: 1 });
userChallengeSchema.index({ challengeType: 1, status: 1 });
userChallengeSchema.index({ status: 1, createdAt: -1 });
userChallengeSchema.index({ 'fundedAccount.isActive': 1 });

module.exports = mongoose.model('UserChallenge', userChallengeSchema);
