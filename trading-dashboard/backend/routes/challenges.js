const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ChallengeType = require('../models/ChallengeType');
const UserChallenge = require('../models/UserChallenge');
const ChallengeTrade = require('../models/ChallengeTrade');
const ChallengePayout = require('../models/ChallengePayout');
const ChallengeCoupon = require('../models/ChallengeCoupon');
const User = require('../models/User');
const TradingAccount = require('../models/TradingAccount');
const AccountType = require('../models/AccountType');

/**
 * @route   GET /api/challenges/types
 * @desc    Get all active challenge types
 * @access  Public
 */
router.get('/types', async (req, res) => {
  try {
    const challengeTypes = await ChallengeType.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean();

    res.json({
      success: true,
      data: challengeTypes
    });
  } catch (error) {
    console.error('Get challenge types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge types'
    });
  }
});

/**
 * @route   GET /api/challenges/types/:slug
 * @desc    Get challenge type by slug
 * @access  Public
 */
router.get('/types/:slug', async (req, res) => {
  try {
    const challengeType = await ChallengeType.findOne({ 
      slug: req.params.slug,
      isActive: true 
    }).lean();

    if (!challengeType) {
      return res.status(404).json({
        success: false,
        message: 'Challenge type not found'
      });
    }

    res.json({
      success: true,
      data: challengeType
    });
  } catch (error) {
    console.error('Get challenge type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge type'
    });
  }
});

/**
 * @route   POST /api/challenges/validate-coupon
 * @desc    Validate a coupon code
 * @access  Private
 */
router.post('/validate-coupon', protect, async (req, res) => {
  try {
    const { code, challengeTypeId, accountSize, originalPrice } = req.body;
    const userId = req.user._id;

    const coupon = await ChallengeCoupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Validate coupon
    const validation = coupon.isValid(userId, challengeTypeId, accountSize, originalPrice);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(originalPrice);
    const finalPrice = originalPrice - discount;

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discount,
        originalPrice,
        finalPrice,
        description: coupon.description
      }
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon'
    });
  }
});

/**
 * @route   POST /api/challenges/purchase
 * @desc    Purchase a new challenge
 * @access  Private
 */
