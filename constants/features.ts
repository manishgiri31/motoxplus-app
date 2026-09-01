// Client-side feature flags for capabilities that are gated on something
// outside this repo (a pending integration, a pending approval, etc).
// Flip and ship a new build once the blocker clears — there's no remote
// config source in this app to read these from at runtime.

// Razorpay native checkout (`react-native-razorpay`, New Architecture build).
// The backend enables it via NEXT_PUBLIC_RAZORPAY_ENABLED=true and both
// `POST /payments/create-order` and `POST /payments/verify` accept the mobile
// Bearer JWT, so prepaid (FULL_100 / ADVANCE_20) orders are paid in-app via
// the native SDK — see app/order/[id]/pay.tsx. Turn this off only if Razorpay
// is disabled server-side again; the create-order endpoint then 400s with
// RAZORPAY_DISABLED and checkout should not offer the prepaid options.
export const ONLINE_PAYMENTS_ENABLED = true;
