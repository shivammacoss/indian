const mongoose = require('mongoose');

const tradingAccountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountType',
    required: true
  },
  nickname: {
    type: String,
    default: ''
  },
  balance: {
    type: Number,
    default: 0
  },
  equity: {
    type: Number,
    default: 0
  },
  margin: {
    type: Number,
    default: 0
  },
  freeMargin: {
    type: Number,
    default: 0
  },
  marginLevel: {
    type: Number,
    default: 0
  },
  leverage: {
    type: Number,
    default: 100
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR']
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'closed'],
    default: 'active'
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  // Trading statistics
  totalDeposits: {
    type: Number,
    default: 0
  },
  totalWithdrawals: {
    type: Number,
    default: 0
  },
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
  // Server/Platform info (for future MT4/MT5 integration)
  server: {
    type: String,
    default: 'HCF-Live'
  },
  platform: {
    type: String,
    enum: ['WebTrader', 'MT4', 'MT5'],
    default: 'WebTrader'
  },
  // Challenge account flag
  isChallenge: {
    type: Boolean,
    default: false
  },
  // Link to UserChallenge if this is a challenge account
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserChallenge'
  },
  // Indian market account flag
  isIndian: {
    type: Boolean,
    default: false
  },
  // Indian market specific settings
  indianMarket: {
    segments: [{
      type: String,
      enum: ['EQUITY', 'FNO', 'CURRENCY', 'COMMODITY']
    }],
    defaultSegment: {
      type: String,
      enum: ['EQUITY', 'FNO', 'CURRENCY', 'COMMODITY'],
      default: 'EQUITY'
    },
    brokerCode: String,
    dpId: String,
    clientId: String
  },
  // Timestamps
  lastTradeAt: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate unique account number before saving
tradingAccountSchema.pre('save', async function(next) {
  if (!this.accountNumber) {
    let prefix = 'HCF';
    if (this.isDemo) prefix = 'DEMO';
    else if (this.isIndian) prefix = 'IND';
    else if (this.isChallenge) prefix = 'CHG';
    
    const count = await this.constructor.countDocuments();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.accountNumber = `${prefix}-${randomNum + count}`;
  }
  next();
});

// Calculate equity (balance + floating P/L)
tradingAccountSchema.methods.calculateEquity = function(floatingPnL = 0) {
  this.equity = this.balance + floatingPnL;
  return this.equity;
};

// Calculate margin level
tradingAccountSchema.methods.calculateMarginLevel = function() {
  if (this.margin > 0) {
    this.marginLevel = (this.equity / this.margin) * 100;
  } else {
    this.marginLevel = 0;
  }
  return this.marginLevel;
};

// Indexes
tradingAccountSchema.index({ user: 1, status: 1 });
tradingAccountSchema.index({ accountNumber: 1 });
tradingAccountSchema.index({ accountType: 1 });

module.exports = mongoose.model('TradingAccount', tradingAccountSchema);
