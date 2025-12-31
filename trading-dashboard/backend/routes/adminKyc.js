const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protectAdmin } = require('./adminAuth');

// @route   GET /api/admin/kyc
// @desc    Get all KYC submissions
// @access  Admin
router.get('/', protectAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = {};
    if (status) {
      filter.kycStatus = status;
    } else {
      filter.kycStatus = { $ne: 'not_submitted' };
    }
    
    const users = await User.find(filter)
      .select('firstName lastName email phone country kycVerified kycStatus kycDocuments dateOfBirth address createdAt')
      .sort({ 'kycDocuments.submittedAt': -1 });
    
    res.json({
      success: true,
      data: users,
      counts: {
        pending: await User.countDocuments({ kycStatus: 'pending' }),
        approved: await User.countDocuments({ kycStatus: 'approved' }),
        rejected: await User.countDocuments({ kycStatus: 'rejected' })
      }
    });
  } catch (error) {
    console.error('Admin get KYC error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/kyc/:userId
// @desc    Get single user KYC details
// @access  Admin
router.get('/:userId', protectAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('firstName lastName email phone country kycVerified kycStatus kycDocuments dateOfBirth address createdAt');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Admin get user KYC error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/kyc/:userId/approve
// @desc    Approve KYC
// @access  Admin
router.put('/:userId/approve', protectAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.kycStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'KYC is not pending' });
    }
    
    user.kycVerified = true;
    user.kycStatus = 'approved';
    user.kycDocuments.verifiedAt = new Date();
    user.kycDocuments.rejectionReason = '';
    
    await user.save();
    
    res.json({
      success: true,
      message: 'KYC approved successfully',
      data: {
        kycVerified: user.kycVerified,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error('Admin approve KYC error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/kyc/:userId/reject
// @desc    Reject KYC
// @access  Admin
router.put('/:userId/reject', protectAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.kycStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'KYC is not pending' });
    }
    
    user.kycVerified = false;
    user.kycStatus = 'rejected';
    user.kycDocuments.rejectionReason = reason;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'KYC rejected',
      data: {
        kycVerified: user.kycVerified,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error('Admin reject KYC error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/kyc/:userId/reset
// @desc    Reset KYC (allow resubmission)
// @access  Admin
router.put('/:userId/reset', protectAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.kycVerified = false;
    user.kycStatus = 'not_submitted';
    user.kycDocuments = {
      idType: '',
      idNumber: '',
      idFrontImage: '',
      idBackImage: '',
      selfieImage: '',
      addressProof: '',
      submittedAt: null,
      verifiedAt: null,
      rejectionReason: ''
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'KYC reset successfully. User can now resubmit.',
      data: {
        kycVerified: user.kycVerified,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error('Admin reset KYC error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
