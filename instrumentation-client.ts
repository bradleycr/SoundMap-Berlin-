// This file is for client-side Sentry initialization.
// We are temporarily disabling it to debug a production connection issue.

// import { init } from "@sentry/nextjs";
// import { browserTracingIntegration, replayIntegration } from "@sentry/react";
// import { SimpleSpanProcessor } from "@sentry/sdk";
// import { OpenTelemetryInstrumentation } from "@sentry/opentelemetry";

// init({
//   // Performance Monitoring
//   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
//   tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
//   // Session Replay
//   replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
//   replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,

//   // Configuration
//   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
//   environment: process.env.NODE_ENV,
//   enabled: process.env.NODE_ENV === 'production',
//   integrations: [
//     browserTracingIntegration(),
//     replayIntegration({
//       // Additional Replay options,
//     }),
//     ...(process.env.NODE_ENV === 'production' ? [
//       new OpenTelemetryInstrumentation(),
//     ] : []),
//   ],
//   instrumenter: 'otel',
//   // An OpenTelemetry Span Processor is required for performance monitoring features
//   // This is temporary until the fix for https://github.com/getsentry/sentry-javascript/issues/12368
//   // is released.
//   spanProcessors: [new SimpleSpanProcessor()],
// });