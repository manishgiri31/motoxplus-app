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
