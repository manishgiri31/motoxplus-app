import { onlineManager } from '@tanstack/react-query';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { emitAuthFailure, emitVerificationRequired } from '@/auth/authEvents';
import { secureStorage } from '@/auth/secureStorage';
import { isSessionRejection } from '@/auth/sessionPolicy';
import { env } from '@/config/env';
import { HapticService } from '@/utils/haptics';
import { logger } from '@/utils/logger';
import { isAccountNotVerifiedError } from './errors';
import { refreshResponseSchema } from './schemas';
import type { RefreshResponse } from './types';

type RetryableConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
  _retryCount?: number;
};

logger.info('API client baseURL resolved', { apiUrl: env.apiUrl });

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
});

// A separate, un-intercepted instance for the refresh call itself — routing it
// through apiClient's own 401 handling would recurse if the refresh token is
// also invalid.
const refreshClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const tokens = await secureStorage.getTokens();
  if (tokens?.accessToken) {
    config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  logger.request(config);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    logger.response(response);
    return response;
  },
  (error: AxiosError) => {
    logger.networkError(error, 'apiClient');
    return Promise.reject(error);
  }
);

// The login endpoint's own 401 ("invalid credentials") is a normal, expected
// outcome, not a sign the current session's tokens are stale — routing it
// through the refresh-and-auto-logout branch below would pointlessly attempt
// a token refresh (and, if a valid refresh token happened to still be in
// storage, rotate/consume it) for what's just a wrong password. Excluded here
// so a failed login only ever rejects with the plain 401, nothing else.
function isLoginRequest(config: RetryableConfig): boolean {
  return config.url?.endsWith('/mobile/auth/login') ?? false;
}

let refreshPromise: Promise<RefreshResult> | null = null;

// A 401 that survives a successful token refresh is not proof the session is
// dead: some routes answer 401 for per-route reasons (GET /cart does for a
// dealer whose email or mobile isn't verified yet). Ask the server about the
// session itself via /mobile/auth/me. Only an explicit 401 there means the
// session is really gone; a network failure must not log anyone out.
async function isSessionStillValid(): Promise<boolean> {
  const tokens = await secureStorage.getTokens();
  if (!tokens?.accessToken) return false;
  try {
    await refreshClient.get('/mobile/auth/me', { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    return true;
  } catch (err) {
    return !isSessionRejection(err);
  }
}

// Outcome of a refresh attempt. Only `rejected` (no refresh token stored, or
// the server answered 401/403) may clear the session; `transient` (network
// error, timeout, 5xx, malformed body) keeps the stored tokens untouched.
type RefreshResult =
  | { kind: 'ok'; accessToken: string }
  | { kind: 'rejected' }
  | { kind: 'transient'; error: unknown };

// POST /mobile/auth/refresh returns only a token pair, not (user, dealer) —
// there's nothing here for auth/access.ts#canAccessDealerApp to check. That's
// fine: role/status are re-verified the next time this token is used to hit
// GET /mobile/auth/me (app cold start, or a future refreshUser() call), and
// if the backend has revoked the refresh token itself (e.g. account
// suspended server-side), this call fails with a 401 and the `rejected`
// branch below logs the user out regardless.
async function refreshAccessToken(): Promise<RefreshResult> {
  const tokens = await secureStorage.getTokens();
  if (!tokens?.refreshToken) return { kind: 'rejected' };

  try {
    const { data: rawData } = await refreshClient.post<RefreshResponse>('/mobile/auth/refresh', {
      refreshToken: tokens.refreshToken,
    });
    // A malformed 200 here would otherwise write `undefined`/garbage into
    // secure storage as the new bearer token — parse before persisting.
    const data = refreshResponseSchema.parse(rawData);
    await secureStorage.setTokens(data);
    return { kind: 'ok', accessToken: data.accessToken };
  } catch (err) {
    return isSessionRejection(err) ? { kind: 'rejected' } : { kind: 'transient', error: err };
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    if (!config) return Promise.reject(error);

    if (error.response?.status === 401 && !isLoginRequest(config)) {
      // 15-minute access tokens expire mid-session constantly — refresh once
      // and replay the original request rather than surfacing a 401 to the screen.
      if (!config._authRetry) {
        config._authRetry = true;

        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const refresh = await refreshPromise;

        if (refresh.kind === 'rejected') {
          await secureStorage.clearTokens();
          emitAuthFailure();
          HapticService.error();
          return Promise.reject(error);
        }

        if (refresh.kind === 'transient') {
          // Couldn't reach the refresh endpoint (offline, timeout, 5xx) —
          // that says nothing about the session, so keep the tokens. Reject
          // with the refresh failure rather than the original 401, so callers
          // (AuthProvider's cold start) see a connectivity error, not a
          // session rejection.
          HapticService.error();
          return Promise.reject(refresh.error);
        }

        config.headers.set('Authorization', `Bearer ${refresh.accessToken}`);
        return apiClient(config);
      }

      // Already replayed once with a freshly refreshed token and still got a
      // 401. If the session itself is still valid this is just that route
      // refusing the request (see isSessionStillValid) — surface the error to
      // the screen and stay signed in. Otherwise (account disabled/suspended
      // server-side, session revoked from another device) the tokens will
      // never be accepted again, so sign out instead of silently 401ing on
      // every subsequent request.
      if (await isSessionStillValid()) {
        HapticService.error();
        return Promise.reject(error);
      }
      await secureStorage.clearTokens();
      emitAuthFailure();
      HapticService.error();
      return Promise.reject(error);
    }

    // The dealer is authenticated but getVerifiedDealer rejected the request
    // (email/mobile not verified, or not yet admin-approved) — surface a
    // "verify your account" prompt app-wide instead of a bare error string.
    if (isAccountNotVerifiedError(error)) {
      emitVerificationRequired();
    }

    // Transient network/5xx retry, GET only — POST/PATCH/DELETE are not
    // idempotent here (e.g. POST /orders places an order), so only reads are
    // safe to replay automatically.
    const isTransient = !error.response || error.response.status >= 500;
    const isIdempotent = (config.method ?? 'get').toLowerCase() === 'get';
    config._retryCount = config._retryCount ?? 0;

    // One retry, and none when the device is known to be offline: a dead
    // network otherwise meant ~46 s of spinner (3 tries x 15 s timeout).
    if (isTransient && isIdempotent && config._retryCount < 1 && onlineManager.isOnline()) {
      config._retryCount += 1;
      const backoffMs = 500 * 2 ** (config._retryCount - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return apiClient(config);
    }

    // Single choke point for the "API Errors"/"Payment Failed" haptic: this
    // only runs once a failure is truly terminal (401 refresh exhausted,
    // retries exhausted, or non-retryable) — never on a request that's about
    // to be silently replayed above, so a transient blip that resolves on
    // retry doesn't buzz the user for no reason.
    HapticService.error();
    return Promise.reject(error);
  }
);
