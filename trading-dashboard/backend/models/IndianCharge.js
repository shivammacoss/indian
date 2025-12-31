const mongoose = require('mongoose');

const indianChargeSchema = new mongoose.Schema({
  // Charge name for identification
  name: {
    type: String,
    required: true
  },
  
  // Scope: global, segment, symbol
  scopeType: {
    type: String,
    enum: ['global', 'segment', 'symbol'],
    default: 'global'
  },
  
  // Segment: NSE, NFO, MCX, CDS, BSE, BFO
  segment: {
    type: String,
    enum: ['NSE', 'NFO', 'MCX', 'CDS', 'BSE', 'BFO', null],
    default: null
  },
  
  // Specific symbol (optional)
  symbol: {
    type: String,
    uppercase: true,
    default: null
  },
  
  // Product type specific charges
  productType: {
    type: String,
    enum: ['MIS', 'CNC', 'NRML', 'ALL'],
    default: 'ALL'
  },
  
  // Charge type: per_lot, per_execution, percentage
  chargeType: {
    type: String,
    enum: ['per_lot', 'per_execution', 'percentage'],
    default: 'per_lot'
  },
  
  // Brokerage charge
  brokerage: {
    type: Number,
    default: 0
  },
  
  // STT (Securities Transaction Tax) - percentage
  sttPercentage: {
    type: Number,
    default: 0
  },
  
  // Transaction charges - percentage
  transactionChargePercentage: {
    type: Number,
    default: 0
  },
  
  // GST on brokerage - percentage (usually 18%)
  gstPercentage: {
    type: Number,
    default: 18
  },
  
  // SEBI charges - percentage
  sebiChargePercentage: {
    type: Number,
    default: 0
  },
  
  // Stamp duty - percentage
  stampDutyPercentage: {
    type: Number,
    default: 0
  },
  
  // Flat charge per trade (if any)
  flatCharge: {
    type: Number,
    default: 0
  },
  
  // Leverage/Margin settings (admin configurable)
  leverage: {
    MIS: {
      type: Number,
      default: 5 // 5x leverage = 20% margin for intraday
    },
    CNC: {
      type: Number,
      default: 1 // 1x = 100% margin for delivery
    },
    NRML: {
      type: Number,
      default: 2.5 // 2.5x leverage = 40% margin for F&O carryforward
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  description: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Indexes
indianChargeSchema.index({ scopeType: 1, segment: 1, symbol: 1 });
indianChargeSchema.index({ productType: 1 });

// Static method to get charges for a trade
indianChargeSchema.statics.getChargesForTrade = async function(segment, symbol, productType) {
  // Priority: Symbol > Segment > Global
  const charges = await this.find({
    isActive: true,
    $or: [
      { scopeType: 'symbol', symbol: symbol?.toUpperCase() },
      { scopeType: 'segment', segment: segment },
      { scopeType: 'global' }
    ],
    $or: [
      { productType: productType },
      { productType: 'ALL' }
    ]
  }).sort({ scopeType: -1 }); // symbol first, then segment, then global
  
  // Merge charges (more specific overrides less specific)
  let finalCharges = {
    brokerage: 20, // Default ₹20 per lot
    sttPercentage: 0.025,
    transactionChargePercentage: 0.00325,
    gstPercentage: 18,
    sebiChargePercentage: 0.0001,
    stampDutyPercentage: 0.003,
    flatCharge: 0,
    chargeType: 'per_lot',
    leverage: {
      MIS: 5,    // 5x = 20% margin
      CNC: 1,    // 1x = 100% margin
      NRML: 2.5  // 2.5x = 40% margin
    },
    source: 'default'
  };
  
  for (const charge of charges) {
    if (charge.brokerage > 0) finalCharges.brokerage = charge.brokerage;
    if (charge.sttPercentage > 0) finalCharges.sttPercentage = charge.sttPercentage;
    if (charge.transactionChargePercentage > 0) finalCharges.transactionChargePercentage = charge.transactionChargePercentage;
    if (charge.gstPercentage > 0) finalCharges.gstPercentage = charge.gstPercentage;
    if (charge.sebiChargePercentage > 0) finalCharges.sebiChargePercentage = charge.sebiChargePercentage;
    if (charge.stampDutyPercentage > 0) finalCharges.stampDutyPercentage = charge.stampDutyPercentage;
    if (charge.flatCharge > 0) finalCharges.flatCharge = charge.flatCharge;
    if (charge.leverage) {
      if (charge.leverage.MIS) finalCharges.leverage.MIS = charge.leverage.MIS;
      if (charge.leverage.CNC) finalCharges.leverage.CNC = charge.leverage.CNC;
      if (charge.leverage.NRML) finalCharges.leverage.NRML = charge.leverage.NRML;
    }
    finalCharges.chargeType = charge.chargeType;
    finalCharges.source = charge.scopeType;
  }
  
  return finalCharges;
};

// Calculate total charges for a trade
indianChargeSchema.statics.calculateCharges = function(chargeConfig, tradeValue, quantity, lotSize = 1) {
  const lots = quantity / lotSize;
  
  let brokerage = 0;
  if (chargeConfig.chargeType === 'per_lot') {
    brokerage = chargeConfig.brokerage * lots;
  } else if (chargeConfig.chargeType === 'per_execution') {
    brokerage = chargeConfig.brokerage;
  } else if (chargeConfig.chargeType === 'percentage') {
    brokerage = (chargeConfig.brokerage / 100) * tradeValue;
  }
  
  const stt = (chargeConfig.sttPercentage / 100) * tradeValue;
  const transactionCharges = (chargeConfig.transactionChargePercentage / 100) * tradeValue;
  const gst = (chargeConfig.gstPercentage / 100) * brokerage;
  const sebiCharges = (chargeConfig.sebiChargePercentage / 100) * tradeValue;
  const stampDuty = (chargeConfig.stampDutyPercentage / 100) * tradeValue;
  const flatCharge = chargeConfig.flatCharge || 0;
  
  const totalCharges = brokerage + stt + transactionCharges + gst + sebiCharges + stampDuty + flatCharge;
  
  return {
    brokerage: Math.round(brokerage * 100) / 100,
    stt: Math.round(stt * 100) / 100,
    transactionCharges: Math.round(transactionCharges * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    sebiCharges: Math.round(sebiCharges * 100) / 100,
    stampDuty: Math.round(stampDuty * 100) / 100,
    flatCharge: Math.round(flatCharge * 100) / 100,
    totalCharges: Math.round(totalCharges * 100) / 100
  };
};

module.exports = mongoose.model('IndianCharge', indianChargeSchema);
