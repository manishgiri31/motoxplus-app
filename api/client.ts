import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { emitAuthFailure } from '@/auth/authEvents';
import { secureStorage } from '@/auth/secureStorage';
import { env } from '@/config/env';
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
  // eslint-disable-next-line no-console
  console.log('REQUEST INTERCEPTOR HIT');
  // eslint-disable-next-line no-console
  console.log('STEP 5');
  const tokens = await secureStorage.getTokens();
  if (tokens?.accessToken) {
    config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  // This is the last point before axios hands the request off to the native
  // networking layer — the closest real boundary to "axios.post() actually
  // sending" that axios exposes (there is no separate call site for it:
  // authService.login's `apiClient.post(...)` *is* the axios.post call).
  // eslint-disable-next-line no-console
  console.log('STEP 6');
  logger.request(config);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // eslint-disable-next-line no-console
    console.log('RESPONSE INTERCEPTOR HIT');
    logger.response(response);
    return response;
  },
  (error: AxiosError) => {
    // eslint-disable-next-line no-console
    console.log('NETWORK ERROR INTERCEPTOR HIT');
    logger.networkError(error, 'apiClient');
    return Promise.reject(error);
  }
);

let refreshPromise: Promise<string | null> | null = null;

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

    return Promise.reject(error);
  }
);
