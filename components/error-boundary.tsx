"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Provides fallback UI and error reporting capabilities
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console and potentially to error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // TODO: Send error to monitoring service (Sentry, LogRocket, etc.)
    // this.reportError(error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback component
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />
      }

      // Default fallback UI with retro styling
      return (
        <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="retro-border p-6 space-y-4">
              <AlertTriangle className="w-12 h-12 text-coral-400 mx-auto" />
              <div className="text-xl font-pixel text-coral-400">SYSTEM ERROR</div>
              <div className="text-sm font-pixel text-stone-400">
                Something went wrong. The app encountered an unexpected error.
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="text-xs font-mono text-stone-500 bg-stone-800 p-3 rounded border-l-2 border-coral-400 text-left">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button onClick={this.handleRetry} className="pixel-button-mint w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                TRY AGAIN
              </Button>

              <Button onClick={() => (window.location.href = "/")} className="pixel-button-sand w-full">
                GO HOME
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook for handling async errors in functional components
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    console.error("Async error:", error, errorInfo)
    // TODO: Report to error monitoring service
  }
}
