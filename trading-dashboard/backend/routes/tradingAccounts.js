const express = require('express');
const router = express.Router();
const TradingAccount = require('../models/TradingAccount');
const AccountType = require('../models/AccountType');
const User = require('../models/User');
const Trade = require('../models/Trade');
const InternalTransfer = require('../models/InternalTransfer');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// @route   GET /api/trading-accounts
// @desc    Get user's trading accounts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get accounts and all open trades in parallel
    const [accounts, openTrades] = await Promise.all([
      TradingAccount.find({ user: req.user._id })
        .populate('accountType')
        .sort({ createdAt: -1 })
        .lean(),
      Trade.find({ user: req.user._id, status: 'open' })
        .select('tradingAccount profit margin')
        .lean()
    ]);
    
    // Group trades by account for O(1) lookup
    const tradesByAccount = {};
    openTrades.forEach(trade => {
      const accId = trade.tradingAccount?.toString();
      if (!tradesByAccount[accId]) tradesByAccount[accId] = { pnl: 0, margin: 0 };
      tradesByAccount[accId].pnl += trade.profit || 0;
      tradesByAccount[accId].margin += trade.margin || 0;
    });
    
    // Calculate equity for each account
    const result = accounts.map(account => {
      const accData = tradesByAccount[account._id.toString()] || { pnl: 0, margin: 0 };
      return {
        ...account,
        equity: account.balance + accData.pnl,
        freeMargin: account.balance + accData.pnl - accData.margin
      };
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get trading accounts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trading-accounts/:id
// @desc    Get single trading account
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const account = await TradingAccount.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('accountType');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    // Get open trades for this account
    const openTrades = await Trade.find({ 
      tradingAccount: account._id,
      status: 'open' 
    });
    
    let floatingPnL = 0;
    let totalMargin = 0;
    openTrades.forEach(trade => {
      floatingPnL += trade.profit || 0;
      totalMargin += trade.margin || 0;
    });
    
    account.equity = account.balance + floatingPnL;
    account.margin = totalMargin;
    account.freeMargin = account.equity - totalMargin;
    if (totalMargin > 0) {
      account.marginLevel = (account.equity / totalMargin) * 100;
    }
    
    res.json({
      success: true,
      data: account,
      openTrades: openTrades.length,
      floatingPnL
    });
  } catch (error) {
    console.error('Get trading account error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/trading-accounts
// @desc    Create new trading account
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { accountTypeId, leverage, currency, isDemo, nickname, isIndian } = req.body;
    
    // Get account type
    const accountType = await AccountType.findById(accountTypeId);
    if (!accountType || !accountType.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid account type' });
    }
    
    // Validate leverage (Indian accounts don't use leverage)
    const selectedLeverage = isIndian ? 1 : (leverage || accountType.maxLeverage);
    if (!isIndian && selectedLeverage > accountType.maxLeverage) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum leverage for ${accountType.name} is 1:${accountType.maxLeverage}` 
      });
    }
    
    // Create trading account (auto-approved)
    const tradingAccount = await TradingAccount.create({
      user: req.user._id,
      accountType: accountType._id,
      leverage: selectedLeverage,
      currency: isIndian ? 'INR' : (currency || 'USD'),
      isDemo: isDemo || false,
      isIndian: isIndian || false,
      nickname: nickname || (isIndian ? 'Indian Market Account' : `${accountType.name} Account`),
      status: 'active',
      balance: isDemo ? 10000 : (isIndian ? 100000 : 0), // Demo: $10k, Indian: ₹1L, Live: $0
      server: isDemo ? 'HCF-Demo' : (isIndian ? 'IND-Live' : 'HCF-Live'),
      indianMarket: isIndian ? {
        segments: ['EQUITY', 'FNO', 'CURRENCY', 'COMMODITY'],
        defaultSegment: 'EQUITY'
      } : undefined
    });
    
    await tradingAccount.populate('accountType');
    
    res.status(201).json({
      success: true,
      message: `${isIndian ? 'Indian Market' : isDemo ? 'Demo' : 'Live'} trading account created successfully`,
      data: tradingAccount
    });
  } catch (error) {
    console.error('Create trading account error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/trading-accounts/:id
// @desc    Update trading account (nickname, leverage)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { nickname, leverage } = req.body;
    
    const account = await TradingAccount.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('accountType');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    // Check for open trades before changing leverage
    if (leverage && leverage !== account.leverage) {
      const openTrades = await Trade.countDocuments({ 
        tradingAccount: account._id,
        status: 'open' 
      });
      
      if (openTrades > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot change leverage with open trades' 
        });
      }
      
      if (leverage > account.accountType.maxLeverage) {
        return res.status(400).json({ 
          success: false, 
          message: `Maximum leverage for ${account.accountType.name} is 1:${account.accountType.maxLeverage}` 
        });
      }
      
      account.leverage = leverage;
    }
    
    if (nickname) {
      account.nickname = nickname;
    }
    
    await account.save();
    
    res.json({
      success: true,
      message: 'Account updated successfully',
      data: account
    });
  } catch (error) {
    console.error('Update trading account error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/trading-accounts/transfer
// @desc    Transfer funds (wallet <-> account, account <-> account)
// @access  Private
router.post('/transfer', protect, async (req, res) => {
  try {
    const { fromType, fromAccountId, toType, toAccountId, amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    
    const user = await User.findById(req.user._id);
    let fromAccount = null;
    let toAccount = null;
    
    // Validate source
    if (fromType === 'wallet') {
      if (user.balance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
    } else if (fromType === 'trading_account') {
      fromAccount = await TradingAccount.findOne({ 
        _id: fromAccountId, 
        user: req.user._id,
        status: 'active'
      });
      
      if (!fromAccount) {
        return res.status(404).json({ success: false, message: 'Source account not found' });
      }
      
      // Check for open trades
      const openTrades = await Trade.find({ 
        tradingAccount: fromAccount._id,
        status: 'open' 
      });
      
      let floatingPnL = 0;
      let usedMargin = 0;
      openTrades.forEach(trade => {
        floatingPnL += trade.profit || 0;
        usedMargin += trade.margin || 0;
      });
      
      const availableBalance = fromAccount.balance + floatingPnL - usedMargin;
      
      if (availableBalance < amount) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient funds. Available: $${availableBalance.toFixed(2)}` 
        });
      }
    }
    
    // Validate destination
    if (toType === 'trading_account') {
      toAccount = await TradingAccount.findOne({ 
        _id: toAccountId, 
        user: req.user._id,
        status: 'active'
      });
      
      if (!toAccount) {
        return res.status(404).json({ success: false, message: 'Destination account not found' });
      }
      
      // Check minimum deposit for account type
      if (fromType === 'wallet') {
        await toAccount.populate('accountType');
        const currentBalance = toAccount.balance;
        const newBalance = currentBalance + amount;
        
        if (currentBalance === 0 && amount < toAccount.accountType.minDeposit) {
          return res.status(400).json({ 
            success: false, 
            message: `Minimum deposit for ${toAccount.accountType.name} account is $${toAccount.accountType.minDeposit}` 
          });
        }
      }
    }
    
    // Execute transfer
    if (fromType === 'wallet') {
      user.balance -= amount;
      await user.save();
    } else {
      fromAccount.balance -= amount;
      fromAccount.totalWithdrawals += amount;
      await fromAccount.save();
    }
    
    if (toType === 'wallet') {
      user.balance += amount;
      await user.save();
    } else {
      toAccount.balance += amount;
      toAccount.totalDeposits += amount;
      await toAccount.save();
    }
    
    // Determine transfer type
    let transferType = 'account_to_account';
    if (fromType === 'wallet' && toType === 'trading_account') {
      transferType = 'wallet_to_account';
    } else if (fromType === 'trading_account' && toType === 'wallet') {
      transferType = 'account_to_wallet';
    }
    
    // Create transfer record
    const transfer = await InternalTransfer.create({
      user: req.user._id,
      transferType,
      fromType,
      fromAccount: fromAccount?._id,
      toType,
      toAccount: toAccount?._id,
      amount,
      status: 'completed'
    });
    
    // Create transaction records
    if (fromType === 'wallet') {
      await Transaction.create({
        user: req.user._id,
        type: 'transfer_out',
        amount: -amount,
        description: `Transfer to trading account ${toAccount.accountNumber}`,
        status: 'completed',
        reference: transfer._id
      });
    }
    
    if (toType === 'wallet') {
      await Transaction.create({
        user: req.user._id,
        type: 'transfer_in',
        amount: amount,
        description: `Transfer from trading account ${fromAccount.accountNumber}`,
        status: 'completed',
        reference: transfer._id
      });
    }
    
    res.json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        transfer,
        walletBalance: user.balance,
        fromAccountBalance: fromAccount?.balance,
        toAccountBalance: toAccount?.balance
      }
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trading-accounts/:id/transfers
// @desc    Get transfer history for an account
// @access  Private
router.get('/:id/transfers', protect, async (req, res) => {
  try {
    const account = await TradingAccount.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    const transfers = await InternalTransfer.find({
      user: req.user._id,
      $or: [
        { fromAccount: account._id },
        { toAccount: account._id }
      ]
    })
    .populate('fromAccount', 'accountNumber')
    .populate('toAccount', 'accountNumber')
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trading-accounts/transfers/all
// @desc    Get all transfer history for user
// @access  Private
router.get('/transfers/all', protect, async (req, res) => {
  try {
    const transfers = await InternalTransfer.find({ user: req.user._id })
      .populate('fromAccount', 'accountNumber nickname')
      .populate('toAccount', 'accountNumber nickname')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    console.error('Get all transfers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/trading-accounts/:id
// @desc    Delete a trading account
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const account = await TradingAccount.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!account) {
      return res.status(404).json({ 
        success: false, 
        message: 'Account not found' 
      });
    }

    // Check for open trades
    const openTrades = await Trade.countDocuments({ 
      tradingAccount: account._id, 
      status: 'open' 
    });

    if (openTrades > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete account with open trades. Close all trades first.' 
      });
    }

    // Check if account has balance (only for non-challenge accounts)
    if (!account.isChallenge && account.balance > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete account with balance. Withdraw funds first.' 
      });
    }

    // Close instead of hard delete
    account.status = 'closed';
    await account.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete trading account error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
