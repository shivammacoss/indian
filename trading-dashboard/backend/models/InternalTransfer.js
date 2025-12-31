const mongoose = require('mongoose');

const internalTransferSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transferType: {
    type: String,
    enum: ['wallet_to_account', 'account_to_wallet', 'account_to_account'],
    required: true
  },
  // Source
  fromType: {
    type: String,
    enum: ['wallet', 'trading_account'],
    required: true
  },
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount'
  },
  // Destination
  toType: {
    type: String,
    enum: ['wallet', 'trading_account'],
    required: true
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  note: {
    type: String,
    default: ''
  },
  processedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
internalTransferSchema.index({ user: 1, createdAt: -1 });
internalTransferSchema.index({ status: 1 });

module.exports = mongoose.model('InternalTransfer', internalTransferSchema);