router.post('/purchase', protect, async (req, res) => {
  try {
    const { challengeTypeId, accountSize, paymentMethod, couponCode, payoutOption } = req.body;
    const userId = req.user._id;

    // Get challenge type
    const challengeType = await ChallengeType.findById(challengeTypeId);
    if (!challengeType || !challengeType.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Challenge type not found or inactive'
      });
    }

    // Find the account size pricing
    const sizeConfig = challengeType.accountSizes.find(s => s.size === accountSize);
    if (!sizeConfig) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account size for this challenge type'
      });
    }

    let price = sizeConfig.discountedPrice || sizeConfig.price;
    let appliedCoupon = null;
    let discountAmount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await ChallengeCoupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon) {
        const validation = coupon.isValid(userId, challengeTypeId, accountSize, price);
        if (validation.valid) {
          discountAmount = coupon.calculateDiscount(price);
          price = price - discountAmount;
          appliedCoupon = coupon;
        }
      }
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has sufficient balance (if paying from wallet)
    if (paymentMethod === 'wallet') {
      if (user.balance < price) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Deduct from user wallet
      user.balance -= price;
      await user.save();
    }

    // Calculate challenge expiry based on duration settings
    let expiresAt = null;
    const riskRules = challengeType.riskRules;
    if (riskRules.challengeDurationDays > 0) {
      expiresAt = new Date();
      if (riskRules.challengeDurationType === 'weeks') {
        expiresAt.setDate(expiresAt.getDate() + (riskRules.challengeDurationDays * 7));
      } else if (riskRules.challengeDurationType === 'months') {
        expiresAt.setMonth(expiresAt.getMonth() + riskRules.challengeDurationDays);
      } else {
        expiresAt.setDate(expiresAt.getDate() + riskRules.challengeDurationDays);
      }
    }

    // Create initial phase data - only include phase 1 as active, others will be added when passed
    const initialPhases = challengeType.phases.map(phase => ({
      phaseNumber: phase.phaseNumber,
      startDate: phase.phaseNumber === 1 ? new Date() : null,
      startBalance: phase.phaseNumber === 1 ? accountSize : null,
      profitTarget: phase.profitTarget,
      profitAchieved: 0,
      tradingDays: 0,
      minimumTradingDays: phase.minimumTradingDays,
      status: 'active' // All phases start as active (only current phase is tracked)
    }));

    // Create a dedicated Challenge Trading Account
    let challengeAccountType = await AccountType.findOne({ name: 'Challenge Account' });
    if (!challengeAccountType) {
      // Create challenge account type if not exists
      challengeAccountType = await AccountType.create({
        name: 'Challenge Account',
        code: 'CHALLENGE',
        description: 'Prop Firm Challenge Account',
        minDeposit: 0,
        maxLeverage: 100,
        spreadMarkup: 0,
        commission: 0,
        features: ['Prop Firm Challenge', 'Virtual Capital'],
        color: '#f59e0b',
        icon: 'trophy',
        sortOrder: 99,
        isActive: true
      });
    }

    // Create dedicated trading account for challenge
    const challengeTradingAccount = new TradingAccount({
      user: userId,
      accountType: challengeAccountType._id,
      nickname: `${challengeType.name} - $${accountSize.toLocaleString()}`,
      balance: accountSize,
      equity: accountSize,
      leverage: 100,
      currency: 'USD',
      status: 'active',
      isDemo: false,
      isChallenge: true, // Mark as challenge account
      server: 'HCF-Challenge'
    });
    await challengeTradingAccount.save();

    // Create user challenge
    const userChallenge = new UserChallenge({
      user: userId,
      challengeType: challengeTypeId,
      accountSize,
      initialBalance: accountSize,
      balance: accountSize,
      equity: accountSize,
      highestBalance: accountSize,
      highestEquity: accountSize,
      dailyStartBalance: accountSize,
      dailyStartEquity: accountSize,
      currentPhase: challengeType.totalPhases === 0 ? 0 : 1, // 0 for instant funding
      status: challengeType.totalPhases === 0 ? 'funded' : 'active', // Instant = funded immediately
      phases: initialPhases,
      payment: {
        amount: price,
        currency: sizeConfig.currency || 'USD',
        method: paymentMethod,
        paidAt: new Date(),
        originalAmount: sizeConfig.discountedPrice || sizeConfig.price,
        discountAmount: discountAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : null
      },
      payoutOption: payoutOption || 'biweekly',
      tradingAccount: challengeTradingAccount._id, // Link to trading account
      expiresAt: expiresAt,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      // Trading limits from challenge type
      tradingLimits: {
        maxTradesPerDay: riskRules.maxTradesPerDay || 0,
        maxTradesPerPhase: riskRules.maxTradesPerPhase || 0,
        allowMultiplePositions: riskRules.allowMultiplePositions !== false,
        autoSlEnabled: riskRules.autoSlEnabled || false,
        autoSlPercent: riskRules.autoSlPercent || 2,
        autoTpEnabled: riskRules.autoTpEnabled || false,
        autoTpPercent: riskRules.autoTpPercent || 4
      },
      // Daily trade tracking
      dailyTradeCount: 0,
      dailyTradeDate: new Date().toDateString()
    });

    // For instant funding, set funded account details
    if (challengeType.totalPhases === 0) {
      userChallenge.fundedAccount = {
        isActive: true,
        fundedAt: new Date(),
        profitSplit: challengeType.payoutConfig.profitSplit,
        totalPayouts: 0,
        scalingLevel: 0
      };
    }

    await userChallenge.save();

    // Update coupon usage if applied
    if (appliedCoupon) {
      appliedCoupon.currentUsageCount += 1;
      appliedCoupon.usedBy.push({
        user: userId,
        usedAt: new Date(),
        challengeId: userChallenge._id,
        discountApplied: discountAmount
      });
      await appliedCoupon.save();
    }

    // Populate for response
    const populatedChallenge = await UserChallenge.findById(userChallenge._id)
      .populate('challengeType', 'name type slug phases riskRules payoutConfig')
      .populate('tradingAccount', 'accountNumber balance')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Challenge purchased successfully',
      data: populatedChallenge
    });
  } catch (error) {
    console.error('Purchase challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase challenge'
    });
  }
});

/**
 * @route   GET /api/challenges/my
 * @desc    Get user's challenges
 * @access  Private
 */
router.get('/my', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const challenges = await UserChallenge.find(query)
      .populate('challengeType', 'name type slug phases riskRules payoutConfig color badge')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: challenges
    });
  } catch (error) {
    console.error('Get my challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenges'
    });
  }
});

/**
 * @route   GET /api/challenges/:id
 * @desc    Get challenge details
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const challenge = await UserChallenge.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('challengeType')
      .lean();

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Get recent trades
    const recentTrades = await ChallengeTrade.find({ userChallenge: challenge._id })
      .sort({ openedAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: {
        ...challenge,
        recentTrades
      }
    });
  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge'
    });
  }
});

/**
 * @route   GET /api/challenges/:id/trades
 * @desc    Get challenge trades
 * @access  Private
 */
router.get('/:id/trades', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const challenge = await UserChallenge.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const query = { userChallenge: challenge._id };
    if (status) {
      query.status = status;
    }

    const trades = await ChallengeTrade.find(query)
      .sort({ openedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await ChallengeTrade.countDocuments(query);

    res.json({
      success: true,
      data: trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get challenge trades error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trades'
    });
  }
});

/**
 * @route   GET /api/challenges/:id/stats
 * @desc    Get challenge statistics
 * @access  Private
 */
