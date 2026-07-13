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

export const env = {
  apiUrl,
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
} as const;
