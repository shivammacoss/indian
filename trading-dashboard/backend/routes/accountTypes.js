const express = require('express');
const router = express.Router();
const AccountType = require('../models/AccountType');
const { protect } = require('../middleware/auth');

// @route   GET /api/account-types
// @desc    Get all active account types (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const accountTypes = await AccountType.find({ isActive: true })
      .sort({ sortOrder: 1, minDeposit: 1 });
    
    res.json({
      success: true,
      data: accountTypes
    });
  } catch (error) {
    console.error('Get account types error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/account-types/:id
// @desc    Get single account type
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const accountType = await AccountType.findById(req.params.id);
    
    if (!accountType) {
      return res.status(404).json({ success: false, message: 'Account type not found' });
    }
    
    res.json({
      success: true,
      data: accountType
    });
  } catch (error) {
    console.error('Get account type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
