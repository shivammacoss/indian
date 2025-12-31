const mongoose = require('mongoose');

/**
 * Challenge Type Model
 * Defines different challenge types: Two Step, One Step, Instant Funding
 */
const challengeTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['two_step', 'one_step', 'instant_funding'],
    required: true
  },
  // Number of phases before funding (2 for two_step, 1 for one_step, 0 for instant)
  totalPhases: {
    type: Number,
    required: true,
    default: 2
  },
  // Phase configurations
  phases: [{
    phaseNumber: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    profitTarget: {
      type: Number, // Percentage (e.g., 10 for 10%)
      required: true
    },
    minimumTradingDays: {
      type: Number,
      default: 0
    },
    maximumTradingDays: {
      type: Number,
      default: 0 // 0 = unlimited
    },
    minimumTrades: {
      type: Number,
      default: 0
    }
  }],
  // Account sizes available for this challenge type
  accountSizes: [{
    size: {
      type: Number, // e.g., 10000, 25000, 50000, 100000, 200000
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    // Discounted price (optional)
    discountedPrice: {
      type: Number
    },
    // Refundable fee on passing
    refundable: {
      type: Boolean,
      default: true
    }
  }],
  // Global risk rules for this challenge type
  riskRules: {
    maxDailyDrawdown: {
      type: Number, // Percentage
      default: 5
    },
    maxTotalDrawdown: {
      type: Number, // Percentage
      default: 10
    },
    // Drawdown calculation method
    drawdownCalculation: {
      type: String,
      enum: ['balance', 'equity', 'higher_of_both'],
      default: 'higher_of_both'
    },
    // Trailing drawdown (for instant funding)
    trailingDrawdown: {
      type: Boolean,
      default: false
    },
    trailingDrawdownLockProfit: {
      type: Number, // Lock trailing at this profit %
      default: 0
    },
    // Time limits
    maxInactiveDays: {
      type: Number,
      default: 30 // Days without trading
    },
    // Trading restrictions
    weekendHoldingAllowed: {
      type: Boolean,
      default: true
    },
    newsTrading: {
      type: Boolean,
      default: true
    },
    // Auto SL/TP
    mandatorySL: {
      type: Boolean,
      default: false
    },
    maxSlPips: {
      type: Number,
      default: 0 // 0 = no limit
    },
    // Lot size restrictions
    maxLotSize: {
      type: Number,
      default: 0 // 0 = no limit
    },
    maxPositions: {
      type: Number,
      default: 0 // 0 = no limit
    },
    // Minimum time between trades in seconds (default 0 = no limit)
    minTimeBetweenTrades: {
      type: Number,
      default: 0 // 0 = no limit
    },
    // Maximum holding time per trade in seconds (e.g., 300 = 5 minutes, trade auto-closes after this)
    maxHoldingTime: {
      type: Number,
      default: 0 // 0 = unlimited
    },
    // Allowed instruments
    allowedInstruments: {
      type: [String],
      default: [] // Empty = all allowed
    },
    // Expert Advisors / Bots
    eaAllowed: {
      type: Boolean,
      default: true
    },
    // Copy trading
    copyTradingAllowed: {
      type: Boolean,
      default: false
    },
    // Martingale / Grid
    martingaleAllowed: {
      type: Boolean,
      default: false
    },
    // Trade count limits
    maxTradesPerDay: {
      type: Number,
      default: 0 // 0 = unlimited
    },
    maxTradesPerPhase: {
      type: Number,
      default: 0 // 0 = unlimited
    },
    maxTotalTrades: {
      type: Number,
      default: 0 // 0 = unlimited, total trades allowed in entire challenge
    },
    // Rule violation behavior
    warnBeforeBlow: {
      type: Boolean,
      default: true // Warn user first before blowing account on repeated violation
    },
    // Position limits - no multiple positions
    allowMultiplePositions: {
      type: Boolean,
      default: true
    },
    // Auto SL/TP enforcement
    autoSlEnabled: {
      type: Boolean,
      default: false
    },
    autoSlPercent: {
      type: Number, // % of account balance
      default: 2
    },
    autoTpEnabled: {
      type: Boolean,
      default: false
    },
    autoTpPercent: {
      type: Number, // % of account balance
      default: 4
    },
    // Challenge duration
    challengeDurationDays: {
      type: Number,
      default: 30 // Total days challenge is active
    },
    challengeDurationType: {
      type: String,
      enum: ['days', 'weeks', 'months', 'unlimited'],
      default: 'days'
    }
  },
  // Payout configuration
  payoutConfig: {
    profitSplit: {
      type: Number, // Percentage to trader (e.g., 80)
      default: 80
    },
    firstPayoutAfterDays: {
      type: Number,
      default: 14
    },
    payoutFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'on_demand'],
      default: 'biweekly'
    },
    minimumPayout: {
      type: Number,
      default: 100
    }
  },
  // Scaling plan
  scalingPlan: {
    enabled: {
      type: Boolean,
      default: true
    },
    requirements: {
      consistentMonths: {
        type: Number,
        default: 3
      },
      minimumProfit: {
        type: Number, // Percentage
        default: 10
      },
      noRuleViolations: {
        type: Boolean,
        default: true
      }
    },
    increments: [{
      level: Number,
      accountMultiplier: Number, // e.g., 1.25 for 25% increase
      profitSplitIncrease: Number // Additional profit split %
    }]
  },
  // Display settings
  displayOrder: {
    type: Number,
    default: 0
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  badge: {
    type: String,
    default: '' // e.g., "Best Value", "Most Popular"
  },
  color: {
    type: String,
    default: '#3b82f6' // Theme color for UI
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
challengeTypeSchema.index({ slug: 1 });
challengeTypeSchema.index({ type: 1, isActive: 1 });
challengeTypeSchema.index({ displayOrder: 1 });

module.exports = mongoose.model('ChallengeType', challengeTypeSchema);
