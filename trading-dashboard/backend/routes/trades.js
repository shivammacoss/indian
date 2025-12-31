const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const TradeMaster = require('../models/TradeMaster');
const CopyTradeEngine = require('../services/copyTradeEngine');
const { protect } = require('../middleware/auth');
const tradeEngine = require('../services/TradeEngine');
const UserChallenge = require('../models/UserChallenge');
const TradingAccount = require('../models/TradingAccount');

// Pre-trade Challenge Rule Checker - Check if new trade is allowed
const checkPreTradeRules = async (tradingAccountId, userId, tradeData = {}) => {
  try {
    const account = await TradingAccount.findById(tradingAccountId);
    if (!account || !account.isChallenge) return { allowed: true };

    const challenge = await UserChallenge.findOne({
      tradingAccount: tradingAccountId,
      user: userId,
      status: 'active'
    }).populate('challengeType');

    if (!challenge) return { allowed: true };

    const rules = challenge.challengeType?.riskRules;
    if (!rules) return { allowed: true };

    // Check max positions
    if (rules.maxPositions && rules.maxPositions > 0) {
      const openTrades = await Trade.countDocuments({
        tradingAccount: tradingAccountId,
        status: 'open'
      });
      if (openTrades >= rules.maxPositions) {
        return { 
          allowed: false, 
          message: `Maximum ${rules.maxPositions} position(s) allowed. Close existing trades first.`,
          ruleViolated: 'max_positions'
        };
      }
    }

    // Check max total trades in challenge
    if (rules.maxTotalTrades && rules.maxTotalTrades > 0) {
      const totalTrades = await Trade.countDocuments({
        tradingAccount: tradingAccountId,
        user: userId
      });
      
      if (totalTrades >= rules.maxTotalTrades) {
        // Check if we should warn or blow
        if (rules.warnBeforeBlow && !challenge.ruleViolationWarned) {
          // First violation - warn
          challenge.ruleViolationWarned = true;
          challenge.lastViolationType = 'max_total_trades';
          await challenge.save();
          return {
            allowed: false,
            message: `⚠️ WARNING: You've reached the maximum ${rules.maxTotalTrades} trades limit. One more attempt will fail your challenge!`,
            ruleViolated: 'max_total_trades',
            isWarning: true
          };
        } else {
          // Second violation or no warning - blow account
          return {
            allowed: false,
            message: `Challenge failed! Maximum ${rules.maxTotalTrades} trades exceeded.`,
            ruleViolated: 'max_total_trades',
            shouldFail: true
          };
        }
      }
    }

    // Check max trades per day
    if (rules.maxTradesPerDay && rules.maxTradesPerDay > 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tradesToday = await Trade.countDocuments({
        tradingAccount: tradingAccountId,
        user: userId,
        createdAt: { $gte: todayStart }
      });
      
      if (tradesToday >= rules.maxTradesPerDay) {
        return {
          allowed: false,
          message: `Maximum ${rules.maxTradesPerDay} trades per day reached. Try again tomorrow.`,
          ruleViolated: 'max_trades_per_day'
        };
      }
    }

    // Check minimum time between trades
    if (rules.minTimeBetweenTrades && rules.minTimeBetweenTrades > 0) {
      const lastTrade = await Trade.findOne({
        tradingAccount: tradingAccountId,
        user: userId
      }).sort({ createdAt: -1 });

      if (lastTrade) {
        const timeSinceLastTrade = (Date.now() - new Date(lastTrade.createdAt).getTime()) / 1000;
        if (timeSinceLastTrade < rules.minTimeBetweenTrades) {
          const waitTime = Math.ceil((rules.minTimeBetweenTrades - timeSinceLastTrade) / 60);
          return { 
            allowed: false, 
            message: `Please wait ${waitTime} more minute(s) before opening a new trade.`,
            ruleViolated: 'min_time_between_trades'
          };
        }
      }
    }

    // Check mandatory SL requirement
    if (rules.mandatorySL && !tradeData.stopLoss) {
      return {
        allowed: false,
        message: `Stop Loss is mandatory for challenge accounts. Please set a Stop Loss.`,
        ruleViolated: 'mandatory_sl'
      };
    }

    // Check max lot size
    if (rules.maxLotSize && rules.maxLotSize > 0 && tradeData.amount) {
      if (parseFloat(tradeData.amount) > rules.maxLotSize) {
        return {
          allowed: false,
          message: `Maximum lot size is ${rules.maxLotSize}. You tried ${tradeData.amount} lots.`,
          ruleViolated: 'max_lot_size'
        };
      }
    }

    // Check current drawdown before allowing trade
    const dailyDrawdown = ((challenge.dailyStartBalance - account.balance) / challenge.dailyStartBalance) * 100;
    const totalDrawdown = ((challenge.highestBalance - account.balance) / challenge.highestBalance) * 100;

    if (dailyDrawdown >= rules.maxDailyDrawdown) {
      return {
        allowed: false,
        message: `Daily drawdown limit (${rules.maxDailyDrawdown}%) reached. No more trades allowed today.`,
        ruleViolated: 'max_daily_drawdown',
        shouldFail: true
      };
    }

    if (totalDrawdown >= rules.maxTotalDrawdown) {
      return {
        allowed: false,
        message: `Total drawdown limit (${rules.maxTotalDrawdown}%) reached. Challenge failed!`,
        ruleViolated: 'max_total_drawdown',
        shouldFail: true
      };
    }

    return { allowed: true, challenge, rules };
  } catch (error) {
    console.error('Pre-trade rule check error:', error);
    return { allowed: true }; // Don't block on error
  }
};

