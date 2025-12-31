const express = require('express');
const router = express.Router();
const { protectAdmin } = require('./adminAuth');
const ChallengeType = require('../models/ChallengeType');
const UserChallenge = require('../models/UserChallenge');
const ChallengeTrade = require('../models/ChallengeTrade');
const ChallengePayout = require('../models/ChallengePayout');
const ChallengeCoupon = require('../models/ChallengeCoupon');
const User = require('../models/User');

/**
 * CHALLENGE TYPE MANAGEMENT
 */

// Get all challenge types (including inactive)
router.get('/types', protectAdmin, async (req, res) => {
  try {
    const challengeTypes = await ChallengeType.find()
      .sort({ displayOrder: 1 })
      .lean();

    res.json({
      success: true,
      data: challengeTypes
    });
  } catch (error) {
    console.error('Admin get challenge types error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch challenge types' });
  }
});

// Create new challenge type
router.post('/types', protectAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      type,
      totalPhases,
      phases,
      accountSizes,
      riskRules,
      payoutConfig,
      scalingPlan,
      displayOrder,
      isPopular,
      badge,
      color
    } = req.body;

    // Check if slug exists
    const existing = await ChallengeType.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A challenge type with this slug already exists'
      });
    }

    const challengeType = new ChallengeType({
      name,
      slug,
      description,
      type,
      totalPhases,
      phases,
      accountSizes,
      riskRules,
      payoutConfig,
      scalingPlan,
      displayOrder,
      isPopular,
      badge,
      color
    });

    await challengeType.save();

    res.status(201).json({
      success: true,
      message: 'Challenge type created successfully',
      data: challengeType
    });
  } catch (error) {
    console.error('Create challenge type error:', error);
    res.status(500).json({ success: false, message: 'Failed to create challenge type' });
  }
});

// Update challenge type
router.put('/types/:id', protectAdmin, async (req, res) => {
  try {
    const challengeType = await ChallengeType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!challengeType) {
      return res.status(404).json({
        success: false,
        message: 'Challenge type not found'
      });
    }

    res.json({
      success: true,
      message: 'Challenge type updated successfully',
      data: challengeType
    });
  } catch (error) {
    console.error('Update challenge type error:', error);
    res.status(500).json({ success: false, message: 'Failed to update challenge type' });
  }
});

