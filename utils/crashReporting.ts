import * as Sentry from '@sentry/react-native';

import { logger } from './logger';

// Crash reporting (Sentry). Reports only from release builds, and only when
// EXPO_PUBLIC_SENTRY_DSN is set at build time. With no DSN the SDK is never
// initialised: every function here becomes a no-op and the app starts as
// normal. The DSN is read from the environment, never hard-coded.
//
// What reaches Sentry once enabled:
//  - uncaught JS errors (fatal and non-fatal), via ErrorUtils' global handler
//  - unhandled promise rejections, via Hermes' rejection tracker
//    (both installed by Sentry's reactNativeErrorHandlersIntegration below)
//  - render errors caught by components/ErrorBoundary.tsx (reportError)
//  - native crashes (the SDK's native layer)
//
// Not done yet: source-map / debug-symbol upload, so JS stack traces in
// Sentry stay minified (see docs/release-checklist.md).

export interface CrashReportingConfig {
  dsn: string | undefined;
  isDev: boolean;
}

let enabled = false;

export function isCrashReportingEnabled(): boolean {
  return enabled;
}

export function shouldEnableCrashReporting({ dsn, isDev }: CrashReportingConfig): boolean {
  return !isDev && typeof dsn === 'string' && dsn.trim().length > 0;
}

// Without Sentry, a release build drops unhandled promise rejections silently.
// Log them at least. Hermes only; dev keeps React Native's own LogBox tracker.
function installFallbackRejectionLogger() {
  const hermes = (globalThis as { HermesInternal?: { enablePromiseRejectionTracker?: (o: object) => void } })
    .HermesInternal;
  hermes?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id: number, rejection: unknown) => {
      logger.error('Unhandled promise rejection', {
        message: rejection instanceof Error ? rejection.message : String(rejection),
      });
    },
    onHandled: () => {},
  });
}

export function initCrashReporting(
  config: CrashReportingConfig = { dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, isDev: __DEV__ }
): boolean {
  if (!shouldEnableCrashReporting(config)) {
    enabled = false;
    if (!config.isDev) installFallbackRejectionLogger();
    return false;
  }
  try {
    Sentry.init({
      dsn: config.dsn!.trim(),
      environment: 'production',
      // No personal data: no IP address, no request bodies, no user fields
      // beyond what is set explicitly (nothing is, today).
      sendDefaultPii: false,
      tracesSampleRate: 0,
      integrations: [
        // Global handlers: uncaught JS errors and unhandled promise rejections.
        Sentry.reactNativeErrorHandlersIntegration({
          onerror: true,
          onunhandledrejection: true,
          patchGlobalPromise: true,
        }),
      ],
    });
    enabled = true;
  } catch (err) {
    // A bad DSN must never stop the app from starting.
    enabled = false;
    logger.error('Crash reporting init failed', { message: err instanceof Error ? err.message : String(err) });
    installFallbackRejectionLogger();
  }
  return enabled;
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
