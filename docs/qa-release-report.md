# MotoXplus Auto Parts — Pre-release QA report (Play Store)

Date: 2026-11-02 · Branch: main · App: Expo SDK 54 / RN 0.81.5 (New Arch, Hermes, React Compiler) · Package: `com.manishgirii.motoxplusapp` · Version 1.0.0

Scope you confirmed: gateway = Razorpay (native SDK), backend = own API (`motoxplus.com/api`, `/api/mobile/*`). Not live: coupons, vendor/admin screens, camera VIN/part photo. Refund flow: see 5.11.

## How to read this

Nothing here was run on a phone. "Actual" comes from reading the source, from scanning the locally built `app-release.apk`, and from commands I ran (`tsc`, `expo lint`, `npm audit`, `curl` on the legal URLs).

| Result | Meaning |
|---|---|
| PASS | Verified from source, the built APK or a command I ran |
| FAIL | A defect or gap found. Severity and fix are given |
| MANUAL | Needs a device, the backend, EAS or Play Console. I could not verify it from code |
| N/A | Feature does not exist in this app |

Severity: **blocker** = do not submit until fixed. **major** = fix before release unless you accept the risk knowingly. **minor** = can ship, fix soon.

Automated checks I ran: `tsc --noEmit` passed (exit 0). `expo lint` passed (exit 0, no warnings). The repo has **no unit or e2e tests** and no test runner. CI (`.github/workflows/ci.yml`) only runs tsc and lint.

Stale docs warning: `BUGS-APP.md` (July) and parts of `docs/release-checklist.md` no longer match the code. The banner crash, the forgot-password dead end, the missing field limits and the missing Razorpay SDK are all fixed now. The checklist says `android.usesCleartextTraffic: false` is set in `app.json`. It is not (the platform default already blocks cleartext, so this is harmless).

The local `app-release.apk` (built 2026-11-01 20:03) is **outdated and debug-signed**. Its notification colour is still the old blue `#0071E3`. Do not test or upload it. Build a fresh one with EAS.

---

