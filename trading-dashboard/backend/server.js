const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const { connectDB } = require('./config/db');
const SocketManager = require('./services/socketManager');
const tradeEngine = require('./services/TradeEngine');
const CleanupService = require('./services/cleanupService');
const ChallengeEngine = require('./services/ChallengeEngine');
const AccountType = require('./models/AccountType');

// Import routes
const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trades');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');
const marketRoutes = require('./routes/market');
const walletRoutes = require('./routes/wallet');
const copyTradeRoutes = require('./routes/copyTrade');
const ibRoutes = require('./routes/ib');
const { router: adminAuthRoutes } = require('./routes/adminAuth');
const adminUsersRoutes = require('./routes/adminUsers');
const adminWalletRoutes = require('./routes/adminWallet');
const adminCopyTradeRoutes = require('./routes/adminCopyTrade');
const adminIBRoutes = require('./routes/adminIB');
const supportRoutes = require('./routes/support');
const adminSupportRoutes = require('./routes/adminSupport');
const adminChargesRoutes = require('./routes/adminCharges');
const adminTradesRoutes = require('./routes/adminTrades');
const accountTypesRoutes = require('./routes/accountTypes');
const tradingAccountsRoutes = require('./routes/tradingAccounts');
const adminAccountTypesRoutes = require('./routes/adminAccountTypes');
const kycRoutes = require('./routes/kyc');
const adminKycRoutes = require('./routes/adminKyc');
const adminSettingsRoutes = require('./routes/adminSettings');
const challengeRoutes = require('./routes/challenges');
const adminChallengeRoutes = require('./routes/adminChallenges');
const indianMarketRoutes = require('./routes/indianMarket');
const kiteRoutes = require('./routes/kite');
const indianTradesRoutes = require('./routes/indianTrades');
const adminIndianChargesRoutes = require('./routes/adminIndianCharges');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with MetaApi configuration
const socketManager = new SocketManager(server, {
  metaApiToken: process.env.METAAPI_TOKEN,
  metaApiAccountId: process.env.METAAPI_ACCOUNT_ID
});

// Make socketManager available to routes
app.set('socketManager', socketManager);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/copy-trade', copyTradeRoutes);
app.use('/api/ib', ibRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/account-types', accountTypesRoutes);
app.use('/api/trading-accounts', tradingAccountsRoutes);
app.use('/api/kyc', kycRoutes);
// Admin routes - order matters! More specific routes first
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/wallet', adminWalletRoutes);
app.use('/api/admin/copy-trade', adminCopyTradeRoutes);
app.use('/api/admin/ib', adminIBRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/admin/charges', adminChargesRoutes);
app.use('/api/admin/trades', adminTradesRoutes);
app.use('/api/admin/account-types', adminAccountTypesRoutes);
app.use('/api/admin/kyc', adminKycRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/challenges', adminChallengeRoutes);
app.use('/api/admin/indian-charges', adminIndianChargesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/indian-market', indianMarketRoutes);
app.use('/api/indian-trades', indianTradesRoutes);
app.use('/api/kite', kiteRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Stockpip Trading API is running',
    timestamp: new Date().toISOString()
  });
});

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  res.json({
    success: true,
    ...socketManager.getStats()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║     Stockpip Trading API Server              ║
  ║     Running on port ${PORT}                       ║
  ║     Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║     WebSocket: Enabled (Socket.IO)            ║
  ║     Data: MetaApi.cloud (Low Latency)         ║
  ╚═══════════════════════════════════════════════╝
  `);
  
  // Start Socket.IO
  socketManager.start();
  
  // Start Trade Engine
  tradeEngine.setSocketIO(socketManager.io);
  tradeEngine.start();
  
  // Run cleanup on startup (fix orphaned trades)
  CleanupService.runAll();
  
  // Auto-seed account types if none exist
  const seedAccountTypes = async () => {
    try {
      const count = await AccountType.countDocuments();
      if (count === 0) {
        const defaultTypes = [
          { name: 'Demo', code: 'DEMO', description: 'Practice trading with virtual funds', minDeposit: 0, maxLeverage: 500, spreadMarkup: 1.0, commission: 0, features: ['Virtual $10,000', 'All instruments', 'Risk-free practice'], color: '#6b7280', icon: 'graduation-cap', sortOrder: 0, isDemo: true, isActive: true },
          { name: 'Standard', code: 'STANDARD', description: 'Perfect for beginners', minDeposit: 100, maxLeverage: 100, spreadMarkup: 2.0, commission: 0, features: ['Low minimum deposit', 'Standard spreads', 'Email support'], color: '#3b82f6', icon: 'user', sortOrder: 1, isActive: true },
          { name: 'Pro', code: 'PRO', description: 'For experienced traders', minDeposit: 1000, maxLeverage: 200, spreadMarkup: 1.5, commission: 3, features: ['Lower spreads', 'Priority support', 'Advanced tools'], color: '#8b5cf6', icon: 'trending-up', sortOrder: 2, isActive: true },
          { name: 'Pro+', code: 'PRO_PLUS', description: 'Enhanced trading conditions', minDeposit: 5000, maxLeverage: 300, spreadMarkup: 1.0, commission: 2.5, features: ['Tight spreads', 'Dedicated manager', 'VPS hosting'], color: '#ec4899', icon: 'zap', sortOrder: 3, isActive: true },
          { name: 'Elite', code: 'ELITE', description: 'Premium trading experience', minDeposit: 25000, maxLeverage: 400, spreadMarkup: 0.5, commission: 2, features: ['Raw spreads', '24/7 support', 'Custom solutions', 'Insurance'], color: '#f59e0b', icon: 'crown', sortOrder: 4, isActive: true },
          { name: 'HNI', code: 'HNI', description: 'High Net Worth Individual', minDeposit: 100000, maxLeverage: 500, spreadMarkup: 0.3, commission: 1.5, features: ['Institutional spreads', 'Personal relationship manager', 'Custom leverage', 'Premium events'], color: '#10b981', icon: 'diamond', sortOrder: 5, isActive: true }
        ];
        await AccountType.insertMany(defaultTypes);
        console.log('✅ Default account types seeded');
      }
    } catch (error) {
      console.error('Error seeding account types:', error);
    }
  };
  seedAccountTypes();
  
  // Start Challenge Engine
  const challengeEngine = new ChallengeEngine(socketManager.io);
  challengeEngine.start();
  global.challengeEngine = challengeEngine;
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  socketManager.stop();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server, socketManager };
