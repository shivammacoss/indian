const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protectAdmin } = require('./adminAuth');

// @route   GET /api/admin/settings
// @desc    Get all settings
// @access  Admin
router.get('/', protectAdmin, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const settings = await Settings.find(filter).sort({ category: 1, key: 1 });
    
    // Convert to key-value object for easier access
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    
    res.json({ success: true, data: settings, settings: settingsObj });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/settings/:key
// @desc    Get a specific setting
// @access  Admin
router.get('/:key', protectAdmin, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/settings/:key
// @desc    Update a setting
// @access  Admin
router.put('/:key', protectAdmin, async (req, res) => {
  try {
    const { value, description, category } = req.body;
    
    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      { 
        value, 
        description: description || '',
        category: category || 'general',
        updatedBy: req.admin._id
      },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, data: setting, message: 'Setting updated' });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/settings/bulk
// @desc    Update multiple settings at once
// @access  Admin
router.post('/bulk', protectAdmin, async (req, res) => {
  try {
    const { settings } = req.body; // Array of { key, value, category, description }
    
    const updates = await Promise.all(
      settings.map(s => 
        Settings.findOneAndUpdate(
          { key: s.key },
          { 
            value: s.value, 
            category: s.category || 'general',
            description: s.description || '',
            updatedBy: req.admin._id
          },
          { upsert: true, new: true }
        )
      )
    );
    
    res.json({ success: true, data: updates, message: 'Settings updated' });
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/settings/currency/rates
// @desc    Get currency conversion rates
// @access  Admin
router.get('/currency/rates', protectAdmin, async (req, res) => {
  try {
    const rates = {
      depositRate: await Settings.getSetting('deposit_inr_to_usd_rate', 83),
      withdrawalRate: await Settings.getSetting('withdrawal_usd_to_inr_rate', 83),
      depositMarkup: await Settings.getSetting('deposit_currency_markup', 0),
      withdrawalMarkup: await Settings.getSetting('withdrawal_currency_markup', 0)
    };
    
    res.json({ success: true, data: rates });
  } catch (error) {
    console.error('Get currency rates error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/settings/currency/rates
// @desc    Update currency conversion rates
// @access  Admin
router.put('/currency/rates', protectAdmin, async (req, res) => {
  try {
    const { depositRate, withdrawalRate, depositMarkup, withdrawalMarkup } = req.body;
    
    await Promise.all([
      Settings.setSetting('deposit_inr_to_usd_rate', depositRate, 'currency', 'INR to USD rate for deposits'),
      Settings.setSetting('withdrawal_usd_to_inr_rate', withdrawalRate, 'currency', 'USD to INR rate for withdrawals'),
      Settings.setSetting('deposit_currency_markup', depositMarkup || 0, 'currency', 'Markup/Charge on deposit conversion'),
      Settings.setSetting('withdrawal_currency_markup', withdrawalMarkup || 0, 'currency', 'Markup/Charge on withdrawal conversion')
    ]);
    
    res.json({ success: true, message: 'Currency rates updated' });
  } catch (error) {
    console.error('Update currency rates error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
