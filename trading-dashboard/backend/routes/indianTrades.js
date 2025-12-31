const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const IndianTrade = require('../models/IndianTrade');
const IndianCharge = require('../models/IndianCharge');
const TradingAccount = require('../models/TradingAccount');
const Transaction = require('../models/Transaction');

// @route   GET /api/indian-trades
// @desc    Get user's Indian trades
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, tradingAccountId } = req.query;
    
    const query = { user: req.user._id };
    if (status) query.status = status;
    if (tradingAccountId) query.tradingAccount = tradingAccountId;
    
    const trades = await IndianTrade.find(query)
      .populate('tradingAccount', 'accountNumber balance')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: {
        trades,
        positions: trades.filter(t => t.status === 'open'),
        pending: trades.filter(t => t.status === 'pending'),
        history: trades.filter(t => t.status === 'closed').slice(0, 50)
      }
    });
  } catch (error) {
    console.error('[IndianTrades] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/indian-trades
// @desc    Place Indian market order
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      symbol,
      exchange,
      instrumentToken,
      instrumentType,
      side,
      quantity,
      lotSize,
      productType,
      orderType,
      entryPrice,
      limitPrice,
      triggerPrice,
      stopLoss,
      target,
      strike,
      expiry,
      tradingAccountId
    } = req.body;
    
    // Validate required fields
    if (!symbol || !exchange || !side || !quantity || !entryPrice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: symbol, exchange, side, quantity, entryPrice' 
      });
    }
    
    // Get trading account
    let tradingAccount;
    if (tradingAccountId) {
      tradingAccount = await TradingAccount.findOne({
        _id: tradingAccountId,
        user: req.user._id,
        status: 'active',
        isIndian: true
      });
    } else {
      tradingAccount = await TradingAccount.findOne({
        user: req.user._id,
        status: 'active',
        isIndian: true
      }).sort({ createdAt: -1 });
    }
    
    if (!tradingAccount) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active Indian trading account found. Please create one first.' 
      });
    }
    
    // Calculate trade value
    const tradeValue = entryPrice * quantity;
    
    // Get charges and leverage from admin config
    const chargeConfig = await IndianCharge.getChargesForTrade(exchange, symbol, productType || 'MIS');
    const charges = IndianCharge.calculateCharges(chargeConfig, tradeValue, quantity, lotSize || 1);
    
    // Calculate margin required using admin-configured leverage
    const leverage = chargeConfig.leverage[productType] || 1;
    const marginRequired = tradeValue / leverage;
    
    console.log(`[IndianTrades] Trade: ${symbol} | Value: ₹${tradeValue} | Leverage: ${leverage}x | Margin: ₹${marginRequired.toFixed(2)} | Charges: ₹${charges.totalCharges.toFixed(2)}`);
    
    const totalRequired = marginRequired + charges.totalCharges;
    
    // Check balance
    if (tradingAccount.balance < totalRequired) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Required: ₹${totalRequired.toFixed(2)}, Available: ₹${tradingAccount.balance.toFixed(2)}`
      });
    }
    
    // Create trade
    const trade = await IndianTrade.create({
      user: req.user._id,
      tradingAccount: tradingAccount._id,
      symbol: symbol.toUpperCase(),
      exchange,
      instrumentToken: instrumentToken || 0,
      instrumentType: instrumentType || 'EQ',
      side,
      quantity,
      lotSize: lotSize || 1,
      productType: productType || 'MIS',
      orderType: orderType || 'MARKET',
      entryPrice,
      ltp: entryPrice,
      limitPrice,
      triggerPrice,
      stopLoss,
      target,
      strike,
      expiry,
      marginBlocked: marginRequired,
      ...charges,
      status: orderType === 'LIMIT' || orderType === 'SL' || orderType === 'SL-M' ? 'pending' : 'open',
      openedAt: new Date()
    });
    
    // Deduct from balance
    const balanceBefore = tradingAccount.balance;
    tradingAccount.balance -= totalRequired;
    tradingAccount.margin += marginRequired;
    tradingAccount.totalTrades += 1;
    await tradingAccount.save();
    
    // Create transaction record
    await Transaction.create({
      user: req.user._id,
      type: 'margin_deduction',
      amount: -totalRequired,
      description: `${side} ${quantity} ${symbol} @ ₹${entryPrice} | Margin: ₹${marginRequired.toFixed(2)} + Charges: ₹${charges.totalCharges.toFixed(2)}`,
      balanceBefore,
      balanceAfter: tradingAccount.balance,
      status: 'completed',
      reference: `IND_${trade._id}_open`
    });
    
    console.log(`[IndianTrades] Order placed: ${side} ${quantity} ${symbol} @ ₹${entryPrice}`);
    
    res.status(201).json({
      success: true,
      message: `${side} order ${orderType === 'MARKET' ? 'executed' : 'placed'} for ${symbol}`,
      data: trade
    });
  } catch (error) {
    console.error('[IndianTrades] Error placing order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/indian-trades/:id/close
// @desc    Close Indian trade
// @access  Private
router.post('/:id/close', protect, async (req, res) => {
  try {
    const { exitPrice } = req.body;
    
    const trade = await IndianTrade.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'open'
    });
    
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found or already closed' });
    }
    
    const tradingAccount = await TradingAccount.findById(trade.tradingAccount);
    if (!tradingAccount) {
      return res.status(400).json({ success: false, message: 'Trading account not found' });
    }
    
    // Calculate P&L
    const closePrice = exitPrice || trade.ltp || trade.entryPrice;
    const pnl = trade.side === 'BUY' 
      ? (closePrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - closePrice) * trade.quantity;
    
    // Calculate exit charges
    const tradeValue = closePrice * trade.quantity;
    const chargeConfig = await IndianCharge.getChargesForTrade(trade.exchange, trade.symbol, trade.productType);
    const exitCharges = IndianCharge.calculateCharges(chargeConfig, tradeValue, trade.quantity, trade.lotSize);
    
    // Update trade
    trade.exitPrice = closePrice;
    trade.profit = pnl - exitCharges.totalCharges;
    trade.status = 'closed';
    trade.closedAt = new Date();
    trade.totalCharges += exitCharges.totalCharges;
    await trade.save();
    
    // Release margin and add P&L to balance
    const balanceBefore = tradingAccount.balance;
    tradingAccount.balance += trade.marginBlocked + trade.profit;
    tradingAccount.margin -= trade.marginBlocked;
    if (trade.profit >= 0) {
      tradingAccount.winningTrades += 1;
      tradingAccount.totalProfit += trade.profit;
    } else {
      tradingAccount.losingTrades += 1;
      tradingAccount.totalLoss += Math.abs(trade.profit);
    }
    await tradingAccount.save();
    
    // Create transaction record
    await Transaction.create({
      user: req.user._id,
      type: 'trade_close',
      amount: trade.marginBlocked + trade.profit,
      description: `Closed ${trade.side} ${trade.quantity} ${trade.symbol} @ ₹${closePrice} | P&L: ₹${trade.profit.toFixed(2)}`,
      balanceBefore,
      balanceAfter: tradingAccount.balance,
      status: 'completed',
      reference: `IND_${trade._id}_close`
    });
    
    console.log(`[IndianTrades] Trade closed: ${trade.symbol} P&L: ₹${trade.profit.toFixed(2)}`);
    
    res.json({
      success: true,
      message: `Trade closed. P&L: ₹${trade.profit.toFixed(2)}`,
      data: trade
    });
  } catch (error) {
    console.error('[IndianTrades] Error closing trade:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/indian-trades/:id/cancel
// @desc    Cancel pending order
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const trade = await IndianTrade.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'pending'
    });
    
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Pending order not found' });
    }
    
    const tradingAccount = await TradingAccount.findById(trade.tradingAccount);
    
    // Refund margin
    if (tradingAccount) {
      tradingAccount.balance += trade.marginBlocked + trade.totalCharges;
      tradingAccount.margin -= trade.marginBlocked;
      await tradingAccount.save();
    }
    
    trade.status = 'cancelled';
    await trade.save();
    
    res.json({
      success: true,
      message: 'Order cancelled',
      data: trade
    });
  } catch (error) {
    console.error('[IndianTrades] Error cancelling order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/indian-trades/:id/update-ltp
// @desc    Update LTP for a trade (called by streaming service)
// @access  Private
router.put('/:id/update-ltp', protect, async (req, res) => {
  try {
    const { ltp } = req.body;
    
    const trade = await IndianTrade.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'open' },
      { ltp },
      { new: true }
    );
    
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }
    
    res.json({ success: true, data: trade });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/indian-trades/charges
// @desc    Get charge configuration
// @access  Private
router.get('/charges', protect, async (req, res) => {
  try {
    const { segment, symbol, productType } = req.query;
    const charges = await IndianCharge.getChargesForTrade(
      segment || 'NSE',
      symbol,
      productType || 'MIS'
    );
    res.json({ success: true, data: charges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
