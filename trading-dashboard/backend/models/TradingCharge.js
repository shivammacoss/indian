const mongoose = require('mongoose');

const tradingChargeSchema = new mongoose.Schema({
  // Scope type: 'global', 'accountType', 'segment', 'symbol', 'user'
  scopeType: {
    type: String,
    enum: ['global', 'accountType', 'segment', 'symbol', 'user'],
    required: true
  },
  
  // For accountType scope: specific account type
  accountTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountType',
    default: null
  },
  
  // For segment scope: 'forex', 'crypto', 'metals', 'indices'
  segment: {
    type: String,
    enum: ['forex', 'crypto', 'metals', 'indices', null],
    default: null
  },
  
  // For symbol scope: specific symbol like 'EURUSD', 'XAUUSD'
  symbol: {
    type: String,
    uppercase: true,
    default: null
  },
  
  // For user scope: specific user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // SIMPLIFIED: Only Spread and Commission
  spreadPips: {
    type: Number,
    default: 0,
    min: 0
  },
  
  commissionPerLot: {
    type: Number,
    default: 0,
    min: 0
  },

  isActive: {
    type: Boolean,
    default: true
  },
  
  description: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
tradingChargeSchema.index({ scopeType: 1, segment: 1, symbol: 1, userId: 1, accountTypeId: 1 });
tradingChargeSchema.index({ symbol: 1 });
tradingChargeSchema.index({ userId: 1 });
tradingChargeSchema.index({ accountTypeId: 1 });

// Static method to get charges for a trade (with optional accountTypeId)
tradingChargeSchema.statics.getChargesForTrade = async function(symbol, userId, accountTypeId = null) {
  const segment = getSegmentForSymbol(symbol);
  
  // Priority: User > Symbol > AccountType > Segment > Global
  const queryConditions = [
    { scopeType: 'user', userId: userId },
    { scopeType: 'symbol', symbol: symbol.toUpperCase() },
    { scopeType: 'segment', segment: segment },
    { scopeType: 'global' }
  ];
  
  // Add accountType condition if provided
  if (accountTypeId) {
    queryConditions.splice(2, 0, { scopeType: 'accountType', accountTypeId: accountTypeId });
  }
  
  const charges = await this.find({
    isActive: true,
    $or: queryConditions
  });

  // Simplified: Only spread and commission
  let finalCharges = {
    spreadPips: 0,
    commissionPerLot: 0,
    source: 'default'
  };

  // Apply in reverse priority (global first, then more specific)
  // Priority: global(0) < segment(1) < accountType(2) < symbol(3) < user(4)
  const sortedCharges = charges.sort((a, b) => {
    const priority = { global: 0, segment: 1, accountType: 2, symbol: 3, user: 4 };
    return priority[a.scopeType] - priority[b.scopeType];
  });

  for (const charge of sortedCharges) {
    if (charge.spreadPips > 0) finalCharges.spreadPips = charge.spreadPips;
    if (charge.commissionPerLot > 0) finalCharges.commissionPerLot = charge.commissionPerLot;
    finalCharges.source = charge.scopeType;
  }

  return finalCharges;
};

// Helper function to determine segment from symbol
function getSegmentForSymbol(symbol) {
  const upperSymbol = symbol.toUpperCase();
  
  if (['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'].includes(upperSymbol)) {
    return 'metals';
  }
  
  if (['BTCUSD', 'ETHUSD', 'XRPUSD', 'LTCUSD', 'SOLUSD', 'DOGEUSD'].includes(upperSymbol)) {
    return 'crypto';
  }
  
  if (['US30', 'US500', 'NAS100', 'UK100', 'GER40'].includes(upperSymbol)) {
    return 'indices';
  }
  
  // Default to forex
  return 'forex';
}

module.exports = mongoose.model('TradingCharge', tradingChargeSchema);
