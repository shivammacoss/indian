const { Server } = require('socket.io');
const MetaApiService = require('./MetaApiService');
const tradeEngine = require('./TradeEngine');
const TradingCharge = require('../models/TradingCharge');
const jwt = require('jsonwebtoken');
const createZerodhaTickerBridge = require('./zerodhaTicker');

class SocketManager {
  constructor(server, config = {}) {
    // Optimized Socket.IO for low latency
    this.io = new Server(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:5173', 'https://stockpip.com', 'http://stockpip.com'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      // Low latency optimizations
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      perMessageDeflate: false // Disable compression for lower latency
    });

    this.config = config;
    this.metaApi = null;
    this.clients = new Map();
    this.prices = {};
    this.lastEmitTime = {};
    this.throttleMs = 50; // Minimum 50ms between emissions per symbol (20 updates/sec max)
    this.spreads = {}; // Cached spreads from admin config

    // Initialize Zerodha Ticker Bridge for Indian market
    this.zerodhaBridge = null;
    if (process.env.KITE_API_KEY) {
      this.zerodhaBridge = createZerodhaTickerBridge({
        io: this.io,
        apiKey: process.env.KITE_API_KEY
      });
      console.log('[SocketManager] Zerodha Ticker Bridge initialized');
    }

    this.setupSocketHandlers();
    this.loadSpreads(); // Load spreads on startup
  }

  /**
   * Load spreads from TradingCharge model
   */
  async loadSpreads() {
    try {
      const charges = await TradingCharge.find({ isActive: true });
      
      // Default spreads by segment (in pips)
      const defaultSpreads = {
        forex: 1.5,
        metals: 30,
        crypto: 50,
        indices: 100
      };
      
      // Get segment for symbol
      const getSegment = (symbol) => {
        if (['XAUUSD', 'XAGUSD'].includes(symbol)) return 'metals';
        if (['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD'].includes(symbol)) return 'crypto';
        if (['US30', 'US500', 'NAS100', 'UK100', 'GER40'].includes(symbol)) return 'indices';
        return 'forex';
      };
      
      // All symbols
      const symbols = [
        'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
        'EURGBP', 'EURJPY', 'GBPJPY', 'EURAUD', 'EURCAD', 'EURCHF', 'GBPAUD',
        'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD'
      ];
      
      const globalCharge = charges.find(c => c.scopeType === 'global');
      
      for (const symbol of symbols) {
        const segment = getSegment(symbol);
        const symbolCharge = charges.find(c => c.scopeType === 'symbol' && c.symbol === symbol);
        const segmentCharge = charges.find(c => c.scopeType === 'segment' && c.segment === segment);
        
        if (symbolCharge && symbolCharge.spreadPips > 0) {
          this.spreads[symbol] = symbolCharge.spreadPips;
        } else if (segmentCharge && segmentCharge.spreadPips > 0) {
          this.spreads[symbol] = segmentCharge.spreadPips;
        } else if (globalCharge && globalCharge.spreadPips > 0) {
          this.spreads[symbol] = globalCharge.spreadPips;
        } else {
          this.spreads[symbol] = defaultSpreads[segment];
        }
      }
      
      console.log('[SocketManager] Spreads loaded:', Object.keys(this.spreads).length, 'symbols');
      
      // Refresh spreads every 60 seconds
      setTimeout(() => this.loadSpreads(), 60000);
    } catch (error) {
      console.error('[SocketManager] Error loading spreads:', error.message);
      // Retry in 10 seconds
      setTimeout(() => this.loadSpreads(), 10000);
    }
  }

  /**
   * Apply spread to price data
   */
  applySpread(symbol, bid, ask) {
    const spreadPips = this.spreads[symbol] || 1.5;
    
    // Convert pips to price based on symbol type
    let pipValue = 0.0001; // Default for forex
    if (symbol.includes('JPY')) pipValue = 0.01;
    else if (symbol.includes('XAU')) pipValue = 0.1;
    else if (symbol.includes('XAG')) pipValue = 0.01;
    else if (symbol.includes('BTC')) pipValue = 1;
    else if (symbol.includes('ETH')) pipValue = 0.1;
    else if (symbol.includes('LTC') || symbol.includes('XRP')) pipValue = 0.001;
    
    const spreadValue = spreadPips * pipValue;
    const halfSpread = spreadValue / 2;
    
    // Apply spread symmetrically around mid price
    const midPrice = (bid + ask) / 2;
    return {
      bid: midPrice - halfSpread,
      ask: midPrice + halfSpread
    };
  }

  /**
   * Initialize MetaApi connection
   */
  async initMetaApi() {
    if (!this.config.metaApiToken || !this.config.metaApiAccountId) {
      console.log('[SocketManager] MetaApi not configured - skipping');
      return false;
    }

    this.metaApi = new MetaApiService(
      this.config.metaApiToken,
      this.config.metaApiAccountId
    );

    this.setupMetaApiHandlers();
    
    const connected = await this.metaApi.connect();
    if (connected) {
      await this.subscribeDefaultSymbols();
    }
    return connected;
  }

  /**
   * Set up MetaApi event handlers
   */
  setupMetaApiHandlers() {
    const self = this;
    let tickCount = 0;
    
    // Stream ticks to clients AND feed to TradeEngine for order execution
    this.metaApi.on('tick', (tickData) => {
      if (tickData && tickData.symbol) {
        // Apply admin-configured spread
        const { bid, ask } = self.applySpread(tickData.symbol, tickData.bid, tickData.ask);
        
        const priceWithSpread = {
          symbol: tickData.symbol,
          bid: bid,
          ask: ask,
          time: tickData.time
        };
        
        // Send to frontend with spread applied
        self.io.emit('tick', priceWithSpread);
        
        // Feed to TradeEngine for order execution (with spread)
        tradeEngine.updatePrice(tickData.symbol, {
          bid: bid,
          ask: ask,
          price: (bid + ask) / 2,
          spread: ask - bid
        });
        
        // Log first few ticks
        if (tickCount < 5) {
          console.log(`[Socket.IO] Tick: ${tickData.symbol} ${bid}/${ask} (spread applied)`);
          tickCount++;
        }
      }
    });

    this.metaApi.on('connected', () => {
      console.log('[SocketManager] MetaApi connected - streaming to clients');
      self.io.emit('provider:connected', { source: 'metaapi' });
    });

    this.metaApi.on('disconnected', () => {
      console.log('[SocketManager] MetaApi disconnected');
      self.io.emit('provider:disconnected', { source: 'metaapi' });
    });

    this.metaApi.on('error', (error) => {
      console.error('[SocketManager] MetaApi error:', error.message);
    });
  }

  /**
   * Handle price update with throttling for optimal performance
   */
  handlePriceUpdate(priceData) {
    const symbol = priceData.symbol;
    const now = Date.now();

    // Store latest price
    this.prices[symbol] = priceData;

    // Throttle emissions to prevent flooding (max 20 updates/sec per symbol)
    const lastEmit = this.lastEmitTime[symbol] || 0;
    if (now - lastEmit >= this.throttleMs) {
      this.lastEmitTime[symbol] = now;

      // Log first few emissions for debugging
      if (!this.loggedSymbols) this.loggedSymbols = new Set();
      if (!this.loggedSymbols.has(symbol)) {
        console.log(`[Socket.IO] Emitting ${symbol}: bid=${priceData.bid}, ask=${priceData.ask}`);
        this.loggedSymbols.add(symbol);
      }

      // Emit to all clients
      this.io.emit('tick', priceData);
      this.io.emit('prices', this.prices);
    }
  }

  /**
   * Subscribe to default trading symbols
   */
  async subscribeDefaultSymbols() {
    const symbols = [
      // Major Forex pairs
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
      'AUDUSD', 'NZDUSD', 'USDCAD',
      // Cross pairs
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF',
      'AUDCAD', 'AUDCHF', 'AUDJPY', 'AUDNZD',
      'CADCHF', 'CADJPY', 'CHFJPY',
      'EURAUD', 'EURCAD', 'EURNZD',
      'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD',
      'NZDCAD', 'NZDCHF', 'NZDJPY',
      // Metals
      'XAUUSD', 'XAGUSD', 'XAUEUR',
      // Indices (if available)
      'US30', 'US500', 'US100', 'DE30', 'UK100', 'JP225',
      // Crypto (if available on broker)
      'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD',
      // Oil & Energy
      'USOIL', 'UKOIL', 'XNGUSD'
    ];

    console.log(`[SocketManager] Subscribing to ${symbols.length} symbols...`);
    await this.metaApi.subscribeSymbols(symbols);
  }

  /**
   * Set up Socket.IO client handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket.IO] Client connected: ${socket.id}`);
      
      this.clients.set(socket.id, {
        subscribedSymbols: new Set(),
        connectedAt: Date.now(),
        userId: null
      });

      // Authenticate user and join their room for personalized events
      const token = socket.handshake.auth?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          const userId = decoded.id || decoded.userId;
          if (userId) {
            socket.join(`user_${userId}`);
            const client = this.clients.get(socket.id);
            if (client) client.userId = userId;
            console.log(`[Socket.IO] User ${userId} joined room user_${userId}`);
          }
        } catch (err) {
          console.log(`[Socket.IO] Token verification failed:`, err.message);
        }
      }

      // Send current status and prices
      socket.emit('status', this.getStatus());
      socket.emit('prices', this.prices);

      // Handle symbol subscription
      socket.on('subscribe', async (data) => {
        const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols];
        console.log(`[Socket.IO] Client ${socket.id} subscribing to:`, symbols);
        
        const client = this.clients.get(socket.id);
        if (client) {
          symbols.forEach(s => client.subscribedSymbols.add(s));
        }

        // Subscribe via MetaApi if connected
        if (this.metaApi && this.metaApi.isConnected) {
          await this.metaApi.subscribeSymbols(symbols);
        }

        socket.emit('subscribed', { symbols });
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (data) => {
        const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols];
        const client = this.clients.get(socket.id);
        if (client) {
          symbols.forEach(s => client.subscribedSymbols.delete(s));
        }
        socket.emit('unsubscribed', { symbols });
      });

      // Get current status
      socket.on('getStatus', () => {
        socket.emit('status', this.getStatus());
      });

      // Get all prices
      socket.on('getPrices', () => {
        socket.emit('prices', this.prices);
      });

      // Get specific symbol price
      socket.on('getPrice', (symbol) => {
        socket.emit('price', this.prices[symbol] || null);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        this.clients.delete(socket.id);
      });

      socket.on('error', (error) => {
        console.error(`[Socket.IO] Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Start the socket manager
   */
  async start() {
    console.log('[SocketManager] Starting...');
    
    if (this.config.metaApiToken && this.config.metaApiAccountId) {
      await this.initMetaApi();
    } else {
      console.log('[SocketManager] Socket.IO ready (configure MetaApi in .env)');
    }
  }

  /**
   * Stop and cleanup
   */
  async stop() {
    if (this.metaApi) {
      await this.metaApi.disconnect();
    }
    this.io.close();
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      connected: true,
      metaApiConnected: this.metaApi?.isConnected || false,
      subscribedSymbols: this.metaApi ? Array.from(this.metaApi.subscribedSymbols) : [],
      priceCount: Object.keys(this.prices).length,
      clientCount: this.clients.size,
      source: this.metaApi?.isConnected ? 'metaapi' : 'none'
    };
  }

  /**
   * Get all prices
   */
  getAllPrices() {
    return this.prices;
  }

  /**
   * Get price for symbol
   */
  getPrice(symbol) {
    return this.prices[symbol] || null;
  }

  /**
   * Manually emit price (for external data sources)
   */
  emitPrice(priceData) {
    this.handlePriceUpdate(priceData);
  }

  /**
   * Start Zerodha ticker with access token
   */
  startZerodhaTicker(accessToken) {
    if (this.zerodhaBridge && accessToken) {
      this.zerodhaBridge.start(accessToken);
      console.log('[SocketManager] Zerodha Ticker started');
    }
  }

  /**
   * Get Zerodha bridge status
   */
  getZerodhaStatus() {
    if (this.zerodhaBridge) {
      return this.zerodhaBridge.getStatus();
    }
    return { tickerConnected: false, hasAccessToken: false };
  }
}

module.exports = SocketManager;
