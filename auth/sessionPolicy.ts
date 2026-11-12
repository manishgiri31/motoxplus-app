// Single source of truth for "does this failure mean the session is gone?".
//
// Only an explicit 401 or 403 from the server says the stored tokens are no
// longer accepted. Everything else (no network, DNS failure, timeout, 5xx,
// a malformed body) says nothing about the session, so the tokens must be
// kept and the app shown from cache instead of dropping the dealer back to
// the login screen.
//
// Kept free of React Native imports so scripts/test-auth-session.mjs can run
// it under plain Node.

export function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

export function isSessionRejection(error: unknown): boolean {
  const status = getHttpStatus(error);
  return status === 401 || status === 403;
}
