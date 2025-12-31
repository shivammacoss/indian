const axios = require('axios');

class IndianMarketService {
  constructor() {
    // API endpoints
    this.nseBaseUrl = 'https://www.nseindia.com/api';
    this.bseBaseUrl = 'https://api.bseindia.com/BseIndiaAPI/api';
    
    // Headers for NSE (they require specific headers)
    this.nseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': 'https://www.nseindia.com/'
    };
    
    // Cookie storage for NSE
    this.nseCookies = null;
    this.lastCookieTime = 0;
    
    // Cache
    this.cache = new Map();
    this.cacheExpiry = 3000; // 3 seconds
    
    // Initialize NSE session
    this.initNSESession();
  }

  // Initialize NSE session to get cookies
  async initNSESession() {
    try {
      const response = await axios.get('https://www.nseindia.com', {
        headers: this.nseHeaders,
        timeout: 10000
      });
      
      if (response.headers['set-cookie']) {
        this.nseCookies = response.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        this.lastCookieTime = Date.now();
        console.log('[IndianMarket] NSE session initialized');
      }
    } catch (error) {
      console.error('[IndianMarket] Failed to init NSE session:', error.message);
    }
  }

  // Get NSE headers with cookies
  getNSEHeaders() {
    return {
      ...this.nseHeaders,
      'Cookie': this.nseCookies || ''
    };
  }

  // Refresh NSE cookies if expired (every 5 minutes)
  async refreshCookiesIfNeeded() {
    if (Date.now() - this.lastCookieTime > 300000) {
      await this.initNSESession();
    }
  }

  // Get from cache or fetch
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, time: Date.now() });
  }

  // ============ NSE EQUITY DATA ============

  // Get NSE market status
  async getMarketStatus() {
    try {
      await this.refreshCookiesIfNeeded();
      const response = await axios.get(`${this.nseBaseUrl}/marketStatus`, {
        headers: this.getNSEHeaders(),
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('[IndianMarket] Market status error:', error.message);
      return this.getDefaultMarketStatus();
    }
  }

  getDefaultMarketStatus() {
    const now = new Date();
    const istHour = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() + 30 >= 60 ? 1 : 0);
    const istMin = (now.getUTCMinutes() + 30) % 60;
    const day = now.getUTCDay();
    
    const nseOpen = day >= 1 && day <= 5 && 
      ((istHour === 9 && istMin >= 15) || (istHour > 9 && istHour < 15) || (istHour === 15 && istMin <= 30));
    const mcxOpen = day >= 1 && day <= 5 && 
      ((istHour >= 9 && istHour < 23) || (istHour === 23 && istMin <= 30));
    
    return {
      nse: { status: nseOpen ? 'Open' : 'Closed' },
      bse: { status: nseOpen ? 'Open' : 'Closed' },
      mcx: { status: mcxOpen ? 'Open' : 'Closed' }
    };
  }

  // Get NIFTY 50 stocks
  async getNifty50() {
    const cacheKey = 'nifty50';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      await this.refreshCookiesIfNeeded();
      const response = await axios.get(`${this.nseBaseUrl}/equity-stockIndices?index=NIFTY%2050`, {
        headers: this.getNSEHeaders(),
        timeout: 15000
      });
      
      if (response.data && response.data.data) {
        const data = response.data.data.map(stock => ({
          symbol: stock.symbol,
          exchange: 'NSE',
          segment: 'EQUITY',
          ltp: stock.lastPrice,
          change: stock.change,
          changePercent: stock.pChange,
          open: stock.open,
          high: stock.dayHigh,
          low: stock.dayLow,
          close: stock.previousClose,
          volume: stock.totalTradedVolume,
          value: stock.totalTradedValue,
          yearHigh: stock.yearHigh,
          yearLow: stock.yearLow
        }));
        this.setCache(cacheKey, data);
        return data;
      }
    } catch (error) {
      console.error('[IndianMarket] NIFTY 50 error:', error.message);
    }
    
    return this.getFallbackEquityData();
  }

  // Get NIFTY Bank stocks
  async getNiftyBank() {
    const cacheKey = 'niftybank';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      await this.refreshCookiesIfNeeded();
      const response = await axios.get(`${this.nseBaseUrl}/equity-stockIndices?index=NIFTY%20BANK`, {
        headers: this.getNSEHeaders(),
        timeout: 15000
      });
      
      if (response.data && response.data.data) {
        const data = response.data.data.map(stock => ({
          symbol: stock.symbol,
          exchange: 'NSE',
          segment: 'EQUITY',
          ltp: stock.lastPrice,
          change: stock.change,
          changePercent: stock.pChange,
          open: stock.open,
          high: stock.dayHigh,
          low: stock.dayLow,
          close: stock.previousClose,
          volume: stock.totalTradedVolume
        }));
        this.setCache(cacheKey, data);
        return data;
      }
    } catch (error) {
      console.error('[IndianMarket] NIFTY Bank error:', error.message);
    }
    
    return [];
  }

  // Get quote for a specific stock
  async getEquityQuote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      await this.refreshCookiesIfNeeded();
      const response = await axios.get(`${this.nseBaseUrl}/quote-equity?symbol=${encodeURIComponent(symbol)}`, {
        headers: this.getNSEHeaders(),
        timeout: 10000
      });
      
      if (response.data && response.data.priceInfo) {
        const info = response.data.priceInfo;
        const data = {
          symbol: symbol,
          exchange: 'NSE',
          segment: 'EQUITY',
          ltp: info.lastPrice,
          change: info.change,
          changePercent: info.pChange,
          open: info.open,
          high: info.intraDayHighLow?.max,
          low: info.intraDayHighLow?.min,
          close: info.previousClose,
          volume: response.data.securityWiseDP?.quantityTraded,
          bid: info.intraDayHighLow?.min,
          ask: info.intraDayHighLow?.max,
          upperCircuit: info.upperCP,
          lowerCircuit: info.lowerCP
        };
        this.setCache(cacheKey, data);
        return data;
      }
    } catch (error) {
      console.error(`[IndianMarket] Quote error for ${symbol}:`, error.message);
    }
    
    return null;
  }

  // ============ F&O DATA ============

  // Get F&O market data
  async getFOData() {
    const cacheKey = 'fo_data';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      await this.refreshCookiesIfNeeded();
      const response = await axios.get(`${this.nseBaseUrl}/option-chain-indices?symbol=NIFTY`, {
        headers: this.getNSEHeaders(),
        timeout: 15000
      });
      
      if (response.data && response.data.records) {
        const data = this.parseOptionChain(response.data.records, 'NIFTY');
        this.setCache(cacheKey, data);
        return data;
      }
    } catch (error) {
      console.error('[IndianMarket] F&O data error:', error.message);
    }
    
    return this.getFallbackFOData();
  }

  // Get option chain for a symbol
  async getOptionChain(symbol) {
    const cacheKey = `oc_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      await this.refreshCookiesIfNeeded();
      const isIndex = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'].includes(symbol.toUpperCase());
      const url = isIndex 
        ? `${this.nseBaseUrl}/option-chain-indices?symbol=${symbol}`
        : `${this.nseBaseUrl}/option-chain-equities?symbol=${symbol}`;
      
      const response = await axios.get(url, {
        headers: this.getNSEHeaders(),
        timeout: 15000
      });
      
      if (response.data && response.data.records) {
        const records = response.data.records;
        const data = {
          symbol: symbol,
          expiryDates: records.expiryDates || [],
          strikePrices: records.strikePrices || [],
          underlyingValue: records.underlyingValue,
          data: records.data?.map(item => ({
            strikePrice: item.strikePrice,
            expiryDate: item.expiryDate,
            CE: item.CE ? {
              oi: item.CE.openInterest,
              changeInOI: item.CE.changeinOpenInterest,
              volume: item.CE.totalTradedVolume,
              iv: item.CE.impliedVolatility,
              ltp: item.CE.lastPrice,
              change: item.CE.change,
              bidQty: item.CE.bidQty,
              bidPrice: item.CE.bidprice,
              askPrice: item.CE.askPrice,
              askQty: item.CE.askQty
            } : null,
            PE: item.PE ? {
              oi: item.PE.openInterest,
              changeInOI: item.PE.changeinOpenInterest,
              volume: item.PE.totalTradedVolume,
              iv: item.PE.impliedVolatility,
              ltp: item.PE.lastPrice,
              change: item.PE.change,
              bidQty: item.PE.bidQty,
              bidPrice: item.PE.bidprice,
              askPrice: item.PE.askPrice,
              askQty: item.PE.askQty
            } : null
          })) || []
        };
        this.setCache(cacheKey, data);
        return data;
      }
    } catch (error) {
      console.error(`[IndianMarket] Option chain error for ${symbol}:`, error.message);
    }
    
    return { symbol, expiryDates: [], strikePrices: [], data: [] };
  }

  parseOptionChain(records, symbol) {
    return {
      symbol,
      underlyingValue: records.underlyingValue,
      expiryDates: records.expiryDates || [],
      totalCE_OI: records.data?.reduce((sum, item) => sum + (item.CE?.openInterest || 0), 0),
      totalPE_OI: records.data?.reduce((sum, item) => sum + (item.PE?.openInterest || 0), 0),
      maxPain: this.calculateMaxPain(records.data),
      pcr: records.data ? 
        (records.data.reduce((sum, item) => sum + (item.PE?.openInterest || 0), 0) / 
         records.data.reduce((sum, item) => sum + (item.CE?.openInterest || 0), 0)).toFixed(2) : 0
    };
  }

  calculateMaxPain(data) {
    if (!data || data.length === 0) return 0;
    // Simplified max pain calculation
    const strikes = data.map(d => d.strikePrice);
    return strikes[Math.floor(strikes.length / 2)];
  }

  // Get futures data
  async getFuturesData(symbol = 'NIFTY') {
    const cacheKey = `futures_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      await this.refreshCookiesIfNeeded();
      const response = await axios.get(`${this.nseBaseUrl}/quote-derivative?symbol=${symbol}`, {
        headers: this.getNSEHeaders(),
        timeout: 10000
      });
      
      if (response.data && response.data.stocks) {
        const futures = response.data.stocks
          .filter(s => s.metadata?.instrumentType === 'Index Futures' || s.metadata?.instrumentType === 'Stock Futures')
          .map(f => ({
            symbol: f.metadata?.identifier,
            underlying: symbol,
            expiryDate: f.metadata?.expiryDate,
            ltp: f.metadata?.lastPrice,
            change: f.metadata?.change,
            changePercent: f.metadata?.pChange,
            oi: f.metadata?.openInterest,
            volume: f.metadata?.numberOfContractsTraded,
            high: f.metadata?.highPrice,
            low: f.metadata?.lowPrice
          }));
        this.setCache(cacheKey, futures);
        return futures;
      }
    } catch (error) {
      console.error(`[IndianMarket] Futures error for ${symbol}:`, error.message);
    }
    
    return [];
  }

  // ============ MCX COMMODITY DATA ============

  // Get MCX commodity data
  async getMCXData() {
    const cacheKey = 'mcx_data';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // MCX data from public sources
    const commodities = [
      { symbol: 'GOLD', name: 'Gold', lotSize: 100, unit: '10 gms' },
      { symbol: 'GOLDM', name: 'Gold Mini', lotSize: 10, unit: '10 gms' },
      { symbol: 'GOLDPETAL', name: 'Gold Petal', lotSize: 1, unit: '1 gm' },
      { symbol: 'SILVER', name: 'Silver', lotSize: 30, unit: 'kg' },
      { symbol: 'SILVERM', name: 'Silver Mini', lotSize: 5, unit: 'kg' },
      { symbol: 'SILVERMIC', name: 'Silver Micro', lotSize: 1, unit: 'kg' },
      { symbol: 'CRUDEOIL', name: 'Crude Oil', lotSize: 100, unit: 'bbl' },
      { symbol: 'CRUDEOILM', name: 'Crude Oil Mini', lotSize: 10, unit: 'bbl' },
      { symbol: 'NATURALGAS', name: 'Natural Gas', lotSize: 1250, unit: 'mmBtu' },
      { symbol: 'COPPER', name: 'Copper', lotSize: 2500, unit: 'kg' },
      { symbol: 'ZINC', name: 'Zinc', lotSize: 5000, unit: 'kg' },
      { symbol: 'LEAD', name: 'Lead', lotSize: 5000, unit: 'kg' },
      { symbol: 'ALUMINIUM', name: 'Aluminium', lotSize: 5000, unit: 'kg' },
      { symbol: 'NICKEL', name: 'Nickel', lotSize: 1500, unit: 'kg' },
      { symbol: 'MENTHAOIL', name: 'Mentha Oil', lotSize: 360, unit: 'kg' },
      { symbol: 'COTTON', name: 'Cotton', lotSize: 25, unit: 'bales' }
    ];

    try {
      // Try to fetch real MCX data
      const data = await this.fetchMCXPrices(commodities);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[IndianMarket] MCX data error:', error.message);
      return this.getFallbackMCXData(commodities);
    }
  }

  async fetchMCXPrices(commodities) {
    // Using a proxy or direct MCX API if available
    // For now, return last known prices with real-time simulation
    const basePrices = {
      'GOLD': { ltp: 62450, prev: 62270 },
      'GOLDM': { ltp: 62480, prev: 62300 },
      'GOLDPETAL': { ltp: 6248, prev: 6230 },
      'SILVER': { ltp: 74250, prev: 73830 },
      'SILVERM': { ltp: 74280, prev: 73860 },
      'SILVERMIC': { ltp: 74260, prev: 73840 },
      'CRUDEOIL': { ltp: 5842, prev: 5797 },
      'CRUDEOILM': { ltp: 5845, prev: 5800 },
      'NATURALGAS': { ltp: 248.5, prev: 251.7 },
      'COPPER': { ltp: 742.80, prev: 737.50 },
      'ZINC': { ltp: 265.50, prev: 264.20 },
      'LEAD': { ltp: 185.30, prev: 184.50 },
      'ALUMINIUM': { ltp: 228.60, prev: 227.80 },
      'NICKEL': { ltp: 1425.50, prev: 1418.20 },
      'MENTHAOIL': { ltp: 985.20, prev: 982.50 },
      'COTTON': { ltp: 56420, prev: 56180 }
    };

    return commodities.map(c => {
      const price = basePrices[c.symbol] || { ltp: 1000, prev: 1000 };
      const change = price.ltp - price.prev;
      const changePct = ((change / price.prev) * 100).toFixed(2);
      
      return {
        symbol: c.symbol,
        name: c.name,
        exchange: 'MCX',
        segment: 'COMMODITY',
        ltp: price.ltp,
        change: change,
        changePercent: parseFloat(changePct),
        open: price.prev + (Math.random() - 0.5) * price.prev * 0.01,
        high: price.ltp * 1.005,
        low: price.ltp * 0.995,
        close: price.prev,
        lotSize: c.lotSize,
        unit: c.unit,
        volume: Math.floor(Math.random() * 50000) + 10000,
        oi: Math.floor(Math.random() * 100000) + 50000
      };
    });
  }

  getFallbackMCXData(commodities) {
    return this.fetchMCXPrices(commodities);
  }

  // ============ CURRENCY DATA ============

  // Get currency futures data
  async getCurrencyData() {
    const cacheKey = 'currency_data';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const currencies = [
      { symbol: 'USDINR', name: 'USD/INR', lotSize: 1000 },
      { symbol: 'EURINR', name: 'EUR/INR', lotSize: 1000 },
      { symbol: 'GBPINR', name: 'GBP/INR', lotSize: 1000 },
      { symbol: 'JPYINR', name: 'JPY/INR', lotSize: 1000 }
    ];

    try {
      await this.refreshCookiesIfNeeded();
      
      // Fetch from NSE currency segment
      const response = await axios.get(`${this.nseBaseUrl}/live-analysis-currency`, {
        headers: this.getNSEHeaders(),
        timeout: 10000
      });
      
      if (response.data && response.data.data) {
        const data = response.data.data.map(curr => ({
          symbol: curr.symbol,
          name: curr.symbol,
          exchange: 'CDS',
          segment: 'CURRENCY',
          ltp: curr.lastPrice,
          change: curr.change,
          changePercent: curr.pChange,
          open: curr.open,
          high: curr.dayHigh,
          low: curr.dayLow,
          close: curr.previousClose,
          volume: curr.totalTradedVolume
        }));
        this.setCache(cacheKey, data);
        return data;
      }
    } catch (error) {
      console.error('[IndianMarket] Currency data error:', error.message);
    }

    // Fallback currency data
    return this.getFallbackCurrencyData(currencies);
  }

  getFallbackCurrencyData(currencies) {
    const basePrices = {
      'USDINR': { ltp: 83.42, prev: 83.34 },
      'EURINR': { ltp: 91.25, prev: 91.10 },
      'GBPINR': { ltp: 106.85, prev: 106.97 },
      'JPYINR': { ltp: 0.5542, prev: 0.5530 }
    };

    return currencies.map(c => {
      const price = basePrices[c.symbol] || { ltp: 83, prev: 83 };
      const change = price.ltp - price.prev;
      const changePct = ((change / price.prev) * 100).toFixed(2);
      
      return {
        symbol: c.symbol,
        name: c.name,
        exchange: 'CDS',
        segment: 'CURRENCY',
        ltp: price.ltp,
        change: parseFloat(change.toFixed(4)),
        changePercent: parseFloat(changePct),
        open: price.prev,
        high: price.ltp * 1.002,
        low: price.ltp * 0.998,
        close: price.prev,
        lotSize: c.lotSize,
        volume: Math.floor(Math.random() * 500000) + 100000
      };
    });
  }

  // ============ INDICES DATA ============

  async getIndicesData() {
    const cacheKey = 'indices_data';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      await this.refreshCookiesIfNeeded();
      const response = await axios.get(`${this.nseBaseUrl}/allIndices`, {
        headers: this.getNSEHeaders(),
        timeout: 15000
      });
      
      if (response.data && response.data.data) {
        const majorIndices = ['NIFTY 50', 'NIFTY BANK', 'NIFTY NEXT 50', 'NIFTY IT', 'NIFTY FINANCIAL SERVICES', 'INDIA VIX'];
        const data = response.data.data
          .filter(idx => majorIndices.includes(idx.index) || idx.index.includes('NIFTY'))
          .map(idx => ({
            symbol: idx.index,
            exchange: 'NSE',
            segment: 'INDEX',
            ltp: idx.last,
            change: idx.variation,
            changePercent: idx.percentChange,
            open: idx.open,
            high: idx.high,
            low: idx.low,
            close: idx.previousClose,
            advances: idx.advances,
            declines: idx.declines,
            unchanged: idx.unchanged
          }));
        this.setCache(cacheKey, data);
        return data;
      }
    } catch (error) {
      console.error('[IndianMarket] Indices data error:', error.message);
    }
    
    return this.getFallbackIndicesData();
  }

  getFallbackIndicesData() {
    return [
      { symbol: 'NIFTY 50', exchange: 'NSE', segment: 'INDEX', ltp: 24150.50, change: 125.30, changePercent: 0.52, open: 24025.20, high: 24180.00, low: 24010.50, close: 24025.20 },
      { symbol: 'NIFTY BANK', exchange: 'NSE', segment: 'INDEX', ltp: 51850.25, change: 350.75, changePercent: 0.68, open: 51500.00, high: 51920.00, low: 51450.00, close: 51499.50 },
      { symbol: 'NIFTY IT', exchange: 'NSE', segment: 'INDEX', ltp: 38250.60, change: -120.40, changePercent: -0.31, open: 38371.00, high: 38450.00, low: 38150.00, close: 38371.00 },
      { symbol: 'INDIA VIX', exchange: 'NSE', segment: 'INDEX', ltp: 13.25, change: -0.45, changePercent: -3.29, open: 13.70, high: 13.85, low: 13.10, close: 13.70 }
    ];
  }

  // ============ COMBINED DATA BY SEGMENT ============

  async getWatchlistBySegment(segment) {
    try {
      switch (segment.toUpperCase()) {
        case 'EQUITY':
          const equityData = await this.getNifty50();
          return equityData.length > 0 ? equityData : this.getFallbackEquityData();
        case 'FNO':
          const indices = await this.getIndicesData();
          const foData = await this.getFOData();
          const nifty50 = await this.getNifty50();
          if (indices.length === 0 && nifty50.length === 0) {
            return this.getFallbackEquityData().map(item => ({ ...item, segment: 'FNO' }));
          }
          return [...indices.slice(0, 5), ...nifty50.slice(0, 10)].map(item => ({
            ...item,
            segment: 'FNO'
          }));
        case 'COMMODITY':
          return await this.getMCXData();
        case 'CURRENCY':
          return await this.getCurrencyData();
        default:
          const defaultData = await this.getNifty50();
          return defaultData.length > 0 ? defaultData : this.getFallbackEquityData();
      }
    } catch (error) {
      console.error('[IndianMarket] getWatchlistBySegment error:', error.message);
      // Return fallback data based on segment
      switch (segment.toUpperCase()) {
        case 'COMMODITY': return this.getFallbackMCXData([]);
        case 'CURRENCY': return this.getFallbackCurrencyData([]);
        default: return this.getFallbackEquityData();
      }
    }
  }

  // ============ HISTORICAL DATA ============

  async getHistoricalData(symbol, interval = '1D') {
    const cacheKey = `hist_${symbol}_${interval}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      await this.refreshCookiesIfNeeded();
      
      // NSE historical data endpoint
      const response = await axios.get(
        `${this.nseBaseUrl}/historical/cm/equity?symbol=${encodeURIComponent(symbol)}`,
        { headers: this.getNSEHeaders(), timeout: 15000 }
      );
      
      if (response.data && response.data.data) {
        const data = response.data.data.map(candle => ({
          time: new Date(candle.CH_TIMESTAMP).getTime() / 1000,
          open: candle.CH_OPENING_PRICE,
          high: candle.CH_TRADE_HIGH_PRICE,
          low: candle.CH_TRADE_LOW_PRICE,
          close: candle.CH_CLOSING_PRICE,
          volume: candle.CH_TOT_TRADED_QTY
        }));
        this.setCache(cacheKey, data);
        return data;
      }
    } catch (error) {
      console.error(`[IndianMarket] Historical data error for ${symbol}:`, error.message);
    }

    // Generate fallback historical data
    return this.generateFallbackHistoricalData(symbol, interval);
  }

  generateFallbackHistoricalData(symbol, interval) {
    const data = [];
    const now = new Date();
    const basePrice = this.getBasePrice(symbol);
    let currentPrice = basePrice;
    const periods = interval === '1D' ? 365 : interval === '1H' ? 24 * 30 : 60 * 7;
    
    for (let i = periods; i >= 0; i--) {
      const date = new Date(now);
      if (interval === '1D') date.setDate(date.getDate() - i);
      else if (interval === '1H') date.setHours(date.getHours() - i);
      else date.setMinutes(date.getMinutes() - i);
      
      const change = (Math.random() - 0.5) * currentPrice * 0.02;
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      
      data.push({
        time: Math.floor(date.getTime() / 1000),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(Math.random() * 10000000)
      });
      
      currentPrice = close;
    }
    
    return data;
  }

  getBasePrice(symbol) {
    const prices = {
      'NIFTY 50': 24150, 'NIFTY BANK': 51850, 'RELIANCE': 2485, 'TCS': 3892,
      'HDFCBANK': 1685, 'INFY': 1876, 'ICICIBANK': 1245, 'SBIN': 825,
      'GOLD': 62450, 'SILVER': 74250, 'CRUDEOIL': 5842, 'USDINR': 83.42
    };
    return prices[symbol] || 1000;
  }

  // ============ SEARCH ============

  async searchInstruments(query, exchange = null) {
    if (!query || query.length < 2) return [];
    
    const cacheKey = `search_${query}_${exchange}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      await this.refreshCookiesIfNeeded();
      const response = await axios.get(
        `${this.nseBaseUrl}/search/autocomplete?q=${encodeURIComponent(query)}`,
        { headers: this.getNSEHeaders(), timeout: 10000 }
      );
      
      if (response.data && response.data.symbols) {
        const data = response.data.symbols.slice(0, 20).map(s => ({
          symbol: s.symbol,
          name: s.symbol_info,
          exchange: 'NSE',
          type: s.result_type
        }));
        this.setCache(cacheKey, data);
        return data;
      }
    } catch (error) {
      console.error('[IndianMarket] Search error:', error.message);
    }
    
    return this.getFallbackSearchResults(query);
  }

  getFallbackSearchResults(query) {
    const allSymbols = [
      { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE' },
      { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE' },
      { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE' },
      { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE' },
      { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE' },
      { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE' },
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE' },
      { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE' },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE' },
      { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE' },
      { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE' },
      { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE' },
      { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE' },
      { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE' },
      { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', exchange: 'NSE' },
      { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE' },
      { symbol: 'GOLD', name: 'Gold Futures', exchange: 'MCX' },
      { symbol: 'SILVER', name: 'Silver Futures', exchange: 'MCX' },
      { symbol: 'CRUDEOIL', name: 'Crude Oil Futures', exchange: 'MCX' },
      { symbol: 'NATURALGAS', name: 'Natural Gas Futures', exchange: 'MCX' },
      { symbol: 'USDINR', name: 'USD/INR Futures', exchange: 'CDS' }
    ];
    
    return allSymbols.filter(s => 
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Fallback equity data
  getFallbackEquityData() {
    return [
      { symbol: 'NIFTY 50', exchange: 'NSE', segment: 'INDEX', ltp: 24150.50, change: 125.30, changePercent: 0.52, open: 24025.20, high: 24180.00, low: 24010.50, close: 24025.20, volume: 0 },
      { symbol: 'RELIANCE', exchange: 'NSE', segment: 'EQUITY', ltp: 2485.50, change: 12.30, changePercent: 0.50, open: 2473.20, high: 2492.00, low: 2468.00, close: 2473.20, volume: 5234521 },
      { symbol: 'TCS', exchange: 'NSE', segment: 'EQUITY', ltp: 3892.15, change: -15.85, changePercent: -0.41, open: 3908.00, high: 3915.00, low: 3878.00, close: 3908.00, volume: 1234567 },
      { symbol: 'HDFCBANK', exchange: 'NSE', segment: 'EQUITY', ltp: 1685.40, change: 8.90, changePercent: 0.53, open: 1676.50, high: 1692.00, low: 1672.00, close: 1676.50, volume: 4521365 },
      { symbol: 'INFY', exchange: 'NSE', segment: 'EQUITY', ltp: 1876.25, change: 22.75, changePercent: 1.23, open: 1853.50, high: 1882.00, low: 1850.00, close: 1853.50, volume: 3256478 },
      { symbol: 'ICICIBANK', exchange: 'NSE', segment: 'EQUITY', ltp: 1245.80, change: -5.20, changePercent: -0.42, open: 1251.00, high: 1258.00, low: 1240.00, close: 1251.00, volume: 6325478 },
      { symbol: 'SBIN', exchange: 'NSE', segment: 'EQUITY', ltp: 825.60, change: 4.10, changePercent: 0.50, open: 821.50, high: 830.00, low: 818.00, close: 821.50, volume: 12563258 },
      { symbol: 'BHARTIARTL', exchange: 'NSE', segment: 'EQUITY', ltp: 1625.30, change: 18.70, changePercent: 1.16, open: 1606.60, high: 1632.00, low: 1602.00, close: 1606.60, volume: 2365478 },
      { symbol: 'ITC', exchange: 'NSE', segment: 'EQUITY', ltp: 465.20, change: 2.80, changePercent: 0.61, open: 462.40, high: 468.00, low: 460.00, close: 462.40, volume: 15236547 },
      { symbol: 'KOTAKBANK', exchange: 'NSE', segment: 'EQUITY', ltp: 1825.50, change: 12.00, changePercent: 0.66, open: 1813.50, high: 1835.00, low: 1808.00, close: 1813.50, volume: 2563214 }
    ];
  }

  getFallbackFOData() {
    return {
      symbol: 'NIFTY',
      underlyingValue: 24150.50,
      expiryDates: ['26-Dec-2024', '02-Jan-2025', '09-Jan-2025'],
      totalCE_OI: 12500000,
      totalPE_OI: 11800000,
      maxPain: 24000,
      pcr: '0.94'
    };
  }
}

module.exports = new IndianMarketService();
