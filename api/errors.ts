import { isAxiosError } from 'axios';

import type { ApiErrorBody } from './types';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * The backend's error shape isn't uniform (plain `{ error }` on most routes,
 * `{ error, code }` on payments) — this normalizes both to a display string.
 *
 * Important: this distinguishes "the server responded and rejected the
 * request" from "the request never got a response" (network failure, CORS
 * block, timeout). A previous version of this function collapsed both cases
 * into whatever fallback string the caller passed in — which meant a caller
 * passing something like "Invalid email/mobile or password" as a fallback
 * would show that exact text for a pure network failure too, making it
 * indistinguishable from a real backend rejection. Never do that: callers
 * should pass a neutral fallback (or none) and rely on the branches below for
 * anything that should read as a real reason.
 */
export function getErrorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    if (error.response) {
      return error.response.data?.error ?? `Server error (${error.response.status}). Please try again.`;
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'The server took too long to respond. Your connection may be slow. Please try again.';
    }
    if (error.request) {
      return 'Could not reach the server. Check your internet connection and try again.';
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

// Copy of ACCOUNT_NOT_VERIFIED_MESSAGE in motoxplus-web's
// lib/auth/verified-account.ts — matched by content (not endpoint) so a 403
// from /cart, /orders, /payments/create-order, or /payments/verify is
// recognized the same way no matter which one failed. Compared by prefix: the
// backend has reworded the tail of this message before, and an exact match
// silently stopped recognizing it.
export const ACCOUNT_NOT_VERIFIED_MESSAGE =
  'Your account is not verified or is not active. Please complete email and mobile verification, or contact support if your account has been suspended.';

const ACCOUNT_NOT_VERIFIED_PREFIX = 'Your account is not verified';

export function isAccountNotVerifiedError(error: unknown): boolean {
  return (
    isAxiosError<ApiErrorBody>(error) &&
    error.response?.status === 403 &&
    typeof error.response.data?.error === 'string' &&
    error.response.data.error.startsWith(ACCOUNT_NOT_VERIFIED_PREFIX)
  );
}
