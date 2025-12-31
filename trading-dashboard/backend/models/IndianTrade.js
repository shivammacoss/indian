const mongoose = require('mongoose');

const indianTradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tradingAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount',
    required: true
  },
  // Instrument details
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  exchange: {
    type: String,
    required: true,
    enum: ['NSE', 'BSE', 'NFO', 'BFO', 'MCX', 'CDS']
  },
  instrumentToken: {
    type: Number,
    required: true
  },
  instrumentType: {
    type: String,
    enum: ['EQ', 'FUT', 'CE', 'PE'],
    default: 'EQ'
  },
  // Trade details
  side: {
    type: String,
    required: true,
    enum: ['BUY', 'SELL']
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  lotSize: {
    type: Number,
    default: 1
  },
  // Product type
  productType: {
    type: String,
    required: true,
    enum: ['MIS', 'CNC', 'NRML'], // MIS=Intraday, CNC=Delivery(Equity), NRML=Carryforward(F&O)
    default: 'MIS'
  },
  orderType: {
    type: String,
    enum: ['MARKET', 'LIMIT', 'SL', 'SL-M'],
    default: 'MARKET'
  },
  // Prices
  entryPrice: {
    type: Number,
    required: true
  },
  exitPrice: {
    type: Number
  },
  limitPrice: {
    type: Number
  },
  triggerPrice: {
    type: Number
  },
  // Current market price (updated via streaming)
  ltp: {
    type: Number
  },
  // Stop Loss / Target
  stopLoss: {
    type: Number
  },
  target: {
    type: Number
  },
  // Charges
  brokerage: {
    type: Number,
    default: 0
  },
  stt: {
    type: Number,
    default: 0
  },
  transactionCharges: {
    type: Number,
    default: 0
  },
  gst: {
    type: Number,
    default: 0
  },
  sebiCharges: {
    type: Number,
    default: 0
  },
  stampDuty: {
    type: Number,
    default: 0
  },
  totalCharges: {
    type: Number,
    default: 0
  },
  // P&L
  profit: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['open', 'closed', 'pending', 'cancelled', 'rejected'],
    default: 'open'
  },
  // Timestamps
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date
  },
  // Margin blocked
  marginBlocked: {
    type: Number,
    default: 0
  },
  // Strike and expiry for F&O
  strike: {
    type: Number
  },
  expiry: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
indianTradeSchema.index({ user: 1, status: 1 });
indianTradeSchema.index({ tradingAccount: 1, status: 1 });
indianTradeSchema.index({ symbol: 1, exchange: 1 });
indianTradeSchema.index({ instrumentToken: 1 });

// Calculate P&L
indianTradeSchema.methods.calculatePnL = function(currentPrice) {
  const price = currentPrice || this.ltp || this.entryPrice;
  const priceDiff = this.side === 'BUY' 
    ? price - this.entryPrice 
    : this.entryPrice - price;
  return priceDiff * this.quantity;
};

module.exports = mongoose.model('IndianTrade', indianTradeSchema);
