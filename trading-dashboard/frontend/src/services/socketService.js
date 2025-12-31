import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
  }

  connect() {
    if (this.socket?.connected) return this.socket

    const token = localStorage.getItem('token')
    if (!token) return null

    const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    })

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected:', this.socket.id)
      this.isConnected = true
      this.reconnectAttempts = 0
      
      // Join user room
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (user._id) {
        this.socket.emit('join', `user_${user._id}`)
      }

      // Dispatch connected event
      window.dispatchEvent(new CustomEvent('socketConnected'))
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason)
      this.isConnected = false
      window.dispatchEvent(new CustomEvent('socketDisconnected'))
    })

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Connection error:', error.message)
      this.reconnectAttempts++
    })

    // Forward all trade events to window for global access
    const tradeEvents = [
      'orderExecuted', 'orderPlaced', 'tradeClosed', 'pendingOrderActivated',
      'orderCancelled', 'stopOut', 'marginCall', 'trade_copied', 'trade_modified',
      'trade_closed', 'challengeFailed'
    ]

    tradeEvents.forEach(event => {
      this.socket.on(event, (data) => {
        console.log(`[SocketService] Event: ${event}`, data)
        
        // Dispatch to window for any component to listen
        window.dispatchEvent(new CustomEvent(event, { detail: data }))
        
        // Also dispatch generic trade update event
        window.dispatchEvent(new CustomEvent('tradeUpdate', { detail: { event, data } }))
        
        // Notify all registered listeners
        const callbacks = this.listeners.get(event) || []
        callbacks.forEach(cb => cb(data))
      })
    })

    // Forward price updates
    this.socket.on('tick', (data) => {
      window.dispatchEvent(new CustomEvent('tick', { detail: data }))
      const callbacks = this.listeners.get('tick') || []
      callbacks.forEach(cb => cb(data))
    })

    this.socket.on('priceUpdate', (data) => {
      window.dispatchEvent(new CustomEvent('priceUpdate', { detail: data }))
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    // Also register on socket if connected
    if (this.socket) {
      this.socket.on(event, callback)
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event) || []
      const index = callbacks.indexOf(callback)
      if (index > -1) callbacks.splice(index, 1)
      if (this.socket) {
        this.socket.off(event, callback)
      }
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  getSocket() {
    return this.socket
  }
}

// Singleton instance
const socketService = new SocketService()

export default socketService
