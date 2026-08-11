// Lets api/client.ts signal "refresh failed, log the user out" without importing
// AuthProvider directly (which would create a circular dependency, since the
// auth service used by AuthProvider itself goes through api/client.ts).

type Listener = () => void;

let listener: Listener | null = null;

export function onAuthFailure(cb: Listener): void {
  listener = cb;
}

export function emitAuthFailure(): void {
  listener?.();
}

// Same pattern, for the "account exists and is authenticated, but
// getVerifiedDealer rejected the request" case — cart/order/payment POSTs
// 403 with this until the dealer verifies email + mobile and is approved.
// Fired from api/client.ts, consumed by a single app-root listener that
// surfaces a "verify your account" prompt instead of a bare error string.
let verificationListener: Listener | null = null;

export function onVerificationRequired(cb: Listener): void {
  verificationListener = cb;
}

export function emitVerificationRequired(): void {
  verificationListener?.();
}
