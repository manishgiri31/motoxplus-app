# Release Checklist

Honest state as of this audit — not a generic template. Items are marked done/deferred based on what
actually exists in this repo right now.

## Done

- [x] **Splash screen** — configured in `app.json` (`expo-splash-screen` plugin) and wired in
      `app/_layout.tsx`: stays visible until auth session hydration finishes, then hides.
- [x] **App icons** — replaced the default Expo template assets with a simple placeholder mark
      (a white "M" on the app's brand red, `#E4111A`) covering `icon.png`, the Android adaptive
      icon layers, `favicon.png`, and `splash-icon.png` (used for both light and dark splash).
      This is **still not a real MotoXPlus brand icon** — swap it for real brand assets before
      shipping (see the deferred item below).
- [x] **Deep linking** — `app.json` already declares `"scheme": "motoxplusapp"`, and Expo Router
      auto-generates a linking config from the file-based routes with zero extra code. A link like
      `motoxplusapp://product/<id>` will open the product detail screen once the app is installed.
      Universal links (`https://motoxplus.com/...` opening the app) need an
      `apple-app-site-association` file and Android `assetlinks.json` hosted on the web backend —
      that's a web-repo + domain change, not something this repo can do alone.
- [x] **Error boundary** — `components/ErrorBoundary.tsx`, wraps the whole app in `app/_layout.tsx`.
      Catches render errors, shows a recoverable fallback screen.
- [x] **Logging** — `utils/logger.ts` is the single choke point for error/warn/info logging
      (used by the ErrorBoundary). It currently only logs to console — see "Crash reporting" below.
- [x] **Security basics** — tokens only ever touch `expo-secure-store` (never AsyncStorage/plain
      state persisted to disk), `.env` is gitignored, production API URL defaults to HTTPS.
- [x] **Permissions** — the app currently requests none beyond what Expo's default template needs
      (no camera/location/contacts usage), so there's nothing to declare in `app.json` yet.
- [x] **CI** — `.github/workflows/ci.yml` runs `tsc --noEmit` and `expo lint` on every PR to `main`.
- [x] **EAS build profiles** — `eas.json` has `development`/`preview`/`production` profiles with the
      right `EXPO_PUBLIC_API_URL` per environment. Running an actual build needs `eas login` with a
      real Expo account (not something I have).

## Deferred — needs your input or an external account

- [ ] **Crash reporting (Sentry/Bugsnag/etc.)** — not installed. `utils/logger.ts` is already the
      single place to wire a real SDK's `captureException` into once you pick one and have a DSN.
- [ ] **Push notifications** — not installed. Two blockers, not just "not done yet": (1) no
      `/api/*/push-token` endpoint exists on the backend to store device tokens, (2) needs an EAS
      project (for push credentials) which needs your Expo account. Notifications screen currently
      shows an honest empty state instead of fake data.
- [ ] **OTA updates (`expo-updates`)** — needs an EAS project ID in `app.json`
      (`extra.eas.projectId`), which is created via `eas init` under your account.
- [ ] **Actual EAS builds (Android/iOS)** — `eas build --profile preview` needs `eas login`. iOS
      additionally needs an Apple Developer account for signing.
- [ ] **App Store / Play Store submission** — needs store listings, screenshots, privacy-policy URL
      (the web app's `/privacy` already exists and is linked from Settings — reuse that URL for the
      store listing), and signing credentials.
- [ ] **Real brand app icon + splash image** — currently a placeholder monogram (see "App icons"
      above), not real MotoXPlus brand assets.
- [ ] **Online payment (Razorpay) native SDK** — `api/services/paymentService.ts` creates the
      Razorpay order for real, but `react-native-razorpay` was deliberately **not installed** in this
      pass: it's a native module that isn't present in Expo Go, so importing it would break the whole
      app for anyone testing without a custom dev client. Install it once you're ready to build a dev
      client (`npx expo run:android` / `eas build --profile development`), then wire
      `RazorpayCheckout.open()` into `app/checkout.tsx`'s online-payment branch.
- [ ] **`/api/shipping/estimate` mobile auth** — still session-only, not patched for the mobile JWT
      (see `docs/api.md` §9). Low priority since checkout doesn't depend on it (the order's own
      `shippingCost` is authoritative), but worth fixing if you want a live shipping estimate before
      checkout.

## Known, accepted gaps (not release blockers, just be aware)

- Wishlist and "recently viewed" are device-local only (no backend endpoint exists) — they don't
  sync across a dealer's devices.
- No coupon/promo code support anywhere (no backend field for it).
- No address book (a dealer has exactly one address on the backend) — checkout always uses/edits
  that single address per order.
- No product reviews (no public reviews endpoint, only admin moderation).
- No order cancel/return/reorder, no invoice PDF download — none of these have backend endpoints.
