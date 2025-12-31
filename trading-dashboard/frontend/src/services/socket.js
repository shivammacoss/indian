import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  connect(url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000') {
    if (this.socket && this.isConnected) {
      console.log('[Socket] Already connected');
      return this.socket;
    }

    console.log('[Socket] Connecting to:', url);

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', { id: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.emit('error', { message: error.message });
    });

    // AllTick connection events
    this.socket.on('alltick:connected', (data) => {
      console.log('[Socket] AllTick connected:', data.type);
      this.emit('alltick:connected', data);
    });

    this.socket.on('alltick:disconnected', (data) => {
      console.log('[Socket] AllTick disconnected:', data.type);
      this.emit('alltick:disconnected', data);
    });

    this.socket.on('alltick:error', (data) => {
      console.error('[Socket] AllTick error:', data);
      this.emit('alltick:error', data);
    });

    // Market data events
    this.socket.on('trade', (data) => {
      this.emit('trade', data);
    });

    this.socket.on('tick', (data) => {
      this.emit('tick', data);
    });

    this.socket.on('prices', (data) => {
      this.emit('prices', data);
    });

    this.socket.on('orderbook', (data) => {
      this.emit('orderbook', data);
    });

    this.socket.on('quote', (data) => {
      this.emit('quote', data);
    });

    this.socket.on('status', (data) => {
      this.emit('status', data);
    });

    this.socket.on('provider:connected', (data) => {
      this.emit('provider:connected', data);
    });

    this.socket.on('provider:disconnected', (data) => {
      this.emit('provider:disconnected', data);
    });

    this.socket.on('subscribed', (data) => {
      console.log('[Socket] Subscribed to:', data.symbols);
      this.emit('subscribed', data);
    });

    this.socket.on('unsubscribed', (data) => {
      console.log('[Socket] Unsubscribed from:', data.symbols);
      this.emit('unsubscribed', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('[Socket] Disconnected');
    }
  }

  // Subscribe to symbols
  subscribe(symbols, type = 'forex') {
    if (!this.socket || !this.isConnected) {
      console.error('[Socket] Cannot subscribe - not connected');
      return false;
    }

    this.socket.emit('subscribe', { symbols, type });
    return true;
  }

  // Unsubscribe from symbols
  unsubscribe(symbols, type = 'forex') {
    if (!this.socket || !this.isConnected) {
      return false;
    }

    this.socket.emit('unsubscribe', { symbols, type });
    return true;
  }

  // Get current status
  getStatus() {
    if (!this.socket || !this.isConnected) {
      return null;
    }

    this.socket.emit('getStatus');
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Check connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null
    };
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
