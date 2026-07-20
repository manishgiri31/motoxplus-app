import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { emitAuthFailure } from '@/auth/authEvents';
import { secureStorage } from '@/auth/secureStorage';
import { env } from '@/config/env';
import { HapticService } from '@/utils/haptics';
import { logger } from '@/utils/logger';
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

let refreshPromise: Promise<string | null> | null = null;

// POST /mobile/auth/refresh returns only a token pair, not (user, dealer) —
// there's nothing here for auth/access.ts#canAccessDealerApp to check. That's
// fine: role/status are re-verified the next time this token is used to hit
// GET /mobile/auth/me (app cold start, or a future refreshUser() call), and
// if the backend has revoked the refresh token itself (e.g. account
// suspended server-side), this call fails outright and the `!newAccessToken`
// branch below logs the user out regardless.
async function refreshAccessToken(): Promise<string | null> {
  const tokens = await secureStorage.getTokens();
  if (!tokens?.refreshToken) return null;

  try {
    const { data } = await refreshClient.post<RefreshResponse>('/mobile/auth/refresh', {
      refreshToken: tokens.refreshToken,
    });
    await secureStorage.setTokens(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    if (!config) return Promise.reject(error);

    // 15-minute access tokens expire mid-session constantly — refresh once and
    // replay the original request rather than surfacing a 401 to the screen.
    if (error.response?.status === 401 && !config._authRetry) {
      config._authRetry = true;

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;

      if (!newAccessToken) {
        await secureStorage.clearTokens();
        emitAuthFailure();
        HapticService.error();
        return Promise.reject(error);
      }

      config.headers.set('Authorization', `Bearer ${newAccessToken}`);
      return apiClient(config);
    }

    // Transient network/5xx retry, GET only — POST/PATCH/DELETE are not
    // idempotent here (e.g. POST /orders places an order), so only reads are
    // safe to replay automatically.
    const isTransient = !error.response || error.response.status >= 500;
    const isIdempotent = (config.method ?? 'get').toLowerCase() === 'get';
    config._retryCount = config._retryCount ?? 0;

    if (isTransient && isIdempotent && config._retryCount < 2) {
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
