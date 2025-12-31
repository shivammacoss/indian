const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/kyc/status
// @desc    Get user's KYC status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kycVerified kycStatus kycDocuments');
    
    res.json({
      success: true,
      data: {
        kycVerified: user.kycVerified,
        kycStatus: user.kycStatus,
        documents: {
          idType: user.kycDocuments?.idType || '',
          idNumber: user.kycDocuments?.idNumber ? '****' + user.kycDocuments.idNumber.slice(-4) : '',
          hasIdFront: !!user.kycDocuments?.idFrontImage,
          hasIdBack: !!user.kycDocuments?.idBackImage,
          hasSelfie: !!user.kycDocuments?.selfieImage,
          hasAddressProof: !!user.kycDocuments?.addressProof,
          submittedAt: user.kycDocuments?.submittedAt,
          verifiedAt: user.kycDocuments?.verifiedAt,
          rejectionReason: user.kycDocuments?.rejectionReason
        }
      }
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/kyc/submit
// @desc    Submit KYC documents
// @access  Private
router.post('/submit', protect, async (req, res) => {
  try {
    const { 
      idType, 
      idNumber, 
      idFrontImage, 
      idBackImage, 
      selfieImage, 
      addressProof,
      dateOfBirth,
      address
    } = req.body;
    
    // Validate required fields
    if (!idType || !idNumber || !idFrontImage) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID type, ID number, and front image are required' 
      });
    }
    
    const user = await User.findById(req.user._id);
    
    // Check if already verified
    if (user.kycVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'KYC is already verified' 
      });
    }
    
    // Check if pending
    if (user.kycStatus === 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'KYC is already pending review. Please wait for admin approval.' 
      });
    }
    
    // Update KYC documents
    user.kycDocuments = {
      idType,
      idNumber,
      idFrontImage,
      idBackImage: idBackImage || '',
      selfieImage: selfieImage || '',
      addressProof: addressProof || '',
      submittedAt: new Date(),
      verifiedAt: null,
      rejectionReason: ''
    };
    
    user.kycStatus = 'pending';
    
    // Update additional info if provided
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (address) user.address = address;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'KYC documents submitted successfully. Please wait for admin approval.',
      data: {
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
