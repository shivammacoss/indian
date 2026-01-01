const express = require('express');
const router = express.Router();
const kiteService = require('../services/kiteService');
const { protect } = require('../middleware/auth');

// @route   GET /api/kite/login
// @desc    Get Kite login URL
// @access  Public
router.get('/login', (req, res) => {
  try {
    const loginUrl = kiteService.getLoginUrl();
    res.json({
      success: true,
      loginUrl,
      redirectUrl: kiteService.redirectUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/start', (req, res) => {
  try {
    const loginUrl = kiteService.getLoginUrl();
    return res.redirect(loginUrl);
  } catch (error) {
    return res.status(500).send('Failed to start Kite login');
  }
});

// @route   GET /api/kite/callback
// @desc    Handle Kite OAuth callback
// @access  Public
router.get('/callback', async (req, res) => {
  try {
    console.log('[Kite Callback] Full URL:', req.originalUrl);
    console.log('[Kite Callback] Query params:', req.query);

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    
    const { request_token, status, action } = req.query;
    
    // Check if user denied access or there was an error
    if (status === 'error' || action === 'cancel') {
      console.log('[Kite Callback] User cancelled or error occurred');
      return res.redirect(`${frontendBaseUrl}/indian-trade?auth=cancelled`);
    }
    
    if (!request_token) {
      console.error('[Kite Callback] Missing request_token. Query:', req.query);
      return res.send(`
        <html>
          <head><title>Kite Auth Error</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2>Missing Request Token</h2>
            <p>The Kite OAuth callback did not include a request_token.</p>
            <p><strong>Received params:</strong> ${JSON.stringify(req.query)}</p>
            <p>Make sure your redirect URL in Kite Connect matches exactly:</p>
            <code>http://localhost:5001/api/kite/callback</code>
            <br><br>
            <a href="/api/kite/start">Start Kite Login</a>
            <br><br>
            <a href="${frontendBaseUrl}/indian-trade">Go back to Indian Trading</a>
          </body>
        </html>
      `);
    }

    await kiteService.handleCallback(request_token);
    
    // Start Zerodha ticker in SocketManager
    const socketManager = req.app.get('socketManager');
    if (socketManager && kiteService.accessToken) {
      socketManager.startZerodhaTicker(kiteService.accessToken);
      console.log('[Kite Callback] Started Zerodha ticker via SocketManager');
    }
    
    // Redirect to frontend
    res.redirect(`${frontendBaseUrl}/indian-trade?auth=success`);
  } catch (error) {
    console.error('[Kite Callback] Error:', error.message);
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendBaseUrl}/indian-trade?auth=failed&error=` + encodeURIComponent(error.message));
  }
});

// @route   GET /api/kite/status
// @desc    Check Kite authentication status
// @access  Private
router.get('/status', protect, (req, res) => {
  res.json({
    success: true,
    authenticated: kiteService.isAuthenticated(),
    apiKey: process.env.KITE_API_KEY?.slice(0, 8) + '...'
  });
});

// Default instruments data
const DEFAULT_INSTRUMENTS = {
  NSE: [
    { token: 256265, symbol: 'NIFTY 50', name: 'NIFTY 50 INDEX', exchange: 'NSE', segment: 'INDICES', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 24150.50, change: 125.30, changePercent: 0.52 },
    { token: 738561, symbol: 'RELIANCE', name: 'RELIANCE INDUSTRIES', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 2485.50, change: 12.30, changePercent: 0.50 },
    { token: 2953217, symbol: 'TCS', name: 'TATA CONSULTANCY', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 3892.15, change: -15.85, changePercent: -0.41 },
    { token: 341249, symbol: 'HDFCBANK', name: 'HDFC BANK LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 1685.40, change: 8.90, changePercent: 0.53 },
    { token: 408065, symbol: 'INFY', name: 'INFOSYS LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 1876.25, change: 22.75, changePercent: 1.23 },
    { token: 1270529, symbol: 'ICICIBANK', name: 'ICICI BANK LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 1245.80, change: -5.20, changePercent: -0.42 },
    { token: 779521, symbol: 'SBIN', name: 'STATE BANK OF INDIA', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 825.60, change: 4.10, changePercent: 0.50 },
    { token: 2714625, symbol: 'BHARTIARTL', name: 'BHARTI AIRTEL LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 1625.30, change: 18.70, changePercent: 1.16 },
    { token: 424961, symbol: 'ITC', name: 'ITC LIMITED', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 465.20, change: 2.80, changePercent: 0.61 },
    { token: 492033, symbol: 'KOTAKBANK', name: 'KOTAK MAHINDRA BANK', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 1825.50, change: 12.00, changePercent: 0.66 },
    { token: 2939649, symbol: 'TATAMOTORS', name: 'TATA MOTORS LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 785.40, change: -8.20, changePercent: -1.03 },
    { token: 969473, symbol: 'WIPRO', name: 'WIPRO LIMITED', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 456.75, change: 3.25, changePercent: 0.72 },
    { token: 2815745, symbol: 'LT', name: 'LARSEN & TOUBRO', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 3456.80, change: 28.50, changePercent: 0.83 },
    { token: 1510401, symbol: 'AXISBANK', name: 'AXIS BANK LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 1125.60, change: 8.40, changePercent: 0.75 },
    { token: 81153, symbol: 'BAJFINANCE', name: 'BAJAJ FINANCE LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 7245.30, change: 85.20, changePercent: 1.19 },
    { token: 2672641, symbol: 'MARUTI', name: 'MARUTI SUZUKI INDIA', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 11250.40, change: -125.60, changePercent: -1.10 },
    { token: 3861249, symbol: 'ADANIENT', name: 'ADANI ENTERPRISES', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 2856.70, change: 32.40, changePercent: 1.15 },
    { token: 3001089, symbol: 'TATASTEEL', name: 'TATA STEEL LTD', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 142.85, change: 1.35, changePercent: 0.95 },
    { token: 2977281, symbol: 'SUNPHARMA', name: 'SUN PHARMA INDUSTRIES', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 1785.60, change: 15.40, changePercent: 0.87 },
    { token: 2889473, symbol: 'HCLTECH', name: 'HCL TECHNOLOGIES', exchange: 'NSE', segment: 'NSE', instrumentType: 'EQ', strike: 0, expiry: null, lotSize: 1, ltp: 1625.30, change: -12.70, changePercent: -0.78 },
  ],
  NFO: [
    { token: 10001, symbol: 'NIFTY25JANFUT', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-30', lotSize: 50, ltp: 24185.50 },
    { token: 10002, symbol: 'BANKNIFTY25JANFUT', name: 'BANKNIFTY', exchange: 'NFO', segment: 'NFO-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 15, ltp: 51920.25 },
    { token: 10003, symbol: 'FINNIFTY25JANFUT', name: 'FINNIFTY', exchange: 'NFO', segment: 'NFO-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-28', lotSize: 40, ltp: 23856.80 },
    { token: 20001, symbol: 'NIFTY02JAN24000CE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 24000, expiry: '2025-01-02', lotSize: 50, ltp: 185.50 },
    { token: 20002, symbol: 'NIFTY02JAN24000PE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 24000, expiry: '2025-01-02', lotSize: 50, ltp: 45.25 },
    { token: 20003, symbol: 'NIFTY02JAN24100CE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 24100, expiry: '2025-01-02', lotSize: 50, ltp: 125.30 },
    { token: 20004, symbol: 'NIFTY02JAN24100PE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 24100, expiry: '2025-01-02', lotSize: 50, ltp: 68.40 },
    { token: 20005, symbol: 'NIFTY02JAN24200CE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 24200, expiry: '2025-01-02', lotSize: 50, ltp: 78.60 },
    { token: 20006, symbol: 'NIFTY02JAN24200PE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 24200, expiry: '2025-01-02', lotSize: 50, ltp: 95.80 },
    { token: 20007, symbol: 'NIFTY02JAN23900CE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 23900, expiry: '2025-01-02', lotSize: 50, ltp: 265.40 },
    { token: 20008, symbol: 'NIFTY02JAN23900PE', name: 'NIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 23900, expiry: '2025-01-02', lotSize: 50, ltp: 28.50 },
    { token: 20009, symbol: 'BANKNIFTY01JAN52000CE', name: 'BANKNIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 52000, expiry: '2025-01-01', lotSize: 15, ltp: 320.00 },
    { token: 20010, symbol: 'BANKNIFTY01JAN52000PE', name: 'BANKNIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 52000, expiry: '2025-01-01', lotSize: 15, ltp: 125.50 },
    { token: 20011, symbol: 'BANKNIFTY01JAN51500CE', name: 'BANKNIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'CE', strike: 51500, expiry: '2025-01-01', lotSize: 15, ltp: 485.60 },
    { token: 20012, symbol: 'BANKNIFTY01JAN51500PE', name: 'BANKNIFTY', exchange: 'NFO', segment: 'NFO-OPT', instrumentType: 'PE', strike: 51500, expiry: '2025-01-01', lotSize: 15, ltp: 65.40 },
  ],
  MCX: [
    { token: 1, symbol: 'GOLD', name: 'GOLD', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-05', lotSize: 100, ltp: 62450, change: 180, changePercent: 0.29 },
    { token: 2, symbol: 'GOLDM', name: 'GOLD MINI', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-05', lotSize: 10, ltp: 62480, change: 180, changePercent: 0.29 },
    { token: 3, symbol: 'SILVER', name: 'SILVER', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-03-05', lotSize: 30, ltp: 74250, change: 420, changePercent: 0.57 },
    { token: 4, symbol: 'SILVERM', name: 'SILVER MINI', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 5, ltp: 74280, change: 420, changePercent: 0.57 },
    { token: 5, symbol: 'CRUDEOIL', name: 'CRUDE OIL', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-01-17', lotSize: 100, ltp: 5842, change: 45, changePercent: 0.78 },
    { token: 6, symbol: 'NATURALGAS', name: 'NATURAL GAS', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-01-28', lotSize: 1250, ltp: 248.5, change: -3.2, changePercent: -1.27 },
    { token: 7, symbol: 'COPPER', name: 'COPPER', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 2500, ltp: 742.8, change: 5.3, changePercent: 0.72 },
    { token: 8, symbol: 'ZINC', name: 'ZINC', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 5000, ltp: 265.5, change: 1.3, changePercent: 0.49 },
    { token: 9, symbol: 'ALUMINIUM', name: 'ALUMINIUM', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 5000, ltp: 228.6, change: 0.8, changePercent: 0.35 },
    { token: 10, symbol: 'NICKEL', name: 'NICKEL', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 1500, ltp: 1425.5, change: 7.3, changePercent: 0.51 },
  ],
  CDS: [
    { token: 30001, symbol: 'USDINR25JANFUT', name: 'USDINR', exchange: 'CDS', segment: 'CDS-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 1000, ltp: 83.42, change: 0.08, changePercent: 0.10 },
    { token: 30002, symbol: 'EURINR25JANFUT', name: 'EURINR', exchange: 'CDS', segment: 'CDS-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 1000, ltp: 91.25, change: 0.15, changePercent: 0.16 },
    { token: 30003, symbol: 'GBPINR25JANFUT', name: 'GBPINR', exchange: 'CDS', segment: 'CDS-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 1000, ltp: 106.85, change: -0.12, changePercent: -0.11 },
    { token: 30004, symbol: 'JPYINR25JANFUT', name: 'JPYINR', exchange: 'CDS', segment: 'CDS-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-29', lotSize: 1000, ltp: 0.5542, change: 0.0012, changePercent: 0.22 },
  ],
  BFO: [
    { token: 40001, symbol: 'SENSEX25JANFUT', name: 'SENSEX', exchange: 'BFO', segment: 'BFO-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-30', lotSize: 10, ltp: 79856.50 },
    { token: 40002, symbol: 'BANKEX25JANFUT', name: 'BANKEX', exchange: 'BFO', segment: 'BFO-FUT', instrumentType: 'FUT', strike: 0, expiry: '2025-01-30', lotSize: 15, ltp: 56425.80 },
    { token: 40003, symbol: 'SENSEX02JAN80000CE', name: 'SENSEX', exchange: 'BFO', segment: 'BFO-OPT', instrumentType: 'CE', strike: 80000, expiry: '2025-01-02', lotSize: 10, ltp: 245.50 },
    { token: 40004, symbol: 'SENSEX02JAN80000PE', name: 'SENSEX', exchange: 'BFO', segment: 'BFO-OPT', instrumentType: 'PE', strike: 80000, expiry: '2025-01-02', lotSize: 10, ltp: 385.60 },
  ]
};

// @route   GET /api/kite/instruments/all
// @desc    Get all instruments from all exchanges at once with live prices
// @access  Public (no auth needed for instrument data)
router.get('/instruments/all', async (req, res) => {
  try {
    // Check if Kite is authenticated
    if (!kiteService.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kite not authenticated. Please login to Kite first.',
        requiresAuth: true
      });
    }

    const exchanges = ['NSE', 'NFO', 'MCX', 'BFO', 'CDS'];
    const allInstruments = {};
    
    for (const exchange of exchanges) {
      let kiteInstruments = await kiteService.getInstruments(exchange);
      
      // Limit to top 50 instruments per exchange for quote fetching (API limit)
      const limitedInstruments = (kiteInstruments || []).slice(0, 50);
      
      // Build quote symbols for this exchange
      const quoteSymbols = limitedInstruments.map(inst => {
        const symbol = inst.tradingsymbol || inst.symbol;
        return `${exchange}:${symbol}`;
      });
      
      // Fetch live quotes for these instruments
      let quotes = {};
      if (quoteSymbols.length > 0) {
        try {
          quotes = await kiteService.getQuotes(quoteSymbols);
        } catch (e) {
          console.log(`[Kite] Failed to fetch quotes for ${exchange}:`, e.message);
        }
      }
      
      // Map instruments with live prices from quotes
      allInstruments[exchange] = limitedInstruments.map(inst => {
        const symbol = inst.tradingsymbol || inst.symbol;
        const quoteKey = `${exchange}:${symbol}`;
        const quote = quotes[quoteKey] || {};
        
        return {
          token: inst.instrument_token || inst.token,
          symbol: symbol,
          name: inst.name || symbol,
          exchange: inst.exchange || exchange,
          segment: inst.segment,
          instrumentType: inst.instrument_type || inst.instrumentType || 'EQ',
          strike: inst.strike || 0,
          expiry: inst.expiry,
          lotSize: inst.lot_size || inst.lotSize || 1,
          tickSize: inst.tick_size || inst.tickSize || 0.05,
          ltp: quote.last_price || 0,
          open: quote.ohlc?.open || 0,
          high: quote.ohlc?.high || 0,
          low: quote.ohlc?.low || 0,
          close: quote.ohlc?.close || 0,
          change: quote.net_change || 0,
          changePercent: quote.ohlc?.close ? ((quote.last_price - quote.ohlc.close) / quote.ohlc.close * 100) : 0,
          volume: quote.volume || 0,
          bid: quote.depth?.buy?.[0]?.price || 0,
          ask: quote.depth?.sell?.[0]?.price || 0
        };
      });
    }
    
    res.json({
      success: true,
      authenticated: true,
      data: allInstruments,
      counts: {
        NSE: allInstruments.NSE?.length || 0,
        NFO: allInstruments.NFO?.length || 0,
        MCX: allInstruments.MCX?.length || 0,
        BFO: allInstruments.BFO?.length || 0,
        CDS: allInstruments.CDS?.length || 0,
        total: Object.values(allInstruments).reduce((sum, arr) => sum + (arr?.length || 0), 0)
      }
    });
  } catch (error) {
    console.error('[Kite All Instruments] Error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      requiresAuth: error.message.includes('api_key') || error.message.includes('access_token')
    });
  }
});

// @route   GET /api/kite/instruments
// @desc    Get all instruments
// @access  Public (no auth needed for instrument data)
router.get('/instruments', async (req, res) => {
  try {
    // Check if Kite is authenticated
    if (!kiteService.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kite not authenticated. Please login to Kite first.',
        requiresAuth: true
      });
    }

    const { exchange, type, symbol } = req.query;
    
    let instruments = await kiteService.getInstruments(exchange);
    
    // Filter by type if provided
    if (type && instruments.length > 0) {
      instruments = instruments.filter(i => i.instrumentType === type);
    }
    
    // Filter by symbol search if provided
    if (symbol && instruments.length > 0) {
      const q = symbol.toLowerCase();
      instruments = instruments.filter(i => 
        i.symbol?.toLowerCase().includes(q) || 
        i.name?.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: instruments.length,
      data: instruments.slice(0, 500)
    });
  } catch (error) {
    console.error('[Kite Instruments] Error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      requiresAuth: error.message.includes('api_key') || error.message.includes('access_token')
    });
  }
});

// @route   GET /api/kite/instruments/nfo
// @desc    Get NSE F&O instruments
// @access  Private
router.get('/instruments/nfo', protect, async (req, res) => {
  try {
    const { symbol } = req.query;
    const instruments = await kiteService.getFOInstruments(symbol);
    
    res.json({
      success: true,
      count: instruments.length,
      data: instruments.slice(0, 500)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/kite/instruments/mcx
// @desc    Get MCX instruments
// @access  Private
router.get('/instruments/mcx', protect, async (req, res) => {
  try {
    let instruments = await kiteService.getInstruments('MCX');
    
    if (!instruments || instruments.length === 0) {
      // Return default MCX instruments
      instruments = [
        { token: 1, symbol: 'GOLD', name: 'GOLD', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-05', lotSize: 100, ltp: 62450 },
        { token: 2, symbol: 'GOLDM', name: 'GOLD MINI', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-05', lotSize: 10, ltp: 62480 },
        { token: 3, symbol: 'SILVER', name: 'SILVER', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-03-05', lotSize: 30, ltp: 74250 },
        { token: 4, symbol: 'SILVERM', name: 'SILVER MINI', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 5, ltp: 74280 },
        { token: 5, symbol: 'CRUDEOIL', name: 'CRUDE OIL', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-01-17', lotSize: 100, ltp: 5842 },
        { token: 6, symbol: 'NATURALGAS', name: 'NATURAL GAS', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-01-28', lotSize: 1250, ltp: 248.5 },
        { token: 7, symbol: 'COPPER', name: 'COPPER', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 2500, ltp: 742.8 },
        { token: 8, symbol: 'ZINC', name: 'ZINC', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 5000, ltp: 265.5 },
        { token: 9, symbol: 'ALUMINIUM', name: 'ALUMINIUM', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 5000, ltp: 228.6 },
        { token: 10, symbol: 'NICKEL', name: 'NICKEL', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUT', strike: 0, expiry: '2025-02-28', lotSize: 1500, ltp: 1425.5 },
      ];
    }
    
    res.json({
      success: true,
      count: instruments.length,
      data: instruments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/kite/instruments/bfo
// @desc    Get BSE F&O instruments
// @access  Private
router.get('/instruments/bfo', protect, async (req, res) => {
  try {
    const instruments = await kiteService.getBFOInstruments();
    
    res.json({
      success: true,
      count: instruments.length,
      data: instruments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/kite/option-chain
// @desc    Get option chain for a symbol
// @access  Private
router.get('/option-chain', protect, async (req, res) => {
  try {
    const { symbol = 'NIFTY', expiry } = req.query;
    const data = await kiteService.getOptionChain(symbol, expiry);
    
    res.json({
      success: true,
      symbol,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/kite/expiries
// @desc    Get expiry dates for a symbol
// @access  Private
router.get('/expiries', protect, async (req, res) => {
  try {
    const { symbol = 'NIFTY', exchange = 'NFO' } = req.query;
    const expiries = await kiteService.getExpiryDates(symbol, exchange);
    
    res.json({
      success: true,
      symbol,
      expiries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/kite/strikes
// @desc    Get strike prices for a symbol and expiry
// @access  Private
router.get('/strikes', protect, async (req, res) => {
  try {
    const { symbol = 'NIFTY', expiry, exchange = 'NFO' } = req.query;
    
    if (!expiry) {
      return res.status(400).json({ success: false, message: 'Expiry required' });
    }
    
    const strikes = await kiteService.getStrikePrices(symbol, expiry, exchange);
    
    res.json({
      success: true,
      symbol,
      expiry,
      strikes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/kite/quote
// @desc    Get quotes for instruments
// @access  Private
router.get('/quote', protect, async (req, res) => {
  try {
    const { instruments } = req.query;
    
    if (!instruments) {
      return res.status(400).json({ success: false, message: 'Instruments required' });
    }

    const instrumentList = instruments.split(',');
    const quotes = await kiteService.getQuotes(instrumentList);
    
    res.json({
      success: true,
      data: quotes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/kite/ltp
// @desc    Get LTP for instruments
// @access  Private
router.get('/ltp', protect, async (req, res) => {
  try {
    const { instruments } = req.query;
    
    if (!instruments) {
      return res.status(400).json({ success: false, message: 'Instruments required' });
    }

    const instrumentList = instruments.split(',');
    const ltp = await kiteService.getLTP(instrumentList);
    
    res.json({
      success: true,
      data: ltp
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/kite/search
// @desc    Search instruments
// @access  Private
router.get('/search', protect, (req, res) => {
  try {
    const { q, exchange } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const results = kiteService.searchInstruments(q, exchange);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/kite/historical
// @desc    Get historical data
// @access  Public
router.get('/historical', async (req, res) => {
  try {
    const { token, interval = 'day', from, to } = req.query;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Instrument token required' });
    }

    // Check if Kite is authenticated
    if (!kiteService.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kite not authenticated. Please login to Kite first.',
        requiresAuth: true
      });
    }

    // Get real historical data from Kite
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    
    const data = await kiteService.getHistoricalData(token, interval, fromDate, toDate);
    
    return res.json({
      success: true,
      data: data.map(candle => ({
        time: new Date(candle.date).getTime() / 1000,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      }))
    });
  } catch (error) {
    console.error('[Historical] Kite API error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      requiresAuth: error.message.includes('api_key') || error.message.includes('access_token')
    });
  }
});

// Helper function to generate sample candle data
function generateSampleCandles(interval, count) {
  const candles = [];
  const now = Date.now();
  let intervalMs;
  
  switch (interval) {
    case 'minute': intervalMs = 60 * 1000; break;
    case '5minute': intervalMs = 5 * 60 * 1000; break;
    case '15minute': intervalMs = 15 * 60 * 1000; break;
    case '30minute': intervalMs = 30 * 60 * 1000; break;
    case '60minute': case 'hour': intervalMs = 60 * 60 * 1000; break;
    case 'day': default: intervalMs = 24 * 60 * 60 * 1000; break;
  }
  
  let basePrice = 20000 + Math.random() * 5000; // Random base price
  
  for (let i = count - 1; i >= 0; i--) {
    const time = Math.floor((now - i * intervalMs) / 1000);
    const volatility = basePrice * 0.02; // 2% volatility
    const change = (Math.random() - 0.5) * volatility;
    
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 100000) + 10000;
    
    candles.push({ time, open, high, low, close, volume });
    basePrice = close;
  }
  
  return candles;
}

// ==================== WEBSOCKET TICKER ROUTES (DEPRECATED) ====================
// WebSocket for Indian market is now handled by wesocket_zerodha-kite project on port 7001
// These routes are kept for backward compatibility but do nothing

// @route   POST /api/kite/ticker/start
// @desc    Deprecated - use wesocket_zerodha-kite project directly
router.post('/ticker/start', (req, res) => {
  res.json({
    success: true,
    message: 'WebSocket is handled by wesocket_zerodha-kite project on port 7001'
  });
});

// @route   POST /api/kite/ticker/subscribe
// @desc    Deprecated - use wesocket_zerodha-kite project directly
router.post('/ticker/subscribe', (req, res) => {
  res.json({
    success: true,
    message: 'Subscribe via Socket.IO to wesocket_zerodha-kite project on port 7001'
  });
});

// @route   GET /api/kite/ticker/status
// @desc    Deprecated - check wesocket_zerodha-kite project status
router.get('/ticker/status', (req, res) => {
  res.json({
    success: true,
    connected: false,
    message: 'Check wesocket_zerodha-kite project on port 7001 for ticker status'
  });
});

module.exports = router;
