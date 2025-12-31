const mongoose = require('mongoose');

// Schema for individual bank account
const bankAccountSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountHolderName: { type: String, required: true },
  ifscCode: { type: String, required: true },
  bankBranch: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { _id: true });

// Schema for individual UPI
const upiSchema = new mongoose.Schema({
  upiId: { type: String, required: true },
  upiName: { type: String, default: '' }, // Display name like "GPay", "PhonePe"
  qrCode: { type: String, default: '' }, // QR code image (base64 or URL)
  isActive: { type: Boolean, default: true }
}, { _id: true });

const bankSettingsSchema = new mongoose.Schema({
  // Multiple Bank Accounts
  bankAccounts: {
    type: [bankAccountSchema],
    default: []
  },
  
  // Multiple UPI IDs
  upiAccounts: {
    type: [upiSchema],
    default: []
  },
  
  // Legacy single fields (for backward compatibility)
  bankName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  accountHolderName: { type: String, default: '' },
  ifscCode: { type: String, default: '' },
  bankBranch: { type: String, default: '' },
  upiId: { type: String, default: '' },
  qrCode: { type: String, default: '' },
  
  // Additional payment methods
  paymentInstructions: { type: String, default: '' },
  
  // Minimum/Maximum limits
  minDeposit: { type: Number, default: 100 },
  maxDeposit: { type: Number, default: 100000 },
  minWithdrawal: { type: Number, default: 100 },
  maxWithdrawal: { type: Number, default: 50000 },
  
  // Status
  isActive: { type: Boolean, default: true },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
bankSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Get active bank accounts
bankSettingsSchema.statics.getActiveBankAccounts = async function() {
  const settings = await this.getSettings();
  return settings.bankAccounts.filter(acc => acc.isActive);
};

// Get active UPI accounts
bankSettingsSchema.statics.getActiveUPIAccounts = async function() {
  const settings = await this.getSettings();
  return settings.upiAccounts.filter(upi => upi.isActive);
};

module.exports = mongoose.model('BankSettings', bankSettingsSchema);
