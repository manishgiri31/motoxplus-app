# MotoXPlus App — Bug & Risk Audit

Read-only audit. No code changes made. Reviewed every file under `app/`, `api/`, `auth/`, `components/`,
`stores/`, `providers/`, `utils/`, `constants/`, plus config (`app.json`, `eas.json`, `.env*`) and the
in-repo docs (`docs/api.md`, `docs/release-checklist.md`).

## Architecture

**React Native app (Expo SDK 54, Expo Router, TypeScript), not a WebView wrapper, not Flutter, not
native.** Screens are file-based routes under `app/`. State: TanStack React Query for all server data,
Zustand + AsyncStorage for device-local-only state (wishlist, recent searches, recently viewed, theme —
none of this is sensitive or synced to a server).

**Everything that talks to `motoxplus.com` goes through one choke point:** `api/client.ts` (an axios
instance, `baseURL` from `EXPO_PUBLIC_API_URL`), called exclusively via the typed wrappers in
`api/services/*.ts` (`authService`, `cartService`, `orderService`, `paymentService`, `productService`,
`categoryService`, `dealerService`, `shippingService`). No screen or component calls `fetch`/`axios`
directly — the one exception is `utils/networkDiagnostics.ts`, a **dev-only** (`__DEV__`-gated) raw
connectivity probe used before the login request, which intentionally bypasses `apiClient` to isolate
"can't reach the server at all" from "the login request specifically failed."

Auth: JWT bearer tokens (15 min access / 7 day refresh), stored via `expo-secure-store` (`auth/secureStorage.ts`)
— iOS Keychain / Android Keystore-backed, not AsyncStorage. `api/client.ts` attaches the token on every
request and transparently refreshes on 401.

---

## Findings by severity

### High

**1. Placing an order over a dropped connection is ambiguous — can produce duplicate orders.**
`app/checkout.tsx:82-114`, `api/hooks/useOrders.ts:33-44`, `api/client.ts:100-113`
`POST /orders` has no idempotency key, and mutations are explicitly not retried
(`providers/queryClient.ts: mutations.retry: 0`). If the request reaches the server and the order is
created, but the response never makes it back to the device (connection drops mid-flight, timeout), the
`catch` in `onSubmit` shows *"Could not reach the server. Check your internet connection and try again."*
The dealer has no way to tell the order already exists — pressing "Place order" again submits a second,
identical order. There is no post-failure check ("did this actually go through?") before the retry path is
offered.

**2. Home screen banner can crash after ~25 minutes of the app being open.**
`components/BannerCarousel.tsx:38-96`
The auto-scrolling promo carousel walks a synthetic array of `slides.length * 200` items and calls
`listRef.current.scrollToIndex({ index: next })` every 5s, starting from the middle of that array. With
the current 3 hardcoded slides, `currentIndex` walks off the end of the array (`index >= data.length`)
after roughly (600 − 300) × 5s ≈ **25 minutes**. React Native's `VirtualizedList.scrollToIndex` throws an
invariant violation ("scrollToIndex out of range") for an out-of-bounds index — an uncaught exception
inside a `setInterval` callback, outside React's render cycle, which is not caught by
`components/ErrorBoundary.tsx` (that only catches render errors) and crashes/fatal-errors the JS thread.
Because `app/(tabs)/_layout.tsx` uses `freezeOnBlur` (not unmount) for tabs, the `setInterval` keeps
firing even while the user is on a different tab — this is reachable in any normal session that stays
open past ~25 minutes, not just someone idling on the Home tab.