// Challenge Rule Checker - Auto-fail challenge if rules violated
const checkChallengeRules = async (tradingAccountId, userId) => {
  try {
    // Check if this is a challenge account
    const account = await TradingAccount.findById(tradingAccountId);
    if (!account || !account.isChallenge) return { ok: true };

    // Find the associated challenge
    const challenge = await UserChallenge.findOne({
      tradingAccount: tradingAccountId,
      user: userId,
      status: 'active'
    }).populate('challengeType');

    if (!challenge) return { ok: true };

    const rules = challenge.challengeType?.riskRules;
    if (!rules) return { ok: true };

    // Calculate current drawdowns
    const dailyDrawdown = ((challenge.dailyStartBalance - account.balance) / challenge.dailyStartBalance) * 100;
    const totalDrawdown = ((challenge.highestBalance - account.balance) / challenge.highestBalance) * 100;

    // Update challenge stats
    challenge.stats.currentDailyDrawdown = Math.max(0, dailyDrawdown);
    challenge.stats.currentTotalDrawdown = Math.max(0, totalDrawdown);
    challenge.stats.maxDailyDrawdownReached = Math.max(challenge.stats.maxDailyDrawdownReached, dailyDrawdown);
    challenge.stats.maxTotalDrawdownReached = Math.max(challenge.stats.maxTotalDrawdownReached, totalDrawdown);

    // Check if rules violated
    if (dailyDrawdown >= rules.maxDailyDrawdown) {
      await failChallenge(challenge, 'max_daily_drawdown', `Daily drawdown of ${dailyDrawdown.toFixed(2)}% exceeded limit of ${rules.maxDailyDrawdown}%`);
      return { ok: false, reason: 'max_daily_drawdown', message: 'Daily drawdown limit exceeded - Challenge failed!' };
    }

    if (totalDrawdown >= rules.maxTotalDrawdown) {
      await failChallenge(challenge, 'max_total_drawdown', `Total drawdown of ${totalDrawdown.toFixed(2)}% exceeded limit of ${rules.maxTotalDrawdown}%`);
      return { ok: false, reason: 'max_total_drawdown', message: 'Total drawdown limit exceeded - Challenge failed!' };
    }

    await challenge.save();
    return { ok: true };
  } catch (error) {
    console.error('Challenge rule check error:', error);
    return { ok: true }; // Don't block trades on error
  }
};

