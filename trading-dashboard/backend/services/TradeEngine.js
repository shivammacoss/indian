/**
 * Trade Engine - Handles order execution, SL/TP monitoring, margin calls
 * Data provider to be configured separately
 */

const Trade = require('../models/Trade');
const User = require('../models/User');
const TradingAccount = require('../models/TradingAccount');
const Transaction = require('../models/Transaction');
const TradingCharge = require('../models/TradingCharge');

// In-memory price storage (to be fed by external data provider)
const prices = {};

class TradeEngine {
  constructor(io) {
    this.io = io;
    this.isRunning = false;
    this.checkInterval = null;
    this.userSockets = new Map();
    this.prices = prices;
  }

  /**
   * Update price from external source
   */
  updatePrice(symbol, priceData) {
    this.prices[symbol] = {
      ...priceData,
      timestamp: Date.now()
    };
  }

  /**
   * Start the trade engine
   */
  start() {
    if (this.isRunning) return;

    // Check orders every 100ms for fast SL/TP execution
    this.checkInterval = setInterval(() => {
      this.checkPendingOrders();
      this.checkOpenPositions();
    }, 100);

    this.isRunning = true;
    console.log('[TradeEngine] Started - checking SL/TP every 100ms');
  }

  /**
   * Stop the trade engine
   */
  stop() {
    if (!this.isRunning) return;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;
    console.log('[TradeEngine] Stopped');
  }

  /**
   * Set Socket.IO instance
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Register user socket
   */
  registerUserSocket(userId, socketId) {
    this.userSockets.set(userId.toString(), socketId);
  }

  /**
   * Unregister user socket
   */
  unregisterUserSocket(userId) {
    this.userSockets.delete(userId.toString());
  }

  /**
   * Handle price updates - broadcast to clients
   */
  onPriceUpdate(prices) {
    if (this.io) {
      this.io.emit('priceUpdate', prices);
    }
  }

  /**
   * Get current price for symbol
   */
  getPrice(symbol) {
    return this.prices[symbol] || null;
  }

  /**
   * Get all prices
   */
  getAllPrices() {
    return this.prices;
  }

  /**
   * Check if market is open for a symbol
   */
  checkMarketHours(symbol) {
    const now = new Date();
    const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const utcHour = now.getUTCHours();
    
    // Crypto markets (BTC, ETH, etc.) - 24/7
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('LTC') || 
        symbol.includes('XRP') || symbol.includes('USDT') || symbol.includes('DOGE') ||
        symbol.includes('ADA') || symbol.includes('SOL') || symbol.includes('LINK')) {
      return { isOpen: true, message: 'Crypto markets are open 24/7' };
    }
    
    // Forex markets - Sunday 5PM EST to Friday 5PM EST (22:00 UTC Sunday to 22:00 UTC Friday)
    // Closed on weekends
    if (utcDay === 0 && utcHour < 22) {
      return { isOpen: false, message: 'Forex market opens Sunday 10:00 PM UTC' };
    }
    if (utcDay === 6) {
      return { isOpen: false, message: 'Forex market closed on Saturday. Opens Sunday 10:00 PM UTC' };
    }
    if (utcDay === 5 && utcHour >= 22) {
      return { isOpen: false, message: 'Forex market closed for weekend. Opens Sunday 10:00 PM UTC' };
    }
    
