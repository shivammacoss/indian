import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import socketService from '../services/socket';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [providerStatus, setProviderStatus] = useState({ connected: false, source: 'none' });
  const [prices, setPrices] = useState({});
  const [orderBooks, setOrderBooks] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Connect to socket server
    socketService.connect(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

    // Connection status listeners
    const unsubConnected = socketService.on('connected', () => {
      setIsConnected(true);
    });

    const unsubDisconnected = socketService.on('disconnected', () => {
      setIsConnected(false);
    });

    // Provider status listeners (MetaApi)
    const unsubProviderConnected = socketService.on('provider:connected', (data) => {
      setProviderStatus({ connected: true, source: data.source });
    });

    const unsubProviderDisconnected = socketService.on('provider:disconnected', (data) => {
      setProviderStatus({ connected: false, source: data.source });
    });

    // Real-time tick data (low latency)
    const unsubTick = socketService.on('tick', (data) => {
      if (data.symbol) {
        setPrices(prev => ({
          ...prev,
          [data.symbol]: {
            price: data.price,
            bid: data.bid,
            ask: data.ask,
            spread: data.spread,
            timestamp: data.timestamp,
            change: prev[data.symbol] 
              ? ((data.price - prev[data.symbol].price) / prev[data.symbol].price * 100)
              : 0,
            source: data.source
          }
        }));
        setLastUpdate(Date.now());
      }
    });

    // Batch prices update
    const unsubPrices = socketService.on('prices', (allPrices) => {
      if (allPrices && typeof allPrices === 'object') {
        setPrices(prev => ({ ...prev, ...allPrices }));
        setLastUpdate(Date.now());
      }
    });

    // Order book listener
    const unsubOrderbook = socketService.on('orderbook', (data) => {
      if (data.symbol) {
        setOrderBooks(prev => ({
          ...prev,
          [data.symbol]: {
            bids: data.bids,
            asks: data.asks,
            timestamp: data.timestamp
          }
        }));
      }
    });

    // Status listener
    const unsubStatus = socketService.on('status', (data) => {
      if (data.source !== undefined) {
        setProviderStatus({ connected: data.metaApiConnected || false, source: data.source });
      }
    });

    // Cleanup on unmount
    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubProviderConnected();
      unsubProviderDisconnected();
      unsubTick();
      unsubPrices();
      unsubOrderbook();
      unsubStatus();
      socketService.disconnect();
    };
  }, []);

  const subscribe = useCallback((symbols, type = 'forex') => {
    return socketService.subscribe(symbols, type);
  }, []);

  const unsubscribe = useCallback((symbols, type = 'forex') => {
    return socketService.unsubscribe(symbols, type);
  }, []);

  const getPrice = useCallback((symbol) => {
    return prices[symbol] || null;
  }, [prices]);

  const getOrderBook = useCallback((symbol) => {
    return orderBooks[symbol] || null;
  }, [orderBooks]);

  const value = {
    isConnected,
    providerStatus,
    prices,
    orderBooks,
    lastUpdate,
    subscribe,
    unsubscribe,
    getPrice,
    getOrderBook
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
