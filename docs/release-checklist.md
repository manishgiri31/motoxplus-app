# Release Checklist

Honest state as of this audit — not a generic template. Items are marked done/deferred based on what
actually exists in this repo right now.

> **Status update (2026-11-05).** Statuses below were re-checked against the latest pre-release QA
> report (`docs/qa-release-report.md`, 2026-11-02; IDs like "QA 9.2" point to its rows). Where this
> checklist and the QA report disagreed, the QA report wins and the line is marked *Corrected*.
> Also fixed since the July bug audit and confirmed in source: the home banner crash, the
> forgot-password dead end and the missing checkout field limits (see `BUGS-APP.md`).

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
    `https://`. *Corrected 2026-11-05:* `android.usesCleartextTraffic` is **not** set in `app.json`;
    the platform default already blocks cleartext, so this is harmless (QA 11.2 PASS).
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
- [x] **Permissions** — *Fixed 2026-11-12 (QA 9.2).* `android.blockedPermissions` in `app.json`
      removes CAMERA, RECORD_AUDIO, READ/WRITE_EXTERNAL_STORAGE, READ_MEDIA_*, and
      SYSTEM_ALERT_WINDOW. The document upload uses the system photo picker
      (`launchImageLibraryAsync`), which needs no permission. Checked with
      `SLIM_RELEASE_BUILD=1 npx expo config --type introspect`. Still to do: test a document upload
      on Android 10–12 and 13+ devices.
- [x] **Offline cold start** — *Fixed 2026-11-12 (QA 8.6).* Only a 401/403 clears the session
      (`auth/sessionPolicy.ts`). Network errors and 5xx keep the tokens and show the last account
      from `auth/sessionCache.ts`, or a "No connection" retry screen. Test:
      `node scripts/test-auth-session.js`.
- [x] **Duplicate orders on retry** — *Fixed 2026-11-12 (QA 4.11).* The app sends an
      `Idempotency-Key` per checkout attempt (`api/checkoutAttempt.ts`). The server side is on
      `motoxplus-web` branch `release/idempotency` (includes migration
      `20261112100000_order_idempotency_key`). Deploy the server first. The header is optional
      there, so older builds keep working.
- [x] **CI** — `.github/workflows/ci.yml` runs `tsc --noEmit` and `expo lint` on every PR to `main`.
- [x] **EAS build profiles** — `eas.json` has `development`/`preview`/`production` profiles with the
      right `EXPO_PUBLIC_API_URL` per environment. Running an actual build needs `eas login` with a
      real Expo account (not something I have).

## Deferred — needs your input or an external account

- [ ] **Crash reporting (Sentry)** — *Code done 2026-11-12 (QA 12.2); needs a DSN.*
      `@sentry/react-native` 7.2.0 is in `utils/crashReporting.ts`. It catches uncaught JS errors,
      unhandled promise rejections, ErrorBoundary render errors, and native crashes, and sends no
      personal data. It stays off until `EXPO_PUBLIC_SENTRY_DSN` is set. To turn it on:
      1. Create a Sentry project (React Native).
      2. Run `eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value <dsn> --environment production --environment preview`.
      3. Rebuild.
      Source maps are not uploaded yet (`SENTRY_DISABLE_AUTO_UPLOAD`), so stack traces stay minified.
      In Play's Data safety form, declare "Crash logs" and "Diagnostics" (collected, not shared,
      used for app functionality). Test: `node scripts/test-crash-reporting.js`.
- [ ] **Push notifications (Android, FCM via Expo Push)** — app side is wired; end-to-end test on a
      real build is still pending. *2026-11-05: MANUAL, QA 6.8 / 9.4.*
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
- [ ] **OTA updates (`expo-updates`)** — *2026-11-05: MANUAL, QA 11.9.* `extra.eas.projectId` and
      `updates.url` are now set in `app.json`. Remaining: make sure only the `production` channel gets
      production updates; consider update code signing.
- [ ] **Actual EAS builds (Android/iOS)** — `eas build --profile preview` needs `eas login`. iOS
      additionally needs an Apple Developer account for signing. *2026-11-05: MANUAL, QA 13.3 (release
      gate).* The local `app-release.apk` is outdated and debug-signed; confirm the EAS upload keystore.
- [ ] **App Store / Play Store submission** — needs store listings, screenshots, privacy-policy URL
      (the web app's `/privacy` already exists and is linked from Settings — reuse that URL for the
      store listing), and signing credentials. *2026-11-05: MANUAL, QA 13.1, 13.7–13.10, 13.12;
      launcher name FAIL (major), QA 1.7.*
- [x] **Online payment (Razorpay) native SDK** — done. `react-native-razorpay` (New Architecture
      build) is wired: prepaid orders (`FULL_100` / `ADVANCE_20`) are paid in-app via the native SDK
      (`app/order/[id]/pay.tsx` + `hooks/useRazorpayPayment`, server-side verify via
      `POST /payments/verify`). The old manual UPI/bank-transfer stopgap
      (`upiService.ts` / `pay-upi.tsx` / `ONLINE_PAYMENTS_ENABLED` flag) has been removed.
      Needs a dev/production build — not Expo Go. *2026-11-05: QA 5.1 PASS; a live payment on a
      minified production build is still a release gate (QA 5.10 MANUAL).*
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
- No return/reorder. *Corrected 2026-11-05:* order cancellation now exists (QA 6.3 PASS) and invoice
  PDF share exists (QA 6.7 MANUAL — `EXPO_PUBLIC_COMPANY_*` must be set for the seller block).