    // All other times forex is open
    return { isOpen: true, message: 'Market is open' };
  }

  /**
   * Execute market order
   */
  async executeMarketOrder(userId, orderData) {
    const { symbol, type, amount, stopLoss, takeProfit, tradingAccountId, leverage: requestedLeverage } = orderData;
    
    // Check if market is open
    const marketStatus = this.checkMarketHours(symbol);
    if (!marketStatus.isOpen) {
      throw new Error(`Market closed for ${symbol}. ${marketStatus.message}`);
    }
    
    const price = this.getPrice(symbol);
    if (!price) {
      throw new Error(`Invalid symbol: ${symbol}. Market may be closed.`);
    }

    // Get user and their active trading account FIRST to get accountTypeId for charges
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    // Find trading account - use provided ID or find most recent active one
    let tradingAccount;
    if (tradingAccountId) {
      tradingAccount = await TradingAccount.findOne({ 
        _id: tradingAccountId,
        user: userId, 
        status: 'active'
      }).populate('accountType').select('+leverage');
    }
    if (!tradingAccount) {
      tradingAccount = await TradingAccount.findOne({ 
        user: userId, 
        status: 'active',
        isDemo: false 
      }).populate('accountType').select('+leverage').sort({ createdAt: -1 });
    }
    
    console.log(`[TradeEngine] Trading Account: ${tradingAccount?._id}, Balance: ${tradingAccount?.balance}, DB Leverage: ${tradingAccount?.leverage}`);
    
    // Get accountTypeId for charges lookup
    const accountTypeId = tradingAccount?.accountType?._id || null;

    // Get charges for this trade (pass accountTypeId for proper lookup)
    const charges = await this.getChargesForTrade(symbol, userId, accountTypeId);
    
    console.log(`[TradeEngine] Charges for ${symbol}: spreadPips=${charges.spreadPips}, commissionPerLot=${charges.commissionPerLot}, source=${charges.source}`);
    
    // Get execution price (ask for buy, bid for sell)
    // Apply admin spread markup to the price (spread in pips added to entry)
    const basePrice = type === 'buy' ? price.ask : price.bid;
    const pipSize = this.getPipSize(symbol);
    const spreadMarkup = (charges.spreadPips || 0) * pipSize;
    // For buy: add spread to price (worse for user), For sell: subtract spread (worse for user)
    const executionPrice = type === 'buy' ? basePrice + spreadMarkup : basePrice - spreadMarkup;
    
    // User selects their leverage - use it directly
    const parsedRequestedLeverage = requestedLeverage ? parseInt(requestedLeverage) : 100;
    // Allow up to 2000x leverage (safety cap)
    const tradeLeverage = Math.min(Math.max(parsedRequestedLeverage, 1), 2000);
    const usesTradingAccount = !!tradingAccount;
    const availableBalance = usesTradingAccount ? tradingAccount.balance : user.balance;
    
    console.log(`[TradeEngine] Leverage: requested=${requestedLeverage}, using=${tradeLeverage}`);
    
    // TRADING POWER = balance × leverage (this is max position value user can control)
    const tradingPower = availableBalance * tradeLeverage;
    
    // Position value = lots × price × contract size
    const contractSize = this.getContractSize(symbol);
    const positionValue = amount * executionPrice * contractSize;
    
    // Margin required = position value / leverage
    const margin = positionValue / tradeLeverage;
    
    // SIMPLIFIED: Only commission per lot (no percentage fees)
    const commissionPerLot = charges.commissionPerLot || 0;
    const commission = amount * commissionPerLot; // lots × $/lot
    const tradingCharge = Math.round(commission * 100) / 100;
    
    // Spread cost for reference (spread is applied to execution price, not deducted separately)
    const spreadCost = this.calculateSpreadCost(symbol, amount, charges.spreadPips);
    
    // Check if position value is within trading power
    // User needs: margin + charges to open the trade
    const totalRequired = margin + tradingCharge;
    
    console.log(`[TradeEngine] Balance: $${availableBalance}, Leverage: ${tradeLeverage}x, Trading Power: $${tradingPower.toFixed(2)}`);
    console.log(`[TradeEngine] Position Value: $${positionValue.toFixed(2)}, Margin Required: $${margin.toFixed(2)}, Charges: $${tradingCharge.toFixed(2)}`);
    
    // User can trade if they have enough balance to cover margin + charges
    if (availableBalance < totalRequired) {
      throw new Error(`Insufficient balance. Required: $${totalRequired.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`);
    }

    // Validate SL/TP
    if (stopLoss) {
      if (type === 'buy' && stopLoss >= executionPrice) {
        throw new Error('Stop Loss must be below entry price for buy orders');
      }
      if (type === 'sell' && stopLoss <= executionPrice) {
        throw new Error('Stop Loss must be above entry price for sell orders');
      }
    }
    if (takeProfit) {
      if (type === 'buy' && takeProfit <= executionPrice) {
        throw new Error('Take Profit must be above entry price for buy orders');
      }
      if (type === 'sell' && takeProfit >= executionPrice) {
        throw new Error('Take Profit must be below entry price for sell orders');
      }
    }

    // Generate client ID
    const clientId = usesTradingAccount 
      ? tradingAccount.accountNumber 
      : `${user.firstName?.substring(0,2) || 'US'}${user._id.toString().slice(-6)}`.toUpperCase();

    console.log(`[TradeEngine] Creating trade for user ${userId}: ${type} ${amount} ${symbol} @ ${executionPrice}`);
    console.log(`[TradeEngine] Using ${usesTradingAccount ? 'Trading Account' : 'User Balance'}: ${availableBalance}, Required: ${totalRequired}`);
    console.log(`[TradeEngine] Charges: Commission $${commission.toFixed(2)} (${amount} lots × $${commissionPerLot}/lot), Spread: ${charges.spreadPips} pips`);

    // Create trade with charges recorded
    const trade = await Trade.create({
      user: userId,
      tradingAccount: usesTradingAccount ? tradingAccount._id : null,
      clientId,
      tradeSource: 'manual',
      symbol: symbol.toUpperCase(),
      type,
      orderType: 'market',
      amount,
      price: executionPrice,
      leverage: tradeLeverage,
      stopLoss,
      takeProfit,
      margin,
      spread: charges.spreadPips,
      spreadCost,
      commission,                    // Per-lot commission
      tradingCharge,                 // Total charge (commission only now)
      status: 'open'
    });

    console.log(`[TradeEngine] Trade created: ${trade._id}`);

    // Deduct margin from trading account or user balance
    const balanceBefore = availableBalance;
    if (usesTradingAccount) {
      tradingAccount.balance -= totalRequired;
      tradingAccount.margin += margin;
      tradingAccount.totalTrades += 1;
      await tradingAccount.save();
    } else {
      user.balance -= totalRequired;
      await user.save();
    }
    
    console.log(`[TradeEngine] Balance deducted. Before: ${balanceBefore}, After: ${usesTradingAccount ? tradingAccount.balance : user.balance}`);

    // Create transaction record with clear breakdown
    await Transaction.create({
      user: userId,
      type: 'margin_deduction',
      amount: -totalRequired,
      description: `${type.toUpperCase()} ${amount} lots ${symbol} @ ${executionPrice.toFixed(5)} | Margin: $${margin.toFixed(2)} + Charges: $${tradingCharge.toFixed(2)}`,
      balanceBefore,
      balanceAfter: usesTradingAccount ? tradingAccount.balance : user.balance,
      status: 'completed',
      reference: `${trade._id}_open_${Date.now()}`
    });

    // Notify user
    this.notifyUser(userId, 'orderExecuted', {
      trade,
      message: `${type.toUpperCase()} order executed: ${amount} ${symbol} @ ${executionPrice}`
    });

    return trade;
  }

  /**
   * Execute pending order (limit/stop)
   */
  async executePendingOrder(userId, orderData) {
    const { symbol, type, orderType, amount, price: targetPrice, leverage = 1, stopLoss, takeProfit } = orderData;
    
    const currentPrice = this.getPrice(symbol);
    if (!currentPrice) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }

    // Calculate margin required (reserve it)
    const margin = this.calculateMargin(symbol, amount, targetPrice, leverage);
    const fee = margin * 0.001;
    const totalRequired = margin + fee;

    // Check user balance
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.balance < totalRequired) {
      throw new Error(`Insufficient balance. Required: $${totalRequired.toFixed(2)}`);
    }

    // Generate client ID
    const clientId = `${user.firstName?.substring(0,2) || 'US'}${user._id.toString().slice(-6)}`.toUpperCase();

    // Create pending trade
    const trade = await Trade.create({
      user: userId,
      clientId,
      tradeSource: 'manual',
      symbol: symbol.toUpperCase(),
      type,
      orderType,
      amount,
      price: targetPrice,
      leverage,
      stopLoss,
      takeProfit,
      fee,
      margin,
      status: 'pending'
    });

    // Reserve margin
    const balanceBefore = user.balance;
    user.balance -= totalRequired;
    await user.save();

    // Create transaction record
    await Transaction.create({
      user: userId,
      type: 'margin_reserved',
      amount: -totalRequired,
      description: `Margin reserved for pending ${orderType} order: ${symbol}`,
      balanceBefore,
      balanceAfter: user.balance,
      status: 'completed',
      reference: trade._id
    });

    // Notify user
    this.notifyUser(userId, 'orderPlaced', {
      trade,
      message: `Pending ${orderType} order placed: ${amount} ${symbol} @ ${targetPrice}`
    });

    return trade;
  }

  /**
   * Check and execute pending orders
   */
  async checkPendingOrders() {
    try {
      const pendingTrades = await Trade.find({ status: 'pending' });
      
      for (const trade of pendingTrades) {
        const price = this.getPrice(trade.symbol);
        if (!price) continue;

        let shouldExecute = false;
        let executionPrice = null;

        if (trade.orderType === 'limit') {
          // Limit buy: execute when ask <= target price
          // Limit sell: execute when bid >= target price
          if (trade.type === 'buy' && price.ask <= trade.price) {
            shouldExecute = true;
            executionPrice = price.ask;
          } else if (trade.type === 'sell' && price.bid >= trade.price) {
            shouldExecute = true;
            executionPrice = price.bid;
          }
        } else if (trade.orderType === 'stop') {
          // Stop buy: execute when ask >= target price
          // Stop sell: execute when bid <= target price
          if (trade.type === 'buy' && price.ask >= trade.price) {
            shouldExecute = true;
            executionPrice = price.ask;
          } else if (trade.type === 'sell' && price.bid <= trade.price) {
            shouldExecute = true;
            executionPrice = price.bid;
          }
        }

        if (shouldExecute) {
          await this.activatePendingOrder(trade, executionPrice);
        }
      }
    } catch (err) {
      console.error('[TradeEngine] Error checking pending orders:', err);
    }
  }

  /**
   * Activate a pending order
   */
  async activatePendingOrder(trade, executionPrice) {
    trade.price = executionPrice;
    trade.status = 'open';
    trade.activatedAt = new Date();
    await trade.save();

    this.notifyUser(trade.user, 'pendingOrderActivated', {
      trade,
      message: `Pending order activated: ${trade.type.toUpperCase()} ${trade.amount} ${trade.symbol} @ ${executionPrice}`
    });

    console.log(`[TradeEngine] Pending order activated: ${trade._id}`);
  }

  /**
   * Check open positions for SL/TP and margin calls
   */
  async checkOpenPositions() {
    // Prevent concurrent checks
    if (this.isCheckingPositions) return;
    this.isCheckingPositions = true;
    
    try {
      const openTrades = await Trade.find({ status: 'open' });
      const userPositions = new Map(); // Group by user for margin check

      for (const trade of openTrades) {
        const price = this.getPrice(trade.symbol);
        if (!price) continue;

        const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
        const pnl = this.calculatePnL(trade, currentPrice);

        // Check Stop Loss - close at SL price when current price hits or crosses it
        if (trade.stopLoss && trade.stopLoss > 0) {
          const slHit = (trade.type === 'buy' && currentPrice <= trade.stopLoss) ||
                       (trade.type === 'sell' && currentPrice >= trade.stopLoss);
          if (slHit) {
            console.log(`[TradeEngine] SL triggered for ${trade.symbol}: Current ${currentPrice}, SL ${trade.stopLoss}`);
            await this.closeTrade(trade, trade.stopLoss, 'stop_loss');
            continue;
          }
        }

        // Check Take Profit - close at TP price when current price hits or crosses it
        if (trade.takeProfit && trade.takeProfit > 0) {
          const tpHit = (trade.type === 'buy' && currentPrice >= trade.takeProfit) ||
                       (trade.type === 'sell' && currentPrice <= trade.takeProfit);
          if (tpHit) {
            console.log(`[TradeEngine] TP triggered for ${trade.symbol}: Current ${currentPrice}, TP ${trade.takeProfit}`);
            await this.closeTrade(trade, trade.takeProfit, 'take_profit');
            continue;
          }
        }

        // Track user positions for margin check
        const userId = trade.user.toString();
        if (!userPositions.has(userId)) {
          userPositions.set(userId, { trades: [], totalPnL: 0, totalMargin: 0 });
        }
        const userPos = userPositions.get(userId);
        userPos.trades.push(trade);
        userPos.totalPnL += pnl;
        userPos.totalMargin += trade.margin || 0;
      }

      // Check margin levels for each user - Auto stop-out when equity reaches 0
      for (const [userId, positions] of userPositions) {
        await this.checkMarginLevel(userId, positions);
      }
    } catch (err) {
      console.error('[TradeEngine] Error checking open positions:', err);
    } finally {
      this.isCheckingPositions = false;
    }
  }

  /**
   * Check margin level and trigger auto square-off if needed
   * NO margin notifications - just auto close when balance depleted
   */
  async checkMarginLevel(userId, positions) {
    try {
      // Group trades by trading account
      const accountTrades = new Map();
      for (const trade of positions.trades) {
        const accId = trade.tradingAccount?.toString() || 'wallet';
        if (!accountTrades.has(accId)) {
          accountTrades.set(accId, { trades: [], totalPnL: 0 });
        }
        const accPos = accountTrades.get(accId);
        accPos.trades.push(trade);
        const price = this.getPrice(trade.symbol);
        if (price) {
          const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
          accPos.totalPnL += this.calculatePnL(trade, currentPrice);
        }
      }

      // Check each trading account separately
      for (const [accId, accPositions] of accountTrades) {
        let balance = 0;
        
        if (accId === 'wallet') {
          const user = await User.findById(userId);
          balance = user?.balance || 0;
        } else {
          const tradingAccount = await TradingAccount.findById(accId);
          balance = tradingAccount?.balance || 0;
        }

        const equity = balance + accPositions.totalPnL;
        
        // Auto Square Off when equity goes to 0 or negative
        // Stop out at 10% of balance remaining as safety buffer
        const stopOutLevel = balance * 0.1; // 10% stop-out level
        if (equity <= stopOutLevel && accPositions.trades.length > 0) {
          console.log(`[TradeEngine] STOP OUT for user ${userId}, account ${accId}. Balance: ${balance.toFixed(2)}, Equity: ${equity.toFixed(2)}, PnL: ${accPositions.totalPnL.toFixed(2)}`);
          await this.stopOut(userId, accPositions.trades, equity, 0);
        }
      }
    } catch (err) {
      console.error('[TradeEngine] Error checking margin level:', err);
    }
  }

  /**
   * Stop-out: Close all positions for a user
   */
  async stopOut(userId, trades, equity, marginLevel) {
    const closedTrades = [];
    let totalPnL = 0;

    for (const trade of trades) {
      const price = this.getPrice(trade.symbol);
      if (!price) continue;

      const closePrice = trade.type === 'buy' ? price.bid : price.ask;
      const result = await this.closeTrade(trade, closePrice, 'stop_out');
      if (result) {
        closedTrades.push(result);
        totalPnL += result.profit;
      }
    }

    // Notify user about stop-out
    this.notifyUser(userId, 'stopOut', {
      closedTrades,
      totalPnL,
      equity,
      marginLevel: marginLevel.toFixed(2),
      message: `🛑 STOP-OUT: All positions closed due to insufficient margin. Total P/L: $${totalPnL.toFixed(2)}`
    });
  }

  /**
   * Close a trade
   */
  async closeTrade(trade, closePrice, reason = 'manual') {
    try {
      // Prevent double closing
      if (trade.status === 'closed') {
        console.log(`[TradeEngine] Trade ${trade._id} already closed, skipping`);
        return trade;
      }
      
      const rawPnl = this.calculatePnL(trade, closePrice);
      
      // Trading charges were already deducted on trade OPEN
      // So on close, we just record the raw PnL (no double deduction)
      // The tradingCharge stored in trade was already deducted from balance
      const tradingChargeOnOpen = trade.tradingCharge || 0;
      
      // Final PnL = Raw PnL (charges already paid on open)
      const pnl = rawPnl;
      
      console.log(`[TradeEngine] Closing trade ${trade._id}: ${trade.symbol} @ ${closePrice}, PnL: ${pnl.toFixed(2)} (charges $${tradingChargeOnOpen.toFixed(2)} already paid on open), reason: ${reason}`);
      
      trade.closePrice = closePrice;
      trade.profit = pnl;
      trade.rawProfit = rawPnl;
      trade.status = 'closed';
      trade.closedAt = new Date();
      trade.closeReason = reason;
      await trade.save();

      // Update trading account or user balance
      const user = await User.findById(trade.user);
      let tradingAccount = null;
      if (trade.tradingAccount) {
        tradingAccount = await TradingAccount.findById(trade.tradingAccount);
      }
      
      const usesTradingAccount = !!tradingAccount;
      const marginReturn = trade.margin || ((trade.amount * trade.price) / trade.leverage);
      
      if (usesTradingAccount) {
        const balanceBefore = tradingAccount.balance;
        let newBalance = tradingAccount.balance + marginReturn + pnl;
        
        // Prevent balance from going negative - cap loss at available balance
        if (newBalance < 0) {
          console.log(`[TradeEngine] Capping loss to prevent negative balance. Would be: ${newBalance.toFixed(2)}, setting to 0`);
          newBalance = 0;
        }
        
        tradingAccount.balance = newBalance;
        tradingAccount.margin -= trade.margin;
        if (tradingAccount.margin < 0) tradingAccount.margin = 0;
        if (pnl >= 0) {
          tradingAccount.winningTrades += 1;
        } else {
          tradingAccount.losingTrades += 1;
        }
        await tradingAccount.save();
        
        // Create transaction record
        await Transaction.create({
          user: trade.user,
          type: pnl >= 0 ? 'trade_profit' : 'trade_loss',
          amount: marginReturn + pnl,
          description: `Closed ${trade.type.toUpperCase()} ${trade.amount} ${trade.symbol} @ ${closePrice} (${reason})`,
          balanceBefore,
          balanceAfter: tradingAccount.balance,
          status: 'completed',
          reference: `${trade._id}_close_${Date.now()}`
        });
      } else if (user) {
        const balanceBefore = user.balance;
        let newBalance = user.balance + marginReturn + pnl;
        
        // Prevent balance from going negative - cap loss at available balance
        if (newBalance < 0) {
          console.log(`[TradeEngine] Capping user wallet loss. Would be: ${newBalance.toFixed(2)}, setting to 0`);
          newBalance = 0;
        }
        
        user.balance = newBalance;
        await user.save();

        // Create transaction record
        await Transaction.create({
          user: trade.user,
          type: pnl >= 0 ? 'trade_profit' : 'trade_loss',
          amount: marginReturn + pnl,
          description: `Closed ${trade.type.toUpperCase()} ${trade.amount} ${trade.symbol} @ ${closePrice} (${reason})`,
          balanceBefore,
          balanceAfter: user.balance,
          status: 'completed',
          reference: `${trade._id}_close_${Date.now()}`
        });
      }
      
      if (user) {

        // Notify user
        const emoji = pnl >= 0 ? '✅' : '❌';
        this.notifyUser(trade.user, 'tradeClosed', {
          trade,
          reason,
          pnl,
          message: `${emoji} Trade closed (${reason}): ${trade.symbol} P/L: $${pnl.toFixed(2)}`
        });

        // Process IB commission for this trade (pass trading charge for reference)
        try {
          const IBCommissionEngine = require('./ibCommissionEngine');
          const ibEngine = new IBCommissionEngine(this.io);
          await ibEngine.processTradeCommission(trade, user, tradingCharge);
        } catch (ibErr) {
          console.error('[TradeEngine] IB commission error:', ibErr);
        }

        // If this is a master trade (not copied), close follower trades too
        if (!trade.isCopiedTrade && trade.tradeSource !== 'copy') {
          const TradeMaster = require('../models/TradeMaster');
          const tradeMaster = await TradeMaster.findOne({ userId: trade.user, status: 'approved' });
          if (tradeMaster) {
            console.log(`[TradeEngine] Master trade closed - closing follower trades`);
            const CopyTradeEngine = require('./copyTradeEngine');
            const copyEngine = new CopyTradeEngine(this.io);
            // Close follower trades immediately (don't use catch, await it)
            try {
              await copyEngine.closeFollowerTrades(trade, user);
            } catch (err) {
              console.error('[TradeEngine] Error closing follower trades:', err);
            }
          }
        }
      }

      return trade;
    } catch (err) {
      console.error('[TradeEngine] Error closing trade:', err);
      return null;
    }
  }

  /**
   * Calculate P&L for a trade
   * P&L is based on actual position size, NOT leveraged
   * Loss is limited to account balance (stop-out protection)
   */
  calculatePnL(trade, currentPrice) {
    const priceDiff = trade.type === 'buy' 
      ? currentPrice - trade.price 
      : trade.price - currentPrice;
    
    // P&L = price difference × lots × contract size (NO leverage)
    // Leverage only affects margin required to open, not P&L
    let contractSize = 100000; // Standard forex
    if (trade.symbol.includes('XAU')) contractSize = 100;
    else if (trade.symbol.includes('XAG')) contractSize = 5000;
    else if (trade.symbol.includes('BTC') || trade.symbol.includes('ETH')) contractSize = 1;
    
    return priceDiff * trade.amount * contractSize;
  }

  /**
   * Calculate margin required
   */
  calculateMargin(symbol, lotSize, price, leverage) {
    let contractSize = 100000;
    if (symbol.includes('XAU')) contractSize = 100;
    else if (symbol.includes('XAG')) contractSize = 5000;
    else if (symbol.includes('BTC') || symbol.includes('ETH')) contractSize = 1;
    
    return (price * contractSize * lotSize) / leverage;
  }

  /**
   * Get floating P&L for a user
   */
  async getFloatingPnL(userId) {
    const trades = await Trade.find({ user: userId, status: 'open' });
    let totalPnL = 0;
    const positions = [];

    for (const trade of trades) {
      const price = this.getPrice(trade.symbol);
      if (!price) continue;

      const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
      const pnl = this.calculatePnL(trade, currentPrice);
      totalPnL += pnl;

      positions.push({
        ...trade.toObject(),
        currentPrice,
        floatingPnL: pnl
      });
    }

    return { totalPnL, positions };
  }

  /**
   * Modify trade SL/TP
   */
  async modifyTrade(tradeId, userId, { stopLoss, takeProfit }) {
    const trade = await Trade.findOne({ _id: tradeId, user: userId, status: 'open' });
    if (!trade) throw new Error('Trade not found');

    const price = this.getPrice(trade.symbol);
    if (!price) throw new Error('Unable to get current price');

    const currentPrice = trade.type === 'buy' ? price.bid : price.ask;

    // Validate new SL
    if (stopLoss !== undefined) {
      if (stopLoss !== null) {
        if (trade.type === 'buy' && stopLoss >= currentPrice) {
          throw new Error('Stop Loss must be below current price for buy orders');
        }
        if (trade.type === 'sell' && stopLoss <= currentPrice) {
          throw new Error('Stop Loss must be above current price for sell orders');
        }
      }
      trade.stopLoss = stopLoss;
    }

    // Validate new TP
    if (takeProfit !== undefined) {
      if (takeProfit !== null) {
        if (trade.type === 'buy' && takeProfit <= currentPrice) {
          throw new Error('Take Profit must be above current price for buy orders');
        }
        if (trade.type === 'sell' && takeProfit >= currentPrice) {
          throw new Error('Take Profit must be below current price for sell orders');
        }
      }
      trade.takeProfit = takeProfit;
    }

    await trade.save();
    return trade;
  }

  /**
   * Cancel pending order
   */
  async cancelPendingOrder(tradeId, userId) {
    const trade = await Trade.findOne({ _id: tradeId, user: userId, status: 'pending' });
    if (!trade) throw new Error('Pending order not found');

    trade.status = 'cancelled';
    trade.closedAt = new Date();
    await trade.save();

    // Return reserved margin
    const user = await User.findById(userId);
    if (user) {
      const margin = trade.margin || 0;
      const fee = trade.fee || 0;
      const refund = margin + fee;
      
      const balanceBefore = user.balance;
      user.balance += refund;
      await user.save();

      await Transaction.create({
        user: userId,
        type: 'margin_refund',
        amount: refund,
        description: `Margin refunded for cancelled ${trade.orderType} order: ${trade.symbol}`,
        balanceBefore,
        balanceAfter: user.balance,
        status: 'completed',
        reference: trade._id
      });
    }

    this.notifyUser(userId, 'orderCancelled', {
      trade,
      message: `Pending order cancelled: ${trade.symbol}`
    });

    return trade;
  }

  /**
   * Notify user via socket
   */
  notifyUser(userId, event, data) {
    if (this.io) {
      console.log(`[TradeEngine] Emitting ${event} to user ${userId}`);
      
      const socketId = this.userSockets.get(userId.toString());
      if (socketId) {
        this.io.to(socketId).emit(event, data);
      }
      // Also broadcast to user's room
      this.io.to(`user_${userId}`).emit(event, data);
      
      // Broadcast to all clients for real-time updates (positions table refresh)
      this.io.emit(event, { ...data, userId });
    }
  }

  /**
   * Get charges for a trade (from database or defaults)
   * Now accepts accountTypeId to properly look up account type specific charges
   */
  async getChargesForTrade(symbol, userId, accountTypeId = null) {
    try {
      const charges = await TradingCharge.getChargesForTrade(symbol, userId, accountTypeId);
      return charges;
    } catch (err) {
      console.error('[TradeEngine] Error getting charges:', err);
      // Return default charges
      return {
        spreadPips: this.getDefaultSpread(symbol),
        commissionPerLot: 0,
        source: 'default'
      };
    }
  }

  /**
   * Calculate spread cost in USD
   */
  calculateSpreadCost(symbol, lotSize, spreadPips) {
    const pipSize = this.getPipSize(symbol);
    
    // Contract size varies by instrument
    let contractSize = 100000; // Standard forex
    if (symbol.includes('XAU')) contractSize = 100;
    else if (symbol.includes('XAG')) contractSize = 5000;
    else if (symbol.includes('BTC') || symbol.includes('ETH')) contractSize = 1;
    
    // Spread cost = spread in pips * pip value * lot size
    const pipValue = contractSize * pipSize;
    return spreadPips * pipValue * lotSize;
  }

  /**
   * Get pip size for symbol
   */
  getPipSize(symbol) {
    const pipSizes = {
      'EURUSD': 0.0001, 'GBPUSD': 0.0001, 'AUDUSD': 0.0001,
      'NZDUSD': 0.0001, 'USDCHF': 0.0001, 'USDCAD': 0.0001,
      'EURGBP': 0.0001, 'EURCHF': 0.0001,
      'USDJPY': 0.01, 'EURJPY': 0.01,
      'XAUUSD': 0.01, 'XAGUSD': 0.001,
      'BTCUSD': 1, 'ETHUSD': 0.01
    };
    return pipSizes[symbol] || 0.0001;
  }

  /**
   * Get contract size for symbol (value of 1 lot)
   */
  getContractSize(symbol) {
    const upperSymbol = symbol.toUpperCase();
    
    // Metals
    if (upperSymbol.includes('XAU')) return 100;      // 100 oz gold
    if (upperSymbol.includes('XAG')) return 5000;     // 5000 oz silver
    
    // Crypto
    if (upperSymbol.includes('BTC')) return 1;        // 1 BTC
    if (upperSymbol.includes('ETH')) return 1;        // 1 ETH
    if (upperSymbol.includes('SOL')) return 1;
    if (upperSymbol.includes('XRP')) return 1;
    
    // Indices
    if (['US30', 'US500', 'NAS100', 'UK100', 'GER40'].includes(upperSymbol)) return 1;
    
    // Forex (standard lot = 100,000 units)
    return 100000;
  }

  /**
   * Get default spread for symbol
   */
  getDefaultSpread(symbol) {
    const spreads = {
      'EURUSD': 1, 'GBPUSD': 1.5, 'USDJPY': 1,
      'USDCHF': 1.5, 'AUDUSD': 1.2, 'NZDUSD': 1.5,
      'USDCAD': 1.5, 'EURGBP': 1.5, 'EURJPY': 1.5,
      'EURCHF': 2, 'XAUUSD': 30, 'XAGUSD': 3,
      'BTCUSD': 50, 'ETHUSD': 5
    };
    return spreads[symbol] || 2;
  }
}

// Singleton instance
const tradeEngine = new TradeEngine();

module.exports = tradeEngine;
