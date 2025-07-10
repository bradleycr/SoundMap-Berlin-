// Temporarily disabled for clean build - will re-enable after
// import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Client Configuration for SoundMap
 * Temporarily disabled for clean build - will re-enable with proper setup
 */

// TODO: Re-enable after clean build works
/*
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay for debugging (only in production)
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,
  
  // Environment tracking
  environment: process.env.NODE_ENV,
  
  // Enhanced error context
  beforeSend(event, hint) {
    // Filter out development noise
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Event:', event);
    }
    
    // Add user context if available (safely)
    try {
      if (typeof window !== 'undefined') {
        const user = localStorage.getItem('soundmap_user');
        if (user) {
          const userData = JSON.parse(user);
          if (userData.id) {
            event.user = {
              id: userData.id,
              email: userData.email,
            };
          }
        }
      }
    } catch (error) {
      // Ignore localStorage errors
    }
    
    return event;
  },
  
  // Integration configurations
  integrations: [
    // Only include replay in production
    ...(process.env.NODE_ENV === 'production' ? [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      })
    ] : [])
  ],
});
*/

console.log('🔧 SoundMap instrumentation client loaded (Sentry temporarily disabled)');

// TODO: Re-enable after clean build works
// export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;