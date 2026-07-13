import { isAxiosError } from 'axios';

import type { ApiErrorBody } from './types';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * The backend's error shape isn't uniform (plain `{ error }` on most routes,
 * `{ error, code }` on payments) — this normalizes both to a display string.
 */
export function getErrorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
