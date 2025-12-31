/**
 * Seed script for Prop Firm Challenge Types
 * Run with: node scripts/seedChallenges.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const ChallengeType = require('../models/ChallengeType');

const challengeTypes = [
  {
    name: 'Two Step Challenge',
    slug: 'two-step',
    description: 'Complete 2 phases to get funded. Industry standard evaluation with achievable targets.',
    type: 'two_step',
    totalPhases: 2,
    phases: [
      {
        phaseNumber: 1,
        name: 'Phase 1 - Evaluation',
        profitTarget: 8,
        minimumTradingDays: 5,
        maximumTradingDays: 30,
        minimumTrades: 0
      },
      {
        phaseNumber: 2,
        name: 'Phase 2 - Verification',
        profitTarget: 5,
        minimumTradingDays: 5,
        maximumTradingDays: 60,
        minimumTrades: 0
      }
    ],
    accountSizes: [
      { size: 5000, price: 49, currency: 'USD', refundable: true },
      { size: 10000, price: 99, currency: 'USD', refundable: true },
      { size: 25000, price: 199, currency: 'USD', refundable: true },
      { size: 50000, price: 299, currency: 'USD', refundable: true },
      { size: 100000, price: 499, currency: 'USD', refundable: true },
      { size: 200000, price: 899, currency: 'USD', refundable: true }
    ],
    riskRules: {
      maxDailyDrawdown: 5,
      maxTotalDrawdown: 10,
      drawdownCalculation: 'higher_of_both',
      trailingDrawdown: false,
      maxInactiveDays: 30,
      weekendHoldingAllowed: true,
      newsTrading: true,
      mandatorySL: false,
      maxLotSize: 0,
      maxPositions: 0,
      allowedInstruments: [],
      eaAllowed: true,
      copyTradingAllowed: false,
      martingaleAllowed: false,
      // New fields
      maxTradesPerDay: 0, // unlimited
      maxTradesPerPhase: 0, // unlimited
      allowMultiplePositions: true,
      autoSlEnabled: false,
      autoSlPercent: 2,
      autoTpEnabled: false,
      autoTpPercent: 4,
      challengeDurationDays: 30,
      challengeDurationType: 'days'
    },
    payoutConfig: {
      profitSplit: 80,
      firstPayoutAfterDays: 14,
      payoutFrequency: 'biweekly',
      minimumPayout: 50
    },
    scalingPlan: {
      enabled: true,
      requirements: {
        consistentMonths: 3,
        minimumProfit: 10,
        noRuleViolations: true
      },
      increments: [
        { level: 1, accountMultiplier: 1.25, profitSplitIncrease: 5 },
        { level: 2, accountMultiplier: 1.5, profitSplitIncrease: 5 },
        { level: 3, accountMultiplier: 2, profitSplitIncrease: 5 }
      ]
    },
    displayOrder: 1,
    isPopular: true,
    badge: 'Most Popular',
    color: '#3b82f6',
    isActive: true
  },
  {
    name: 'One Step Challenge',
    slug: 'one-step',
    description: 'Fast track to funding with just 1 phase. Higher target but quicker path to profits.',
    type: 'one_step',
    totalPhases: 1,
    phases: [
      {
        phaseNumber: 1,
        name: 'Evaluation',
        profitTarget: 10,
        minimumTradingDays: 5,
        maximumTradingDays: 45,
        minimumTrades: 0
      }
    ],
    accountSizes: [
      { size: 5000, price: 69, currency: 'USD', refundable: true },
      { size: 10000, price: 129, currency: 'USD', refundable: true },
      { size: 25000, price: 249, currency: 'USD', refundable: true },
      { size: 50000, price: 399, currency: 'USD', refundable: true },
      { size: 100000, price: 599, currency: 'USD', refundable: true },
      { size: 200000, price: 1099, currency: 'USD', refundable: true }
    ],
    riskRules: {
      maxDailyDrawdown: 4,
      maxTotalDrawdown: 8,
      drawdownCalculation: 'higher_of_both',
      trailingDrawdown: false,
      maxInactiveDays: 30,
      weekendHoldingAllowed: true,
      newsTrading: true,
      mandatorySL: false,
      maxLotSize: 0,
      maxPositions: 0,
      allowedInstruments: [],
      eaAllowed: true,
      copyTradingAllowed: false,
      martingaleAllowed: false,
      maxTradesPerDay: 0,
      maxTradesPerPhase: 0,
      allowMultiplePositions: false, // One Step = single position
      autoSlEnabled: true,
      autoSlPercent: 2,
      autoTpEnabled: true,
      autoTpPercent: 4,
      challengeDurationDays: 45,
      challengeDurationType: 'days'
    },
    payoutConfig: {
      profitSplit: 80,
      firstPayoutAfterDays: 14,
      payoutFrequency: 'biweekly',
      minimumPayout: 50
    },
    scalingPlan: {
      enabled: true,
      requirements: {
        consistentMonths: 3,
        minimumProfit: 10,
        noRuleViolations: true
      },
      increments: [
        { level: 1, accountMultiplier: 1.25, profitSplitIncrease: 5 },
        { level: 2, accountMultiplier: 1.5, profitSplitIncrease: 5 },
        { level: 3, accountMultiplier: 2, profitSplitIncrease: 5 }
      ]
    },
    displayOrder: 2,
    isPopular: false,
    badge: 'Fast Track',
    color: '#22c55e',
    isActive: true
  },
  {
    name: 'Instant Funding',
    slug: 'instant-funding',
    description: 'Skip the evaluation. Get funded immediately with trailing drawdown protection.',
    type: 'instant_funding',
    totalPhases: 0,
    phases: [],
    accountSizes: [
      { size: 5000, price: 199, currency: 'USD', refundable: false },
      { size: 10000, price: 349, currency: 'USD', refundable: false },
      { size: 25000, price: 599, currency: 'USD', refundable: false },
      { size: 50000, price: 999, currency: 'USD', refundable: false },
      { size: 100000, price: 1799, currency: 'USD', refundable: false },
      { size: 200000, price: 3299, currency: 'USD', refundable: false }
    ],
    riskRules: {
      maxDailyDrawdown: 4,
      maxTotalDrawdown: 6,
      drawdownCalculation: 'equity',
      trailingDrawdown: true,
      trailingDrawdownLockProfit: 6,
      maxInactiveDays: 30,
      weekendHoldingAllowed: true,
      newsTrading: false,
      mandatorySL: true,
      maxSlPips: 50,
      maxLotSize: 0,
      maxPositions: 0,
      allowedInstruments: [],
      eaAllowed: false,
      copyTradingAllowed: false,
      martingaleAllowed: false,
      maxTradesPerDay: 5, // Limited trades per day
      maxTradesPerPhase: 0,
      allowMultiplePositions: false, // Stricter rules
      autoSlEnabled: true,
      autoSlPercent: 1.5,
      autoTpEnabled: true,
      autoTpPercent: 3,
      challengeDurationDays: 0, // Unlimited for funded
      challengeDurationType: 'unlimited'
    },
    payoutConfig: {
      profitSplit: 70,
      firstPayoutAfterDays: 7,
      payoutFrequency: 'weekly',
      minimumPayout: 100
    },
    scalingPlan: {
      enabled: true,
      requirements: {
        consistentMonths: 2,
        minimumProfit: 8,
        noRuleViolations: true
      },
      increments: [
        { level: 1, accountMultiplier: 1.25, profitSplitIncrease: 5 },
        { level: 2, accountMultiplier: 1.5, profitSplitIncrease: 5 }
      ]
    },
    displayOrder: 3,
    isPopular: false,
    badge: 'Instant',
    color: '#f59e0b',
    isActive: true
  }
];

async function seedChallenges() {
  try {
    await connectDB();
    console.log('Connected to database');

    // Clear existing challenge types (optional)
    // await ChallengeType.deleteMany({});
    // console.log('Cleared existing challenge types');

    for (const challengeData of challengeTypes) {
      const existing = await ChallengeType.findOne({ slug: challengeData.slug });
      
      if (existing) {
        // Update existing
        await ChallengeType.findByIdAndUpdate(existing._id, challengeData);
        console.log(`Updated: ${challengeData.name}`);
      } else {
        // Create new
        const challenge = new ChallengeType(challengeData);
        await challenge.save();
        console.log(`Created: ${challengeData.name}`);
      }
    }

    console.log('\n✅ Challenge types seeded successfully!');
    console.log(`Total: ${challengeTypes.length} challenge types`);
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedChallenges();
