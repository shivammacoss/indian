import React, { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

const TradingChart = ({ symbol }) => {
  const containerRef = useRef(null)
  const widgetRef = useRef(null)
  const { isDark } = useTheme()

  // Map symbols to TradingView format
  const getSymbol = (sym) => {
    const symbolMap = {
      // Major Forex
      'EURUSD': 'FX:EURUSD',
      'GBPUSD': 'FX:GBPUSD',
      'USDJPY': 'FX:USDJPY',
      'USDCHF': 'FX:USDCHF',
      'AUDUSD': 'FX:AUDUSD',
      'NZDUSD': 'FX:NZDUSD',
      'USDCAD': 'FX:USDCAD',
      // Cross pairs
      'EURGBP': 'FX:EURGBP',
      'EURJPY': 'FX:EURJPY',
      'EURCHF': 'FX:EURCHF',
      'GBPJPY': 'FX:GBPJPY',
      'AUDCAD': 'FX:AUDCAD',
      'AUDCHF': 'FX:AUDCHF',
      'AUDJPY': 'FX:AUDJPY',
      'AUDNZD': 'FX:AUDNZD',
      'CADCHF': 'FX:CADCHF',
      'CADJPY': 'FX:CADJPY',
      'CHFJPY': 'FX:CHFJPY',
      'EURAUD': 'FX:EURAUD',
      'EURCAD': 'FX:EURCAD',
      'EURNZD': 'FX:EURNZD',
      'GBPAUD': 'FX:GBPAUD',
      'GBPCAD': 'FX:GBPCAD',
      'GBPCHF': 'FX:GBPCHF',
      'GBPNZD': 'FX:GBPNZD',
      'NZDCAD': 'FX:NZDCAD',
      'NZDCHF': 'FX:NZDCHF',
      'NZDJPY': 'FX:NZDJPY',
      // Metals
      'XAUUSD': 'TVC:GOLD',
      'XAGUSD': 'TVC:SILVER',
      'XAUEUR': 'FX:XAUEUR',
      // Indices
      'US30': 'TVC:DJI',
      'US500': 'TVC:SPX',
      'US100': 'NASDAQ:NDX',
      'DE30': 'XETR:DAX',
      'UK100': 'TVC:UKX',
      'JP225': 'TVC:NI225',
      // Crypto
      'BTCUSD': 'BINANCE:BTCUSDT',
      'ETHUSD': 'BINANCE:ETHUSDT',
      'LTCUSD': 'BINANCE:LTCUSDT',
      'XRPUSD': 'BINANCE:XRPUSDT',
      // Energy
      'USOIL': 'TVC:USOIL',
      'UKOIL': 'TVC:UKOIL',
      'XNGUSD': 'TVC:NATURALGAS',
    }
    return symbolMap[sym] || `FX:${sym}`
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous chart
    containerRef.current.innerHTML = ''

    // Theme colors
    const darkColors = {
      bg: '#000000',
      toolbar: '#0a0a0a',
      grid: '#1a1a1a',
      border: '#2a2a2a',
      text: '#9ca3af'
    }
    
    const lightColors = {
      bg: '#ffffff',
      toolbar: '#f8f9fa',
      grid: '#e9ecef',
      border: '#dee2e6',
      text: '#495057'
    }
    
    const colors = isDark ? darkColors : lightColors

    // Use TradingView Advanced Chart embed widget
    const container = containerRef.current
    container.innerHTML = `
      <div class="tradingview-widget-container" style="height:100%;width:100%">
        <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
      </div>
    `
    
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.type = 'text/javascript'
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: getSymbol(symbol),
      interval: "5",
      timezone: "Etc/UTC",
      theme: isDark ? "dark" : "light",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      hide_side_toolbar: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      support_host: "https://www.tradingview.com"
    })
    
    container.querySelector('.tradingview-widget-container').appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [symbol, isDark])

  return (
    <div 
      ref={containerRef}
      className="w-full h-full"
      style={{ backgroundColor: isDark ? '#000000' : '#ffffff' }}
    />
  )
}

export default TradingChart
