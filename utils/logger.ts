import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

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

const SENSITIVE_HEADER_KEYS = new Set(['authorization', 'cookie', 'set-cookie']);

// Full header values are printed (this is a debugging tool, not a shipped
// log pipeline) except Authorization/Cookie, which never need to leave the
// device and are irrelevant to diagnosing a pre-response network failure.
function safeHeaders(headers: unknown): Record<string, unknown> {
  if (!headers || typeof headers !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    out[key] = SENSITIVE_HEADER_KEYS.has(key.toLowerCase()) ? '<redacted>' : value;
  }
  return out;
}

function resolveFullURL(config?: { url?: string; baseURL?: string }): string | undefined {
  if (!config?.url) return undefined;
  try {
    return config.baseURL ? new URL(config.url, config.baseURL).toString() : config.url;
  } catch {
    return config.baseURL ? `${config.baseURL}${config.url}` : config.url;
  }
}

function logRequest(config: InternalAxiosRequestConfig) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.info('[HTTP REQUEST]', {
    url: config.url,
    baseURL: config.baseURL,
    fullURL: resolveFullURL(config),
    method: config.method?.toUpperCase(),
    headers: safeHeaders(config.headers),
    body: config.data,
    timeout: config.timeout,
  });
}

function logResponse(response: AxiosResponse) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.info('[HTTP RESPONSE]', {
    url: response.config?.url,
    status: response.status,
    statusText: response.statusText,
    headers: safeHeaders(response.headers),
    body: response.data,
  });
}

// A plaintext password sitting in a login request body shouldn't end up in
// Metro's scrollback just because we're dumping the raw request for
// debugging — everything else in the body is fine and useful to see as-is.
function redactBody(data: unknown): unknown {
  if (!data || typeof data !== 'object' || !('password' in (data as Record<string, unknown>))) {
    return data;
  }
  return { ...(data as Record<string, unknown>), password: '<redacted>' };
}

/**
 * Distinguishes the three Axios failure shapes (see
 * https://axios-http.com/docs/handling_errors):
 *  - error.response set             -> server responded outside 2xx.
 *  - error.request set, no response -> request left the device, nothing came back
 *    (DNS failure, TLS failure, connection refused, timeout, dropped connection).
 *  - neither set                    -> the request was never sent (bad config, interceptor threw).
 * `hasResponse: false` always means the middle case, so config/request fields
 * below are what actually explain it — always printed in full, never gated
 * behind __DEV__ or abbreviated, since this is the one log that has to carry
 * the real diagnosis.
 *
 * Deliberately NOT JSON.stringify'd: AxiosError's config/headers/request can
 * carry values JSON.stringify chokes on (circular references, or a nested
 * object with its own `toJSON` that JSON.stringify invokes implicitly and
 * which can throw or return something that collapses the whole payload to
 * "null") — Hermes/Metro's console can inspect a live object natively, so
 * pass it straight through.
 */
function logNetworkError(error: AxiosError, context?: string) {
  // Ground truth, unprocessed, first — if anything below ever misbehaves,
  // this line already has the real object on record.
  // eslint-disable-next-line no-console
  console.error('RAW AXIOS ERROR', error);
  // eslint-disable-next-line no-console
  console.error('RAW ERROR TOJSON', error.toJSON?.());

  // eslint-disable-next-line no-console
  console.error('[HTTP NETWORK ERROR]', {
    context,
    name: error.name,
    message: error.message,
    code: error.code,
    stack: error.stack,
    isAxiosError: error.isAxiosError,

    config: {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: resolveFullURL(error.config),
      method: error.config?.method,
      timeout: error.config?.timeout,
      headers: safeHeaders(error.config?.headers),
      data: redactBody(error.config?.data),
    },

    request: error.request,

    response: error.response && {
      status: error.response.status,
      statusText: error.response.statusText,
      headers: safeHeaders(error.response.headers),
      data: error.response.data,
    },

    toJSON: typeof error.toJSON === 'function' ? error.toJSON() : undefined,
  });
}

export const logger = {
  info: (message: string, extra?: Record<string, unknown>) => log('info', message, extra),
  warn: (message: string, extra?: Record<string, unknown>) => log('warn', message, extra),
  error: (message: string, extra?: Record<string, unknown>) => log('error', message, extra),
  request: logRequest,
  response: logResponse,
  networkError: logNetworkError,
};
