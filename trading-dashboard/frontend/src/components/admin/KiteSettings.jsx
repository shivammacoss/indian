import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Wifi, WifiOff, ExternalLink, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

const KiteSettings = () => {
  const [kiteStatus, setKiteStatus] = useState({
    authenticated: false,
    apiKey: '',
    loading: true
  })
  const [connecting, setConnecting] = useState(false)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  const fetchKiteStatus = async () => {
    try {
      const res = await axios.get('/api/kite/status')
      setKiteStatus({
        authenticated: res.data.authenticated,
        apiKey: res.data.apiKey || '',
        loading: false
      })
    } catch (error) {
      setKiteStatus({
        authenticated: false,
        apiKey: '',
        loading: false
      })
    }
  }

  useEffect(() => {
    fetchKiteStatus()
    // Check status every 30 seconds
    const interval = setInterval(fetchKiteStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleConnectKite = () => {
    setConnecting(true)
    // Open Kite login in new window - use full backend URL to avoid proxy issues
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    const loginWindow = window.open(`${backendUrl}/api/kite/start`, '_blank', 'width=600,height=700')
    
    // Poll for authentication status
    const checkAuth = setInterval(async () => {
      try {
        const res = await axios.get('/api/kite/status')
        if (res.data.authenticated) {
          clearInterval(checkAuth)
          setConnecting(false)
          setKiteStatus({
            authenticated: true,
            apiKey: res.data.apiKey || '',
            loading: false
          })
          if (loginWindow) loginWindow.close()
        }
      } catch (e) {
        // Keep polling
      }
    }, 2000)

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(checkAuth)
      setConnecting(false)
    }, 300000)
  }

  if (kiteStatus.loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="animate-spin" size={20} />
          <span>Loading Kite status...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Kite Connect Settings</h2>
      
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {kiteStatus.authenticated ? (
              <>
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                  <Wifi size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-400">Kite Connected</h3>
                  <p className="text-sm text-gray-400">API Key: {kiteStatus.apiKey}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                  <WifiOff size={24} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-400">Kite Not Connected</h3>
                  <p className="text-sm text-gray-500">Connect your Zerodha Kite account to enable Indian market trading</p>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={kiteStatus.authenticated ? fetchKiteStatus : handleConnectKite}
            disabled={connecting}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              kiteStatus.authenticated 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-orange-600 hover:bg-orange-500 text-white'
            } ${connecting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {connecting ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Connecting...
              </>
            ) : kiteStatus.authenticated ? (
              <>
                <RefreshCw size={16} />
                Refresh Status
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                Connect Kite
              </>
            )}
          </button>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="font-semibold mb-3">Connection Status</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {kiteStatus.authenticated ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-red-500" />
              )}
              <span className="text-sm">Zerodha Authentication</span>
            </div>
            <div className="flex items-center gap-2">
              {kiteStatus.authenticated ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-gray-500" />
              )}
              <span className="text-sm">Live Market Data</span>
            </div>
            <div className="flex items-center gap-2">
              {kiteStatus.authenticated ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-gray-500" />
              )}
              <span className="text-sm">Order Execution</span>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <h4 className="font-semibold mb-2 text-yellow-500">⚠️ Important Notes</h4>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Kite session expires daily at 6:00 AM IST</li>
            <li>You need to reconnect every trading day</li>
            <li>All users will use this connection for Indian market data</li>
            <li>Make sure your Kite API credentials are configured in server .env</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default KiteSettings
