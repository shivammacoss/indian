const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const IB = require('../models/IB');
const IBReferral = require('../models/IBReferral');
const IBCommissionLog = require('../models/IBCommissionLog');
const IBWithdrawal = require('../models/IBWithdrawal');
const IBCommissionSettings = require('../models/IBCommissionSettings');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// =============== IB PROFILE ===============

// @route   GET /api/ib/profile
// @desc    Get user's IB profile (auto-create if not exists)
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    // Fetch settings first
    const settings = await IBCommissionSettings.getSettings();
    
    // Fetch IB (need document for methods)
    let ib = await IB.findOne({ userId: req.user._id });
    
    // Auto-create IB profile for user
    if (!ib) {
      ib = await IB.create({
        userId: req.user._id,
        status: 'active',
        activatedAt: new Date()
      });
    } else {
      // Check and auto-upgrade based on referral count
      await ib.checkAutoUpgrade();
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const sortedLevels = settings.levels.filter(l => l.isActive).sort((a, b) => a.level - b.level);
    const currentLevel = sortedLevels.find(l => l.level === ib.commissionLevel) || sortedLevels[0];
    const currentLevelIndex = sortedLevels.findIndex(l => l.level === ib.commissionLevel);
    const nextLevel = currentLevelIndex < sortedLevels.length - 1 ? sortedLevels[currentLevelIndex + 1] : null;
    
    // Calculate effective commission (custom or level-based)
    let effectiveCommission = currentLevel?.commissionPerLot || settings.defaultCommissionPerLot;
    if (ib.customCommission?.enabled && ib.customCommission?.perLot > 0) {
      effectiveCommission = ib.customCommission.perLot;
    }
    
    // Calculate progress to next level
    const totalReferrals = ib.stats?.totalReferrals || 0;
    const currentLevelMinReferrals = currentLevel?.minReferrals || 0;
    const nextLevelMinReferrals = nextLevel?.minReferrals || 1; // Avoid division by zero
    const referralsNeeded = nextLevel ? Math.max(0, nextLevelMinReferrals - totalReferrals) : 0;
    const progressPercent = nextLevel && nextLevelMinReferrals > 0 
      ? Math.min(100, Math.round((totalReferrals / nextLevelMinReferrals) * 100)) 
      : 100;
    
    // Generate referral link
    const referralLink = ib.referralCode ? `${baseUrl}/register?ref=${ib.referralCode}` : '';
    
    res.json({
      success: true,
      data: {
        ...ib.toObject(),
        referralLink,
        // Commission info
        effectiveCommission,
        levelName: currentLevel?.name || 'Standard',
        levelColor: currentLevel?.color || '#6b7280',
        levelDescription: currentLevel?.description || '',
        // All levels for display
        allLevels: sortedLevels.map(l => ({
          level: l.level,
          name: l.name,
          commissionPerLot: l.commissionPerLot,
          minReferrals: l.minReferrals,
          color: l.color,
          description: l.description,
          isCurrentLevel: l.level === ib.commissionLevel,
          isUnlocked: totalReferrals >= l.minReferrals
        })),
        // Next level info
        nextLevel: nextLevel ? {
          name: nextLevel.name,
          level: nextLevel.level,
          commissionPerLot: nextLevel.commissionPerLot,
          minReferrals: nextLevel.minReferrals,
          color: nextLevel.color,
          referralsNeeded,
          progressPercent
        } : null
      }
    });
  } catch (error) {
    console.error('Get IB profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/ib/stats
// @desc    Get IB dashboard stats
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const ib = await IB.findOne({ userId: req.user._id });
    if (!ib) {
      return res.status(404).json({ success: false, message: 'IB profile not found' });
    }

    // Get additional stats
    const [totalCommissions, pendingWithdrawals] = await Promise.all([
      IBCommissionLog.aggregate([
        { $match: { ibId: ib._id, status: 'credited' } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ]),
      IBWithdrawal.aggregate([
        { $match: { ibId: ib._id, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalReferrals: ib.stats.totalReferrals,
        activeReferrals: ib.stats.activeReferrals,
        totalDeposits: ib.stats.totalDeposits,
        totalTradingVolume: ib.stats.totalTradingVolume,
        totalCommissionEarned: ib.wallet.totalEarned,
        availableBalance: ib.wallet.balance,
        pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
        totalWithdrawn: ib.wallet.totalWithdrawn
      }
    });
  } catch (error) {
    console.error('Get IB stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== REFERRALS ===============

// @route   GET /api/ib/referrals
// @desc    Get list of referred users
// @access  Private
router.get('/referrals', async (req, res) => {
  try {
    const ib = await IB.findOne({ userId: req.user._id });
    if (!ib) {
      return res.status(404).json({ success: false, message: 'IB profile not found' });
    }

    const { status, limit = 50, page = 1 } = req.query;
    const query = { ibId: ib._id };
    if (status) query.status = status;

    const referrals = await IBReferral.find(query)
      .populate('referredUserId', 'firstName lastName email createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await IBReferral.countDocuments(query);

    res.json({
      success: true,
      data: referrals,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== COMMISSION HISTORY ===============

// @route   GET /api/ib/commissions
// @desc    Get commission history
// @access  Private
router.get('/commissions', async (req, res) => {
  try {
    const ib = await IB.findOne({ userId: req.user._id });
    if (!ib) {
      return res.status(404).json({ success: false, message: 'IB profile not found' });
    }

    const { type, limit = 50, page = 1 } = req.query;
    const query = { ibId: ib._id };
    if (type) query.sourceType = type;

    const commissions = await IBCommissionLog.find(query)
      .populate('sourceUserId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await IBCommissionLog.countDocuments(query);

    // Get totals by type
    const totals = await IBCommissionLog.aggregate([
      { $match: { ibId: ib._id, status: 'credited' } },
      { $group: { _id: '$sourceType', total: { $sum: '$commissionAmount' } } }
    ]);

    res.json({
      success: true,
      data: commissions,
      totals: totals.reduce((acc, t) => ({ ...acc, [t._id]: t.total }), {}),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== WITHDRAWALS ===============

// @route   GET /api/ib/withdrawals
// @desc    Get withdrawal history
// @access  Private
router.get('/withdrawals', async (req, res) => {
  try {
    const ib = await IB.findOne({ userId: req.user._id });
    if (!ib) {
      return res.status(404).json({ success: false, message: 'IB profile not found' });
    }

    const withdrawals = await IBWithdrawal.find({ ibId: ib._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: withdrawals });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/ib/withdraw
// @desc    Request commission withdrawal
// @access  Private
router.post('/withdraw', [
  body('amount').isFloat({ min: 1 }),
  body('method').isIn(['wallet', 'bank', 'upi'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const ib = await IB.findOne({ userId: req.user._id });
    if (!ib) {
      return res.status(404).json({ success: false, message: 'IB profile not found' });
    }

    const { amount, method, bankDetails } = req.body;

    // Check minimum withdrawal
    if (amount < ib.minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is $${ib.minWithdrawal}`
      });
    }

    // Check available balance
    if (amount > ib.wallet.balance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create withdrawal request
    const withdrawal = await IBWithdrawal.create({
      ibId: ib._id,
      ibUserId: ib.userId,
      amount,
      method,
      withdrawalDetails: method !== 'wallet' ? bankDetails : {},
      status: ib.requireWithdrawalApproval ? 'pending' : 'approved'
    });

    // If no approval required and method is wallet, process immediately
    if (!ib.requireWithdrawalApproval && method === 'wallet') {
      ib.wallet.balance -= amount;
      ib.wallet.totalWithdrawn += amount;
      await ib.save();

      // Credit user's main wallet
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { balance: amount }
      });

      withdrawal.status = 'completed';
      withdrawal.processedAt = new Date();
      await withdrawal.save();
    } else {
      // Hold balance for pending withdrawal
      ib.wallet.balance -= amount;
      ib.wallet.pendingBalance += amount;
      await ib.save();
    }

    res.status(201).json({
      success: true,
      message: ib.requireWithdrawalApproval 
        ? 'Withdrawal request submitted for approval'
        : 'Withdrawal processed successfully',
      data: withdrawal
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/ib/withdraw-to-wallet
// @desc    Quick withdraw to trading wallet (if no approval needed)
// @access  Private
router.post('/withdraw-to-wallet', [
  body('amount').isFloat({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const ib = await IB.findOne({ userId: req.user._id });
    if (!ib) {
      return res.status(404).json({ success: false, message: 'IB profile not found' });
    }

    const { amount } = req.body;

    if (amount < 1) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is $1' });
    }

    if (amount > ib.wallet.balance) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Deduct from IB wallet
    ib.wallet.balance -= amount;
    ib.wallet.totalWithdrawn += amount;
    await ib.save();

    // Credit user's main wallet
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { balance: amount }
    });

    // Create withdrawal record
    await IBWithdrawal.create({
      ibId: ib._id,
      ibUserId: ib.userId,
      amount,
      method: 'wallet',
      status: 'completed',
      processedAt: new Date()
    });

    res.json({
      success: true,
      message: `$${amount} transferred to your trading wallet`,
      data: { newBalance: ib.wallet.balance }
    });
  } catch (error) {
    console.error('Withdraw to wallet error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/ib/request-upgrade
// @desc    Request commission level upgrade
// @access  Private
router.post('/request-upgrade', [
  body('requestedLevel').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const ib = await IB.findOne({ userId: req.user._id });
    if (!ib) {
      return res.status(404).json({ success: false, message: 'IB profile not found' });
    }

    const { requestedLevel, message } = req.body;

    // Validate level exists
    const settings = await IBCommissionSettings.getSettings();
    const targetLevel = settings.levels.find(l => l.level === requestedLevel && l.isActive);
    if (!targetLevel) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    // Check if already at or above requested level
    if (ib.commissionLevel >= requestedLevel) {
      return res.status(400).json({ success: false, message: 'You are already at or above this level' });
    }

    // Check if already has pending upgrade request
    if (ib.upgradeRequest?.pending) {
      return res.status(400).json({ success: false, message: 'You already have a pending upgrade request' });
    }

    // Set upgrade request
    ib.upgradeRequest = {
      pending: true,
      requestedLevel,
      requestedAt: new Date(),
      message: message || ''
    };
    await ib.save();

    res.json({
      success: true,
      message: `Upgrade request to ${targetLevel.name} submitted. Admin will review your request.`,
      data: { upgradeRequest: ib.upgradeRequest }
    });
  } catch (error) {
    console.error('Request upgrade error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
