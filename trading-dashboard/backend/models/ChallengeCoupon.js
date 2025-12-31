const mongoose = require('mongoose');

/**
 * Challenge Coupon Model
 * Discount codes for challenge purchases
 */
const challengeCouponSchema = new mongoose.Schema({
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
  // Discount type: percentage or fixed amount
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  // Discount value (percentage or fixed USD amount)
  discountValue: {
    type: Number,
    required: true
  },
  // Maximum discount amount (for percentage discounts)
  maxDiscount: {
    type: Number,
    default: 0 // 0 = no limit
  },
  // Minimum purchase amount to apply coupon
  minPurchaseAmount: {
    type: Number,
    default: 0
  },
  // Which challenge types this coupon applies to (empty = all)
  applicableChallengeTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChallengeType'
  }],
  // Which account sizes this coupon applies to (empty = all)
  applicableAccountSizes: [{
    type: Number
  }],
  // Usage limits
  maxUsageTotal: {
    type: Number,
    default: 0 // 0 = unlimited
  },
  maxUsagePerUser: {
    type: Number,
    default: 1
  },
  currentUsageCount: {
    type: Number,
    default: 0
  },
  // Users who have used this coupon
  usedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserChallenge'
    },
    discountApplied: Number
  }],
  // Validity period
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  // Created by admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Check if coupon is valid
challengeCouponSchema.methods.isValid = function(userId, challengeTypeId, accountSize, purchaseAmount) {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) {
    return { valid: false, reason: 'Coupon is inactive' };
  }
  
  // Check validity period
  if (this.validFrom && now < this.validFrom) {
    return { valid: false, reason: 'Coupon is not yet valid' };
  }
  if (this.validUntil && now > this.validUntil) {
    return { valid: false, reason: 'Coupon has expired' };
  }
  
  // Check total usage limit
  if (this.maxUsageTotal > 0 && this.currentUsageCount >= this.maxUsageTotal) {
    return { valid: false, reason: 'Coupon usage limit reached' };
  }
  
  // Check per-user usage limit
  if (this.maxUsagePerUser > 0 && userId) {
    const userUsageCount = this.usedBy.filter(u => u.user.toString() === userId.toString()).length;
    if (userUsageCount >= this.maxUsagePerUser) {
      return { valid: false, reason: 'You have already used this coupon' };
    }
  }
  
  // Check minimum purchase amount
  if (this.minPurchaseAmount > 0 && purchaseAmount < this.minPurchaseAmount) {
    return { valid: false, reason: `Minimum purchase amount is $${this.minPurchaseAmount}` };
  }
  
  // Check applicable challenge types
  if (this.applicableChallengeTypes.length > 0 && challengeTypeId) {
    const isApplicable = this.applicableChallengeTypes.some(
      t => t.toString() === challengeTypeId.toString()
    );
    if (!isApplicable) {
      return { valid: false, reason: 'Coupon not valid for this challenge type' };
    }
  }
  
  // Check applicable account sizes
  if (this.applicableAccountSizes.length > 0 && accountSize) {
    if (!this.applicableAccountSizes.includes(accountSize)) {
      return { valid: false, reason: 'Coupon not valid for this account size' };
    }
  }
  
  return { valid: true, reason: '' };
};

// Calculate discount amount
challengeCouponSchema.methods.calculateDiscount = function(originalPrice) {
  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (originalPrice * this.discountValue) / 100;
    // Apply max discount cap if set
    if (this.maxDiscount > 0 && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    // Fixed discount
    discount = this.discountValue;
  }
  
  // Discount cannot exceed original price
  if (discount > originalPrice) {
    discount = originalPrice;
  }
  
  return Math.round(discount * 100) / 100; // Round to 2 decimals
};

// Indexes
challengeCouponSchema.index({ code: 1 });
challengeCouponSchema.index({ isActive: 1, validUntil: 1 });

module.exports = mongoose.model('ChallengeCoupon', challengeCouponSchema);