router.get('/:id/stats', protect, async (req, res) => {
  try {
    const challenge = await UserChallenge.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('challengeType');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const challengeType = challenge.challengeType;
    const currentPhaseConfig = challengeType.phases.find(p => p.phaseNumber === challenge.currentPhase);

    // Calculate progress metrics
    const profitPercent = ((challenge.balance - challenge.initialBalance) / challenge.initialBalance) * 100;
    const dailyDrawdown = challenge.getDailyDrawdownPercent();
    const totalDrawdown = challenge.getTotalDrawdownPercent();
    
    const stats = {
      // Account info
      accountNumber: challenge.accountNumber,
      accountSize: challenge.accountSize,
      currentBalance: challenge.balance,
      currentEquity: challenge.equity,
      
      // Phase info
      currentPhase: challenge.currentPhase,
      totalPhases: challengeType.totalPhases,
      phaseStatus: challenge.phaseStatus,
      
      // Profit/Target
      profitPercent: profitPercent.toFixed(2),
      profitTarget: currentPhaseConfig?.profitTarget || 0,
      profitProgress: currentPhaseConfig ? Math.min(100, (profitPercent / currentPhaseConfig.profitTarget) * 100).toFixed(1) : 0,
      
      // Drawdown
      dailyDrawdown: dailyDrawdown.toFixed(2),
      maxDailyDrawdown: challengeType.riskRules.maxDailyDrawdown,
      dailyDrawdownUsed: ((dailyDrawdown / challengeType.riskRules.maxDailyDrawdown) * 100).toFixed(1),
      
      totalDrawdown: totalDrawdown.toFixed(2),
      maxTotalDrawdown: challengeType.riskRules.maxTotalDrawdown,
      totalDrawdownUsed: ((totalDrawdown / challengeType.riskRules.maxTotalDrawdown) * 100).toFixed(1),
      
      // Trading stats
      totalTrades: challenge.stats.totalTrades,
      winningTrades: challenge.stats.winningTrades,
      losingTrades: challenge.stats.losingTrades,
      winRate: challenge.stats.winRate.toFixed(1),
      profitFactor: challenge.stats.profitFactor.toFixed(2),
      
      // Days
      tradingDays: challenge.stats.tradingDays,
      minimumTradingDays: currentPhaseConfig?.minimumTradingDays || 0,
      daysRemaining: challenge.expiresAt ? Math.max(0, Math.ceil((new Date(challenge.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : null,
      
      // Status
      status: challenge.status,
      startedAt: challenge.startedAt,
      expiresAt: challenge.expiresAt,
      
      // Rules
      rules: {
        maxDailyDrawdown: challengeType.riskRules.maxDailyDrawdown,
        maxTotalDrawdown: challengeType.riskRules.maxTotalDrawdown,
        maxInactiveDays: challengeType.riskRules.maxInactiveDays,
        weekendHoldingAllowed: challengeType.riskRules.weekendHoldingAllowed,
        newsTrading: challengeType.riskRules.newsTrading,
        mandatorySL: challengeType.riskRules.mandatorySL,
        eaAllowed: challengeType.riskRules.eaAllowed
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get challenge stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * @route   POST /api/challenges/:id/payout
 * @desc    Request payout for funded account
 * @access  Private
 */
router.post('/:id/payout', protect, async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;

    const challenge = await UserChallenge.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'funded',
      'fundedAccount.isActive': true
    }).populate('challengeType');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Funded account not found'
      });
    }

    // Check minimum payout
    const minPayout = challenge.challengeType.payoutConfig.minimumPayout;
    if (amount < minPayout) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout amount is $${minPayout}`
      });
    }

    // Check available profit
    const profit = challenge.balance - challenge.initialBalance;
    if (amount > profit) {
      return res.status(400).json({
        success: false,
        message: 'Requested amount exceeds available profit'
      });
    }

    // Check for pending payout
    const pendingPayout = await ChallengePayout.findOne({
      userChallenge: challenge._id,
      status: { $in: ['pending', 'processing'] }
    });

    if (pendingPayout) {
      return res.status(400).json({
        success: false,
        message: 'You have a pending payout request'
      });
    }

    // Calculate shares
    const profitSplit = challenge.fundedAccount.profitSplit;
    const traderShare = (amount * profitSplit) / 100;
    const platformShare = amount - traderShare;

    // Create payout request
    const payout = new ChallengePayout({
      userChallenge: challenge._id,
      user: req.user._id,
      requestedAmount: amount,
      profitSplit,
      traderShare,
      platformShare,
      accountBalanceAtRequest: challenge.balance,
      profitAtRequest: profit,
      paymentMethod,
      paymentDetails
    });

    await payout.save();

    res.status(201).json({
      success: true,
      message: 'Payout request submitted successfully',
      data: payout
    });
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request payout'
    });
  }
});

/**
 * @route   GET /api/challenges/:id/payouts
 * @desc    Get payout history for challenge
 * @access  Private
 */
router.get('/:id/payouts', protect, async (req, res) => {
  try {
    const challenge = await UserChallenge.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const payouts = await ChallengePayout.find({ userChallenge: challenge._id })
      .sort({ requestedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: payouts
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payouts'
    });
  }
});

module.exports = router;
