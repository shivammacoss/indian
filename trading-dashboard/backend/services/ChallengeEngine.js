/**
 * Challenge Engine Service
 * Handles automated evaluation, rule enforcement, and phase transitions for Prop Firm Challenges
 */

const UserChallenge = require('../models/UserChallenge');
const ChallengeTrade = require('../models/ChallengeTrade');
const ChallengeType = require('../models/ChallengeType');

class ChallengeEngine {
  constructor(io) {
    this.io = io;
    this.checkInterval = null;
  }

  /**
   * Start the challenge monitoring loop
   */
  start() {
    console.log('[ChallengeEngine] Starting challenge monitoring...');
    
    // Run checks every minute
    this.checkInterval = setInterval(() => {
      this.runChecks();
    }, 60000);

    // Initial check
    this.runChecks();
  }

  /**
   * Stop the challenge monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('[ChallengeEngine] Stopped');
  }

  /**
   * Run all periodic checks
   */
  async runChecks() {
    try {
      await this.checkExpiredChallenges();
      await this.checkInactiveChallenges();
      await this.resetDailyDrawdowns();
    } catch (error) {
      console.error('[ChallengeEngine] Check error:', error);
    }
  }

  /**
   * Check and fail expired challenges
   */
  async checkExpiredChallenges() {
    const now = new Date();
    
    const expiredChallenges = await UserChallenge.find({
      status: 'active',
      expiresAt: { $lte: now }
    });

    for (const challenge of expiredChallenges) {
      await this.failChallenge(challenge, 'time_limit_exceeded', 'Challenge time limit exceeded');
    }
  }

  /**
   * Check for inactive challenges
   */
  async checkInactiveChallenges() {
    const challenges = await UserChallenge.find({ status: 'active' })
      .populate('challengeType');

    for (const challenge of challenges) {
      const maxInactiveDays = challenge.challengeType.riskRules.maxInactiveDays;
      if (maxInactiveDays <= 0) continue;

      const lastActivity = challenge.lastTradeAt || challenge.startedAt;
      const daysSinceActivity = Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24));

