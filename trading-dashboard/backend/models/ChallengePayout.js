const mongoose = require('mongoose');

/**
 * Challenge Payout Model
 * Tracks payout requests and history for funded accounts
 */
const challengePayoutSchema = new mongoose.Schema({
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
  // Payout details
  requestedAmount: {
    type: Number,
    required: true
  },
  profitSplit: {
    type: Number, // Percentage at time of request
    required: true
  },
  traderShare: {
    type: Number, // Amount to trader
    required: true
  },
  platformShare: {
    type: Number, // Amount to platform
    required: true
  },
  // Account state at request
  accountBalanceAtRequest: {
    type: Number,
    required: true
  },
  profitAtRequest: {
    type: Number,
    required: true
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled'],
    default: 'pending'
  },
  // Payment details
  paymentMethod: {
    type: String,
    enum: ['wallet', 'crypto', 'bank'],
    default: 'wallet'
  },
  paymentDetails: {
    walletAddress: String,
    bankAccount: String,
    cryptoNetwork: String,
    transactionHash: String
  },
  // Admin processing
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedAt: Date,
  rejectionReason: String,
  adminNotes: String,
  // Timestamps
  requestedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: Date
}, {
  timestamps: true
});

// Indexes
challengePayoutSchema.index({ userChallenge: 1, status: 1 });
challengePayoutSchema.index({ user: 1, status: 1 });
challengePayoutSchema.index({ status: 1, requestedAt: -1 });

module.exports = mongoose.model('ChallengePayout', challengePayoutSchema);
