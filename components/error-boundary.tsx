"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { reportError, ErrorSeverity, getUserFriendlyMessage } from "@/lib/error-handler"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  componentName?: string
}

/**
 * Enhanced Global Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Provides fallback UI and comprehensive error reporting capabilities
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
    // Enhanced error reporting with context
    const context = {
      component: this.props.componentName || 'ErrorBoundary',
      errorInfo: errorInfo.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString(),
    }

    // Report error with high severity since it crashed a component
    reportError(error, context, ErrorSeverity.HIGH)

    this.setState({
      error,
      errorInfo,
    })
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

      // Enhanced fallback UI with user-friendly messaging
      const userMessage = this.state.error ? getUserFriendlyMessage(this.state.error) : "Something went wrong";
      
      return (
        <div className="pwa-page">
          <div className="pwa-content-centered">
            <div className="max-w-md mx-auto text-center space-y-6 p-4">
              <div className="retro-border p-6 space-y-4">
                <AlertTriangle className="w-12 h-12 text-coral-400 mx-auto" />
                <div className="text-xl font-pixel text-coral-400">SYSTEM ERROR</div>
                <div className="text-sm font-pixel text-stone-400">
                  {userMessage}
                </div>

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="text-xs font-mono text-stone-500 bg-stone-800 p-3 rounded border-l-2 border-coral-400 text-left">
                    <div className="font-bold text-coral-400 mb-1">Technical Details:</div>
                    <div>{this.state.error.message}</div>
                    {this.state.errorInfo && (
                      <div className="mt-2 text-xs">
                        <div className="font-bold text-coral-400">Component Stack:</div>
                        <pre className="whitespace-pre-wrap text-xs">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button 
                  onClick={this.handleRetry}
                  className="pixel-button-mint w-full"
                >
                  TRY AGAIN
                </button>
                
                <button 
                  onClick={() => window.location.href = "/"}
                  className="pixel-button-sand w-full"
                >
                  GO HOME
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children
  }
}

/**
 * Hook for handling async errors in functional components
 */
export function useErrorHandler() {
  return (error: Error, context?: Record<string, any>) => {
    reportError(error, context, ErrorSeverity.MEDIUM)
  }
}
