/**
 * Enhanced WebSocket client with automatic reconnection strategy
 * Provides resilient real-time communication with exponential backoff
 */

import { io, Socket } from 'socket.io-client';

export interface WebSocketClientOptions {
  url: string;
  token: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onReconnect?: (attemptNumber: number) => void;
  onReconnectFailed?: () => void;
  onError?: (error: Error) => void;
}

export class ResilientWebSocketClient {
  private socket: Socket | null = null;
  private options: Required<WebSocketClientOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;

  constructor(options: WebSocketClientOptions) {
    this.options = {
      maxReconnectAttempts: 10,
      reconnectInterval: 1000, // Start with 1 second
      maxReconnectInterval: 30000, // Max 30 seconds
      onConnect: () => {},
      onDisconnect: () => {},
      onReconnect: () => {},
      onReconnectFailed: () => {},
      onError: () => {},
      ...options,
    };
  }

  /**
   * Connect to the WebSocket server with automatic reconnection
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.isIntentionalDisconnect = false;

    this.socket = io(this.options.url, {
      auth: {
        token: this.options.token,
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually
      timeout: 20000,
    });

    this.setupEventHandlers();
    return this.socket;
  }

  /**
   * Setup all event handlers including reconnection logic
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      console.log(`WebSocket connected (ID: ${this.socket?.id})`);
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.options.onConnect();
    });

    // Connection lost
    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket disconnected: ${reason}`);
      this.options.onDisconnect(reason);

      // Don't reconnect if disconnect was intentional or due to server-side disconnect
      if (!this.isIntentionalDisconnect && reason !== 'io server disconnect') {
        this.attemptReconnect();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      this.options.onError(error);

      // Attempt reconnection on connection errors
      if (!this.isIntentionalDisconnect) {
        this.attemptReconnect();
      }
    });

    // Handle authentication errors specifically
    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);

      // If it's an auth error, we might need a new token
      if (error?.message?.includes('auth') || error?.message?.includes('token')) {
        console.log('Authentication error detected, stopping reconnection attempts');
        this.isIntentionalDisconnect = true;
        this.disconnect();
      }

      this.options.onError(new Error(error?.message || 'Unknown socket error'));
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    // Clear any existing reconnect timer
    this.clearReconnectTimer();

    // Check if we've exceeded max reconnect attempts
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.options.onReconnectFailed();
      return;
    }

    this.reconnectAttempts++;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      this.options.maxReconnectInterval
    );

    console.log(`Attempting reconnection #${this.reconnectAttempts} in ${delay}ms...`);
    this.options.onReconnect(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      if (!this.isIntentionalDisconnect && this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Clear the reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Manually disconnect from the server
   */
  disconnect(): void {
    this.isIntentionalDisconnect = true;
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get the underlying socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Reset reconnection attempts counter
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * Update authentication token (useful for token refresh)
   */
  updateToken(newToken: string): void {
    this.options.token = newToken;

    if (this.socket) {
      // Reconnect with new token
      this.disconnect();
      setTimeout(() => this.connect(), 100);
    }
  }

  /**
   * Register a custom event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, ...args: any[]): void {
    this.socket?.emit(event, ...args);
  }

  /**
   * Remove a specific event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  /**
   * Remove all event listeners for an event
   */
  removeAllListeners(event?: string): void {
    this.socket?.removeAllListeners(event);
  }
}

// Export a factory function for easy instantiation
export function createResilientWebSocketClient(options: WebSocketClientOptions): ResilientWebSocketClient {
  return new ResilientWebSocketClient(options);
}