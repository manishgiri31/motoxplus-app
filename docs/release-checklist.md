# Release Checklist

Honest state as of this audit — not a generic template. Items are marked done/deferred based on what
actually exists in this repo right now.

## Done

- [x] **Splash screen** — configured in `app.json` (`expo-splash-screen` plugin) and wired in
      `app/_layout.tsx`: stays visible until auth session hydration finishes, then hides.
- [x] **App icons** — the real brand mark (`assets/images/icon.png`, placed directly, not
      generated) drives every other icon asset. `scripts/generate-icon.js` (sharp) derives the
      Android adaptive icon layers (foreground = the mark on transparent, background = flat paper
      `#FBFAF8`, plus the Android 13+ monochrome/themed layer — the mark's alpha shape recolored to
      solid ink) and `splash-icon.png` from that one source, so re-running the script after any
      future icon.png update keeps every derived asset in sync. `favicon.png` (web) was
      intentionally left as the old placeholder — out of scope of that pass.
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
- [x] **Client-side security pass** (see `api/client.ts`, `auth/secureStorage.ts`, `utils/logger.ts`):
  - Tokens: `expo-secure-store` only, `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (excluded from device backups).
    No AsyncStorage token usage was ever introduced, so there was nothing to migrate.
  - Secrets audit: grepped the app for anything that must never ship client-side (API secrets, DB
    strings, private keys) — clean. Only `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_RAZORPAY_KEY_ID`
    exist, both public-by-design.
  - Transport: `config/env.ts` throws at load time if a non-`__DEV__` build's API URL isn't
    `https://`. `android.usesCleartextTraffic: false` set in `app.json`.
  - 401 handling: single-flight refresh with a retry-once guard (`api/client.ts`) — no retry loops;
    exhausting the refresh clears tokens and logs out cleanly. `utils/logger.ts` never logs
    headers/bodies/raw errors outside `__DEV__` (bearer tokens, passwords, OTPs, PII all excluded
    from production logs); dev-only logs redact the password field.
  - Release hardening: `jsEngine: "hermes"` set explicitly (SDK default, now also explicit).
    `expo-build-properties` added with `enableProguardInReleaseBuilds` +
    `enableShrinkResourcesInReleaseBuilds` for Android release (R8/ProGuard minify+shrink).
    No source-map-embedding step exists in the build config, so none ship inside the APK/IPA.
  - Deep links: the entire authenticated route group is behind `Stack.Protected guard={isAuthenticated}`
    (`app/_layout.tsx`) — a deep link into an authed screen while logged out already redirects.
    Params like order/product ids are re-validated server-side (e.g. `GET /api/orders/[id]` 403s on
    a non-owner) rather than trusted client-side, matching the model that the server is the real
    boundary.
  - **Certificate pinning: deliberately skipped.** Pin rotation breakage (a forced/expired
    certificate change bricking every installed copy of the app until an update ships) outweighs
    this app's actual threat model. Revisit only if that calculus changes.
  - Not verifiable from this environment: building an actual release APK and grepping the extracted
    bundle for secrets — no Android SDK/EAS credentials available here. The source-level secrets
    audit above is a reasonable proxy, but treat an actual release-APK grep as still outstanding
    before shipping.
- [x] **Permissions** — the app currently requests none beyond what Expo's default template needs
      (no camera/location/contacts usage), so there's nothing to declare in `app.json` yet.
- [x] **CI** — `.github/workflows/ci.yml` runs `tsc --noEmit` and `expo lint` on every PR to `main`.
- [x] **EAS build profiles** — `eas.json` has `development`/`preview`/`production` profiles with the
      right `EXPO_PUBLIC_API_URL` per environment. Running an actual build needs `eas login` with a
      real Expo account (not something I have).

## Deferred — needs your input or an external account

- [ ] **Crash reporting (Sentry/Bugsnag/etc.)** — not installed. `utils/logger.ts` is already the
      single place to wire a real SDK's `captureException` into once you pick one and have a DSN.
- [ ] **Push notifications (Android, FCM via Expo Push)** — app side is wired; end-to-end test on a
      real build is still pending.
  - **Done in the app:** `expo-notifications` plugin in `app.json` (channel `orders`),
    `google-services.json` committed (no secret in it) and set as `android.googleServicesFile`,
    `extra.eas.projectId` set. `hooks/use-push-notifications.ts` asks permission, gets the Expo
    push token and calls `POST /mobile/push-token`; `auth/AuthProvider.tsx` registers on login and
    unregisters on logout; `app/_layout.tsx` sets the foreground handler + `orders` channel and
    routes notification taps to the deep link. Notifications are delivered live only (the
    Notifications screen shows an empty state, no history).
  - **Done outside the repo (reported by the user, not verifiable from here):** FCM V1 service
    account key uploaded to EAS (`eas credentials` → Android → Google Service Account → FCM V1).
    The key file is never committed; `.gitignore` blocks `*firebase-adminsdk*.json`,
    `*service-account*.json`, `*serviceAccountKey*.json`.
  - **Unverified — backend (`motoxplus-web`):** that `POST /api/mobile/push-token` stores the
    token, and that `src/lib/push/send.ts` (`notifyOrderEvent`) posts to
    `https://exp.host/--/api/v2/push/send` with `to: "ExponentPushToken[...]"` and
    `channelId: "orders"`. Check these in the web repo before relying on real order pushes.
  - **Remaining:**
    1. Build: `eas build --profile preview --platform android` (native config changed, so OTA
       won't do; Expo Go can't receive pushes). Install the APK on a real device.
    2. Log in on the device, allow the notification permission, and confirm an
       `ExponentPushToken[...]` row appears in the backend DB for that dealer.
    3. Paste that token into https://expo.dev/notifications and send a test push (use channel
       `orders`); check it shows in foreground and background, and that tapping opens the right screen.
    4. Trigger a real order event from the backend (e.g. change an order's status) and confirm the
       push arrives.
    5. Log out and confirm the token is removed (`DELETE /mobile/push-token`).
  - **iOS — deferred:** needs an APNs key and `GoogleService-Info.plist` (git-ignored) plus an
    Apple Developer account. Not set up; revisit after the Android release.
- [ ] **OTA updates (`expo-updates`)** — needs an EAS project ID in `app.json`
      (`extra.eas.projectId`), which is created via `eas init` under your account.
- [ ] **Actual EAS builds (Android/iOS)** — `eas build --profile preview` needs `eas login`. iOS
      additionally needs an Apple Developer account for signing.
- [ ] **App Store / Play Store submission** — needs store listings, screenshots, privacy-policy URL
      (the web app's `/privacy` already exists and is linked from Settings — reuse that URL for the
      store listing), and signing credentials.
- [x] **Online payment (Razorpay) native SDK** — done. `react-native-razorpay` (New Architecture
      build) is wired: prepaid orders (`FULL_100` / `ADVANCE_20`) are paid in-app via the native SDK
      (`app/order/[id]/pay.tsx` + `hooks/useRazorpayPayment`, server-side verify via
      `POST /payments/verify`). The old manual UPI/bank-transfer stopgap
      (`upiService.ts` / `pay-upi.tsx` / `ONLINE_PAYMENTS_ENABLED` flag) has been removed.
      Needs a dev/production build — not Expo Go.
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
