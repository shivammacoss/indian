const mongoose = require('mongoose');

const ibSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // IB Identity
  ibId: {
    type: String,
    unique: true
  },
  referralCode: {
    type: String,
    unique: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  
  // Commission Level (references IBCommissionSettings levels)
  commissionLevel: {
    type: Number,
    default: 1 // Default level (Standard)
  },
  
  // Custom Commission Override (if admin sets custom rate for this IB)
  customCommission: {
    enabled: { type: Boolean, default: false },
    perLot: { type: Number, default: 0 } // Custom $ per lot (overrides level)
  },
  
  // Upgrade Request
  upgradeRequest: {
    pending: { type: Boolean, default: false },
    requestedLevel: { type: Number },
    requestedAt: { type: Date },
    note: { type: String }
  },
  
  // Wallet
  wallet: {
    balance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 }
  },
  
  // Stats
  stats: {
    totalReferrals: { type: Number, default: 0 },
    activeReferrals: { type: Number, default: 0 },
    totalDeposits: { type: Number, default: 0 },
    totalTradingVolume: { type: Number, default: 0 }
  },
  
  // Settings
  minWithdrawal: {
    type: Number,
    default: 50
  },
  requireWithdrawalApproval: {
    type: Boolean,
    default: true
  },
  
  // Admin Controls
  commissionFrozen: {
    type: Boolean,
    default: false
  },
  adminNote: {
    type: String,
    default: ''
  },
  
  // Timestamps
  activatedAt: Date,
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Generate unique IB ID and referral code before saving
ibSchema.pre('save', async function(next) {
  if (!this.ibId) {
    const count = await this.constructor.countDocuments();
    this.ibId = `IB${String(count + 1001).padStart(4, '0')}`;
  }
  if (!this.referralCode) {
    this.referralCode = `HCF-${this.ibId}`;
  }
  next();
});

// Get referral link
ibSchema.methods.getReferralLink = function(baseUrl = 'https://hcfinvest.com') {
  return `${baseUrl}/register?ref=${this.ibId}`;
};

// Get effective commission per lot
ibSchema.methods.getEffectiveCommission = async function() {
  // If custom commission is set, use it
  if (this.customCommission?.enabled && this.customCommission?.perLot > 0) {
    return this.customCommission.perLot;
  }
  // Otherwise, get from level settings
  const IBCommissionSettings = require('./IBCommissionSettings');
  return await IBCommissionSettings.getCommissionForLevel(this.commissionLevel);
};

// Check and auto-upgrade based on referral count
ibSchema.methods.checkAutoUpgrade = async function() {
  const IBCommissionSettings = require('./IBCommissionSettings');
  const settings = await IBCommissionSettings.getSettings();
  
  // Only auto-upgrade if enabled
  if (!settings.autoUpgradeEnabled) {
    return false;
  }
  
  const referralCount = this.stats?.totalReferrals || 0;
  const eligibleLevel = await IBCommissionSettings.getEligibleLevel(referralCount);
  
  // Only upgrade if eligible level is higher than current (no downgrades)
  if (eligibleLevel > this.commissionLevel) {
    this.commissionLevel = eligibleLevel;
    await this.save();
    return true;
  }
  return false;
};

// Indexes
ibSchema.index({ userId: 1 });
ibSchema.index({ ibId: 1 });
ibSchema.index({ referralCode: 1 });
ibSchema.index({ status: 1 });

module.exports = mongoose.model('IB', ibSchema);
