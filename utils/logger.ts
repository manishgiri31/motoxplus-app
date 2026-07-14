type LogLevel = 'info' | 'warn' | 'error';

/**
 * Single choke point for all app logging (ErrorBoundary, axios interceptor
 * failures, etc.). Swap the console calls below for a real crash-reporting
 * SDK (Sentry, Bugsnag, ...) once one is installed — see docs/release-checklist.md.
 */
function log(level: LogLevel, message: string, extra?: Record<string, unknown>) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console[level](`[${level.toUpperCase()}] ${message}`, extra ?? '');
    return;
  }
  if (level === 'error') {
    // No crash reporter wired up yet — at least surface it in production logs.
    // eslint-disable-next-line no-console
    console.error(message, extra ?? '');
  }
}

export const logger = {
  info: (message: string, extra?: Record<string, unknown>) => log('info', message, extra),
  warn: (message: string, extra?: Record<string, unknown>) => log('warn', message, extra),
  error: (message: string, extra?: Record<string, unknown>) => log('error', message, extra),
};
