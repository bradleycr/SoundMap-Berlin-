/**
 * Enhanced Network Utilities
 * Handles network requests with retry logic, offline support, and comprehensive error handling
 */

import { AppError, ErrorType, ErrorSeverity, reportError } from "./error-handler"

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: any) => boolean
  context?: Record<string, any>
}

/**
 * Enhanced network request with exponential backoff retry and comprehensive error handling
 */
export async function retryRequest<T>(requestFn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    context = {},
    retryCondition = (error) => {
      // Enhanced retry conditions
      const message = error?.message?.toLowerCase() || "";
      const code = error?.code?.toLowerCase() || "";
      const status = error?.status || 0;
      
      return (
        error.name === "NetworkError" ||
        error.name === "TimeoutError" ||
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("fetch") ||
        code.includes("network") ||
        code.includes("timeout") ||
        (status >= 500 && status < 600) ||
        status === 408 || // Request Timeout
        status === 429 || // Too Many Requests
        status === 503 || // Service Unavailable
        status === 504    // Gateway Timeout
      )
    },
  } = options

  let lastError: any
  let delay = baseDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error

      // Enhanced error context
      const errorContext = {
        ...context,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        retryable: retryCondition(error),
        delay: delay,
      }

      // Report error on first attempt or if not retryable
      if (attempt === 0 || !retryCondition(error)) {
        reportError(error, errorContext, ErrorSeverity.MEDIUM)
      }

      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === maxRetries || !retryCondition(error)) {
        throw new AppError(
          `Network request failed after ${attempt + 1} attempts`,
          ErrorType.NETWORK,
          ErrorSeverity.HIGH,
          {
            context: errorContext,
            userMessage: "Connection problem. Please check your internet and try again.",
            retryable: true,
            cause: error
          }
        )
      }

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, maxDelay)))
      delay *= backoffFactor

      console.warn(`🔄 Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error)
    }
  }

  throw lastError
}

/**
 * Network status monitor
 */
export class NetworkMonitor {
  private listeners: ((online: boolean) => void)[] = []
  private _isOnline = typeof window !== 'undefined' && navigator ? navigator.onLine : true

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener("online", this.handleOnline)
      window.addEventListener("offline", this.handleOffline)
    }
  }

  get isOnline() {
    return this._isOnline
  }

  private handleOnline = () => {
    this._isOnline = true
    this.notifyListeners(true)
  }

  private handleOffline = () => {
    this._isOnline = false
    this.notifyListeners(false)
  }

  private notifyListeners(online: boolean) {
    this.listeners.forEach((listener) => listener(online))
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(listener: (online: boolean) => void) {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * Test actual connectivity (not just network interface)
   */
  async testConnectivity(url = "/api/health"): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        cache: "no-cache",
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener("online", this.handleOnline)
      window.removeEventListener("offline", this.handleOffline)
    }
    this.listeners = []
  }
}

/**
 * Queue for offline operations
 */
export class OfflineQueue {
  private queue: Array<{
    id: string
    operation: () => Promise<any>
    data: any
    timestamp: number
    retries: number
  }> = []

  private isProcessing = false
  private maxRetries = 3
  private storageKey = "soundmap_offline_queue"

  constructor() {
    this.loadFromStorage()

    // Process queue when coming online
    if (typeof window !== 'undefined') {
      window.addEventListener("online", () => {
        this.processQueue()
      })
    }
  }

  /**
   * Add operation to offline queue
   */
  add(id: string, operation: () => Promise<any>, data: any) {
    const item = {
      id,
      operation,
      data,
      timestamp: Date.now(),
      retries: 0,
    }

    this.queue.push(item)
    this.saveToStorage()

    // Try to process immediately if online
    if (typeof window !== 'undefined' && navigator?.onLine) {
      this.processQueue()
    }
  }

  /**
   * Process all queued operations with enhanced error handling
   */
  async processQueue() {
    if (this.isProcessing || (typeof window !== 'undefined' && !navigator?.onLine)) return

    this.isProcessing = true

    const itemsToProcess = [...this.queue]

    for (const item of itemsToProcess) {
      try {
        await item.operation()
        this.removeFromQueue(item.id)
        console.log(`✅ Offline operation completed: ${item.id}`)
      } catch (error) {
        item.retries++

        const errorContext = {
          operationId: item.id,
          retries: item.retries,
          maxRetries: this.maxRetries,
          timestamp: item.timestamp,
          data: item.data
        }

        if (item.retries >= this.maxRetries) {
          reportError(error, errorContext, ErrorSeverity.HIGH)
          console.error(`❌ Offline operation failed permanently: ${item.id}`, error)
          this.removeFromQueue(item.id)
        } else {
          reportError(error, errorContext, ErrorSeverity.MEDIUM)
          console.warn(`⚠️ Offline operation failed, will retry: ${item.id}`, error)
        }
      }
    }

    this.saveToStorage()
    this.isProcessing = false
  }

  private removeFromQueue(id: string) {
    this.queue = this.queue.filter((item) => item.id !== id)
  }

  private saveToStorage() {
    try {
      const serializable = this.queue.map((item) => ({
        id: item.id,
        data: item.data,
        timestamp: item.timestamp,
        retries: item.retries,
      }))
      localStorage.setItem(this.storageKey, JSON.stringify(serializable))
    } catch (error) {
      console.warn("Failed to save offline queue:", error)
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const items = JSON.parse(stored)
        // Note: operations can't be serialized, so they need to be re-registered
        console.log(`Loaded ${items.length} items from offline queue`)
      }
    } catch (error) {
      console.warn("Failed to load offline queue:", error)
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      pending: this.queue.length,
      processing: this.isProcessing,
      items: this.queue.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        retries: item.retries,
      })),
    }
  }
}

// Global instances - only create in browser environment
export const networkMonitor = typeof window !== 'undefined' ? new NetworkMonitor() : null
export const offlineQueue = typeof window !== 'undefined' ? new OfflineQueue() : null