// Fail challenge and close all trades
const failChallenge = async (challenge, reason, details) => {
  try {
    challenge.status = 'failed';
    challenge.failureReason = reason;
    challenge.failureDetails = details;
    challenge.failedAt = new Date();
    await challenge.save();

    // Close all open trades for this challenge account
    await Trade.updateMany(
      { tradingAccount: challenge.tradingAccount, status: 'open' },
      { status: 'closed', closedAt: new Date(), closeReason: 'challenge_failed' }
    );

    // Set trading account balance to 0 (blown)
    await TradingAccount.findByIdAndUpdate(challenge.tradingAccount, {
      balance: 0,
      equity: 0,
      status: 'closed'
    });

    console.log(`[Challenge] Failed: ${challenge.accountNumber} - ${reason}`);
  } catch (error) {
    console.error('Fail challenge error:', error);
  }
};

// Update challenge balance after trade
const updateChallengeBalance = async (tradingAccountId, newBalance) => {
  try {
    const account = await TradingAccount.findById(tradingAccountId);
    if (!account || !account.isChallenge) return;

    const challenge = await UserChallenge.findOne({
      tradingAccount: tradingAccountId,
      status: 'active'
    });

    if (!challenge) return;

    // Update challenge balance
    challenge.balance = newBalance;
    challenge.equity = newBalance;
    challenge.lastActivityAt = new Date();

    // Update highest balance if new high
    if (newBalance > challenge.highestBalance) {
      challenge.highestBalance = newBalance;
      challenge.highestEquity = newBalance;
    }

    // Calculate profit achieved
    const profitPercent = ((newBalance - challenge.initialBalance) / challenge.initialBalance) * 100;
    const currentPhase = challenge.phases.find(p => p.phaseNumber === challenge.currentPhase);
    if (currentPhase) {
      currentPhase.profitAchieved = profitPercent;
    }

    await challenge.save();

    // Check if passed phase
    if (currentPhase && profitPercent >= currentPhase.profitTarget) {
      console.log(`[Challenge] ${challenge.accountNumber} passed phase ${challenge.currentPhase}!`);
    }
  } catch (error) {
    console.error('Update challenge balance error:', error);
  }
};

// Initialize copy trade engine (io will be set later via tradeEngine)
let copyTradeEngine = null;

// Get or create copy trade engine instance
const getCopyTradeEngine = () => {
  if (!copyTradeEngine) {
    copyTradeEngine = new CopyTradeEngine(tradeEngine.io);
  }
  return copyTradeEngine;
};

