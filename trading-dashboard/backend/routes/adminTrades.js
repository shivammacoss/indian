const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade');
const User = require('../models/User');
const TradingAccount = require('../models/TradingAccount');
const Transaction = require('../models/Transaction');
const { protectAdmin } = require('./adminAuth');
const tradeEngine = require('../services/TradeEngine');

// @route   GET /api/admin/trades
// @desc    Get all trades
// @access  Admin
router.get('/', protectAdmin, async (req, res) => {
  try {
    const { status, type, userId, limit = 100, page = 1 } = req.query;
    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (userId) query.user = userId;

    const trades = await Trade.find(query)
      .populate('user', 'firstName lastName email balance')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Trade.countDocuments(query);

    res.json({ 
      success: true, 
      data: trades,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/trades/stats
// @desc    Get trade statistics
// @access  Admin
router.get('/stats', protectAdmin, async (req, res) => {
  try {
    const [total, open, closed, pending] = await Promise.all([
      Trade.countDocuments(),
      Trade.countDocuments({ status: 'open' }),
      Trade.countDocuments({ status: 'closed' }),
      Trade.countDocuments({ status: 'pending' })
    ]);

    const volumeResult = await Trade.aggregate([
      { $group: { _id: null, totalVolume: { $sum: '$amount' }, totalProfit: { $sum: '$profit' } } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        open,
        closed,
        pending,
        totalVolume: volumeResult[0]?.totalVolume || 0,
        totalProfit: volumeResult[0]?.totalProfit || 0
      }
    });
  } catch (error) {
    console.error('Get trade stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/trades
// @desc    Create trade for a user (admin) - supports market and pending orders with full control
// @access  Admin
router.post('/', protectAdmin, async (req, res) => {
  try {
    const { 
      userId, 
      tradingAccountId,
      symbol, 
      type, 
      orderType = 'market', // market or pending
      amount, 
      leverage, 
      stopLoss, 
      takeProfit, 
      price,
      pendingPrice, // For pending orders
      openTime // Custom open time
    } = req.body;

    if (!userId || !symbol || !type || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Validate trading account if provided
    let tradingAccount = null;
    if (tradingAccountId) {
      tradingAccount = await TradingAccount.findOne({ _id: tradingAccountId, user: userId });
      if (!tradingAccount) {
        return res.status(400).json({ success: false, message: 'Invalid trading account' });
      }
    }

    let trade;

    if (orderType === 'pending') {
      // Create pending order directly
      trade = new Trade({
        user: userId,
        tradingAccount: tradingAccountId || null,
        symbol,
        type,
        amount: parseFloat(amount),
        leverage: leverage || 100,
        price: pendingPrice ? parseFloat(pendingPrice) : null,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        status: 'pending',
        orderType: 'limit',
        createdAt: openTime ? new Date(openTime) : new Date()
      });
      await trade.save();
    } else {
      // Execute market order through trade engine
      trade = await tradeEngine.executeMarketOrder(userId, {
        symbol,
        type,
        amount,
        leverage: leverage || 100,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        tradingAccountId: tradingAccountId || null
      });

      // If custom open time provided, update it directly in database
      if (openTime && trade && trade._id) {
        const customDate = new Date(openTime);
        await Trade.findByIdAndUpdate(trade._id, { createdAt: customDate });
        trade.createdAt = customDate;
      }
    }

    res.status(201).json({ success: true, data: trade, message: 'Trade created successfully' });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   PUT /api/admin/trades/:id/modify
// @desc    Modify trade (admin - full control over all fields)
// @access  Admin
router.put('/:id/modify', protectAdmin, async (req, res) => {
  try {
    const { 
      stopLoss, takeProfit, profit, notes, closePrice,
      // Full admin control fields
      price, amount, type, symbol, createdAt, closedAt, leverage, margin, fee
    } = req.body;

    const trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }

    // Admin full control - can modify any field on any trade
    if (stopLoss !== undefined) trade.stopLoss = stopLoss;
    if (takeProfit !== undefined) trade.takeProfit = takeProfit;
    if (notes !== undefined) trade.notes = notes;
    
    // Entry price
    if (price !== undefined) trade.price = price;
    
    // Quantity/Lots
    if (amount !== undefined) trade.amount = amount;
    
    // Side (buy/sell)
    if (type !== undefined && (type === 'buy' || type === 'sell')) trade.type = type;
    
    // Symbol
    if (symbol !== undefined) trade.symbol = symbol;
    
    // Leverage
    if (leverage !== undefined) trade.leverage = leverage;
    
    // Margin
    if (margin !== undefined) trade.margin = margin;
    
    // Fee
    if (fee !== undefined) trade.fee = fee;
    
    // Time (createdAt)
    if (createdAt !== undefined) trade.createdAt = new Date(createdAt);
    
    // Close time
    if (closedAt !== undefined) trade.closedAt = new Date(closedAt);
    
    // Close price
    if (closePrice !== undefined) trade.closePrice = closePrice;
    
    // Profit - update user balance if changed
    if (profit !== undefined) {
      const profitDiff = profit - (trade.profit || 0);
      trade.profit = profit;
      
      if (profitDiff !== 0) {
        const user = await User.findById(trade.user);
        if (user) {
          user.balance += profitDiff;
          await user.save();
        }
      }
    }

    await trade.save();

    res.json({ success: true, data: trade, message: 'Trade modified successfully' });
  } catch (error) {
    console.error('Modify trade error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/trades/:id/close
// @desc    Close trade (admin) - fast direct close with optional custom price/profit
// @access  Admin
router.put('/:id/close', protectAdmin, async (req, res) => {
  try {
    const { closePrice, profit, closeTime } = req.body;
    
    const trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }

    if (trade.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Trade already closed' });
    }

    // If pending, just cancel it
    if (trade.status === 'pending') {
      trade.status = 'cancelled';
      trade.closedAt = closeTime ? new Date(closeTime) : new Date();
      trade.closeReason = 'admin_cancelled';
      await trade.save();

      // Release margin
      const user = await User.findById(trade.user);
      if (user && trade.margin) {
        user.balance += trade.margin;
        await user.save();
      }

      return res.json({ success: true, data: trade, message: 'Order cancelled' });
    }

    // Fast direct close for admin - bypass trade engine for speed
    // Get current price if not provided
    let finalClosePrice = closePrice;
    let finalProfit = profit;
    
    if (!finalClosePrice) {
      // Try to get from trade engine prices
      try {
        const currentPrices = tradeEngine.getCurrentPrices?.() || {};
        const priceData = currentPrices[trade.symbol];
        if (priceData) {
          finalClosePrice = trade.type === 'buy' ? priceData.bid : priceData.ask;
        }
      } catch (e) {
        console.log('Could not get live price, using entry price');
        finalClosePrice = trade.price;
      }
    }

    // Calculate profit if not provided
    if (finalProfit === undefined || finalProfit === null) {
      const priceDiff = trade.type === 'buy' 
        ? (finalClosePrice || trade.price) - trade.price 
        : trade.price - (finalClosePrice || trade.price);
      
      const lotSize = trade.symbol?.includes('XAU') ? 100 : 
                     trade.symbol?.includes('BTC') ? 1 :
                     trade.symbol?.includes('US') || trade.symbol?.includes('DE') || trade.symbol?.includes('UK') || trade.symbol?.includes('JP') ? 1 : 100000;
      finalProfit = priceDiff * (trade.amount || 0.01) * lotSize;
    }

    // Update trade directly
    trade.status = 'closed';
    trade.closePrice = finalClosePrice || trade.price;
    trade.profit = finalProfit;
    trade.closedAt = closeTime ? new Date(closeTime) : new Date();
    trade.closeReason = 'admin_closed';
    await trade.save();

    // Update user balance
    const user = await User.findById(trade.user);
    if (user) {
      // Return margin + profit
      user.balance += (trade.margin || 0) + finalProfit;
      await user.save();
    }

    // Emit socket event for instant update
    if (tradeEngine.io) {
      tradeEngine.io.emit('tradeClosed', { tradeId: trade._id, userId: trade.user });
    }

    res.json({ success: true, data: trade, message: 'Trade closed successfully' });
  } catch (error) {
    console.error('Close trade error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   DELETE /api/admin/trades/:id
// @desc    Delete trade (admin only, use with caution)
// @access  Admin
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }

    // Only allow deleting closed/cancelled trades
    if (trade.status === 'open' || trade.status === 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot delete active trade. Close it first.' });
    }

    await Trade.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Trade deleted' });
  } catch (error) {
    console.error('Delete trade error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/trades/ledger/download
// @desc    Download trade ledger for all account types (CSV format)
// @access  Admin
router.get('/ledger/download', protectAdmin, async (req, res) => {
  try {
    const { accountType, status, startDate, endDate, userId } = req.query;
    
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (userId) query.user = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // If accountType filter, get trading accounts of that type first
    if (accountType && accountType !== 'all') {
      const AccountType = require('../models/AccountType');
      const accType = await AccountType.findOne({ code: accountType.toUpperCase() });
      if (accType) {
        const accounts = await TradingAccount.find({ accountType: accType._id }).select('_id');
        query.tradingAccount = { $in: accounts.map(a => a._id) };
      }
    }
    
    const trades = await Trade.find(query)
      .populate('user', 'firstName lastName email')
      .populate('tradingAccount', 'accountNumber')
      .sort({ createdAt: -1 })
      .lean();
    
    // Generate CSV
    const csvHeaders = [
      'Trade ID', 'Date', 'User', 'Email', 'Account', 'Symbol', 'Type', 
      'Lots', 'Entry Price', 'Close Price', 'Leverage', 'Margin', 
      'Commission', 'Fee', 'Total Charges', 'PnL', 'Status'
    ].join(',');
    
    const csvRows = trades.map(t => [
      t._id,
      new Date(t.createdAt).toISOString(),
      `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim(),
      t.user?.email || '',
      t.tradingAccount?.accountNumber || t.clientId || '',
      t.symbol,
      t.type,
      t.amount || t.lots || 0,
      t.price || 0,
      t.closePrice || '',
      t.leverage || 1,
      t.margin || 0,
      t.commission || 0,
      t.fee || 0,
      t.tradingCharge || 0,
      t.profit || 0,
      t.status
    ].join(','));
    
    const csv = [csvHeaders, ...csvRows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=trade-ledger-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Download ledger error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/trades/by-account-type
// @desc    Get trades grouped by account type
// @access  Admin
router.get('/by-account-type', protectAdmin, async (req, res) => {
  try {
    const AccountType = require('../models/AccountType');
    const accountTypes = await AccountType.find({ isActive: true }).lean();
    
    const result = await Promise.all(accountTypes.map(async (accType) => {
      const accounts = await TradingAccount.find({ accountType: accType._id }).select('_id');
      const accountIds = accounts.map(a => a._id);
      
      const [totalTrades, openTrades, volume, profit] = await Promise.all([
        Trade.countDocuments({ tradingAccount: { $in: accountIds } }),
        Trade.countDocuments({ tradingAccount: { $in: accountIds }, status: 'open' }),
        Trade.aggregate([
          { $match: { tradingAccount: { $in: accountIds } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Trade.aggregate([
          { $match: { tradingAccount: { $in: accountIds }, status: 'closed' } },
          { $group: { _id: null, total: { $sum: '$profit' } } }
        ])
      ]);
      
      return {
        accountType: accType.name,
        code: accType.code,
        color: accType.color,
        totalTrades,
        openTrades,
        totalVolume: volume[0]?.total || 0,
        totalProfit: profit[0]?.total || 0,
        commission: accType.commission,
        spreadMarkup: accType.spreadMarkup,
        tradingFee: accType.tradingFee
      };
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get trades by account type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
