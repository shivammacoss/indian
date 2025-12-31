const mongoose = require('mongoose');

const accountTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  minDeposit: {
    type: Number,
    required: true,
    default: 100
  },
  maxLeverage: {
    type: Number,
    required: true,
    default: 100
  },
  spreadMarkup: {
    type: Number,
    required: true,
    default: 1.5  // in pips
  },
  commission: {
    type: Number,
    default: 0  // per lot
  },
  swapFree: {
    type: Boolean,
    default: false
  },
  features: [{
    type: String
  }],
  tradingFee: {
    type: Number,
    default: 0  // percentage
  },
  withdrawalFee: {
    type: Number,
    default: 0  // fixed or percentage
  },
  minTradeSize: {
    type: Number,
    default: 0.01  // lots
  },
  maxTradeSize: {
    type: Number,
    default: 100  // lots
  },
  marginCallLevel: {
    type: Number,
    default: 100  // percentage
  },
  stopOutLevel: {
    type: Number,
    default: 50  // percentage
  },
  allowedInstruments: [{
    type: String  // 'forex', 'crypto', 'commodities', 'indices'
  }],
  color: {
    type: String,
    default: '#3b82f6'  // for UI display
  },
  icon: {
    type: String,
    default: 'star'
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
accountTypeSchema.index({ code: 1 });
accountTypeSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('AccountType', accountTypeSchema);
