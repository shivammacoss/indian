const { KiteConnect, KiteTicker } = require('kiteconnect');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load dotenv if not already loaded
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class KiteService {
  constructor() {
    this.apiKey = process.env.KITE_API_KEY;
    this.apiSecret = process.env.KITE_API_SECRET;
    this.redirectUrl = process.env.KITE_REDIRECT_URL || 'http://localhost:5000/api/kite/callback';
    
    if (!this.apiKey) {
      console.error('[KiteService] ERROR: KITE_API_KEY not found in environment variables!');
    }
    
    this.kite = new KiteConnect({ api_key: this.apiKey });
    this.ticker = null;
    this.accessToken = null;
    this.instruments = new Map();
    this.instrumentsLastFetch = 0;
    this.subscribedTokens = new Set();
    this.tickCallbacks = [];
    this.isTickerConnected = false;
    
    // Token file path
    this.tokenFile = path.join(__dirname, '../.kite_token');
    
    // Try to load saved token
    this.loadSavedToken();
    
    console.log('[KiteService] Initialized with API Key:', this.apiKey?.slice(0, 8) + '...');
  }

  // Load saved access token from file
  loadSavedToken() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
        const today = new Date().toDateString();
        
        // Token is valid only for the same day
        if (data.date === today && data.accessToken) {
          this.accessToken = data.accessToken;
          this.kite.setAccessToken(this.accessToken);
          console.log('[KiteService] Loaded saved access token');
          return true;
        }
      }
    } catch (error) {
      console.log('[KiteService] No valid saved token');
    }
    return false;
  }

  // Save access token to file
  saveToken(accessToken) {
    try {
      const data = {
        accessToken,
        date: new Date().toDateString()
      };
      fs.writeFileSync(this.tokenFile, JSON.stringify(data));
      console.log('[KiteService] Token saved');
    } catch (error) {
      console.error('[KiteService] Failed to save token:', error.message);
    }
  }

  // Get login URL for OAuth
  getLoginUrl() {
    return this.kite.getLoginURL();
  }

  // Handle OAuth callback and generate session
  async handleCallback(requestToken) {
    try {
      const session = await this.kite.generateSession(requestToken, this.apiSecret);
      this.accessToken = session.access_token;
      this.kite.setAccessToken(this.accessToken);
      this.saveToken(this.accessToken);
      
      console.log('[KiteService] Session generated successfully');
      return { success: true, accessToken: this.accessToken };
    } catch (error) {
      console.error('[KiteService] Session generation failed:', error.message);
      throw error;
    }
  }

  // Check if authenticated
  isAuthenticated() {
    return !!this.accessToken;
  }

  // Get all instruments (cached for 24 hours)
  async getInstruments(exchange = null) {
    const now = Date.now();
    const cacheKey = exchange || 'ALL';
    
    // Refresh instruments daily
    if (now - this.instrumentsLastFetch > 24 * 60 * 60 * 1000 || this.instruments.size === 0) {
      await this.fetchAllInstruments();
    }

    if (exchange) {
      return Array.from(this.instruments.values()).filter(i => i.exchange === exchange);
    }
    return Array.from(this.instruments.values());
  }

  // Fetch all instruments from Kite
  async fetchAllInstruments() {
    // Try API first if authenticated
    if (this.isAuthenticated()) {
      try {
        console.log('[KiteService] Fetching instruments from Kite API...');
        const instruments = await this.kite.getInstruments();
        
        const parsed = instruments.map(inst => ({
          token: inst.instrument_token,
          symbol: inst.tradingsymbol,
          name: inst.name || inst.tradingsymbol,
          exchange: inst.exchange,
          segment: inst.segment,
          instrumentType: inst.instrument_type,
          strike: inst.strike || 0,
          expiry: inst.expiry || null,
          lotSize: inst.lot_size || 1,
          tickSize: inst.tick_size || 0.05,
          lastPrice: inst.last_price || 0
        }));
        
        this.instruments.clear();
        parsed.forEach(inst => this.instruments.set(inst.token, inst));
        this.instrumentsLastFetch = Date.now();
        this.cacheInstruments(parsed);
        
        console.log(`[KiteService] Loaded ${parsed.length} instruments from API`);
        return parsed;
      } catch (error) {
        console.error('[KiteService] API fetch failed:', error.message);
      }
    }

    // Try cached instruments
    const cached = this.loadCachedInstruments();
    if (cached.length > 0) {
      console.log(`[KiteService] Using ${cached.length} cached instruments`);
      cached.forEach(inst => this.instruments.set(inst.token, inst));
      return cached;
    }

    // Return default instruments
    console.log('[KiteService] Using default instruments');
    return this.getDefaultInstruments();
  }

  // Default instruments when no cache/API available
  getDefaultInstruments() {
    const defaults = [
      // NSE Equity
      { token: 256265, symbol: 'NIFTY 50', name: 'NIFTY 50 INDEX', exchange: 'NSE', segment: 'INDICES', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 738561, symbol: 'RELIANCE', name: 'RELIANCE INDUSTRIES', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 2953217, symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 341249, symbol: 'HDFCBANK', name: 'HDFC BANK LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 408065, symbol: 'INFY', name: 'INFOSYS LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 1270529, symbol: 'ICICIBANK', name: 'ICICI BANK LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 779521, symbol: 'SBIN', name: 'STATE BANK OF INDIA', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 2714625, symbol: 'BHARTIARTL', name: 'BHARTI AIRTEL LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 424961, symbol: 'ITC', name: 'ITC LIMITED', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 492033, symbol: 'KOTAKBANK', name: 'KOTAK MAHINDRA BANK', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 2939649, symbol: 'TATAMOTORS', name: 'TATA MOTORS LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 969473, symbol: 'WIPRO', name: 'WIPRO LIMITED', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 2815745, symbol: 'LT', name: 'LARSEN & TOUBRO', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 1510401, symbol: 'AXISBANK', name: 'AXIS BANK LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 81153, symbol: 'BAJFINANCE', name: 'BAJAJ FINANCE LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 2672641, symbol: 'MARUTI', name: 'MARUTI SUZUKI INDIA', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 3861249, symbol: 'ADANIENT', name: 'ADANI ENTERPRISES', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 3001089, symbol: 'TATASTEEL', name: 'TATA STEEL LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 2977281, symbol: 'SUNPHARMA', name: 'SUN PHARMA INDUSTRIES', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      { token: 2889473, symbol: 'HCLTECH', name: 'HCL TECHNOLOGIES', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1 },
      // MCX
      { token: 1, symbol: 'GOLD', name: 'GOLD', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-05', lotSize: 100 },
      { token: 2, symbol: 'GOLDM', name: 'GOLD MINI', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-05', lotSize: 10 },
      { token: 3, symbol: 'SILVER', name: 'SILVER', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-03-05', lotSize: 30 },
      { token: 4, symbol: 'SILVERM', name: 'SILVER MINI', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 5 },
      { token: 5, symbol: 'CRUDEOIL', name: 'CRUDE OIL', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-01-17', lotSize: 100 },
      { token: 6, symbol: 'NATURALGAS', name: 'NATURAL GAS', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-01-28', lotSize: 1250 },
      { token: 7, symbol: 'COPPER', name: 'COPPER', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 2500 },
      // NFO - Futures
      { token: 10001, symbol: 'NIFTY25JANFUT', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-30', lotSize: 50 },
      { token: 10002, symbol: 'BANKNIFTY25JANFUT', name: 'BANKNIFTY', exchange: 'NFO', segment: 'NFO-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 15 },
      // NFO - Options
      { token: 20001, symbol: 'NIFTY25JAN24000CE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 24000, expiry: '2025-01-02', lotSize: 50 },
      { token: 20002, symbol: 'NIFTY25JAN24000PE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 24000, expiry: '2025-01-02', lotSize: 50 },
      { token: 20003, symbol: 'NIFTY25JAN24100CE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 24100, expiry: '2025-01-02', lotSize: 50 },
      { token: 20004, symbol: 'NIFTY25JAN24100PE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 24100, expiry: '2025-01-02', lotSize: 50 },
      { token: 20005, symbol: 'NIFTY25JAN24200CE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 24200, expiry: '2025-01-02', lotSize: 50 },
      { token: 20006, symbol: 'NIFTY25JAN24200PE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 24200, expiry: '2025-01-02', lotSize: 50 },
      { token: 20007, symbol: 'BANKNIFTY25JAN52000CE', name: 'BANKNIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 52000, expiry: '2025-01-01', lotSize: 15 },
      { token: 20008, symbol: 'BANKNIFTY25JAN52000PE', name: 'BANKNIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 52000, expiry: '2025-01-01', lotSize: 15 },
      // CDS - Currency
      { token: 30001, symbol: 'USDINR25JANFUT', name: 'USDINR', exchange: 'CDS', segment: 'CDS-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 1000 },
      { token: 30002, symbol: 'EURINR25JANFUT', name: 'EURINR', exchange: 'CDS', segment: 'CDS-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 1000 },
      { token: 30003, symbol: 'GBPINR25JANFUT', name: 'GBPINR', exchange: 'CDS', segment: 'CDS-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 1000 },
      { token: 30004, symbol: 'JPYINR25JANFUT', name: 'JPYINR', exchange: 'CDS', segment: 'CDS-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 1000 },
    ];
    
    defaults.forEach(inst => this.instruments.set(inst.token, inst));
    return defaults;
  }

  // Cache instruments to file
  cacheInstruments(instruments) {
    try {
      const cacheFile = path.join(__dirname, '../.kite_instruments.json');
      fs.writeFileSync(cacheFile, JSON.stringify({
        date: new Date().toDateString(),
        instruments: instruments.slice(0, 50000) // Limit size
      }));
    } catch (error) {
      console.error('[KiteService] Failed to cache instruments');
    }
  }

  // Load cached instruments
  loadCachedInstruments() {
    try {
      const cacheFile = path.join(__dirname, '../.kite_instruments.json');
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        return data.instruments || [];
      }
    } catch (error) {
      console.log('[KiteService] No cached instruments');
    }
    return [];
  }

  // Get instruments by exchange with filters
  async getInstrumentsByExchange(exchange, filters = {}) {
    const instruments = await this.getInstruments(exchange);
    
    let filtered = instruments;
    
    if (filters.instrumentType) {
      filtered = filtered.filter(i => i.instrumentType === filters.instrumentType);
    }
    
    if (filters.symbol) {
      filtered = filtered.filter(i => 
        i.symbol.toLowerCase().includes(filters.symbol.toLowerCase()) ||
        i.name?.toLowerCase().includes(filters.symbol.toLowerCase())
      );
    }
    
    if (filters.expiry) {
      filtered = filtered.filter(i => i.expiry === filters.expiry);
    }

    return filtered;
  }

  // Get F&O instruments with strike prices
  async getFOInstruments(underlying = null) {
    const nfoInstruments = await this.getInstruments('NFO');
    
    if (underlying) {
      return nfoInstruments.filter(i => 
        i.name?.toUpperCase() === underlying.toUpperCase() ||
        i.symbol?.startsWith(underlying.toUpperCase())
      );
    }
    
    return nfoInstruments;
  }

  // Get Options with strikes for a symbol
  async getOptionChain(symbol, expiry = null) {
    const fnoInstruments = await this.getFOInstruments(symbol);
    
    const options = fnoInstruments.filter(i => 
      i.instrumentType === 'CE' || i.instrumentType === 'PE'
    );

    if (expiry) {
      return options.filter(i => i.expiry === expiry);
    }

    // Group by expiry
    const grouped = {};
    options.forEach(opt => {
      const exp = opt.expiry || 'Unknown';
      if (!grouped[exp]) grouped[exp] = [];
      grouped[exp].push(opt);
    });

    return grouped;
  }

  // Get MCX instruments
  async getMCXInstruments() {
    return this.getInstruments('MCX');
  }

  // Get BSE F&O instruments
  async getBFOInstruments() {
    return this.getInstruments('BFO');
  }

  // Get quotes for multiple symbols
  async getQuotes(instruments) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const quotes = await this.kite.getQuote(instruments);
      return quotes;
    } catch (error) {
      console.error('[KiteService] Quote error:', error.message);
      throw error;
    }
  }

  // Get LTP for multiple symbols
  async getLTP(instruments) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const ltp = await this.kite.getLTP(instruments);
      return ltp;
    } catch (error) {
      console.error('[KiteService] LTP error:', error.message);
      throw error;
    }
  }

  // Get OHLC for multiple symbols
  async getOHLC(instruments) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const ohlc = await this.kite.getOHLC(instruments);
      return ohlc;
    } catch (error) {
      console.error('[KiteService] OHLC error:', error.message);
      throw error;
    }
  }

  // Get historical data
  async getHistoricalData(instrumentToken, interval, from, to) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const data = await this.kite.getHistoricalData(
        instrumentToken,
        interval,
        from,
        to
      );
      return data;
    } catch (error) {
      console.error('[KiteService] Historical data error:', error.message);
      throw error;
    }
  }

  // Search instruments
  searchInstruments(query, exchange = null) {
    const allInstruments = Array.from(this.instruments.values());
    const q = query.toLowerCase();
    
    let results = allInstruments.filter(i => 
      i.symbol?.toLowerCase().includes(q) ||
      i.name?.toLowerCase().includes(q)
    );

    if (exchange) {
      results = results.filter(i => i.exchange === exchange);
    }

    return results.slice(0, 50);
  }

  // Get unique expiry dates for a symbol
  async getExpiryDates(symbol, exchange = 'NFO') {
    const instruments = await this.getInstruments(exchange);
    const filtered = instruments.filter(i => 
      i.name?.toUpperCase() === symbol.toUpperCase() ||
      i.symbol?.startsWith(symbol.toUpperCase())
    );

    const expiries = [...new Set(filtered.map(i => i.expiry).filter(Boolean))];
    return expiries.sort((a, b) => new Date(a) - new Date(b));
  }

  // Get available strike prices for a symbol and expiry
  async getStrikePrices(symbol, expiry, exchange = 'NFO') {
    const instruments = await this.getInstruments(exchange);
    const filtered = instruments.filter(i => 
      (i.name?.toUpperCase() === symbol.toUpperCase() || i.symbol?.startsWith(symbol.toUpperCase())) &&
      i.expiry === expiry &&
      (i.instrumentType === 'CE' || i.instrumentType === 'PE')
    );

    const strikes = [...new Set(filtered.map(i => i.strike).filter(Boolean))];
    return strikes.sort((a, b) => a - b);
  }

  // ==================== WEBSOCKET TICKER METHODS ====================

  // Initialize Kite Ticker for real-time streaming
  initTicker() {
    if (!this.isAuthenticated()) {
      console.log('[KiteTicker] Cannot init - not authenticated');
      return false;
    }

    if (this.ticker && this.isTickerConnected) {
      console.log('[KiteTicker] Already connected');
      return true;
    }

    try {
      this.ticker = new KiteTicker({
        api_key: this.apiKey,
        access_token: this.accessToken
      });

      this.ticker.on('connect', () => {
        console.log('[KiteTicker] Connected to Kite WebSocket');
        this.isTickerConnected = true;
        
        // Re-subscribe to previously subscribed tokens
        if (this.subscribedTokens.size > 0) {
          const tokens = Array.from(this.subscribedTokens);
          this.ticker.subscribe(tokens);
          this.ticker.setMode(this.ticker.modeFull, tokens);
          console.log(`[KiteTicker] Re-subscribed to ${tokens.length} tokens`);
        }
      });

      this.ticker.on('ticks', (ticks) => {
        this.handleTicks(ticks);
      });

      this.ticker.on('disconnect', () => {
        console.log('[KiteTicker] Disconnected');
        this.isTickerConnected = false;
      });

      this.ticker.on('error', (error) => {
        console.error('[KiteTicker] Error:', error);
      });

      this.ticker.on('close', () => {
        console.log('[KiteTicker] Connection closed');
        this.isTickerConnected = false;
      });

      this.ticker.on('reconnect', (retries, interval) => {
        console.log(`[KiteTicker] Reconnecting... attempt ${retries}, interval ${interval}ms`);
      });

      this.ticker.connect();
      console.log('[KiteTicker] Connecting...');
      return true;
    } catch (error) {
      console.error('[KiteTicker] Init error:', error.message);
      return false;
    }
  }

  // Handle incoming ticks
  handleTicks(ticks) {
    const formattedTicks = ticks.map(tick => ({
      token: tick.instrument_token,
      symbol: this.getSymbolByToken(tick.instrument_token),
      ltp: tick.last_price,
      open: tick.ohlc?.open || 0,
      high: tick.ohlc?.high || 0,
      low: tick.ohlc?.low || 0,
      close: tick.ohlc?.close || 0,
      change: tick.change || 0,
      changePercent: tick.change_percent || ((tick.last_price - (tick.ohlc?.close || tick.last_price)) / (tick.ohlc?.close || tick.last_price) * 100) || 0,
      volume: tick.volume || 0,
      buyQty: tick.total_buy_quantity || 0,
      sellQty: tick.total_sell_quantity || 0,
      oi: tick.oi || 0,
      oiChange: tick.oi_day_high - tick.oi_day_low || 0,
      bid: tick.depth?.buy?.[0]?.price || tick.last_price,
      ask: tick.depth?.sell?.[0]?.price || tick.last_price,
      timestamp: tick.exchange_timestamp || new Date()
    }));

    // Notify all callbacks
    this.tickCallbacks.forEach(callback => {
      try {
        callback(formattedTicks);
      } catch (e) {
        console.error('[KiteTicker] Callback error:', e.message);
      }
    });
  }

  // Get symbol name by token
  getSymbolByToken(token) {
    // Try numeric token first
    let instrument = this.instruments.get(token);
    if (instrument?.symbol) return instrument.symbol;
    
    // Try string token
    instrument = this.instruments.get(String(token));
    if (instrument?.symbol) return instrument.symbol;
    
    // Try parseInt token
    instrument = this.instruments.get(parseInt(token));
    if (instrument?.symbol) return instrument.symbol;
    
    // Fallback mapping for common MCX tokens
    const mcxMap = {
      115080711: 'GOLD26FEBFUT',
      119020807: 'CRUDEOIL26JANFUT',
      119021063: 'CRUDEOILM26JANFUT',
      119741447: 'GOLDGUINEA25DECFUT',
      119299847: 'COPPER25DECFUT',
      119739655: 'COPPER26JANFUT',
      119299591: 'ALUMINIUM25DECFUT',
      119555335: 'CRUDEOIL26FEBFUT',
    };
    return mcxMap[token] || `TOKEN_${token}`;
  }
  
  // Add instrument to cache (for dynamic subscription)
  addInstrumentToCache(token, symbol, exchange = 'NSE') {
    if (!this.instruments.has(token)) {
      this.instruments.set(token, { token, symbol, exchange });
    }
  }

  // Subscribe to instrument tokens
  subscribe(tokens) {
    if (!Array.isArray(tokens)) tokens = [tokens];
    
    tokens.forEach(t => this.subscribedTokens.add(t));
    
    if (this.ticker && this.isTickerConnected) {
      this.ticker.subscribe(tokens);
      this.ticker.setMode(this.ticker.modeFull, tokens);
      console.log(`[KiteTicker] Subscribed to ${tokens.length} tokens`);
    } else {
      console.log(`[KiteTicker] Queued ${tokens.length} tokens for subscription (use zerodhaBridge)`);
      // Don't auto-init ticker - let zerodhaBridge handle it
    }
  }

  // Unsubscribe from instrument tokens
  unsubscribe(tokens) {
    if (!Array.isArray(tokens)) tokens = [tokens];
    
    tokens.forEach(t => this.subscribedTokens.delete(t));
    
    if (this.ticker && this.isTickerConnected) {
      this.ticker.unsubscribe(tokens);
      console.log(`[KiteTicker] Unsubscribed from ${tokens.length} tokens`);
    }
  }

  // Register tick callback
  onTick(callback) {
    if (typeof callback === 'function') {
      this.tickCallbacks.push(callback);
      console.log(`[KiteTicker] Registered tick callback (total: ${this.tickCallbacks.length})`);
    }
  }

  // Remove tick callback
  offTick(callback) {
    const index = this.tickCallbacks.indexOf(callback);
    if (index > -1) {
      this.tickCallbacks.splice(index, 1);
    }
  }

  // Disconnect ticker
  disconnectTicker() {
    if (this.ticker) {
      this.ticker.disconnect();
      this.isTickerConnected = false;
      console.log('[KiteTicker] Disconnected');
    }
  }

  // Get ticker status
  getTickerStatus() {
    return {
      connected: this.isTickerConnected,
      subscribedCount: this.subscribedTokens.size,
      subscribedTokens: Array.from(this.subscribedTokens)
    };
  }
}

module.exports = new KiteService();
