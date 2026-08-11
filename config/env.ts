/**
 * Typed access to build-time environment variables.
 * Expo inlines any `EXPO_PUBLIC_*` var from `.env` at build time — see `.env.example`.
 */

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and set it (see README).'
  );
}

// Plain HTTP is only ever expected against a local dev backend (Android
// emulator's 10.0.2.2, iOS simulator's localhost, a LAN IP — see
// .env.example) — never in a real build. Fail loudly rather than silently
// shipping a release build that sends bearer tokens and order data in the
// clear.
if (!__DEV__ && !apiUrl.startsWith('https://')) {
  throw new Error(`EXPO_PUBLIC_API_URL must be an https:// URL in a non-dev build, got: ${apiUrl}`);
}

export const env = {
  apiUrl,
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
} as const;

// The Next.js web app's origin, for deep-linking to pages that only exist
// there (contact, privacy, terms) — derived from apiUrl since there's no
// separate EXPO_PUBLIC_WEB_URL.
export const webOrigin = apiUrl.replace(/\/api\/?$/, '');
