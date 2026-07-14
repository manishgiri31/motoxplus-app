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
    if (error.request) {
      return 'Could not reach the server. Check your internet connection and try again.';
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