**3. Online payment is a dead end in this build — and payment methods are hardcoded, not server-driven.**
`app/checkout.tsx:23-27, 97-106`; `api/services/paymentService.ts`; `docs/release-checklist.md`
`paymentOptions` (COD / 20% advance / full payment online) is a **local hardcoded array** in
`checkout.tsx` — the app has no concept of a server-driven payment-method config at all, and no endpoint
for one exists in the documented backend (`docs/api.md`). Separately and more urgently: selecting either
online option creates a real order and a real Razorpay order server-side, but `react-native-razorpay` is
**not installed** (confirmed in `docs/release-checklist.md` and the comments in `paymentService.ts` /
`checkout.tsx`) — there is no native checkout UI to actually capture payment. The user is shown an `Alert`
telling them to "complete online payment from the order details screen once the payment SDK is available
in this build," which never happens anywhere in the app. Net effect: a dealer can create an order with
`amountDue > 0` that can never be paid from the app, with no visible warning before they tap "Place order
& pay." *(I could not verify the specific claim about a `RAZORPAY_ENABLED` flag on the website — that's a
different repo not present here — but the underlying ask, "does the app hardcode payment options instead
of reading server config," is confirmed true regardless.)*

**4. Forgot-password OTP step has no resend and no way back if the code doesn't arrive.**
`app/(auth)/forgot-password.tsx:130-159`, `app/(auth)/_layout.tsx:5`
The `(auth)` stack sets `headerShown: false` globally, so there's no back button on this screen. The `otp`
step offers only a single "Verify code" action — no resend, no countdown, no link back to the `request`
step. Per `docs/api.md` §3/§12, OTPs expire in **10 minutes** and resend is capped at **1/hour/user**
server-side — if the SMS/email is delayed past that window, or the code is mistyped 3 times (server-enforced
max attempts), the only recovery is backing out of the *entire screen* via the Android hardware back
button / iOS swipe gesture, which unmounts the component and discards `userId`/`resetToken` state,
forcing a full restart from scratch.

### Medium

**5. Mobile-number verification is dead code — the app nags the user with no way to fix it.**
`app/(tabs)/account.tsx:90-94`; `api/services/authService.ts:42-46`
Account screen shows *"Your mobile number isn't verified yet — verify it to unlock full account
features"* whenever `user.mobileVerified` is false, but `authService.sendMobileOtp` /
`authService.verifyMobile` — the only two endpoints that could resolve this — are never called from
anywhere in `app/` (confirmed by a repo-wide search: only referenced in `authService.ts` itself and the
type definitions). There is no screen, button, or modal that starts this flow. Any dealer with an
unverified mobile sees this warning permanently.

**6. No max-length validation on checkout free-text fields.**
`auth/validation.ts:36-44` (`checkoutSchema`), `components/ui/Input.tsx`
`deliveryName`, `deliveryAddress`, `deliveryCity`, `deliveryState`, and `notes` all have `.min()` but no
`.max()` in the Zod schema, and `Input` never defaults a `maxLength`. A pasted 10,000-character string (or
a string full of emoji) into Address or Notes passes client-side validation untouched and is sent to the
server as-is — behavior then depends entirely on whatever limits (or lack of them) the backend enforces,
and a long single-line value will visibly overflow the Notes field's layout (it's not `multiline`, unlike
Address).

**7. No runtime validation of API responses — the app trusts server response shape via TypeScript types only.**
`api/services/*.ts`, `api/types.ts`
Every service method does `apiClient.get<SomeType>(...).then(r => r.data)` — `SomeType` is a compile-time
annotation, not a runtime check (no `zod`/`io-ts` parsing of responses, despite `zod` already being a
dependency for forms). If the backend ever returns a shape the client doesn't expect (bad deploy, a field
renamed, `null` where an array was assumed), the failure surfaces as an unhandled `TypeError` deep inside
a component (e.g. `.map` on `undefined`) rather than a clear, specific error — the user just sees the
generic ErrorBoundary fallback ("Something went wrong"), and there's nothing in the logs pointing at
*which* field was missing.

**8. Client-side shipping/free-delivery math is duplicated and can silently drift from the server.**
`utils/cartTotals.ts:6-8`
`FREE_DELIVERY_THRESHOLD = 25000` and `SHIPPING_RATE = 0.05` are hardcoded constants mirroring the
backend's actual calculation (`docs/api.md` §7) purely to show a pre-checkout estimate. There is no
endpoint the app reads these from. If the backend's threshold or rate ever changes, the app's displayed
cart/checkout totals go stale until someone remembers to update this constant and ship a new build. Blast
radius is limited — `cart.tsx` shows *"Final total is confirmed by the server when you place the order"*
— but the **displayed** estimate can be wrong for an arbitrarily long time with no error and no way to
fix it without an app-store release.