// Delete challenge type
router.delete('/types/:id', protectAdmin, async (req, res) => {
  try {
    // Check if any active challenges use this type
    const activeCount = await UserChallenge.countDocuments({
      challengeType: req.params.id,
      status: { $in: ['active', 'funded'] }
    });

    if (activeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${activeCount} active challenges use this type. Deactivate instead.`
      });
    }

    await ChallengeType.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Challenge type deleted successfully'
    });
  } catch (error) {
    console.error('Delete challenge type error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete challenge type' });
  }
});

// Toggle challenge type active status
router.patch('/types/:id/toggle', protectAdmin, async (req, res) => {
  try {
    const challengeType = await ChallengeType.findById(req.params.id);
    if (!challengeType) {
      return res.status(404).json({
        success: false,
        message: 'Challenge type not found'
      });
    }

    challengeType.isActive = !challengeType.isActive;
    await challengeType.save();

    res.json({
      success: true,
      message: `Challenge type ${challengeType.isActive ? 'activated' : 'deactivated'}`,
      data: challengeType
    });
  } catch (error) {
    console.error('Toggle challenge type error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle challenge type' });
  }
});

/**
 * USER CHALLENGE MANAGEMENT
 */

// Get all user challenges with filters
router.get('/challenges', protectAdmin, async (req, res) => {
  try {
    const { 
      status, 
      challengeType, 
      userId,
      phase,
      page = 1, 
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (challengeType) query.challengeType = challengeType;
    if (userId) query.user = userId;
    if (phase) query.currentPhase = parseInt(phase);

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const challenges = await UserChallenge.find(query)
      .populate('user', 'name email')
      .populate('challengeType', 'name type slug')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await UserChallenge.countDocuments(query);

    // Get summary stats
    const stats = await UserChallenge.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$accountSize' }
        }
      }
    ]);

    res.json({
      success: true,
      data: challenges,
      stats: stats.reduce((acc, s) => {
        acc[s._id] = { count: s.count, totalValue: s.totalValue };
        return acc;
      }, {}),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get challenges error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch challenges' });
  }
});

// Get single challenge details
router.get('/challenges/:id', protectAdmin, async (req, res) => {
  try {
    const challenge = await UserChallenge.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('challengeType')
      .lean();

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Get trades
    const trades = await ChallengeTrade.find({ userChallenge: challenge._id })
      .sort({ openedAt: -1 })
      .limit(100)
      .lean();

    // Get payouts
    const payouts = await ChallengePayout.find({ userChallenge: challenge._id })
      .sort({ requestedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        ...challenge,
        trades,
        payouts
      }
    });
  } catch (error) {
    console.error('Admin get challenge error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch challenge' });
  }
});

// Manually fail a challenge
router.post('/challenges/:id/fail', protectAdmin, async (req, res) => {
  try {
    const { reason, details } = req.body;

    const challenge = await UserChallenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    if (challenge.status === 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Challenge already failed'
      });
    }

    challenge.status = 'failed';
    challenge.phaseStatus = 'failed';
    challenge.failureReason = reason || 'manual_termination';
    challenge.failureDetails = details || 'Manually terminated by admin';
    challenge.failedAt = new Date();

    // Close any open trades
    await ChallengeTrade.updateMany(
      { userChallenge: challenge._id, status: 'open' },
      { 
        status: 'closed',
        closedAt: new Date(),
        closeReason: 'challenge_failed'
      }
    );

    await challenge.save();

    res.json({
      success: true,
      message: 'Challenge failed successfully',
      data: challenge
    });
  } catch (error) {
    console.error('Fail challenge error:', error);
    res.status(500).json({ success: false, message: 'Failed to fail challenge' });
  }
});

// Manually pass a phase
router.post('/challenges/:id/pass-phase', protectAdmin, async (req, res) => {
  try {
    const challenge = await UserChallenge.findById(req.params.id)
      .populate('challengeType');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    if (challenge.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Challenge is not active'
      });
    }

    const challengeType = challenge.challengeType;
    const currentPhaseIndex = challenge.phases.findIndex(p => p.phaseNumber === challenge.currentPhase);

    if (currentPhaseIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Current phase not found'
      });
    }

    // Mark current phase as passed
    challenge.phases[currentPhaseIndex].status = 'passed';
    challenge.phases[currentPhaseIndex].passedAt = new Date();
    challenge.phases[currentPhaseIndex].endDate = new Date();
    challenge.phases[currentPhaseIndex].endBalance = challenge.balance;
    challenge.phases[currentPhaseIndex].profitAchieved = ((challenge.balance - challenge.initialBalance) / challenge.initialBalance) * 100;

    // Check if this was the last phase
    if (challenge.currentPhase >= challengeType.totalPhases) {
      // Challenge completed - move to funded
      challenge.status = 'funded';
      challenge.phaseStatus = 'passed';
      challenge.fundedAccount = {
        isActive: true,
        fundedAt: new Date(),
        profitSplit: challengeType.payoutConfig.profitSplit,
        totalPayouts: 0,
        scalingLevel: 0
      };
    } else {
      // Move to next phase
      challenge.currentPhase += 1;
      challenge.phaseStatus = 'active';
      
      // Initialize next phase
      const nextPhaseIndex = challenge.phases.findIndex(p => p.phaseNumber === challenge.currentPhase);
      if (nextPhaseIndex !== -1) {
        challenge.phases[nextPhaseIndex].status = 'active';
        challenge.phases[nextPhaseIndex].startDate = new Date();
        challenge.phases[nextPhaseIndex].startBalance = challenge.balance;
      }

      // Reset for new phase
      challenge.highestBalance = challenge.balance;
      challenge.highestEquity = challenge.equity;
      challenge.dailyStartBalance = challenge.balance;
      challenge.dailyStartEquity = challenge.equity;
    }

    await challenge.save();

    res.json({
      success: true,
      message: challenge.status === 'funded' ? 'Challenge completed! Account is now funded.' : `Phase ${challenge.currentPhase - 1} passed!`,
      data: challenge
    });
  } catch (error) {
    console.error('Pass phase error:', error);
    res.status(500).json({ success: false, message: 'Failed to pass phase' });
  }
});

// Fund a challenge manually
router.post('/challenges/:id/fund', protectAdmin, async (req, res) => {
  try {
    const { profitSplit } = req.body;

    const challenge = await UserChallenge.findById(req.params.id)
      .populate('challengeType');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    challenge.status = 'funded';
    challenge.phaseStatus = 'passed';
    challenge.fundedAccount = {
      isActive: true,
      fundedAt: new Date(),
      profitSplit: profitSplit || challenge.challengeType.payoutConfig.profitSplit,
      totalPayouts: 0,
      scalingLevel: 0
    };

    // Mark all phases as passed
    challenge.phases.forEach(phase => {
      if (phase.status === 'active') {
        phase.status = 'passed';
        phase.passedAt = new Date();
      }
    });

    await challenge.save();

    res.json({
      success: true,
      message: 'Challenge funded successfully',
      data: challenge
    });
  } catch (error) {
    console.error('Fund challenge error:', error);
    res.status(500).json({ success: false, message: 'Failed to fund challenge' });
  }
});

// Update challenge balance (admin override)
router.patch('/challenges/:id/balance', protectAdmin, async (req, res) => {
  try {
    const { balance, reason } = req.body;

    const challenge = await UserChallenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const oldBalance = challenge.balance;
    challenge.balance = balance;
    challenge.equity = balance;
    challenge.adminNotes = `${challenge.adminNotes || ''}\n[${new Date().toISOString()}] Balance adjusted from $${oldBalance} to $${balance}. Reason: ${reason}`;

    await challenge.save();

    res.json({
      success: true,
      message: 'Balance updated successfully',
      data: challenge
    });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ success: false, message: 'Failed to update balance' });
  }
});

/**
 * PAYOUT MANAGEMENT
 */

// Get all payout requests
router.get('/payouts', protectAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;

    const payouts = await ChallengePayout.find(query)
      .populate('user', 'name email')
      .populate('userChallenge', 'accountNumber accountSize')
      .sort({ requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await ChallengePayout.countDocuments(query);

    // Get pending stats
    const pendingStats = await ChallengePayout.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$traderShare' } } }
    ]);

    res.json({
      success: true,
      data: payouts,
      pendingStats: pendingStats[0] || { count: 0, total: 0 },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payouts' });
  }
});

// Approve payout
router.post('/payouts/:id/approve', protectAdmin, async (req, res) => {
  try {
    const payout = await ChallengePayout.findById(req.params.id)
      .populate('userChallenge');

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payout is not pending'
      });
    }

    payout.status = 'approved';
    payout.processedBy = req.admin._id;
    payout.processedAt = new Date();
    await payout.save();

    res.json({
      success: true,
      message: 'Payout approved',
      data: payout
    });
  } catch (error) {
    console.error('Approve payout error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve payout' });
  }
});

// Mark payout as paid
router.post('/payouts/:id/paid', protectAdmin, async (req, res) => {
  try {
    const { transactionHash, adminNotes } = req.body;

    const payout = await ChallengePayout.findById(req.params.id)
      .populate('userChallenge')
      .populate('user');

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    if (!['pending', 'approved', 'processing'].includes(payout.status)) {
      return res.status(400).json({
        success: false,
        message: 'Payout cannot be marked as paid'
      });
    }

    // Update payout
    payout.status = 'paid';
    payout.paidAt = new Date();
    payout.processedBy = req.admin._id;
    payout.processedAt = new Date();
    if (transactionHash) payout.paymentDetails.transactionHash = transactionHash;
    if (adminNotes) payout.adminNotes = adminNotes;
    await payout.save();

    // Update challenge
    const challenge = payout.userChallenge;
    challenge.fundedAccount.totalPayouts += payout.traderShare;
    challenge.fundedAccount.lastPayoutAt = new Date();
    
    // Deduct profit from challenge balance
    challenge.balance -= payout.requestedAmount;
    challenge.equity = challenge.balance;
    await challenge.save();

    // Add to user wallet if payment method is wallet
    if (payout.paymentMethod === 'wallet') {
      const user = await User.findById(payout.user._id);
      user.balance += payout.traderShare;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Payout marked as paid',
      data: payout
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark payout as paid' });
  }
});

// Reject payout
router.post('/payouts/:id/reject', protectAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    const payout = await ChallengePayout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    payout.status = 'rejected';
    payout.rejectionReason = reason;
    payout.processedBy = req.admin._id;
    payout.processedAt = new Date();
    await payout.save();

    res.json({
      success: true,
      message: 'Payout rejected',
      data: payout
    });
  } catch (error) {
    console.error('Reject payout error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject payout' });
  }
});

/**
 * DASHBOARD & ANALYTICS
 */

// Get challenge dashboard stats
router.get('/dashboard', protectAdmin, async (req, res) => {
  try {
    // Challenge counts by status
    const statusCounts = await UserChallenge.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Total revenue
    const revenue = await UserChallenge.aggregate([
      { $group: { _id: null, total: { $sum: '$payment.amount' } } }
    ]);

    // Active funded accounts
    const fundedAccounts = await UserChallenge.countDocuments({
      status: 'funded',
      'fundedAccount.isActive': true
    });

    // Total funded capital
    const fundedCapital = await UserChallenge.aggregate([
      { $match: { status: 'funded', 'fundedAccount.isActive': true } },
      { $group: { _id: null, total: { $sum: '$accountSize' } } }
    ]);

    // Pending payouts
    const pendingPayouts = await ChallengePayout.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$traderShare' } } }
    ]);

    // Pass rate
    const passedCount = await UserChallenge.countDocuments({ status: 'funded' });
    const failedCount = await UserChallenge.countDocuments({ status: 'failed' });
    const passRate = passedCount + failedCount > 0 
      ? ((passedCount / (passedCount + failedCount)) * 100).toFixed(1) 
      : 0;

    // Recent challenges
    const recentChallenges = await UserChallenge.find()
      .populate('user', 'name email')
      .populate('challengeType', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        statusCounts: statusCounts.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
        totalRevenue: revenue[0]?.total || 0,
        fundedAccounts,
        fundedCapital: fundedCapital[0]?.total || 0,
        pendingPayouts: pendingPayouts[0] || { count: 0, total: 0 },
        passRate,
        recentChallenges
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
});

/**
 * COUPON MANAGEMENT
 */

// Get all coupons
router.get('/coupons', protectAdmin, async (req, res) => {
  try {
    const { isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const coupons = await ChallengeCoupon.find(query)
      .populate('applicableChallengeTypes', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: coupons
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
});

// Create new coupon
router.post('/coupons', protectAdmin, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minPurchaseAmount,
      applicableChallengeTypes,
      applicableAccountSizes,
      maxUsageTotal,
      maxUsagePerUser,
      validFrom,
      validUntil
    } = req.body;

    // Check if code already exists
    const existing = await ChallengeCoupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    const coupon = new ChallengeCoupon({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      maxDiscount,
      minPurchaseAmount,
      applicableChallengeTypes,
      applicableAccountSizes,
      maxUsageTotal,
      maxUsagePerUser,
      validFrom,
      validUntil,
      createdBy: req.admin._id
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to create coupon' });
  }
});

// Update coupon
router.put('/coupons/:id', protectAdmin, async (req, res) => {
  try {
    const coupon = await ChallengeCoupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to update coupon' });
  }
});

// Delete coupon
router.delete('/coupons/:id', protectAdmin, async (req, res) => {
  try {
    await ChallengeCoupon.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
});

// Toggle coupon active status
router.patch('/coupons/:id/toggle', protectAdmin, async (req, res) => {
  try {
    const coupon = await ChallengeCoupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}`,
      data: coupon
    });
  } catch (error) {
    console.error('Toggle coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle coupon' });
  }
});

// Get coupon usage stats
router.get('/coupons/:id/usage', protectAdmin, async (req, res) => {
  try {
    const coupon = await ChallengeCoupon.findById(req.params.id)
      .populate('usedBy.user', 'name email')
      .populate('usedBy.challengeId', 'accountNumber accountSize')
      .lean();

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const totalDiscount = coupon.usedBy.reduce((sum, u) => sum + (u.discountApplied || 0), 0);

    res.json({
      success: true,
      data: {
        code: coupon.code,
        totalUsage: coupon.currentUsageCount,
        totalDiscount,
        usageHistory: coupon.usedBy
      }
    });
  } catch (error) {
    console.error('Get coupon usage error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupon usage' });
  }
});

module.exports = router;
