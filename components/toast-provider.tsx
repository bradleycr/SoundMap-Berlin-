"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

/**
 * Toast Provider Component
 * Manages global toast notifications with retro styling
 * Supports different types: success, error, warning, info
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9)
      const newToast = { ...toast, id }

      setToasts((prev) => [...prev, newToast])

      // Auto-remove toast after duration (default 5 seconds)
      const duration = toast.duration ?? 5000
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast],
  )

  // Convenience methods for different toast types
  const success = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "success", title, message })
    },
    [addToast],
  )

  const error = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "error", title, message, duration: 7000 })
    },
    [addToast],
  )

  const warning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "warning", title, message })
    },
    [addToast],
  )

  const info = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "info", title, message })
    },
    [addToast],
  )

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-mint-400" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-coral-400" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-sand-400" />
      case "info":
        return <Info className="w-5 h-5 text-sage-400" />
    }
  }

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-mint-400 bg-mint-400/10"
      case "error":
        return "border-coral-400 bg-coral-400/10"
      case "warning":
        return "border-sand-400 bg-sand-400/10"
      case "info":
        return "border-sage-400 bg-sage-400/10"
    }
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`retro-border p-4 ${getToastStyles(toast.type)} animate-in slide-in-from-right duration-300`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              {getToastIcon(toast.type)}

              <div className="flex-1 min-w-0">
                <div className="text-sm font-pixel text-stone-200 font-medium">{toast.title}</div>
                {toast.message && <div className="text-xs font-pixel text-stone-400 mt-1">{toast.message}</div>}

                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className="text-xs font-pixel text-sage-400 hover:text-sage-300 mt-2 underline"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-stone-400 hover:text-stone-200 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * Hook to access toast functionality
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