### Low

**9. No visible feedback during the automatic retry window — a dead network can look "stuck" for up to ~46s.**
`api/client.ts:100-113`
GET requests transiently failing (network blip or 5xx) are retried up to twice with 500ms/1000ms backoff,
on top of the 15s axios timeout per attempt — worst case ≈ 46s of a plain spinner with no "retrying…"
messaging before `ErrorState` finally appears. Not infinite, but nothing tells the user a retry is even
happening.

**10. No app-level max on catalog/search/cart-total precision or list virtualization tuning was found to be wrong — flagged as reviewed, not a bug.** *(noted here only so it's clear this was checked, not skipped — `FlatList` windowing props on Home/Search/Category screens are all sensibly set.)*

---

## What I checked and found already correct (no action needed)

These map directly to the security-audit questions raised mid-review — recorded here so they aren't
mistaken for gaps:

- **Token storage**: `auth/secureStorage.ts` uses `expo-secure-store` exclusively on iOS/Android (Keychain /
  Keystore-backed), never AsyncStorage. The only fallback to `localStorage` is explicitly `Platform.OS ===
  'web'`-gated with a comment flagging it as not-equivalent security if web ever ships for real — correct
  and already documented, not a silent gap.
- **Hardcoded secrets**: none found. `.env` contains only `EXPO_PUBLIC_API_URL` (meant to be public — it's
  inlined into the JS bundle regardless) and `EXPO_PUBLIC_RAZORPAY_KEY_ID` (Razorpay's *Key ID* is a public
  client identifier by design; the actual Razorpay secret never touches this app). `.env` is gitignored and
  confirmed **not** present anywhere in git history (`git log --all -- .env` is empty).
- **HTTPS / cleartext traffic**: production and preview EAS profiles and the default `.env` point at
  `https://motoxplus.com/api`. `app.json` sets no `android.usesCleartextTraffic` override and no iOS
  `NSAppTransportSecurity` exception, so platform defaults (both block plaintext HTTP) apply. Only the
  gitignored local-dev override (`10.0.2.2` / `localhost`) uses HTTP, as expected for a local backend.
- **Sudden token invalidation (e.g. a server-side JWT secret rotation)**: traced end-to-end and confirmed
  correct. `api/client.ts`'s 401 handler calls `refreshAccessToken()`; if the refresh token is also invalid
  under the new secret, the refresh call itself 401s, the catch returns `null`, tokens are cleared from
  SecureStore, `emitAuthFailure()` fires, `AuthProvider` clears `user`/`dealer`, and
  `Stack.Protected guard={isAuthenticated}` in `app/_layout.tsx` swaps to the `(auth)` group — landing
  cleanly on the login screen. No crash, no loop; concurrent in-flight requests share one refresh attempt
  via `refreshPromise` rather than each firing their own.

## Dead code

- `authService.sendMobileOtp` / `authService.verifyMobile` (`api/services/authService.ts:42-46`) — see
  Finding 5.
- `AuthProvider.refreshUser` (`auth/AuthProvider.tsx:120-129`) — exported from the context, called nowhere
  today. Explicitly documented in-code as intentional ("any future caller inherits the access check for
  free"), not an oversight — flagged for completeness only.

## Release-readiness note (relevant to "diffing against the last release")

There is no prior release to diff against: `git tag --list` is empty, there's a single `main` branch, no
`app.json extra.eas.projectId`, and `docs/release-checklist.md` explicitly lists EAS builds and store
submission as **not yet done**. `package.json`/`app.json` version is `1.0.0`. Treat this as a first
release, not an update — "what changed since the last version users have" doesn't apply yet.