// @route   GET /api/trades
// @desc    Get all trades for current user (all account types combined)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, symbol, tradingAccountId, page = 1, limit = 50 } = req.query;
    
    const query = { user: req.user.id };
    if (status) query.status = status;
    if (symbol) query.symbol = symbol.toUpperCase();
    if (tradingAccountId) query.tradingAccount = tradingAccountId;

    // Use lean() for faster queries and get count in parallel
    const [trades, total] = await Promise.all([
      Trade.find(query)
        .populate({
          path: 'tradingAccount',
          select: 'accountNumber accountType',
          populate: { path: 'accountType', select: 'name code color' }
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Trade.countDocuments(query)
    ]);

    // Map trades with account type info (no extra DB calls)
    const enrichedTrades = trades.map(trade => ({
      ...trade,
      accountTypeName: trade.tradingAccount?.accountType?.name || 'Wallet',
      accountTypeColor: trade.tradingAccount?.accountType?.color || '#6b7280'
    }));

    res.json({
      success: true,
      data: {
        trades: enrichedTrades,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/trades/prices
// @desc    Get all current prices
// @access  Private
router.get('/prices', protect, async (req, res) => {
  try {
    const prices = tradeEngine.getAllPrices();
    res.json({ success: true, data: prices });
  } catch (error) {
    console.error('Get prices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trades/price/:symbol
// @desc    Get current price for symbol
// @access  Private
router.get('/price/:symbol', protect, async (req, res) => {
  try {
    const price = tradeEngine.getPrice(req.params.symbol);
    if (!price) {
      return res.status(404).json({ success: false, message: 'Symbol not found' });
    }
    res.json({ success: true, data: price });
  } catch (error) {
    console.error('Get price error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trades/price-with-spread/:symbol
// @desc    Get price with spread calculated for user's account type
// @access  Private
router.get('/price-with-spread/:symbol', protect, async (req, res) => {
  try {
    const { tradingAccountId } = req.query;
    const symbol = req.params.symbol.toUpperCase();
    
    const price = tradeEngine.getPrice(symbol);
    if (!price) {
      return res.status(404).json({ success: false, message: 'Symbol not found' });
    }
    
    // Get account type spread and charges
    const TradingAccount = require('../models/TradingAccount');
    const AccountType = require('../models/AccountType');
    const TradingCharge = require('../models/TradingCharge');
    
    let spreadPips = 0;
    let commissionPerLot = 0;
    let tradingFeePercent = 0;
    let accountTypeName = 'Standard';
    
    // Get trading account and its type
    if (tradingAccountId) {
      const tradingAccount = await TradingAccount.findById(tradingAccountId).populate('accountType');
      if (tradingAccount?.accountType) {
        spreadPips = tradingAccount.accountType.spreadMarkup || 0;
        commissionPerLot = tradingAccount.accountType.commission || 0;
        tradingFeePercent = tradingAccount.accountType.tradingFee || 0;
        accountTypeName = tradingAccount.accountType.name;
      }
    }
    
    // Also check TradingCharge settings (can override/add to account type)
    try {
      const charges = await TradingCharge.getChargesForTrade(symbol, req.user._id);
      if (charges.spreadPips > spreadPips) spreadPips = charges.spreadPips;
      if (charges.commissionPerLot > commissionPerLot) commissionPerLot = charges.commissionPerLot;
      if (charges.feePercentage > tradingFeePercent) tradingFeePercent = charges.feePercentage;
    } catch (e) {}
    
    // Calculate prices with spread
    const pipSize = tradeEngine.getPipSize(symbol);
    const spreadValue = spreadPips * pipSize;
    
    // Buy price = Ask + spread (worse for buyer)
    // Sell price = Bid - spread (worse for seller)
    const buyPrice = price.ask + spreadValue;
    const sellPrice = price.bid - spreadValue;
    
    res.json({
      success: true,
      data: {
        symbol,
        // Raw prices (from market)
        rawBid: price.bid,
        rawAsk: price.ask,
        // Prices with spread (what user actually gets)
        buyPrice: parseFloat(buyPrice.toFixed(5)),
        sellPrice: parseFloat(sellPrice.toFixed(5)),
        // Spread info
        spreadPips,
        spreadValue: parseFloat(spreadValue.toFixed(5)),
        // Charges info
        commissionPerLot,
        tradingFeePercent,
        accountType: accountTypeName,
        // For display
        pipSize
      }
    });
  } catch (error) {
    console.error('Get price with spread error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trades/calculate-charges
// @desc    Calculate charges for a trade before opening (SIMPLIFIED: only spread & commission)
// @access  Private
router.get('/calculate-charges', protect, async (req, res) => {
  try {
    const { symbol, amount, tradingAccountId, leverage: requestedLeverage } = req.query;
    
    if (!symbol || !amount) {
      return res.status(400).json({ success: false, message: 'Symbol and amount required' });
    }
    
    const price = tradeEngine.getPrice(symbol.toUpperCase());
    if (!price) {
      return res.status(404).json({ success: false, message: 'Symbol not found' });
    }
    
    const TradingAccount = require('../models/TradingAccount');
    const TradingCharge = require('../models/TradingCharge');
    
    let spreadPips = 0;
    let commissionPerLot = 0;
    let accountTypeName = 'Standard';
    let maxLeverage = 100;
    let accountTypeId = null;
    
    // Get trading account info
    if (tradingAccountId) {
      const tradingAccount = await TradingAccount.findById(tradingAccountId).populate('accountType');
      if (tradingAccount) {
        accountTypeName = tradingAccount.accountType?.name || 'Standard';
        maxLeverage = tradingAccount.leverage || 1000;
        accountTypeId = tradingAccount.accountType?._id;
      }
    }
    
    // Use requested leverage directly - user chooses their leverage
    let leverage = requestedLeverage ? parseInt(requestedLeverage) : 100;
    if (isNaN(leverage) || leverage < 1) leverage = 100;
    if (leverage > 2000) leverage = 2000; // Max safety cap
    
    console.log(`[Calculate-Charges] Symbol: ${symbol}, Amount: ${amount}, Requested Leverage: ${requestedLeverage}, Parsed: ${leverage}`);
    
    // Get charges from TradingCharge settings (with accountTypeId for priority)
    try {
      const charges = await TradingCharge.getChargesForTrade(symbol.toUpperCase(), req.user._id, accountTypeId);
      spreadPips = charges.spreadPips || 0;
      commissionPerLot = charges.commissionPerLot || 0;
    } catch (e) {}
    
    // Calculate (SIMPLIFIED: only commission, no percentage fee)
    const lots = parseFloat(amount);
    const contractSize = tradeEngine.getContractSize(symbol.toUpperCase());
    const tradeValue = lots * price.ask * contractSize;
    
    const commission = lots * commissionPerLot;
    const totalCharges = Math.round(commission * 100) / 100;
    
    const margin = tradeValue / leverage;
    const totalRequired = margin + totalCharges;
    
    console.log(`[Calculate-Charges] TradeValue: ${tradeValue}, Leverage: ${leverage}, Margin: ${margin}`);
    
    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        lots,
        price: price.ask,
        accountType: accountTypeName,
        leverage,
        // Breakdown (SIMPLIFIED: only spread & commission)
        tradeValue: Math.round(tradeValue * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        spreadPips,
        commissionPerLot,
        commission: Math.round(commission * 100) / 100,
        totalCharges,
        totalRequired: Math.round(totalRequired * 100) / 100
      }
    });
  } catch (error) {
    console.error('Calculate charges error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trades/floating-pnl
// @desc    Get floating P&L for user
// @access  Private
router.get('/floating-pnl', protect, async (req, res) => {
  try {
    const result = await tradeEngine.getFloatingPnL(req.user.id);
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        ...result,
        balance: user.balance,
        equity: user.balance + result.totalPnL
      }
    });
  } catch (error) {
    console.error('Get floating PnL error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/trades
// @desc    Create new trade (market or pending order)
// @access  Private
router.post('/', protect, [
  body('symbol').notEmpty().withMessage('Symbol is required'),
  body('type').isIn(['buy', 'sell']).withMessage('Type must be buy or sell'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount/Lot size must be at least 0.01')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { symbol, type, orderType = 'market', amount, price, leverage = 100, stopLoss, takeProfit, tradingAccountId } = req.body;

    // Check challenge pre-trade rules before allowing trade
    if (tradingAccountId) {
      const preTradeCheck = await checkPreTradeRules(tradingAccountId, req.user.id, { 
        symbol, type, amount, stopLoss, takeProfit 
      });
      
      if (!preTradeCheck.allowed) {
        // If shouldFail is true, fail the challenge
        if (preTradeCheck.shouldFail) {
          const challenge = await UserChallenge.findOne({
            tradingAccount: tradingAccountId,
            user: req.user.id,
            status: 'active'
          });
          
          if (challenge) {
            challenge.status = 'failed';
            challenge.failureReason = preTradeCheck.ruleViolated;
            challenge.failureDetails = preTradeCheck.message;
            challenge.failedAt = new Date();
            await challenge.save();
            
            // Close all open trades
            await Trade.updateMany(
              { tradingAccount: tradingAccountId, status: 'open' },
              { status: 'closed', closedAt: new Date(), closeReason: 'challenge_failed' }
            );
            
            // Set account balance to 0
            await TradingAccount.findByIdAndUpdate(tradingAccountId, {
              balance: 0,
              equity: 0,
              status: 'suspended'
            });
            
            // Emit challenge failed event via socket
            if (tradeEngine.io) {
              tradeEngine.io.to(`user_${req.user.id}`).emit('challengeFailed', {
                challengeId: challenge._id,
                reason: preTradeCheck.ruleViolated,
                message: preTradeCheck.message
              });
            }
          }
        }
        
        return res.status(400).json({
          success: false,
          message: preTradeCheck.message,
          challengeRuleViolation: true,
          isWarning: preTradeCheck.isWarning || false,
          challengeFailed: preTradeCheck.shouldFail || false
        });
      }
    }

    let trade;
    
    if (orderType === 'market') {
      // Execute market order immediately
      trade = await tradeEngine.executeMarketOrder(req.user.id, {
        symbol,
        type,
        amount,
        leverage,
        stopLoss,
        takeProfit,
        tradingAccountId
      });

      // Check if user is a trade master and mirror to followers
      const user = await User.findById(req.user.id);
      console.log(`[CopyTrade] Checking if user ${req.user.id} is a trade master...`);
      
      const tradeMaster = await TradeMaster.findOne({ userId: req.user.id, status: 'approved' });
      console.log(`[CopyTrade] TradeMaster found: ${tradeMaster ? 'YES' : 'NO'}`);
      
      if (tradeMaster) {
        console.log(`[CopyTrade] User is approved master, mirroring trade ${trade._id}...`);
        // Mirror trade to followers asynchronously
        const engine = getCopyTradeEngine();
        engine.mirrorTradeToFollowers(trade, user).then(results => {
          console.log(`[CopyTrade] Mirror complete. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
          results.forEach(r => {
            if (!r.success) console.log(`[CopyTrade] Failed for follower ${r.followerId}: ${r.reason}`);
          });
        }).catch(err => {
          console.error('[CopyTrade] Mirror error:', err);
        });
      } else {
        // Check if user has any master profile
        const anyMaster = await TradeMaster.findOne({ userId: req.user.id });
        if (anyMaster) {
          console.log(`[CopyTrade] User has master profile but status is: ${anyMaster.status}`);
        }
      }
    } else {
      // Create pending order (limit/stop)
      if (!price) {
        return res.status(400).json({
          success: false,
          message: 'Price is required for pending orders'
        });
      }
      trade = await tradeEngine.executePendingOrder(req.user.id, {
        symbol,
        type,
        orderType,
        amount,
        price,
        leverage,
        stopLoss,
        takeProfit
      });
    }

    res.status(201).json({
      success: true,
      message: orderType === 'market' ? 'Trade opened successfully' : 'Pending order placed',
      data: trade
    });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create trade'
    });
  }
});

// @route   PUT/POST /api/trades/:id/close
// @desc    Close a trade
// @access  Private
const closeTradeHandler = async (req, res) => {
  try {
    console.log(`[CloseTrade] Attempting to close trade ${req.params.id} for user ${req.user.id}`);
    
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: 'open'
    });

    if (!trade) {
      // Check if trade exists at all
      const anyTrade = await Trade.findOne({ _id: req.params.id });
      console.log(`[CloseTrade] Trade not found with status open. Exists: ${!!anyTrade}, Status: ${anyTrade?.status}, Owner: ${anyTrade?.user}`);
      return res.status(404).json({
        success: false,
        message: 'Trade not found or already closed'
      });
    }
    
    console.log(`[CloseTrade] Found trade: ${trade.symbol} ${trade.type} ${trade.amount} lots`);

    // Get current market price
    const price = tradeEngine.getPrice(trade.symbol);
    if (!price) {
      return res.status(400).json({
        success: false,
        message: 'Unable to get current price'
      });
    }

    const closePrice = trade.type === 'buy' ? price.bid : price.ask;
    const closedTrade = await tradeEngine.closeTrade(trade, closePrice, 'manual');
    
    // Note: TradeEngine.closeTrade already handles closing follower trades internally

    // Check challenge rules after trade closes (for challenge accounts)
    if (trade.tradingAccount) {
      const tradingAccount = await TradingAccount.findById(trade.tradingAccount);
      if (tradingAccount) {
        // Update challenge balance
        await updateChallengeBalance(trade.tradingAccount, tradingAccount.balance);
        
        // Check if challenge rules violated
        const ruleCheck = await checkChallengeRules(trade.tradingAccount, req.user.id);
        if (!ruleCheck.ok) {
          return res.json({
            success: true,
            message: `Trade closed. ${ruleCheck.message}`,
            data: closedTrade,
            challengeFailed: true,
            failureReason: ruleCheck.reason
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Trade closed successfully',
      data: closedTrade
    });
  } catch (error) {
    console.error('Close trade error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Register both PUT and POST for close trade
router.put('/:id/close', protect, closeTradeHandler);
router.post('/:id/close', protect, closeTradeHandler);

// @route   PUT /api/trades/:id/modify
// @desc    Modify trade SL/TP
// @access  Private
router.put('/:id/modify', protect, async (req, res) => {
  try {
    const { stopLoss, takeProfit } = req.body;
    
    const trade = await tradeEngine.modifyTrade(req.params.id, req.user.id, {
      stopLoss,
      takeProfit
    });

    res.json({
      success: true,
      message: 'Trade modified successfully',
      data: trade
    });
  } catch (error) {
    console.error('Modify trade error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to modify trade'
    });
  }
});

// @route   PUT /api/trades/:id/cancel
// @desc    Cancel pending order
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const trade = await tradeEngine.cancelPendingOrder(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Pending order cancelled',
      data: trade
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
});

// @route   POST /api/trades/close-all
// @desc    Close all open trades
// @access  Private
router.post('/close-all', protect, async (req, res) => {
  try {
    const openTrades = await Trade.find({ user: req.user.id, status: 'open' });
    const closedTrades = [];
    let totalPnL = 0;

    for (const trade of openTrades) {
      const price = tradeEngine.getPrice(trade.symbol);
      if (!price) continue;

      const closePrice = trade.type === 'buy' ? price.bid : price.ask;
      const closedTrade = await tradeEngine.closeTrade(trade, closePrice, 'manual');
      if (closedTrade) {
        closedTrades.push(closedTrade);
        totalPnL += closedTrade.profit;
      }
    }

    res.json({
      success: true,
      message: `Closed ${closedTrades.length} trades`,
      data: {
        closedTrades,
        totalPnL
      }
    });
  } catch (error) {
    console.error('Close all trades error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @route   GET /api/trades/stats
// @desc    Get trading statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await Trade.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          openTrades: {
            $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
          },
          closedTrades: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
          },
          totalProfit: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, '$profit', 0] }
          },
          winningTrades: {
            $sum: { $cond: [{ $and: [{ $eq: ['$status', 'closed'] }, { $gt: ['$profit', 0] }] }, 1, 0] }
          },
          losingTrades: {
            $sum: { $cond: [{ $and: [{ $eq: ['$status', 'closed'] }, { $lt: ['$profit', 0] }] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalProfit: 0,
        winningTrades: 0,
        losingTrades: 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
