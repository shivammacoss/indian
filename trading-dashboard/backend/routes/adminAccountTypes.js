const express = require('express');
const router = express.Router();
const AccountType = require('../models/AccountType');
const TradingAccount = require('../models/TradingAccount');
const { protectAdmin } = require('./adminAuth');

// @route   GET /api/admin/account-types
// @desc    Get all account types (including inactive)
// @access  Admin
router.get('/', protectAdmin, async (req, res) => {
  try {
    const accountTypes = await AccountType.find().sort({ sortOrder: 1 });
    
    // Get usage count for each type
    const typesWithStats = await Promise.all(accountTypes.map(async (type) => {
      const accountCount = await TradingAccount.countDocuments({ accountType: type._id });
      return {
        ...type.toObject(),
        accountCount
      };
    }));
    
    res.json({
      success: true,
      data: typesWithStats
    });
  } catch (error) {
    console.error('Admin get account types error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/account-types
// @desc    Create new account type
// @access  Admin
router.post('/', protectAdmin, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      minDeposit,
      maxLeverage,
      spreadMarkup,
      commission,
      swapFree,
      features,
      tradingFee,
      withdrawalFee,
      minTradeSize,
      maxTradeSize,
      marginCallLevel,
      stopOutLevel,
      allowedInstruments,
      color,
      icon,
      sortOrder,
      isDemo,
      isActive
    } = req.body;
    
    // Check if code already exists
    const existing = await AccountType.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Account type code already exists' });
    }
    
    const accountType = await AccountType.create({
      name,
      code: code.toUpperCase(),
      description,
      minDeposit: minDeposit || 100,
      maxLeverage: maxLeverage || 100,
      spreadMarkup: spreadMarkup || 1.5,
      commission: commission || 0,
      swapFree: swapFree || false,
      features: features || [],
      tradingFee: tradingFee || 0,
      withdrawalFee: withdrawalFee || 0,
      minTradeSize: minTradeSize || 0.01,
      maxTradeSize: maxTradeSize || 100,
      marginCallLevel: marginCallLevel || 100,
      stopOutLevel: stopOutLevel || 50,
      allowedInstruments: allowedInstruments || ['forex', 'crypto', 'commodities', 'indices'],
      color: color || '#3b82f6',
      icon: icon || 'star',
      sortOrder: sortOrder || 0,
      isDemo: isDemo || false,
      isActive: isActive !== false
    });
    
    res.status(201).json({
      success: true,
      message: 'Account type created successfully',
      data: accountType
    });
  } catch (error) {
    console.error('Create account type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/account-types/:id
// @desc    Update account type
// @access  Admin
router.put('/:id', protectAdmin, async (req, res) => {
  try {
    const accountType = await AccountType.findById(req.params.id);
    
    if (!accountType) {
      return res.status(404).json({ success: false, message: 'Account type not found' });
    }
    
    const updateFields = [
      'name', 'description', 'minDeposit', 'maxLeverage', 'spreadMarkup',
      'commission', 'swapFree', 'features', 'tradingFee', 'withdrawalFee',
      'minTradeSize', 'maxTradeSize', 'marginCallLevel', 'stopOutLevel',
      'allowedInstruments', 'color', 'icon', 'sortOrder', 'isActive'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        accountType[field] = req.body[field];
      }
    });
    
    await accountType.save();
    
    res.json({
      success: true,
      message: 'Account type updated successfully',
      data: accountType
    });
  } catch (error) {
    console.error('Update account type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/account-types/:id
// @desc    Delete account type (only if no accounts use it)
// @access  Admin
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const accountType = await AccountType.findById(req.params.id);
    
    if (!accountType) {
      return res.status(404).json({ success: false, message: 'Account type not found' });
    }
    
    // Check if any accounts use this type
    const accountCount = await TradingAccount.countDocuments({ accountType: req.params.id });
    if (accountCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete: ${accountCount} trading accounts use this type. Deactivate instead.` 
      });
    }
    
    await accountType.deleteOne();
    
    res.json({
      success: true,
      message: 'Account type deleted successfully'
    });
  } catch (error) {
    console.error('Delete account type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/account-types/seed
// @desc    Seed default account types
// @access  Admin
router.post('/seed', protectAdmin, async (req, res) => {
  try {
    const existingCount = await AccountType.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Account types already exist. Delete existing types first.' 
      });
    }
    
    const defaultTypes = [
      {
        name: 'Demo',
        code: 'DEMO',
        description: 'Practice trading with virtual funds',
        minDeposit: 0,
        maxLeverage: 500,
        spreadMarkup: 1.0,
        commission: 0,
        features: ['Virtual $10,000', 'All instruments', 'Risk-free practice'],
        color: '#6b7280',
        icon: 'graduation-cap',
        sortOrder: 0,
        isDemo: true,
        isActive: true
      },
      {
        name: 'Standard',
        code: 'STANDARD',
        description: 'Perfect for beginners',
        minDeposit: 100,
        maxLeverage: 100,
        spreadMarkup: 2.0,
        commission: 0,
        features: ['Low minimum deposit', 'Standard spreads', 'Email support'],
        color: '#3b82f6',
        icon: 'user',
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'Pro',
        code: 'PRO',
        description: 'For experienced traders',
        minDeposit: 1000,
        maxLeverage: 200,
        spreadMarkup: 1.5,
        commission: 3,
        features: ['Lower spreads', 'Priority support', 'Advanced tools'],
        color: '#8b5cf6',
        icon: 'trending-up',
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'Pro+',
        code: 'PRO_PLUS',
        description: 'Enhanced trading conditions',
        minDeposit: 5000,
        maxLeverage: 300,
        spreadMarkup: 1.0,
        commission: 2.5,
        features: ['Tight spreads', 'Dedicated manager', 'VPS hosting'],
        color: '#ec4899',
        icon: 'zap',
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'Elite',
        code: 'ELITE',
        description: 'Premium trading experience',
        minDeposit: 25000,
        maxLeverage: 400,
        spreadMarkup: 0.5,
        commission: 2,
        features: ['Raw spreads', '24/7 support', 'Custom solutions', 'Insurance'],
        color: '#f59e0b',
        icon: 'crown',
        sortOrder: 4,
        isActive: true
      },
      {
        name: 'HNI',
        code: 'HNI',
        description: 'High Net Worth Individual',
        minDeposit: 100000,
        maxLeverage: 500,
        spreadMarkup: 0.3,
        commission: 1.5,
        features: ['Institutional spreads', 'Personal relationship manager', 'Custom leverage', 'Premium events'],
        color: '#10b981',
        icon: 'diamond',
        sortOrder: 5,
        isActive: true
      }
    ];
    
    const created = await AccountType.insertMany(defaultTypes);
    
    res.status(201).json({
      success: true,
      message: `${created.length} account types created`,
      data: created
    });
  } catch (error) {
    console.error('Seed account types error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/trading-accounts
// @desc    Get all trading accounts
// @access  Admin
router.get('/trading-accounts', protectAdmin, async (req, res) => {
  try {
    const { status, accountType, isDemo, search } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (accountType) filter.accountType = accountType;
    if (isDemo !== undefined) filter.isDemo = isDemo === 'true';
    
    let accounts = await TradingAccount.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('accountType', 'name code color')
      .sort({ createdAt: -1 });
    
    if (search) {
      const searchLower = search.toLowerCase();
      accounts = accounts.filter(acc => 
        acc.accountNumber.toLowerCase().includes(searchLower) ||
        acc.user?.email?.toLowerCase().includes(searchLower) ||
        acc.user?.firstName?.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      success: true,
      data: accounts,
      total: accounts.length
    });
  } catch (error) {
    console.error('Admin get trading accounts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/trading-accounts/:id/status
// @desc    Update trading account status
// @access  Admin
router.put('/trading-accounts/:id/status', protectAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    const account = await TradingAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    account.status = status;
    await account.save();
    
    res.json({
      success: true,
      message: `Account status updated to ${status}`,
      data: account
    });
  } catch (error) {
    console.error('Update account status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
