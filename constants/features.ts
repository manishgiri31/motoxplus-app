// Client-side feature flags for capabilities that are gated on something
// outside this repo (a pending integration, a pending approval, etc).
// Flip and ship a new build once the blocker clears — there's no remote
// config source in this app to read these from at runtime.

// `react-native-razorpay` isn't installed yet (site verification with
// Razorpay is still pending), so there is no native UI to actually capture
// an online payment. Keep this off until the SDK is wired up end-to-end;
// otherwise a dealer can create an order with amountDue > 0 that can never
// be paid from the app.
export const ONLINE_PAYMENTS_ENABLED = false;

// Direct UPI / bank transfer is a manual proof-of-payment flow (QR + UTR +
// screenshot, verified by staff) — it needs no native payment SDK, so it can
// stay on independently of ONLINE_PAYMENTS_ENABLED/Razorpay. This is
// currently the only way to pay a non-COD order from the app.
export const UPI_PAYMENTS_ENABLED = true;
