const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const indianMarketService = require('../services/indianMarketService');

// @route   GET /api/indian-market/quotes
// @desc    Get quote for a specific symbol
// @access  Private
router.get('/quotes', protect, async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ success: false, message: 'Symbol required' });
    }
    
    const quote = await indianMarketService.getEquityQuote(symbol);
    
    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ success: false, message: 'Failed to get quote' });
  }
});

// @route   GET /api/indian-market/watchlist
// @desc    Get watchlist data for a segment
// @access  Private
router.get('/watchlist', protect, async (req, res) => {
  try {
    const { segment = 'EQUITY' } = req.query;
    const data = await indianMarketService.getWatchlistBySegment(segment);
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to get watchlist' });
  }
});

// @route   GET /api/indian-market/indices
// @desc    Get all indices data
// @access  Private
router.get('/indices', protect, async (req, res) => {
  try {
    const data = await indianMarketService.getIndicesData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get indices error:', error);
    res.status(500).json({ success: false, message: 'Failed to get indices' });
  }
});

// @route   GET /api/indian-market/nifty50
// @desc    Get NIFTY 50 stocks
// @access  Private
router.get('/nifty50', protect, async (req, res) => {
  try {
    const data = await indianMarketService.getNifty50();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get NIFTY 50 error:', error);
    res.status(500).json({ success: false, message: 'Failed to get NIFTY 50' });
  }
});

// @route   GET /api/indian-market/mcx
// @desc    Get MCX commodity data
// @access  Private
router.get('/mcx', protect, async (req, res) => {
  try {
    const data = await indianMarketService.getMCXData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get MCX error:', error);
    res.status(500).json({ success: false, message: 'Failed to get MCX data' });
  }
});

// @route   GET /api/indian-market/currency
// @desc    Get currency futures data
// @access  Private
router.get('/currency', protect, async (req, res) => {
  try {
    const data = await indianMarketService.getCurrencyData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get currency error:', error);
    res.status(500).json({ success: false, message: 'Failed to get currency data' });
  }
});

// @route   GET /api/indian-market/option-chain
// @desc    Get option chain for a symbol
// @access  Private
router.get('/option-chain', protect, async (req, res) => {
  try {
    const { symbol = 'NIFTY' } = req.query;
    const data = await indianMarketService.getOptionChain(symbol);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get option chain error:', error);
    res.status(500).json({ success: false, message: 'Failed to get option chain' });
  }
});

// @route   GET /api/indian-market/futures
// @desc    Get futures data
// @access  Private
router.get('/futures', protect, async (req, res) => {
  try {
    const { symbol = 'NIFTY' } = req.query;
    const data = await indianMarketService.getFuturesData(symbol);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get futures error:', error);
    res.status(500).json({ success: false, message: 'Failed to get futures data' });
  }
});

// @route   GET /api/indian-market/historical
// @desc    Get historical OHLC data
// @access  Private
router.get('/historical', protect, async (req, res) => {
  try {
    const { symbol = 'NIFTY 50', interval = '1D' } = req.query;
    const data = await indianMarketService.getHistoricalData(symbol, interval);
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Get historical data error:', error);
    res.status(500).json({ success: false, message: 'Failed to get historical data' });
  }
});

// @route   GET /api/indian-market/search
// @desc    Search instruments
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { q, exchange } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }
    
    const results = await indianMarketService.searchInstruments(q, exchange);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Search instruments error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// @route   GET /api/indian-market/market-status
// @desc    Get market status
// @access  Public
router.get('/market-status', async (req, res) => {
  try {
    const rawStatus = await indianMarketService.getMarketStatus();
    
    // Normalize response to consistent format
    let status = {
      nse: { status: 'closed' },
      bse: { status: 'closed' },
      mcx: { status: 'closed' },
      currency: { status: 'closed' }
    };
    
    if (rawStatus?.marketState) {
      rawStatus.marketState.forEach(m => {
        if (m.market === 'Capital Market') {
          status.nse.status = m.marketStatus?.toLowerCase() === 'open' ? 'open' : 'closed';
          status.bse.status = status.nse.status;
        } else if (m.market === 'Commodity') {
          status.mcx.status = m.marketStatus?.toLowerCase() === 'open' ? 'open' : 'closed';
        } else if (m.market === 'Currency' || m.market === 'currencyfuture') {
          status.currency.status = m.marketStatus?.toLowerCase() === 'open' ? 'open' : 'closed';
        }
      });
    } else if (rawStatus?.nse) {
      status = rawStatus;
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Market status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get market status' });
  }
});

module.exports = router;
