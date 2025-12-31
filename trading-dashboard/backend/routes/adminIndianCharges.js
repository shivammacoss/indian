const express = require('express');
const router = express.Router();
const { protectAdmin } = require('./adminAuth');
const IndianCharge = require('../models/IndianCharge');

// @route   GET /api/admin/indian-charges
// @desc    Get all Indian charge configurations
// @access  Admin
router.get('/', protectAdmin, async (req, res) => {
  try {
    const charges = await IndianCharge.find()
      .sort({ scopeType: 1, segment: 1, createdAt: -1 });
    
    res.json({
      success: true,
      data: charges,
      count: charges.length
    });
  } catch (error) {
    console.error('[AdminIndianCharges] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/indian-charges
// @desc    Create Indian charge configuration
// @access  Admin
router.post('/', protectAdmin, async (req, res) => {
  try {
    const {
      name,
      scopeType,
      segment,
      symbol,
      productType,
      chargeType,
      brokerage,
      sttPercentage,
      transactionChargePercentage,
      gstPercentage,
      sebiChargePercentage,
      stampDutyPercentage,
      flatCharge,
      leverage,
      description
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    
    const charge = await IndianCharge.create({
      name,
      scopeType: scopeType || 'global',
      segment: segment || null,
      symbol: symbol?.toUpperCase() || null,
      productType: productType || 'ALL',
      chargeType: chargeType || 'per_lot',
      brokerage: brokerage || 0,
      sttPercentage: sttPercentage || 0,
      transactionChargePercentage: transactionChargePercentage || 0,
      gstPercentage: gstPercentage || 18,
      sebiChargePercentage: sebiChargePercentage || 0,
      stampDutyPercentage: stampDutyPercentage || 0,
      flatCharge: flatCharge || 0,
      leverage: leverage || { MIS: 5, CNC: 1, NRML: 2.5 },
      description,
      createdBy: req.admin._id,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Indian charge configuration created',
      data: charge
    });
  } catch (error) {
    console.error('[AdminIndianCharges] Error creating:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/indian-charges/:id
// @desc    Update Indian charge configuration
// @access  Admin
router.put('/:id', protectAdmin, async (req, res) => {
  try {
    const charge = await IndianCharge.findByIdAndUpdate(
      req.params.id,
      { ...req.body, symbol: req.body.symbol?.toUpperCase() },
      { new: true }
    );
    
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge configuration not found' });
    }
    
    res.json({
      success: true,
      message: 'Charge configuration updated',
      data: charge
    });
  } catch (error) {
    console.error('[AdminIndianCharges] Error updating:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/admin/indian-charges/:id
// @desc    Delete Indian charge configuration
// @access  Admin
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const charge = await IndianCharge.findByIdAndDelete(req.params.id);
    
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge configuration not found' });
    }
    
    res.json({
      success: true,
      message: 'Charge configuration deleted'
    });
  } catch (error) {
    console.error('[AdminIndianCharges] Error deleting:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/indian-charges/seed-defaults
// @desc    Seed default Indian charge configurations
// @access  Admin
router.post('/seed-defaults', protectAdmin, async (req, res) => {
  try {
    // Check if defaults already exist
    const existing = await IndianCharge.countDocuments();
    if (existing > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Charge configurations already exist. Delete them first to re-seed.' 
      });
    }
    
    const defaults = [
      // Global default
      {
        name: 'Global Default',
        scopeType: 'global',
        productType: 'ALL',
        chargeType: 'per_lot',
        brokerage: 20,
        sttPercentage: 0.025,
        transactionChargePercentage: 0.00325,
        gstPercentage: 18,
        sebiChargePercentage: 0.0001,
        stampDutyPercentage: 0.003,
        leverage: { MIS: 5, CNC: 1, NRML: 2.5 },
        description: 'Default charges for all Indian trades'
      },
      // NSE Equity Intraday
      {
        name: 'NSE Equity Intraday',
        scopeType: 'segment',
        segment: 'NSE',
        productType: 'MIS',
        chargeType: 'per_execution',
        brokerage: 20,
        sttPercentage: 0.025,
        transactionChargePercentage: 0.00325,
        gstPercentage: 18,
        sebiChargePercentage: 0.0001,
        stampDutyPercentage: 0.003,
        leverage: { MIS: 5, CNC: 1, NRML: 2.5 },
        description: 'NSE Equity Intraday charges - 5x leverage'
      },
      // NSE Equity Delivery
      {
        name: 'NSE Equity Delivery',
        scopeType: 'segment',
        segment: 'NSE',
        productType: 'CNC',
        chargeType: 'per_execution',
        brokerage: 0, // Zero brokerage for delivery
        sttPercentage: 0.1,
        transactionChargePercentage: 0.00325,
        gstPercentage: 18,
        sebiChargePercentage: 0.0001,
        stampDutyPercentage: 0.015,
        leverage: { MIS: 5, CNC: 1, NRML: 2.5 },
        description: 'NSE Equity Delivery charges (Zero brokerage, no leverage)'
      },
      // NSE F&O
      {
        name: 'NSE F&O',
        scopeType: 'segment',
        segment: 'NFO',
        productType: 'ALL',
        chargeType: 'per_lot',
        brokerage: 20,
        sttPercentage: 0.05,
        transactionChargePercentage: 0.05,
        gstPercentage: 18,
        sebiChargePercentage: 0.0001,
        stampDutyPercentage: 0.003,
        leverage: { MIS: 10, CNC: 1, NRML: 4 },
        description: 'NSE F&O charges per lot - 10x MIS, 4x NRML leverage'
      },
      // MCX
      {
        name: 'MCX Commodity',
        scopeType: 'segment',
        segment: 'MCX',
        productType: 'ALL',
        chargeType: 'per_lot',
        brokerage: 20,
        sttPercentage: 0.05,
        transactionChargePercentage: 0.0026,
        gstPercentage: 18,
        sebiChargePercentage: 0.0001,
        stampDutyPercentage: 0.003,
        leverage: { MIS: 10, CNC: 1, NRML: 5 },
        description: 'MCX Commodity charges per lot - 10x MIS, 5x NRML leverage'
      },
      // Currency
      {
        name: 'Currency Derivatives',
        scopeType: 'segment',
        segment: 'CDS',
        productType: 'ALL',
        chargeType: 'per_lot',
        brokerage: 20,
        sttPercentage: 0,
        transactionChargePercentage: 0.00035,
        gstPercentage: 18,
        sebiChargePercentage: 0.0001,
        stampDutyPercentage: 0.0001,
        leverage: { MIS: 20, CNC: 1, NRML: 10 },
        description: 'Currency Derivatives charges per lot - 20x MIS, 10x NRML leverage'
      }
    ];
    
    const created = await IndianCharge.insertMany(
      defaults.map(d => ({ ...d, createdBy: req.admin._id, isActive: true }))
    );
    
    res.status(201).json({
      success: true,
      message: `Created ${created.length} default charge configurations`,
      data: created
    });
  } catch (error) {
    console.error('[AdminIndianCharges] Error seeding:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
