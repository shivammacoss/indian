const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const TradeMaster = require('../models/TradeMaster');
const TradeMasterRequest = require('../models/TradeMasterRequest');
const CopyFollower = require('../models/CopyFollower');
const CopyTradeMap = require('../models/CopyTradeMap');
const CommissionLog = require('../models/CommissionLog');
const User = require('../models/User');
const TradingAccount = require('../models/TradingAccount');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// =============== TRADE MASTERS LIST ===============

// @route   GET /api/copy-trade/masters
// @desc    Get list of approved trade masters
// @access  Private
router.get('/masters', async (req, res) => {
  try {
    const { sort = 'followers', riskLevel, minWinRate } = req.query;

    const query = { status: 'approved' };
    if (riskLevel) query.riskLevel = riskLevel;

    let sortOption = {};
    switch (sort) {
      case 'followers':
        sortOption = { 'stats.activeFollowers': -1 };
        break;
      case 'profit':
        sortOption = { 'stats.profit30Days': -1 };
        break;
      case 'winrate':
        sortOption = { 'stats.winRate': -1 };
        break;
      default:
        sortOption = { 'stats.activeFollowers': -1 };
    }

    let masters = await TradeMaster.find(query)
      .populate('userId', 'firstName lastName avatar')
      .sort(sortOption)
      .limit(50);

    // Filter by win rate if specified
    if (minWinRate) {
      masters = masters.filter(m => m.stats.winRate >= parseInt(minWinRate));
    }

    // Check if current user is following each master
    const userFollows = await CopyFollower.find({
      userId: req.user._id,
      status: { $in: ['active', 'paused'] }
    }).select('masterId');
    const followingIds = userFollows.map(f => f.masterId.toString());

    const mastersWithFollow = masters.map(m => ({
      ...m.toObject(),
      isFollowing: followingIds.includes(m._id.toString())
    }));

    res.json({ success: true, data: mastersWithFollow });
  } catch (error) {
    console.error('Get masters error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/copy-trade/masters/:id
// @desc    Get single trade master details
// @access  Private
router.get('/masters/:id', async (req, res) => {
  try {
    const master = await TradeMaster.findById(req.params.id)
      .populate('userId', 'firstName lastName avatar');

    if (!master || master.status !== 'approved') {
      return res.status(404).json({ success: false, message: 'Trade master not found' });
    }

    // Check if user is following
    const isFollowing = await CopyFollower.findOne({
      masterId: master._id,
      userId: req.user._id,
      status: { $in: ['active', 'paused'] }
    });

    // Get recent trades (last 10)
    const recentTrades = await CopyTradeMap.find({ masterId: master._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('symbol type masterLot masterPnL status createdAt');

    res.json({
      success: true,
      data: {
        ...master.toObject(),
        isFollowing: !!isFollowing,
        followSettings: isFollowing,
        recentTrades
      }
    });
  } catch (error) {
    console.error('Get master details error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== FOLLOW / UNFOLLOW ===============

// @route   POST /api/copy-trade/follow/:masterId
// @desc    Follow a trade master
// @access  Private
router.post('/follow/:masterId', [
  body('copyMode').isIn(['fixed_lot', 'multiplier', 'balance_ratio']),
  body('tradingAccountId').notEmpty().withMessage('Trading account is required'),
  body('fixedLot').optional().isFloat({ min: 0.01 }),
  body('multiplier').optional().isFloat({ min: 0.1, max: 10 }),
  body('maxDailyLossPercent').optional().isFloat({ min: 1, max: 100 }),
  body('maxDrawdownPercent').optional().isFloat({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const master = await TradeMaster.findById(req.params.masterId);
    if (!master || master.status !== 'approved') {
      return res.status(404).json({ success: false, message: 'Trade master not found' });
    }

    // Check if user is trying to follow themselves
    if (master.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    // Validate trading account belongs to user
    const { tradingAccountId } = req.body;
    console.log(`[CopyTrade] Looking for account: ${tradingAccountId}, user: ${req.user._id}`);
    
    const tradingAccount = await TradingAccount.findOne({ 
      _id: tradingAccountId, 
      user: req.user._id, 
      status: 'active' 
    });
    
    console.log(`[CopyTrade] Found account:`, tradingAccount ? { id: tradingAccount._id, balance: tradingAccount.balance, status: tradingAccount.status } : 'null');
    
    if (!tradingAccount) {
      return res.status(400).json({ success: false, message: 'Invalid trading account selected' });
    }

    // Check if already following
    const existingFollow = await CopyFollower.findOne({
      masterId: master._id,
      userId: req.user._id
    });

    if (existingFollow && existingFollow.status === 'active') {
      return res.status(400).json({ success: false, message: 'Already following this master' });
    }

    // Check max followers limit
    if (master.stats.activeFollowers >= master.maxFollowers) {
      return res.status(400).json({ success: false, message: 'Master has reached max followers' });
    }

    // Check selected trading account balance meets minimum (with small tolerance for floating point)
    console.log(`[CopyTrade] Account balance: ${tradingAccount.balance}, Min required: ${master.minCopyAmount}`);
    const accountBalance = parseFloat(tradingAccount.balance) || 0;
    const minRequired = parseFloat(master.minCopyAmount) || 0;
    
    if (accountBalance < minRequired - 0.01) { // Small tolerance for floating point
      return res.status(400).json({
        success: false,
        message: `Minimum balance of $${minRequired.toFixed(2)} required. Your account balance: $${accountBalance.toFixed(2)}`
      });
    }

    const {
      copyMode,
      fixedLot = 0.01,
      multiplier = 1.0,
      maxDailyLossPercent = 10,
      maxDrawdownPercent = 30,
      maxLotSize = 10,
      stopCopyOnDrawdown = true
    } = req.body;

    // Create or reactivate follow
    let follower;
    if (existingFollow) {
      existingFollow.status = 'active';
      existingFollow.tradingAccountId = tradingAccountId;
      existingFollow.copyMode = copyMode;
      existingFollow.fixedLot = fixedLot;
      existingFollow.multiplier = multiplier;
      existingFollow.maxDailyLossPercent = maxDailyLossPercent;
      existingFollow.maxDrawdownPercent = maxDrawdownPercent;
      existingFollow.maxLotSize = maxLotSize;
      existingFollow.stopCopyOnDrawdown = stopCopyOnDrawdown;
      existingFollow.startedAt = new Date();
      existingFollow.stoppedAt = null;
      existingFollow.pauseReason = '';
      follower = await existingFollow.save();
    } else {
      follower = await CopyFollower.create({
        masterId: master._id,
        masterUserId: master.userId,
        userId: req.user._id,
        tradingAccountId,
        copyMode,
        fixedLot,
        multiplier,
        maxDailyLossPercent,
        maxDrawdownPercent,
        maxLotSize,
        stopCopyOnDrawdown
      });
    }

    // Update master stats
    master.stats.totalFollowers += existingFollow ? 0 : 1;
    master.stats.activeFollowers += 1;
    await master.save();

    res.status(201).json({
      success: true,
      message: 'Now following trade master',
      data: follower
    });
  } catch (error) {
    console.error('Follow master error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/copy-trade/follow/:masterId
// @desc    Update follow settings
// @access  Private
router.put('/follow/:masterId', async (req, res) => {
  try {
    const follower = await CopyFollower.findOne({
      masterId: req.params.masterId,
      userId: req.user._id,
      status: { $in: ['active', 'paused'] }
    });

    if (!follower) {
      return res.status(404).json({ success: false, message: 'Not following this master' });
    }

    const {
      copyMode,
      fixedLot,
      multiplier,
      maxDailyLossPercent,
      maxDrawdownPercent,
      maxLotSize,
      stopCopyOnDrawdown
    } = req.body;

    if (copyMode) follower.copyMode = copyMode;
    if (fixedLot !== undefined) follower.fixedLot = fixedLot;
    if (multiplier !== undefined) follower.multiplier = multiplier;
    if (maxDailyLossPercent !== undefined) follower.maxDailyLossPercent = maxDailyLossPercent;
    if (maxDrawdownPercent !== undefined) follower.maxDrawdownPercent = maxDrawdownPercent;
    if (maxLotSize !== undefined) follower.maxLotSize = maxLotSize;
    if (stopCopyOnDrawdown !== undefined) follower.stopCopyOnDrawdown = stopCopyOnDrawdown;

    await follower.save();

    res.json({ success: true, message: 'Settings updated', data: follower });
  } catch (error) {
    console.error('Update follow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/copy-trade/follow/:masterId
// @desc    Stop following a trade master
// @access  Private
router.delete('/follow/:masterId', async (req, res) => {
  try {
    const follower = await CopyFollower.findOne({
      masterId: req.params.masterId,
      userId: req.user._id,
      status: { $in: ['active', 'paused'] }
    });

    if (!follower) {
      return res.status(404).json({ success: false, message: 'Not following this master' });
    }

    follower.status = 'stopped';
    follower.stoppedAt = new Date();
    await follower.save();

    // Update master stats
    await TradeMaster.findByIdAndUpdate(req.params.masterId, {
      $inc: { 'stats.activeFollowers': -1 }
    });

    res.json({ success: true, message: 'Stopped following trade master' });
  } catch (error) {
    console.error('Unfollow master error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/copy-trade/follow/:masterId/pause
// @desc    Pause/Resume copy trading
// @access  Private
router.put('/follow/:masterId/pause', async (req, res) => {
  try {
    const follower = await CopyFollower.findOne({
      masterId: req.params.masterId,
      userId: req.user._id
    });

    if (!follower) {
      return res.status(404).json({ success: false, message: 'Not following this master' });
    }

    if (follower.status === 'stopped') {
      return res.status(400).json({ success: false, message: 'Follow has been stopped' });
    }

    const newStatus = follower.status === 'active' ? 'paused' : 'active';
    follower.status = newStatus;
    follower.pauseReason = newStatus === 'paused' ? 'Paused by user' : '';
    await follower.save();

    res.json({
      success: true,
      message: newStatus === 'paused' ? 'Copy trading paused' : 'Copy trading resumed',
      data: follower
    });
  } catch (error) {
    console.error('Pause follow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== MY FOLLOWS ===============

// @route   GET /api/copy-trade/my-follows
// @desc    Get user's active follows
// @access  Private
router.get('/my-follows', async (req, res) => {
  try {
    const follows = await CopyFollower.find({
      userId: req.user._id,
      status: { $in: ['active', 'paused'] }
    })
      .populate({
        path: 'masterId',
        select: 'masterId displayName strategyType stats riskLevel commissionType commissionValue',
        populate: { path: 'userId', select: 'firstName lastName avatar' }
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: follows });
  } catch (error) {
    console.error('Get my follows error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/copy-trade/my-copied-trades
// @desc    Get user's copied trades
// @access  Private
router.get('/my-copied-trades', async (req, res) => {
  try {
    const { status = 'all', limit = 50 } = req.query;

    const query = { followerUserId: req.user._id };
    if (status !== 'all') query.status = status;

    const trades = await CopyTradeMap.find(query)
      .populate('masterId', 'displayName masterId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: trades });
  } catch (error) {
    console.error('Get copied trades error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== BECOME TRADE MASTER ===============

// @route   POST /api/copy-trade/request-master
// @desc    Request to become a trade master
// @access  Private
router.post('/request-master', [
  body('experienceYears').isInt({ min: 0 }),
  body('strategy').notEmpty(),
  body('riskDisclosureAccepted').equals('true')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Check if already a master
    const existingMaster = await TradeMaster.findOne({ userId: req.user._id });
    if (existingMaster) {
      return res.status(400).json({
        success: false,
        message: existingMaster.status === 'approved' 
          ? 'You are already a trade master'
          : 'You already have a pending request'
      });
    }

    // Check for existing request
    const existingRequest = await TradeMasterRequest.findOne({
      userId: req.user._id,
      status: 'pending'
    });
    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'Request already pending' });
    }

    const {
      experienceYears,
      strategy,
      description,
      minCapital,
      preferredCommissionType,
      preferredCommissionValue,
      riskLevel,
      riskDisclosureAccepted,
      termsAccepted
    } = req.body;

    const request = await TradeMasterRequest.create({
      userId: req.user._id,
      experienceYears,
      strategy,
      description: description || '',
      minCapital: minCapital || 1000,
      preferredCommissionType: preferredCommissionType || 'profit_share',
      preferredCommissionValue: preferredCommissionValue || 20,
      riskLevel: riskLevel || 'Medium',
      riskDisclosureAccepted: riskDisclosureAccepted === 'true',
      termsAccepted: termsAccepted === 'true'
    });

    res.status(201).json({
      success: true,
      message: 'Request submitted successfully',
      data: request
    });
  } catch (error) {
    console.error('Request master error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/copy-trade/my-master-status
// @desc    Get user's trade master status
// @access  Private
router.get('/my-master-status', async (req, res) => {
  try {
    const master = await TradeMaster.findOne({ userId: req.user._id });
    const request = await TradeMasterRequest.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        isMaster: master?.status === 'approved',
        masterProfile: master,
        latestRequest: request
      }
    });
  } catch (error) {
    console.error('Get master status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== TRADE MASTER DASHBOARD ===============

// @route   GET /api/copy-trade/master/dashboard
// @desc    Get trade master dashboard data
// @access  Private (Masters only)
router.get('/master/dashboard', async (req, res) => {
  try {
    const master = await TradeMaster.findOne({ userId: req.user._id, status: 'approved' });
    if (!master) {
      return res.status(403).json({ success: false, message: 'Not a trade master' });
    }

    // Get followers with their trade stats
    const followers = await CopyFollower.find({ masterId: master._id })
      .populate('userId', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .lean();

    // Get follower trades and PnL for each follower
    const followerIds = followers.map(f => f.userId?._id).filter(Boolean);
    
    // Get all copied trades for these followers from this master
    const Trade = require('../models/Trade');
    const followerTrades = await Trade.find({
      user: { $in: followerIds },
      isCopiedTrade: true,
      masterTradeId: { $exists: true }
    }).select('user profit status symbol amount closedAt').lean();

    // Calculate per-follower stats
    const followerStats = {};
    for (const trade of followerTrades) {
      const oderId = trade.user.toString();
      if (!followerStats[oderId]) {
        followerStats[oderId] = { totalTrades: 0, closedTrades: 0, totalPnL: 0, openTrades: 0 };
      }
      followerStats[oderId].totalTrades++;
      if (trade.status === 'closed') {
        followerStats[oderId].closedTrades++;
        followerStats[oderId].totalPnL += trade.profit || 0;
      } else {
        followerStats[oderId].openTrades++;
      }
    }

    // Attach stats to followers
    const followersWithStats = followers.map(f => ({
      ...f,
      tradeStats: followerStats[f.userId?._id?.toString()] || { totalTrades: 0, closedTrades: 0, totalPnL: 0, openTrades: 0 }
    }));

    // Get recent commissions with trade details
    const recentCommissions = await CommissionLog.find({ masterId: master._id })
      .populate('followerUserId', 'firstName lastName')
      .populate('tradeId', 'symbol amount profit')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get recent trades with more details
    const recentTrades = await CopyTradeMap.find({ masterId: master._id })
      .populate('followerTradeId', 'symbol amount profit status type price closePrice')
      .populate('followerUserId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: {
        profile: master,
        followers: followersWithStats,
        recentCommissions,
        recentTrades,
        stats: {
          totalFollowers: followers.length,
          activeFollowers: followers.filter(f => f.isActive).length,
          totalCommissionEarned: master.stats?.totalCommission || 0,
          availableCommission: master.stats?.availableCommission || 0
        }
      }
    });
  } catch (error) {
    console.error('Get master dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/copy-trade/master/profile
// @desc    Update trade master profile
// @access  Private (Masters only)
router.put('/master/profile', async (req, res) => {
  try {
    const master = await TradeMaster.findOne({ userId: req.user._id, status: 'approved' });
    if (!master) {
      return res.status(403).json({ success: false, message: 'Not a trade master' });
    }

    const { displayName, strategyType, description, minCopyAmount, maxFollowers } = req.body;

    if (displayName) master.displayName = displayName;
    if (strategyType) master.strategyType = strategyType;
    if (description) master.description = description;
    if (minCopyAmount) master.minCopyAmount = minCopyAmount;
    if (maxFollowers) master.maxFollowers = maxFollowers;

    await master.save();

    res.json({ success: true, message: 'Profile updated', data: master });
  } catch (error) {
    console.error('Update master profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/copy-trade/master/withdraw-commission
// @desc    Withdraw available commission
// @access  Private (Masters only)
router.post('/master/withdraw-commission', [
  body('amount').isFloat({ min: 1 })
], async (req, res) => {
  try {
    const master = await TradeMaster.findOne({ userId: req.user._id, status: 'approved' });
    if (!master) {
      return res.status(403).json({ success: false, message: 'Not a trade master' });
    }

    const { amount } = req.body;

    if (amount > master.stats.availableCommission) {
      return res.status(400).json({ success: false, message: 'Insufficient commission balance' });
    }

    // Deduct from available commission
    master.stats.availableCommission -= amount;
    await master.save();

    // Add to user wallet
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { balance: amount }
    });

    res.json({
      success: true,
      message: `$${amount} withdrawn to wallet`,
      data: { availableCommission: master.stats.availableCommission }
    });
  } catch (error) {
    console.error('Withdraw commission error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