      if (daysSinceActivity >= maxInactiveDays) {
        await this.failChallenge(challenge, 'inactivity', `No trading activity for ${daysSinceActivity} days`);
      }
    }
  }

  /**
   * Reset daily drawdown tracking at server day start (00:00 UTC)
   */
  async resetDailyDrawdowns() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Only reset if we haven't already reset today
    const challenges = await UserChallenge.find({
      status: { $in: ['active', 'funded'] },
      updatedAt: { $lt: todayStart }
    });

    for (const challenge of challenges) {
      // Reset daily tracking to higher of balance/equity
      const startValue = Math.max(challenge.balance, challenge.equity);
      challenge.dailyStartBalance = startValue;
      challenge.dailyStartEquity = startValue;
      challenge.stats.currentDailyDrawdown = 0;
      await challenge.save();
    }
  }

  /**
   * Validate a trade before execution
   * Returns { valid: boolean, reason: string, autoSl: number, autoTp: number }
   */
  async validateTrade(challengeId, tradeData) {
    const challenge = await UserChallenge.findById(challengeId)
      .populate('challengeType');

    if (!challenge) {
      return { valid: false, reason: 'Challenge not found' };
    }

    if (challenge.status !== 'active' && challenge.status !== 'funded') {
      return { valid: false, reason: 'Challenge is not active' };
    }

    // Check if challenge has expired
    if (challenge.expiresAt && new Date() > challenge.expiresAt) {
      await this.failChallenge(challenge, 'time_limit_exceeded', 'Challenge time limit exceeded');
      return { valid: false, reason: 'Challenge has expired' };
    }

    const rules = challenge.challengeType.riskRules;
    const limits = challenge.tradingLimits || {};
    const { symbol, volume, type, stopLoss, price } = tradeData;

    // Check allowed instruments
    if (rules.allowedInstruments && rules.allowedInstruments.length > 0 && !rules.allowedInstruments.includes(symbol)) {
      return { valid: false, reason: `Trading ${symbol} is not allowed for this challenge` };
    }

    // Check max lot size
    if (rules.maxLotSize > 0 && volume > rules.maxLotSize) {
      return { valid: false, reason: `Maximum lot size is ${rules.maxLotSize}` };
    }

    // Check max positions (no multiple positions rule)
    if (!limits.allowMultiplePositions) {
      const openPositions = await ChallengeTrade.countDocuments({
        userChallenge: challengeId,
        status: 'open'
      });
      if (openPositions >= 1) {
        return { valid: false, reason: 'Only one position allowed at a time' };
      }
    } else if (rules.maxPositions > 0) {
      const openPositions = await ChallengeTrade.countDocuments({
        userChallenge: challengeId,
        status: 'open'
      });
      if (openPositions >= rules.maxPositions) {
        return { valid: false, reason: `Maximum ${rules.maxPositions} positions allowed` };
      }
    }

    // Check daily trade limit
    if (limits.maxTradesPerDay > 0) {
      const today = new Date().toDateString();
      // Reset daily count if new day
      if (challenge.dailyTradeDate !== today) {
        challenge.dailyTradeCount = 0;
        challenge.dailyTradeDate = today;
        await challenge.save();
      }
      if (challenge.dailyTradeCount >= limits.maxTradesPerDay) {
        return { valid: false, reason: `Maximum ${limits.maxTradesPerDay} trades per day reached` };
      }
    }

    // Check phase trade limit
    if (limits.maxTradesPerPhase > 0 && challenge.phaseTradeCount >= limits.maxTradesPerPhase) {
      return { valid: false, reason: `Maximum ${limits.maxTradesPerPhase} trades per phase reached` };
    }

    // Check mandatory SL
    if (rules.mandatorySL && !stopLoss) {
      return { valid: false, reason: 'Stop Loss is mandatory for this challenge' };
    }

    // Check weekend holding
    if (!rules.weekendHoldingAllowed) {
      const now = new Date();
      const day = now.getUTCDay();
      const hour = now.getUTCHours();
      
      // Friday after 21:00 UTC
      if ((day === 5 && hour >= 21) || day === 6 || (day === 0 && hour < 21)) {
        return { valid: false, reason: 'Weekend trading/holding is not allowed' };
      }
    }

    // Calculate auto SL/TP if enabled
    let autoSl = null;
    let autoTp = null;
    
    if (limits.autoSlEnabled && price) {
      const slAmount = (challenge.balance * limits.autoSlPercent) / 100;
      // Calculate SL price based on position type
      const pipValue = this.getPipValue(symbol, volume);
      const slPips = slAmount / pipValue;
      autoSl = type === 'buy' ? price - (slPips * this.getPipSize(symbol)) : price + (slPips * this.getPipSize(symbol));
    }
    
    if (limits.autoTpEnabled && price) {
      const tpAmount = (challenge.balance * limits.autoTpPercent) / 100;
      const pipValue = this.getPipValue(symbol, volume);
      const tpPips = tpAmount / pipValue;
      autoTp = type === 'buy' ? price + (tpPips * this.getPipSize(symbol)) : price - (tpPips * this.getPipSize(symbol));
    }

    return { valid: true, reason: '', autoSl, autoTp };
  }

  /**
   * Get pip size for a symbol
   */
  getPipSize(symbol) {
    if (symbol.includes('JPY')) return 0.01;
    if (symbol.includes('XAU')) return 0.1;
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 1;
    return 0.0001;
  }

  /**
   * Get pip value for a symbol and volume
   */
  getPipValue(symbol, volume) {
    let contractSize = 100000;
    if (symbol.includes('XAU')) contractSize = 100;
    else if (symbol.includes('XAG')) contractSize = 5000;
    else if (symbol.includes('BTC') || symbol.includes('ETH')) contractSize = 1;
    
    return volume * contractSize * this.getPipSize(symbol);
  }

  /**
   * Process a new trade opening
   */
  async onTradeOpen(challengeId, trade) {
    const challenge = await UserChallenge.findById(challengeId)
      .populate('challengeType');

    if (!challenge) return;

    // Update last trade time
    challenge.lastTradeAt = new Date();
    challenge.lastActivityAt = new Date();

    // Update trading days
    const today = new Date().toDateString();
    const tradedToday = challenge.stats.tradingDaysList.some(
      d => new Date(d).toDateString() === today
    );
    
    if (!tradedToday) {
      challenge.stats.tradingDaysList.push(new Date());
      challenge.stats.tradingDays += 1;
    }

    // Update stats
    challenge.stats.totalTrades += 1;
    challenge.stats.totalVolume += trade.volume;

    // Update trade counts for limits
    if (challenge.dailyTradeDate !== today) {
      challenge.dailyTradeCount = 1;
      challenge.dailyTradeDate = today;
    } else {
      challenge.dailyTradeCount += 1;
    }
    challenge.phaseTradeCount += 1;
    challenge.openPositionsCount += 1;

    await challenge.save();

    // Emit update to client
    this.emitChallengeUpdate(challenge);
  }

  /**
   * Process a trade closing
   */
  async onTradeClose(challengeId, trade, closePrice) {
    const challenge = await UserChallenge.findById(challengeId)
      .populate('challengeType');

    if (!challenge) return;

    // Calculate P/L
    const priceDiff = trade.type === 'buy' 
      ? closePrice - trade.openPrice 
      : trade.openPrice - closePrice;

    let contractSize = 100000;
    if (trade.symbol.includes('XAU')) contractSize = 100;
    else if (trade.symbol.includes('XAG')) contractSize = 5000;
    else if (trade.symbol.includes('BTC') || trade.symbol.includes('ETH')) contractSize = 1;

    const profit = priceDiff * trade.volume * contractSize;
    const netProfit = profit - (trade.commission || 0) - (trade.swap || 0);

    // Update trade
    trade.closePrice = closePrice;
    trade.profit = profit;
    trade.netProfit = netProfit;
    trade.status = 'closed';
    trade.closedAt = new Date();
    trade.balanceAtClose = challenge.balance + netProfit;
    trade.equityAtClose = trade.balanceAtClose;
    trade.durationSeconds = Math.floor((trade.closedAt - trade.openedAt) / 1000);
    trade.pips = trade.calculatePips();
    await trade.save();

    // Update challenge balance
    const oldBalance = challenge.balance;
    challenge.balance += netProfit;
    challenge.equity = challenge.balance;

    // Update highest balance/equity
    if (challenge.balance > challenge.highestBalance) {
      challenge.highestBalance = challenge.balance;
    }
    if (challenge.equity > challenge.highestEquity) {
      challenge.highestEquity = challenge.equity;
    }

    // Update stats
    if (netProfit > 0) {
      challenge.stats.winningTrades += 1;
      challenge.stats.totalProfit += netProfit;
      if (netProfit > challenge.stats.largestWin) {
        challenge.stats.largestWin = netProfit;
      }
    } else {
      challenge.stats.losingTrades += 1;
      challenge.stats.totalLoss += Math.abs(netProfit);
      if (Math.abs(netProfit) > challenge.stats.largestLoss) {
        challenge.stats.largestLoss = Math.abs(netProfit);
      }
    }

    // Calculate averages
    if (challenge.stats.winningTrades > 0) {
      challenge.stats.averageWin = challenge.stats.totalProfit / challenge.stats.winningTrades;
    }
    if (challenge.stats.losingTrades > 0) {
      challenge.stats.averageLoss = challenge.stats.totalLoss / challenge.stats.losingTrades;
    }

    // Calculate win rate
    const totalClosed = challenge.stats.winningTrades + challenge.stats.losingTrades;
    challenge.stats.winRate = totalClosed > 0 
      ? (challenge.stats.winningTrades / totalClosed) * 100 
      : 0;

    // Calculate profit factor
    challenge.stats.profitFactor = challenge.stats.totalLoss > 0 
      ? challenge.stats.totalProfit / challenge.stats.totalLoss 
      : challenge.stats.totalProfit > 0 ? Infinity : 0;

    await challenge.save();

    // Check drawdown rules
    await this.checkDrawdownRules(challenge);

    // Check phase completion
    await this.checkPhaseCompletion(challenge);

    // Emit update
    this.emitChallengeUpdate(challenge);

    return { profit: netProfit, newBalance: challenge.balance };
  }

  /**
   * Update equity in real-time (for floating P/L)
   */
  async updateEquity(challengeId, floatingPnL) {
    const challenge = await UserChallenge.findById(challengeId)
      .populate('challengeType');

    if (!challenge || (challenge.status !== 'active' && challenge.status !== 'funded')) {
      return;
    }

    const oldEquity = challenge.equity;
    challenge.equity = challenge.balance + floatingPnL;

    // Update highest equity
    if (challenge.equity > challenge.highestEquity) {
      challenge.highestEquity = challenge.equity;
    }

    // Calculate current drawdowns
    const dailyDrawdown = challenge.getDailyDrawdownPercent();
    const totalDrawdown = challenge.getTotalDrawdownPercent();

    challenge.stats.currentDailyDrawdown = dailyDrawdown;
    challenge.stats.currentTotalDrawdown = totalDrawdown;

    // Track max drawdowns reached
    if (dailyDrawdown > challenge.stats.maxDailyDrawdownReached) {
      challenge.stats.maxDailyDrawdownReached = dailyDrawdown;
    }
    if (totalDrawdown > challenge.stats.maxTotalDrawdownReached) {
      challenge.stats.maxTotalDrawdownReached = totalDrawdown;
    }

    await challenge.save();

    // Check drawdown rules (real-time)
    await this.checkDrawdownRules(challenge);

    return {
      equity: challenge.equity,
      dailyDrawdown,
      totalDrawdown
    };
  }

  /**
   * Check drawdown rules and fail if violated
   */
  async checkDrawdownRules(challenge) {
    if (challenge.status !== 'active' && challenge.status !== 'funded') {
      return;
    }

    const rules = challenge.challengeType.riskRules;
    
    // Check daily drawdown
    const dailyDrawdown = challenge.getDailyDrawdownPercent();
    if (dailyDrawdown >= rules.maxDailyDrawdown) {
      await this.failChallenge(
        challenge, 
        'max_daily_drawdown', 
        `Daily drawdown limit (${rules.maxDailyDrawdown}%) exceeded: ${dailyDrawdown.toFixed(2)}%`
      );
      return;
    }

    // Check total drawdown
    const totalDrawdown = challenge.getTotalDrawdownPercent();
    if (totalDrawdown >= rules.maxTotalDrawdown) {
      await this.failChallenge(
        challenge, 
        'max_total_drawdown', 
        `Total drawdown limit (${rules.maxTotalDrawdown}%) exceeded: ${totalDrawdown.toFixed(2)}%`
      );
      return;
    }

    // For trailing drawdown (instant funding)
    if (rules.trailingDrawdown && challenge.challengeType.type === 'instant_funding') {
      const profit = ((challenge.highestBalance - challenge.initialBalance) / challenge.initialBalance) * 100;
      
      // Lock trailing at specified profit level
      if (profit >= rules.trailingDrawdownLockProfit && challenge.trailingDrawdownFloor === 0) {
        challenge.trailingDrawdownFloor = challenge.initialBalance;
        await challenge.save();
      }

      // Check if equity below trailing floor
      if (challenge.trailingDrawdownFloor > 0 && challenge.equity < challenge.trailingDrawdownFloor) {
        await this.failChallenge(
          challenge,
          'max_total_drawdown',
          'Trailing drawdown floor breached'
        );
      }
    }
  }

  /**
   * Check if phase is completed
   */
  async checkPhaseCompletion(challenge) {
    if (challenge.status !== 'active') return;

    const challengeType = challenge.challengeType;
    const currentPhase = challengeType.phases.find(p => p.phaseNumber === challenge.currentPhase);
    
    if (!currentPhase) return;

    // Check profit target
    const profitPercent = challenge.getCurrentProfitPercent();
    if (profitPercent < currentPhase.profitTarget) {
      return; // Target not met
    }

    // Check minimum trading days
    if (challenge.stats.tradingDays < currentPhase.minimumTradingDays) {
      return; // Not enough trading days
    }

    // Check minimum trades
    if (currentPhase.minimumTrades > 0 && challenge.stats.totalTrades < currentPhase.minimumTrades) {
      return; // Not enough trades
    }

    // Phase passed!
    await this.passPhase(challenge);
  }

  /**
   * Pass current phase and move to next
   */
  async passPhase(challenge) {
    const challengeType = challenge.challengeType;
    const currentPhaseIndex = challenge.phases.findIndex(p => p.phaseNumber === challenge.currentPhase);

    if (currentPhaseIndex === -1) return;

    // Mark current phase as passed
    challenge.phases[currentPhaseIndex].status = 'passed';
    challenge.phases[currentPhaseIndex].passedAt = new Date();
    challenge.phases[currentPhaseIndex].endDate = new Date();
    challenge.phases[currentPhaseIndex].endBalance = challenge.balance;
    challenge.phases[currentPhaseIndex].profitAchieved = challenge.getCurrentProfitPercent();
    challenge.phases[currentPhaseIndex].tradingDays = challenge.stats.tradingDays;

    // Check if all phases completed
    if (challenge.currentPhase >= challengeType.totalPhases) {
      // Challenge completed - fund the account
      challenge.status = 'funded';
      challenge.phaseStatus = 'passed';
      challenge.fundedAccount = {
        isActive: true,
        fundedAt: new Date(),
        profitSplit: challengeType.payoutConfig.profitSplit,
        totalPayouts: 0,
        scalingLevel: 0
      };

      console.log(`[ChallengeEngine] Challenge ${challenge.accountNumber} FUNDED!`);
      
      // Emit funded notification
      if (this.io) {
        this.io.to(`user_${challenge.user}`).emit('challenge_funded', {
          challengeId: challenge._id,
          accountNumber: challenge.accountNumber,
          accountSize: challenge.accountSize
        });
      }
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

      // Reset tracking for new phase
      challenge.highestBalance = challenge.balance;
      challenge.highestEquity = challenge.equity;
      challenge.dailyStartBalance = challenge.balance;
      challenge.dailyStartEquity = challenge.equity;
      challenge.stats.tradingDays = 0;
      challenge.stats.tradingDaysList = [];

      // Set new expiry if phase has time limit
      const nextPhaseConfig = challengeType.phases.find(p => p.phaseNumber === challenge.currentPhase);
      if (nextPhaseConfig && nextPhaseConfig.maximumTradingDays > 0) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + nextPhaseConfig.maximumTradingDays);
        challenge.expiresAt = expiryDate;
      }

      console.log(`[ChallengeEngine] Challenge ${challenge.accountNumber} passed Phase ${challenge.currentPhase - 1}`);

      // Emit phase passed notification
      if (this.io) {
        this.io.to(`user_${challenge.user}`).emit('challenge_phase_passed', {
          challengeId: challenge._id,
          accountNumber: challenge.accountNumber,
          phasePassed: challenge.currentPhase - 1,
          newPhase: challenge.currentPhase
        });
      }
    }

    await challenge.save();
    this.emitChallengeUpdate(challenge);
  }

  /**
   * Fail a challenge
   */
  async failChallenge(challenge, reason, details) {
    if (challenge.status === 'failed') return;

    console.log(`[ChallengeEngine] Challenge ${challenge.accountNumber} FAILED: ${reason} - ${details}`);

    challenge.status = 'failed';
    challenge.phaseStatus = 'failed';
    challenge.failureReason = reason;
    challenge.failureDetails = details;
    challenge.failedAt = new Date();

    // Update current phase
    const currentPhaseIndex = challenge.phases.findIndex(p => p.phaseNumber === challenge.currentPhase);
    if (currentPhaseIndex !== -1) {
      challenge.phases[currentPhaseIndex].status = 'failed';
      challenge.phases[currentPhaseIndex].failedAt = new Date();
      challenge.phases[currentPhaseIndex].failureReason = reason;
    }

    // Close all open trades
    await ChallengeTrade.updateMany(
      { userChallenge: challenge._id, status: 'open' },
      {
        status: 'closed',
        closedAt: new Date(),
        closeReason: 'challenge_failed'
      }
    );

    await challenge.save();

    // Emit failure notification
    if (this.io) {
      this.io.to(`user_${challenge.user}`).emit('challenge_failed', {
        challengeId: challenge._id,
        accountNumber: challenge.accountNumber,
        reason,
        details
      });
    }

    this.emitChallengeUpdate(challenge);
  }

  /**
   * Emit challenge update to connected clients
   */
  emitChallengeUpdate(challenge) {
    if (this.io) {
      this.io.to(`user_${challenge.user}`).emit('challenge_update', {
        challengeId: challenge._id,
        balance: challenge.balance,
        equity: challenge.equity,
        status: challenge.status,
        currentPhase: challenge.currentPhase,
        stats: challenge.stats
      });
    }
  }

  /**
   * Get challenge by account number
   */
  async getChallengeByAccountNumber(accountNumber) {
    return await UserChallenge.findOne({ accountNumber })
      .populate('challengeType');
  }

  /**
   * Check if an account is a challenge account
   */
  async isChallengeAccount(accountNumber) {
    const challenge = await UserChallenge.findOne({ accountNumber });
    return !!challenge;
  }
}

module.exports = ChallengeEngine;
