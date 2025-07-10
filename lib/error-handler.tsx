import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";
import React from 'react';

/**
 * Error types for better categorization and handling
 */
export enum ErrorType {
  AUTHENTICATION = "authentication",
  VALIDATION = "validation",
  NETWORK = "network",
  STORAGE = "storage",
  AUDIO = "audio",
  LOCATION = "location",
  PERMISSION = "permission",
  CONNECTION = "connection", // New error type for connection issues
  TIMEOUT = "timeout", // New error type for timeout issues
  UNKNOWN = "unknown",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical"
}

/**
 * Enhanced error class with additional context
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, any>;
  public readonly userMessage?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options: {
      context?: Record<string, any>;
      userMessage?: string;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.severity = severity;
    this.context = options.context;
    this.userMessage = options.userMessage;
    this.retryable = options.retryable ?? false;
    
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Error classification helper
 */
export function classifyError(error: any): ErrorType {
  const message = error?.message?.toLowerCase() || "";
  const code = error?.code?.toLowerCase() || "";
  
  if (message.includes("network") || message.includes("fetch") || code.includes("network")) {
    return ErrorType.NETWORK;
  }
  
  if (message.includes("auth") || message.includes("unauthorized") || code.includes("auth")) {
    return ErrorType.AUTHENTICATION;
  }
  
  if (message.includes("permission") || message.includes("denied") || code.includes("permission")) {
    return ErrorType.PERMISSION;
  }
  
  if (message.includes("validation") || message.includes("invalid") || code.includes("validation")) {
    return ErrorType.VALIDATION;
  }
  
  if (message.includes("storage") || message.includes("upload") || code.includes("storage")) {
    return ErrorType.STORAGE;
  }
  
  if (message.includes("audio") || message.includes("media") || code.includes("media")) {
    return ErrorType.AUDIO;
  }
  
  if (message.includes("location") || message.includes("geolocation") || code.includes("location")) {
    return ErrorType.LOCATION;
  }
  
  if (message.includes("timeout") || message.includes("timed out") || code.includes("timeout")) {
    return ErrorType.TIMEOUT;
  }
  
  if (message.includes("connection") || message.includes("connect") || code.includes("connection")) {
    return ErrorType.CONNECTION;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error messages
 */
export function getUserFriendlyMessage(error: any): string {
  if (error instanceof AppError && error.userMessage) {
    return error.userMessage;
  }
  
  const type = classifyError(error);
  
  switch (type) {
    case ErrorType.NETWORK:
      return "Connection problem. Please check your internet and try again.";
    case ErrorType.AUTHENTICATION:
      return "Please sign in to continue.";
    case ErrorType.PERMISSION:
      return "Permission required. Please allow access and try again.";
    case ErrorType.VALIDATION:
      return "Please check your input and try again.";
    case ErrorType.STORAGE:
      return "Upload failed. Please try again.";
    case ErrorType.AUDIO:
      return "Audio recording issue. Please check your microphone.";
    case ErrorType.LOCATION:
      return "Location access needed. Please enable location services.";
    case ErrorType.CONNECTION:
      return "Connection to server failed. The app will work offline.";
    case ErrorType.TIMEOUT:
      return "Request timed out. Please try again or continue offline.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/**
 * Central error reporting function
 */
export function reportError(
  error: any,
  context?: Record<string, any>,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
) {
  // Enhanced error object for reporting
  const errorInfo = {
    message: error?.message || "Unknown error",
    stack: error?.stack,
    type: error instanceof AppError ? error.type : classifyError(error),
    severity: error instanceof AppError ? error.severity : severity,
    context: {
      ...context,
      ...(error instanceof AppError ? error.context : {}),
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    }
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error Report:', errorInfo);
  }
  
  // Send to Sentry with enhanced context (only in production)
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      scope.setLevel(severity === ErrorSeverity.CRITICAL ? 'fatal' : 
                     severity === ErrorSeverity.HIGH ? 'error' : 
                     severity === ErrorSeverity.MEDIUM ? 'warning' : 'info');
      
      scope.setTag('error_type', errorInfo.type);
      scope.setContext('error_details', errorInfo.context);
      
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }
      
      Sentry.captureException(error);
    });
  }
}

/**
 * Handle errors with user notification
 */
export function handleError(
  error: any,
  context?: Record<string, any>,
  options: {
    showToast?: boolean;
    severity?: ErrorSeverity;
    customMessage?: string;
  } = {}
) {
  const {
    showToast = true,
    severity = ErrorSeverity.MEDIUM,
    customMessage
  } = options;
  
  // Report the error
  reportError(error, context, severity);
  
  // Show user notification
  if (showToast) {
    const message = customMessage || getUserFriendlyMessage(error);
    
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
      toast.error(message);
    } else {
      toast.warning(message);
    }
  }
  
  return {
    type: error instanceof AppError ? error.type : classifyError(error),
    message: getUserFriendlyMessage(error),
    retryable: error instanceof AppError ? error.retryable : false
  };
}

/**
 * Async error wrapper for better error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, any>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  };
}

/**
 * React error boundary helper
 */
export function createErrorBoundaryFallback(componentName: string) {
  return ({ error, retry }: { error: Error; retry: () => void }) => {
    // Report error with component context
    reportError(error, { component: componentName }, ErrorSeverity.HIGH);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="retro-border p-6 space-y-4">
            <div className="text-xl font-pixel text-coral-400">COMPONENT ERROR</div>
            <div className="text-sm font-pixel text-stone-400">
              {componentName} encountered an error
            </div>
            <div className="text-xs font-pixel text-stone-500">
              {getUserFriendlyMessage(error)}
            </div>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={retry}
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
    );
  };
} 