## 1. Install and launch

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 1.1 | Fresh install, open app | Splash, then login screen | `app/_layout.tsx` holds the splash until auth hydration and fonts are done, then shows `(auth)`. A font load error does not block it | PASS | |
| 1.2 | Install v1.0.0, log in, install a higher versionCode over it | Session and local data survive | Tokens are in SecureStore, so they should survive. Needs two builds | MANUAL | Test with two EAS builds (production profile uses remote `autoIncrement`) |
| 1.3 | Settings, Clear data (or reinstall), open | Login screen, no crash | `getTokens()` returns null, `isLoading` goes false, login shows. Storage read errors also fall through to login (`AuthProvider.tsx:110-120`) | PASS | |
| 1.4 | Cold start with a valid session | Lands on Home, push token re-registered | `authService.me()` then `canAccessDealerApp`, then app. Push registration is fire-and-forget | PASS | |
| 1.5 | Press Home, return after under 1 min, and after over 15 min | App resumes, expired token silently refreshed | 401 triggers a single-flight refresh and replay (`api/client.ts:111-131`) | PASS | |
| 1.6 | Open `motoxplusapp://product/<id>` while logged out | Goes to login, not the product | Whole authed group is under `Stack.Protected` | PASS | |
| 1.7 | Check the launcher label after install | "MotoXplus Auto Parts" | `app.json` `name` is `motoxplus-app`, so Android `app_name` is `motoxplus-app` (`strings.xml`, and in the APK's `app.config`) | FAIL | **major** — set `"name": "MotoXplus Auto Parts"` in `app.json` (the launcher truncates around 12 to 14 characters, so also consider a short name like "MotoXplus") |

## 2. Auth

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 2.1 | Signup with valid dealer details | Account created, verification flow starts | Form has GST, PAN and mobile regexes mirrored from the backend, plus terms and privacy links. I did not trace the whole submit path or the backend | MANUAL | Run on a device against production |
| 2.2 | Signup with invalid mobile, GST, PAN, short password | Inline errors, no request sent | `auth/validation.ts` regexes and zod caps | PASS | |
| 2.3 | Login with correct email or mobile plus password | Home | `login()` then `completeLogin()` gates on `canAccessDealerApp`, stores tokens, registers push | PASS | End-to-end still needs a device |
| 2.4 | Login with wrong password | Error shown, no token refresh attempt, no logout loop | The login URL is excluded from the 401 refresh branch (`client.ts:58-60`). Lockout (429/423) shows a countdown | PASS | |
| 2.5 | Login with a one-time code | Code sent, auto-submits on the 6th digit | Implemented (`login.tsx`). Needs `/api/mobile/auth/login-otp` live on the server | MANUAL | Confirm the endpoint is deployed on motoxplus.com |
| 2.6 | Logout | Tokens cleared, push token removed, cached data wiped | `clearSession()` clears SecureStore, unregisters push, `queryClient.clear()`. A failed logout request does not block it | PASS | |
| 2.7 | Forgot password: request, OTP, reset | Resend works after the cooldown, hardware back stays in the flow | 60 s resend cooldown, back handler, `usePreventScreenCapture` on the screen | PASS | Minor: "We couldn't find an account" (`forgot-password.tsx:95`) reveals whether an account exists. Confirm the server behaviour |
| 2.8 | Access token expires mid-session | Request silently retried | Single-flight refresh, one retry | PASS | |
| 2.9 | Refresh token revoked or expired | Clean logout to login, no loop | Refresh fails, tokens cleared, `emitAuthFailure`, `Stack.Protected` swaps to login | PASS | |
| 2.10 | Where tokens are stored | SecureStore only, never AsyncStorage | `auth/secureStorage.ts` uses expo-secure-store. AsyncStorage holds only wishlist, recent searches, recently viewed, vehicle and theme (`stores/*`) | PASS | |
| 2.11 | Non-dealer or unapproved account logs in | Access Denied screen, no tokens stored | `completeLogin` checks before `setTokens`. Same gate on cold start | PASS | |
| 2.12 | Delete account | In-app deletion with password re-entry | `app/settings.tsx` does this. Google Play requires it | PASS | You still need a public web URL for deletion in the Data safety form (13.8) |
| 2.13 | Screenshot or app-switcher on OTP and payment screens | Blocked on Android | `usePreventScreenCapture` is used on 5 screens. iOS switcher blur is also set | PASS | |

## 3. Catalog and search

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 3.1 | Scroll the parts list | Pages load as you scroll | `useInfiniteProducts` with `onEndReached`, windowed FlatList | PASS | |
| 3.2 | Filter by vehicle brand and model | Only compatible parts | Vehicle picker, `vehicleStore`, `vehicle` API param, bundled taxonomy fallback for offline | PASS | |
| 3.3 | Filter by part brand | Brand filter available | No brand filter. Only category, in-stock and sort (`CatalogFilterSheet`). "Brand A to Z" is sort only | FAIL | **minor** — add a brand filter or drop it from the requirements |
| 3.4 | Filter or sort by price | Price range or sort | Sort by price exists (low to high, high to low). No price range filter | FAIL | **minor** — add a min/max price filter if dealers need it |
| 3.5 | Search with empty, 1 character, or spaces only | Idle suggestions, no request | Mode is `idle` under 2 characters, requests are debounced 300 ms | PASS | |
| 3.6 | Search with `%`, `'`, `"`, `<script>`, emoji, 300 characters | No crash, no broken request | Query is passed as an axios param (URL-encoded). The text is never interpolated into HTML or SQL on the client. The input has no `maxLength` | PASS | Minor: add `maxLength={100}` to the search field |
| 3.7 | Same special characters, server side | No 500, no injection | Backend not in this repo | MANUAL | Test against `/api/products/search` and `/api/products?search=` |
| 3.8 | Out-of-stock item | Clearly marked, cannot be bought | `isOutOfStock` on cards and cart. Cart blocks checkout and shows `OutOfStockSheet`. Server also rejects | PASS | |
| 3.9 | Image URL fails or is missing | Placeholder icon, no blank hole | `components/ui/Image.tsx` falls back to a box icon on error or empty source. No screen imports `expo-image` directly | PASS | |
| 3.10 | No search results | Friendly empty state | `EmptyState` with clear-filters or browse action | PASS | |

## 4. Cart and checkout

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 4.1 | Add to cart, then force a failure | Item appears instantly, rolled back on failure | Optimistic update plus `onError` rollback (`useCart.ts`) | PASS | |
| 4.2 | Remove item, tap Undo | Item removed, Undo restores it | `removeLines` and `handleUndo` in `cart.tsx` | PASS | |
| 4.3 | Change quantity | Respects the minimum order quantity | `Stepper` with `moq`, optimistic update | PASS | |
| 4.4 | Add items, kill the app, reopen | Cart still there | Cart lives on the server (`GET /cart`), not on the device | PASS | Confirm once on a device |
| 4.5 | Compare cart total, checkout total and the Razorpay amount for a cart with paise (for example 1234.56) | All three show the same amount | `formatCurrency` uses `maximumFractionDigits: 0`, so the app shows ₹1,235 while the server charges ₹1,234.56. GST is also summed unrounded per line, so the displayed rows may not add up by ₹1 (`format.ts`, `cartTotals.ts`) | FAIL | **minor** — show 2 decimals when the value is not whole, and round GST the same way the server does |
| 4.6 | Free-delivery threshold and shipping rate | Match the server | App hardcodes ₹25,000 and 5% (`cartTotals.ts`). The cart tells the user the server confirms the final total | MANUAL | Confirm the server still uses 25000 and 5% |
| 4.7 | Coupon invalid or expired | Error message | No coupon feature exists in the app | N/A | |
| 4.8 | Address: empty fields, 5-digit pincode, 9-digit phone, 600-character address | Inline errors | `checkoutSchema` has min and max limits, mobile regex, 6-digit pincode. Pincode serviceability banner shown | PASS | |
| 4.9 | Order exceeds credit limit | Warning before placing | Advisory banner in `checkout.tsx`. Server is the authority | PASS | |
| 4.10 | Double-tap "Place order & pay" | One order | Button has `loading` while submitting or pending | PASS | |
| 4.11 | Network drops after the server creates the order but before the reply arrives, then tap Place order again | Second tap does not create a duplicate | `POST /orders` has no idempotency key and mutations are never retried. The error says "check your connection and try again", so the dealer re-submits and gets a second PENDING order (`orderService.create`, `checkout.tsx:136-153`) | FAIL | **major** — send an `Idempotency-Key` header (server must honour it), or on a no-response error check `GET /orders` for a fresh PENDING order before offering retry |
| 4.12 | GST Benefit free items | Shown as free, not in the total | `splitCartItems` separates scheme lines from the totals | PASS | |

## 5. Payments (Razorpay native)

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 5.1 | Pay successfully | Order moves to CONFIRMED, invoice shown | create-order, `RazorpayCheckout.open`, `POST /payments/verify`, then the order refetches (`useRazorpayPayment.ts`). Success is only shown after the server confirms | PASS | Live end-to-end still needs a device (5.10) |
| 5.2 | Payment fails (declined card) | Clear error, can retry or pay later | Phase `failed`, chooser re-shown, order stays PENDING | PASS | |
| 5.3 | Close the Razorpay sheet | "Cancelled", nothing charged, can retry | Error code 0 maps to `cancelled`. The order is refetched | PASS | |
| 5.4 | Payment succeeds but verify call times out or fails | Not shown as paid or cancelled, no second payment offered | `paidButUnconfirmed` and `paymentCompleted` hide all payment options. Message says contact support, with a button | PASS | Minor: no automatic re-check of the order. Poll `GET /orders/:id` for about 30 s after a verify failure, because the webhook may confirm it |
| 5.5 | Double-tap Pay or a payment method row | One Razorpay order | `inFlight` ref guard, and the buttons disappear while busy | PASS | |
| 5.6 | Amount integrity | Client cannot change the amount | Amount, currency and key come from `createRazorpayOrder`. Server re-verifies signature and amount | PASS | |
| 5.7 | Kill the app or switch to a UPI app mid-payment, then return | Order shows the true status | If money was captured, the webhook confirms and the pay screen shows "Payment received" after a refetch. The refetch on return depends on 8.7 | MANUAL | Test with PhonePe, GPay and Paytm on a real device |
| 5.8 | Sandbox keys in the release build | No `rzp_test_` key | Bundle contains `rzp_live_...` only. No `rzp_test_`. The local `.env` also has a live key | PASS | This means all testing is real money. See 5.9 |
| 5.9 | Server keys | Live key id, secret and webhook secret all match | Backend not in this repo. The app uses the `keyId` the server returns. `EXPO_PUBLIC_RAZORPAY_KEY_ID` is read in `config/env.ts` but used nowhere | MANUAL | Check the server env. Delete the unused env var |
| 5.10 | Payment on a real minified release build | Razorpay sheet opens, pays, verifies | R8 minify and shrink are on, with Razorpay keep rules in `app.json` and `proguard-rules.pro`. Never exercised in a release build | MANUAL | **Release gate.** Pay a small real order (for example ₹1 item) on an EAS production-profile build |
| 5.11 | Refund after cancelling a paid order | Refund initiated and shown | You said refunds are not live. The app already shows "refund initiated" with a refund status on cancel (`order/[id]/index.tsx`, `CancellationSheet`) | MANUAL | If refunds are not automatic yet, change the copy so it does not promise one |
| 5.12 | Late stock-out after payment (HTTP 409) | Specific message, no re-pay | Handled in the hook | PASS | |

## 6. Orders

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 6.1 | Place an order | Goes to the pay screen | `router.replace('/order/:id/pay')`. COD is not offered (dealer orders are prepaid) | PASS | |
| 6.2 | Status updates | Order detail and tracking reflect changes | Tracking polls every 60 s. Order detail refetches on open and after payment | PASS | |
| 6.3 | Cancel an order | Allowed for PENDING, CONFIRMED, PROCESSING with the fee shown | `CancellationSheet`. SHIPPED is blocked in the UI on purpose | PASS | End-to-end MANUAL (needs backend) |
| 6.4 | Order history with more than one page | Scrolls through all pages, no duplicates | `useInfiniteOrders`, de-dupe by id, filter tabs auto-load more | PASS | |
| 6.5 | Order history: next page fails | Retry control | Footer button "Couldn't load more. Try again" | PASS | |
| 6.6 | No orders yet | Empty state | `EmptyState` | PASS | |
| 6.7 | Invoice list and PDF share | Opens, shares | `invoices.tsx`, `invoice/[id].tsx`, `utils/invoicePdf.ts` (expo-print) exist. Seller details come from `EXPO_PUBLIC_COMPANY_*`, which are not set in `eas.json` or `.env`, so those lines print empty | MANUAL | Set `EXPO_PUBLIC_COMPANY_ADDRESS/GST/PHONE` in the `eas.json` production env, then test the PDF |
| 6.8 | Push notification on an order event, then tap it | Opens the right order | Client wired (channel `orders`, tap routes via `url`). Checklist says the end-to-end test is still pending | MANUAL | Send a real order event to a production build |
| 6.9 | Dead route `order-placed` | No unused screens | Registered in `_layout.tsx:122` but nothing navigates to it | FAIL | **minor** — delete the screen and its `Stack.Screen` |

## 7. Vendor / admin

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 7.1 | Inventory add, edit, delete | | No such screens. The app is dealer-only | N/A | |
| 7.2 | Two users edit the same item | | No editing feature | N/A | |
| 7.3 | Admin or vendor account signs in to the dealer app | Rejected | `canAccessDealerApp` rejects every non-dealer role. Access Denied screen links to the become-dealer page, which returns HTTP 200 | PASS | |

## 8. Network

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 8.1 | Airplane mode while browsing | Error with a retry, no crash | `ErrorState` with retry on lists and detail screens | PASS | |
| 8.2 | Offline banner | A visible "You're offline" indicator | None. No NetInfo package, no banner. Users only see a per-screen error after a request fails | FAIL | **minor** — add `@react-native-community/netinfo` (Expo-compatible version) and a banner. Wire it to React Query's `onlineManager` |
| 8.3 | Slow network (3G) | Feedback, bounded wait | 15 s timeout per try, GETs retry twice with backoff, so up to about 46 s of plain spinner with no message | FAIL | **minor** — show "Still trying…" after 8 s, or cut the retries to one |
| 8.4 | Connection drops during create-order or verify | Safe state | create-order failure: nothing charged, retry offered. Verify failure: see 5.4. For `POST /orders` see 4.11 | PASS | |
| 8.5 | Retry rules | Only safe requests retried | GET only, 500 ms then 1 s backoff. POST, PATCH and DELETE are never replayed. One 401 refresh, no loops | PASS | |
| 8.6 | Open the app offline with a stored session | Session kept, shows offline or last data | `AuthProvider.tsx:143-148` catches any `me()` failure (including no network) and calls `clearSession()`, which deletes the tokens. The dealer is logged out just for opening the app without signal | FAIL | **major** — only clear the session on a 401 or 403 from `/mobile/auth/me`. On a network error keep the tokens and show a retry screen |
| 8.7 | Return from background or reconnect | Stale data refreshed | React Query's focus and online managers are not wired for React Native (no `focusManager` or `onlineManager` setup). `staleTime` is 60 s, so screens refresh only on navigation or pull-to-refresh | FAIL | **minor** — wire `focusManager` to `AppState` and `onlineManager` to NetInfo |

## 9. Permissions

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 9.1 | Camera for VIN or part photo | | Not built. Documents screen uses the photo library and file picker only | N/A | |
| 9.2 | Permissions declared in the built APK | Only what the app uses | The APK manifest declares CAMERA, RECORD_AUDIO, READ/WRITE_EXTERNAL_STORAGE, READ_MEDIA_IMAGES, SYSTEM_ALERT_WINDOW, NFC, USE_BIOMETRIC and launcher-badge permissions. The app records no audio and has no camera screen | FAIL | **major** — Play flags unused sensitive permissions and they must match the Data safety answers. Add `android.blockedPermissions` to `app.json`: `RECORD_AUDIO`, `CAMERA`, `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`. `/android` is gitignored and EAS regenerates it, so `app.json` is the only place that counts |
| 9.3 | Location | | Not used. No location permission in the APK | N/A | |
| 9.4 | Notifications: allow | Token registered | `registerPushToken` asks, then posts to `/mobile/push-token` | PASS | End-to-end MANUAL (6.8) |
| 9.5 | Notifications: deny | App works normally | Returns null and nothing blocks login or ordering | PASS | |
| 9.6 | Upload a document from the gallery or files | Works with no storage prompt, 10 MB limit enforced | Uses the system pickers. Size check is in `documents.tsx` | PASS | |

## 10. Devices and screens

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 10.1 | Low-end phone (2 GB RAM, Android 8 to 10) | No crashes, usable scrolling | `minSdk` 24. Needs a device | MANUAL | Test on a real 2 GB phone with the production build |
| 10.2 | Small screen (about 320 dp wide) | No clipped text, buttons visible | Layouts use flex and safe-area insets. Cannot be proven from code | MANUAL | Check login, checkout and pay screens |
| 10.3 | Largest system font size | No overflow or overlap | 74 files cap text with `maxFontSizeMultiplier` 1.2, which limits overflow but also limits accessibility scaling | MANUAL | Check visually. Consider raising the cap to 1.3 on body text |
| 10.4 | Landscape | Locked to portrait | `orientation: portrait` and the manifest lock. With target SDK 36, Android 16 ignores orientation locks on screens 600 dp and wider (tablets, foldables) | MANUAL | Test on a tablet or foldable emulator. Add landscape-safe layouts or accept it |
| 10.5 | Notch and gesture bars | Content clear of cutouts | Edge-to-edge is on and screens use `useSafeAreaInsets` | PASS | |
| 10.6 | Keyboard over bottom buttons on checkout and forgot password | Buttons stay reachable | `KeyboardAvoidingView` is only active on iOS. Android relies on `adjustResize`, which behaves differently with edge-to-edge on Android 15+ | MANUAL | Test the checkout bottom bar with the keyboard open on Android 15 or 16 |
| 10.7 | Dark mode | Stays light | Locked light (`userInterfaceStyle: light`) | PASS | |

## 11. Security

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 11.1 | Secrets in the JS bundle | None | Scanned `index.android.bundle`: no secret keys, PEM blocks, Bearer tokens or Google API keys. Only the Razorpay public key id and `https://motoxplus.com` URLs. `.env` is gitignored and was never committed | PASS | Re-scan the new EAS build. The scan above was on the old local APK |
| 11.2 | HTTPS only | No http URLs | `config/env.ts` throws on a non-https URL in release. `eas.json` uses https. The manifest has no cleartext flag (default is blocked). The bundle's only http strings are third-party library text | PASS | |
| 11.3 | Input sanitisation | Validated before sending | zod on every form with length caps. No `eval`, no WebView. External links open in the system browser | PASS | Hardening: `getNotificationUrl` passes any string from a push to `router.push`. Accept only values starting with `/` |
| 11.4 | Sensitive data in logs | None in production | `logger.ts` logs headers and bodies only under `__DEV__`. Production logs method, URL and status only. The `console.log` in `networkDiagnostics.ts` is called only when `__DEV__` is true (`login.tsx:152`) | PASS | |
| 11.5 | Debug flags in release | Off | No `debuggable` in the APK manifest. `__DEV__` is false in release. Minify and shrink are on | PASS | |
| 11.6 | Backup of app data | Tokens not restored on another device | `allowBackup` is true, with `fullBackupContent` and `dataExtractionRules` from expo-secure-store. Tokens use `WHEN_UNLOCKED_THIS_DEVICE_ONLY` | PASS | |
| 11.7 | Dependency vulnerabilities | None high or critical in shipped code | `npm audit --omit=dev`: 57 findings (1 critical, 19 high). Direct deps with high findings: `axios`, `expo-router`, `zod`. Critical is `shell-quote` (build tooling, not in the app) | FAIL | **minor** — run `npm update axios zod expo-router`, re-run `npx expo-doctor`, and re-audit. Most of the rest is Expo CLI tooling that never ships |
| 11.8 | Server authorisation (another dealer's order id, rate limits) | 403 or 404 | Backend not in this repo | MANUAL | Request `/api/orders/<someone else's id>` with your token |
| 11.9 | OTA updates | Only your code | `expo-updates` checks on every launch against your EAS project. No update code signing is set up | MANUAL | Make sure only the `production` channel gets production updates. Consider code signing |

## 12. Crashes and performance

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 12.1 | Error boundary | Render crash shows a recovery screen | `components/ErrorBoundary.tsx` wraps the whole app, with a "Try again" button | PASS | |
| 12.2 | Crash reporting and non-render errors | Crashes reach you | No Sentry or similar. No global handler for async errors or unhandled promise rejections, so those bypass the boundary. `logger` only writes to console | FAIL | **major** — add Sentry (or Bugsnag) via `logger.ts` and `ErrorUtils.setGlobalHandler`. Play Console vitals will show crashes but without readable JS stack traces |
| 12.3 | Home banner after 25+ minutes open | No crash | Rewritten with `% count` and `scrollTo`. The old out-of-range `scrollToIndex` bug is gone | PASS | |
| 12.4 | Timers and listeners cleaned up | No leaks | Intervals, timeouts and `BackHandler` subscriptions are cleared in effect cleanups (banner, forgot-password, pay) | PASS | |
| 12.5 | Heap growth after 10 minutes of browsing | Flat | Needs profiling | MANUAL | Android Studio Profiler, or `adb shell dumpsys meminfo` before and after |
| 12.6 | Long list scrolling at 60 fps | Smooth | Windowed FlatList on search, orders and catalog. `removeClippedSubviews` on search | MANUAL | Test with 500+ products on a low-end phone |
| 12.7 | Startup time | Under about 3 s to Home | Splash waits for fonts and for `authService.me()`. On a slow network this can last up to about 46 s (3 tries, 15 s timeout each) | FAIL | **minor** — cap the wait at about 5 s and continue with a cached session. Then measure with `adb shell am start -W` |
| 12.8 | Download and install size | Reasonable | Local universal APK is 115 MB (4 ABIs, plus ML Kit models pulled in by the Razorpay SDK). A Play AAB is split per device | MANUAL | Check the size on the Play Console after the first AAB upload |
| 12.9 | 16 KB page size (Android 15+ requirement) | Native libs aligned | All 24 arm64 `.so` files have 16 KB ELF alignment | PASS | Also run `zipalign -c -P 16 -v 4` on the final AAB's APKs |

## 13. Play Store readiness

| ID | Test and steps | Expected | Actual | Result | Severity / fix |
|---|---|---|---|---|---|
| 13.1 | applicationId | Final, brand-appropriate | `com.manishgirii.motoxplusapp`. It can never change after the first upload, and `google-services.json` is tied to it | MANUAL | Decide now. For example `com.motoxplus.app`. Changing it means a new Firebase app entry and a new `google-services.json` |
| 13.2 | Version | 1.0.0 with a versionCode that grows | `version` 1.0.0. EAS `appVersionSource: remote` with `autoIncrement` on production | PASS | Check with `eas build:version:get -p android` |
| 13.3 | Release signing | Signed with your own upload key, Play App Signing on | Locally the `release` build type uses `debug.keystore`. The `/android` folder is generated, so EAS signs the real build with its own credentials. I cannot see them | MANUAL | **Release gate.** Run `eas credentials -p android`. Confirm an upload keystore exists and back it up |
| 13.4 | Build output type | AAB | Production profile has no `buildType`, so EAS builds an AAB by default | PASS | |
| 13.5 | R8 / ProGuard | On, with Razorpay rules | `enableProguardInReleaseBuilds`, `enableShrinkResourcesInReleaseBuilds`, Razorpay and Reanimated keep rules | PASS | Runtime check is 5.10. Upload the R8 mapping file to Play |
| 13.6 | Target SDK | 35 or higher | React Native 0.81 targets API 36 (`libs.versions.toml`). `minSdk` 24 | PASS | |
| 13.7 | Privacy policy URL | Public and reachable | In-app link and the web page both return HTTP 200: `/privacy`, `/terms`, `/cancellation-policy`, `/contact` | PASS | Enter `https://motoxplus.com/privacy` in Play Console |
| 13.8 | Data safety form | Matches what the app collects | Cannot be filled from code. What the app handles: name, email, phone, address, GST/PAN documents (uploaded), order history, push token (Expo and FCM), payments via Razorpay (card and UPI details never reach your server). All traffic over HTTPS. Account deletion is in the app | MANUAL | Fill the form from that list. Add a web URL for account deletion requests |
| 13.9 | App access for reviewers | Working login | The app is login-only and dealers need approval | MANUAL | Create an approved test dealer with a password and enter it under "App access" |
| 13.10 | Content rating, ads, target audience | Completed | Play Console only | MANUAL | Fill in the questionnaires |
| 13.11 | App icon | Adaptive and monochrome icons present | `icon.png`, foreground, background and monochrome all 1024×1024 and present. Splash is 1024×1024 | PASS | |
| 13.12 | Store listing assets | 512×512 icon, 1024×500 feature graphic, 2 to 8 phone screenshots | Not in the repo | MANUAL | Take screenshots from a production build (login, catalog, cart, order) |

---

## Summary

| | Count |
|---|---|
| Total test cases | 116 |
| PASS | 70 |
| FAIL | 14 (0 blocker, 5 major, 9 minor) |
| MANUAL | 27 |
| N/A | 5 |

### Failures by severity

Major (5):
- 1.7 App name is `motoxplus-app` — `app.json` one-line fix.
- 9.2 Unused sensitive permissions in the manifest (RECORD_AUDIO, CAMERA, storage, SYSTEM_ALERT_WINDOW) — `app.json` `blockedPermissions`.
- 8.6 Opening the app offline logs the dealer out and deletes the tokens — `AuthProvider.tsx` fix.
- 4.11 A dropped connection on "Place order" can lead to a duplicate order — needs an idempotency key (client and server).
- 12.2 No crash reporting and no global handler for async errors.

Minor (9): 3.3, 3.4, 4.5, 6.9, 8.2, 8.3, 8.7, 11.7, 12.7.

### Blocker list

No code defect I found is a hard blocker. The blockers are **release gates** that I could not verify, and each one must pass before you submit:

1. **5.10** — Live Razorpay payment has never been run on a minified EAS production build. Your key is `rzp_live_`, so test with a real small order.
2. **13.3** — Confirm the EAS upload keystore exists and is backed up (`eas credentials -p android`). The local APK is debug-signed and cannot be uploaded.
3. **13.9** — Create an approved test dealer for Play reviewers. The app is login-only, so without it the review fails.
4. **13.7, 13.8, 13.10, 13.12** — Play Console: privacy policy URL, Data safety form, content rating, screenshots.
5. **13.1** — Decide the applicationId now. It is permanent after the first upload.
6. **5.9** — Confirm the server uses the live Razorpay key, secret and webhook secret.

### Verdict: NO-GO for today

Reason: the payment path is unproven on a release build, and signing and Play Console items are unconfirmed. Nothing in the code I read is crash-prone enough to stop a release on its own.

It becomes **GO** when:
1. The five major fixes are in (items 1.7, 9.2 take minutes; 8.6 is a small change; 4.11 needs a small backend change; 12.2 is about an hour with Sentry). If you decide to ship without 4.11 or 12.2, write down that you accepted the risk.
2. A fresh EAS production build passes a real payment (5.10), the release gates above are done, and the MANUAL device tests (section 10 especially) show no layout break.
3. Play Console items are complete.

### Not covered

- Anything that runs on a device or in Play Console (all MANUAL rows).
- The backend (`motoxplus-web`). It is not in this repo, so payment verification, webhooks, authorisation and rate limits are unchecked.
- iOS. The report is Android only.
