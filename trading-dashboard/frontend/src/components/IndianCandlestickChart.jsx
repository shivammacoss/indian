import React, { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts'
import axios from 'axios'
import { TrendingUp } from 'lucide-react'

const IndianCandlestickChart = ({ symbol, token, exchange, ltp, change }) => {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const [interval, setIntervalState] = useState('15minute')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chartReady, setChartReady] = useState(false)
  const [candles, setCandles] = useState([])

  const intervals = [
    { id: 'minute', label: '1m' },
    { id: '5minute', label: '5m' },
    { id: '15minute', label: '15m' },
    { id: '30minute', label: '30m' },
    { id: '60minute', label: '1H' },
    { id: 'day', label: '1D' },
  ]

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    let chart = null
    let candleSeries = null

    try {
      const containerHeight = chartContainerRef.current.clientHeight || 250
      chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth || 600,
        height: containerHeight,
        layout: {
          background: { type: ColorType.Solid, color: '#1a1a2e' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: true,
        },
      })

      candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      })

      chartRef.current = chart
      candleSeriesRef.current = candleSeries
      setChartReady(true)
      setError(null)
      console.log('[Chart] Initialized successfully')

      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({ 
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight 
          })
        }
      }
      // Initial resize to fit container
      setTimeout(handleResize, 50)
      window.addEventListener('resize', handleResize)
      
      // Listen for custom resize event (when panels open/close)
      window.addEventListener('chart-resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('chart-resize', handleResize)
        if (chart) {
          chart.remove()
        }
      }
    } catch (err) {
      console.error('Chart init error:', err)
      setError('Chart error: ' + err.message)
    }
  }, [])

  // Fetch historical data when symbol or interval changes
  useEffect(() => {
    console.log('[Chart] Effect triggered - token:', token, 'chartReady:', chartReady, 'candleSeries:', !!candleSeriesRef.current)
    if (!token || !chartReady || !candleSeriesRef.current) {
      console.log('[Chart] Skipping fetch - missing:', !token ? 'token' : !chartReady ? 'chartReady' : 'candleSeries')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      console.log('[Chart] Fetching historical data for token:', token)

      try {
        const res = await axios.get(`/api/kite/historical?token=${token}&interval=${interval}`)
        
        if (res.data.success && res.data.data) {
          const candles = res.data.data
          
          // Set candlestick data
          candleSeriesRef.current.setData(candles.map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })))

          // Fit content
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent()
          }
          
          console.log('[Chart] Loaded', candles.length, 'candles')
        }
      } catch (err) {
        console.error('Failed to fetch historical data:', err)
        setError('Failed to load chart data')
      }

      setLoading(false)
    }

    fetchData()
  }, [token, interval, chartReady])

  // Update last candle with live price
  useEffect(() => {
    if (!ltp || !candleSeriesRef.current) return

    const now = Math.floor(Date.now() / 1000)
    
    // Update the last candle with live price
    candleSeriesRef.current.update({
      time: now,
      open: ltp,
      high: ltp,
      low: ltp,
      close: ltp,
    })
  }, [ltp])

  return (
    <div className="flex flex-col h-full">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">{symbol || 'Select Instrument'}</span>
          {exchange && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{exchange}</span>}
          {ltp && (
            <span className="font-medium">₹{ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          )}
          {change !== undefined && (
            <span className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </span>
          )}
        </div>
        
        {/* Interval Selector */}
        <div className="flex gap-1">
          {intervals.map(int => (
            <button
              key={int.id}
              onClick={() => setIntervalState(int.id)}
              className={`px-2 py-1 text-xs rounded ${interval === int.id ? 'bg-orange-500 text-white' : ''}`}
              style={interval !== int.id ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}
            >
              {int.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 relative overflow-hidden">
        {!token && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <div className="text-center">
              <TrendingUp size={48} className="mx-auto mb-2 opacity-20" />
              <p>Select an instrument to view chart</p>
            </div>
          </div>
        )}
        {loading && token && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading chart...
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}
        <div ref={chartContainerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}

export default IndianCandlestickChart
