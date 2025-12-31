const mongoose = require('mongoose');

// Commission Level Schema (tiers)
const commissionLevelSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Bronze", "Silver", "Gold", "Platinum"
  level: { type: Number, required: true, unique: true }, // 1, 2, 3, 4...
  commissionPerLot: { type: Number, required: true }, // $ per lot
  description: { type: String, default: '' },
  minReferrals: { type: Number, default: 0 }, // Minimum referrals needed (for reference)
  minVolume: { type: Number, default: 0 }, // Minimum volume needed (for reference)
  isActive: { type: Boolean, default: true },
  color: { type: String, default: '#3b82f6' } // For UI display
}, { _id: true });

const ibCommissionSettingsSchema = new mongoose.Schema({
  // Global Default Commission (applies to all new IBs)
  defaultCommissionPerLot: {
    type: Number,
    default: 2, // $2 per lot default
    min: 0
  },
  
  // Commission Levels/Tiers
  levels: {
    type: [commissionLevelSchema],
    default: [
      { name: 'Standard', level: 1, commissionPerLot: 2, minReferrals: 0, description: 'Default commission level', color: '#6b7280' },
      { name: 'Bronze', level: 2, commissionPerLot: 3, minReferrals: 5, description: '5+ active referrals', color: '#cd7f32' },
      { name: 'Silver', level: 3, commissionPerLot: 4, minReferrals: 15, description: '15+ active referrals', color: '#c0c0c0' },
      { name: 'Gold', level: 4, commissionPerLot: 5, minReferrals: 30, description: '30+ active referrals', color: '#ffd700' },
      { name: 'Platinum', level: 5, commissionPerLot: 7, minReferrals: 50, description: '50+ active referrals', color: '#e5e4e2' }
    ]
  },
  
  // Commission Settings
  minWithdrawal: { type: Number, default: 50 },
  requireWithdrawalApproval: { type: Boolean, default: true },
  
  // Auto-upgrade settings - IB auto-upgrades when referral count meets level requirement
  autoUpgradeEnabled: { type: Boolean, default: true },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
ibCommissionSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Get commission for a specific level
ibCommissionSettingsSchema.statics.getCommissionForLevel = async function(levelNumber) {
  const settings = await this.getSettings();
  const level = settings.levels.find(l => l.level === levelNumber && l.isActive);
  return level ? level.commissionPerLot : settings.defaultCommissionPerLot;
};

// Get all active levels
ibCommissionSettingsSchema.statics.getActiveLevels = async function() {
  const settings = await this.getSettings();
  return settings.levels.filter(l => l.isActive).sort((a, b) => a.level - b.level);
};

// Get eligible level based on referral count (highest level IB qualifies for)
ibCommissionSettingsSchema.statics.getEligibleLevel = async function(referralCount) {
  const settings = await this.getSettings();
  const activeLevels = settings.levels.filter(l => l.isActive).sort((a, b) => b.level - a.level); // Sort descending
  
  // Find highest level where referralCount meets minReferrals requirement
  for (const level of activeLevels) {
    if (referralCount >= level.minReferrals) {
      return level.level;
    }
  }
  return 1; // Default to level 1
};

// Get next level info for an IB
ibCommissionSettingsSchema.statics.getNextLevelInfo = async function(currentLevel, referralCount) {
  const settings = await this.getSettings();
  const activeLevels = settings.levels.filter(l => l.isActive).sort((a, b) => a.level - b.level);
  
  const currentLevelIndex = activeLevels.findIndex(l => l.level === currentLevel);
  if (currentLevelIndex === -1 || currentLevelIndex >= activeLevels.length - 1) {
    return null; // Already at max level
  }
  
  const nextLevel = activeLevels[currentLevelIndex + 1];
  return {
    level: nextLevel.level,
    name: nextLevel.name,
    commissionPerLot: nextLevel.commissionPerLot,
    minReferrals: nextLevel.minReferrals,
    referralsNeeded: Math.max(0, nextLevel.minReferrals - referralCount),
    color: nextLevel.color
  };
};

module.exports = mongoose.model('IBCommissionSettings', ibCommissionSettingsSchema);
