// One Idempotency-Key per checkout attempt for POST /orders.
//
// The key is created on the first "Place order" tap and reused on every
// retry (a second tap after a dropped connection, a double tap, a 401
// refresh-and-replay in api/client.ts) until the server answers with a
// success. The server stores it on the order and, for a key it has already
// seen, returns the original order instead of creating a duplicate.
//
// Module-level rather than component state so it survives the checkout
// screen being left and re-entered mid-attempt. Cleared only after a
// successful response (useCreateOrder's onSuccess); a failed attempt keeps
// the key so its retry is recognised.

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

let currentKey: string | null = null;

function uuidv4(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const checkoutAttempt = {
  /** The current attempt's key, created on first use. */
  key(): string {
    currentKey ??= uuidv4();
    return currentKey;
  },
  /** Call only after the server confirmed the order was created. */
  clear(): void {
    currentKey = null;
  },
};
