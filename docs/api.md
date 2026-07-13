# MotoXPlus Backend API — Reference for the React Native App

Audited directly from `motoxplus-web/src/app/api` on 2026-07-13. This backend is a **B2B dealer
portal** (Next.js 14 App Router + Prisma + Postgres), not a generic consumer storefront — every
cart/order/payment endpoint requires an approved `Dealer` record (GST/PAN, MOQ-based ordering,
GST-inclusive pricing, dealer credit).

## 1. Base URL & environment

- Base URL: `NEXT_PUBLIC_APP_URL` (see backend `.env`) + `/api`, e.g. `https://motoxplus.example.com/api`.
- All request/response bodies are JSON. Send `Content-Type: application/json`.
- **Response envelope is inconsistent across the API** — do not assume one shape everywhere:
  - Most routes (`auth`, `mobile/auth`, `products`, `categories`, `cart`, `orders`) return the
    payload **directly**, e.g. `{ accessToken, refreshToken, user }` or `{ products, total, page, pageSize }`.
  - `payments/create-order` uses a `{ data: T }` / `{ error, code }` envelope (from `lib/api.ts`).
  - `payments/verify` returns the payload directly (`{ success, invoiceNumber }`), not the envelope.
  - Errors are generally `{ error: string }`, sometimes `{ error: string, code: string }` (payments only),
    sometimes `{ error: string, details: ZodIssue[] }` (product create validation).
  - **Type each endpoint individually** in the service layer — do not build one generic response parser.

## 2. Authentication model

The backend has three parallel auth mechanisms; the mobile app uses only #1:

1. **Mobile JWT (use this)** — `POST /api/mobile/auth/login` returns `accessToken` / `refreshToken` in
   the JSON body. Store both in **SecureStore**. Send `Authorization: Bearer <accessToken>` on every
   authenticated request.
   - Access token: HS256 JWT, **15 minute** expiry.
   - Refresh token: HS256 JWT, **7 day** expiry, single-use-per-rotation (rotates on every refresh).
2. **Web JWT cookie** (`mx_access`/`mx_refresh`, httpOnly) — set by `POST /api/auth/login`, used by the
   web app's plain login. Not relevant to the app, but note it's verified by the *same* `verifyAccessToken`
   as your Bearer token, so backend logic for both is unified via `getCurrentUserId(req)`.
3. **NextAuth session cookie** — used by the web dealer/admin/vendor dashboards via `signIn()`. Not
   relevant to the app.

Every endpoint the app needs (`cart`, `orders`, `orders/[id]`, `orders/[id]/tracking`,
`payments/create-order`, `payments/verify`, `dealer/account`) was **patched during this audit** to accept
the Bearer JWT via `getCurrentUserId` (previously they only accepted the NextAuth cookie and would have
401'd every mobile request). This was a backend change, scoped exactly to swapping the auth resolution —
no endpoint behavior, validation, or business logic changed. Verified with `tsc --noEmit` (0 errors).

### Token refresh & auto-logout (client-side contract)

- Access token expires in 15 min → attach an Axios response interceptor: on `401`, call
  `POST /api/mobile/auth/refresh` with the stored `refreshToken`; on success, retry the original request
  with the new `accessToken`; on failure (401/expired refresh token), clear SecureStore and route to Login.
- There is no server-side "logout everywhere" push — `POST /api/auth/logout-all` revokes all sessions for
  the user but the app must still clear its own local tokens.

## 3. Auth endpoints

### `POST /api/mobile/auth/login`
Primary login for the app.
- **Request**: `{ email?: string, mobile?: string, password: string }` — provide one of email/mobile.
- **Response 200**: `{ accessToken, refreshToken, user: { id, name, email, role, emailVerified, mobileVerified, isActive }, dealer: { id, companyName, ownerName, phone, state, city, address, pincode, gstNumber, status, creditLimit } | null }`
- **Errors**: `401` invalid credentials, `403` account disabled, `423` account locked (5 failed attempts → 30 min lock), `429` IP rate limit.
- **Rate limit**: 10 requests/min per IP.
- **Notes**: `dealer` is `null` if the user registered without completing dealer details (see registration below) — route the app to a "complete your dealer profile" step in that case. `dealer.status` will be `PENDING`/`ACTIVE`/etc.; the web app blocks unapproved dealers via middleware — **the API does not enforce this**, so the app must check `dealer.status` itself before allowing checkout.

### `GET /api/mobile/auth/me`
- **Auth**: Bearer required.
- **Response 200**: `{ user: { id, name, email, role, mobileVerified, isActive }, dealer: {...} | null }` (same dealer shape as login).
- **Errors**: `401` missing/invalid/expired token, `404` user not found.
- Use on app cold start to validate the stored access token and hydrate user state.

### `POST /api/mobile/auth/refresh`
- **Request**: `{ refreshToken: string }`
- **Response 200**: `{ accessToken, refreshToken }` (both rotated — overwrite both in SecureStore).
- **Errors**: `400` missing refreshToken, `401` invalid/expired.

### `POST /api/dealer/register` — recommended registration endpoint
Full one-shot dealer signup (validated with Zod).
- **Request**: `{ companyName, ownerName, phone, email, password, state, city, gstNumber?, panNumber?, aadhaarNumber?, companyAddress?, shopAddress?, pincode? }`
  - `phone`: Indian mobile, 10 digits (with/without `+91`).
  - `gstNumber`: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` if provided.
  - `panNumber`: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` if provided.
  - `aadhaarNumber`: 12 digits if provided (stored encrypted).
  - `password`: min 8 chars.
- **Response 201**: `{ success: true, userId, email }`. Creates `role: "DEALER"` user **with** a linked `Dealer` record, `status: "PENDING"` (needs admin approval before ordering — reflected in `dealerStatus` from login/me). Sends a verification email with an OTP.
- **Errors**: `400` validation / duplicate email / duplicate mobile / duplicate GST, `429` rate limit (5/min/IP).
- **Note**: There is also `POST /api/auth/register`, a looser variant where company fields are optional (creates a `DEALER`-role user with **no** `Dealer` record if company info is omitted, leaving `dealer: null` forever — there's no follow-up "complete your profile" endpoint to attach one later). Use `/api/dealer/register` for the app; avoid `/api/auth/register` since it can strand a user without a Dealer record.

### `POST /api/auth/forgot-password`
- **Request**: `{ email?: string, mobile?: string, method: "email" | "mobile" }`
- **Response 200**: `{ message, userId: string | null, method, expires: 10 }` — **always returns success** (prevents user enumeration) even if the account doesn't exist, in which case `userId` is `null`.
- **Errors**: `429` (5/min/IP, or 1/hour per-user OTP resend cap).
- OTP is 6 digits, 10 min expiry, max 3 attempts.

### `POST /api/auth/verify-forgot-password-otp`
- **Request**: `{ userId, otp }`
- **Response 200**: `{ resetToken, userId, expires: 10 }` (resetToken valid 10 min).
- **Errors**: `400` invalid/expired/wrong OTP (message includes attempts remaining).

### `POST /api/auth/reset-password`
- **Request**: `{ userId, resetToken, newPassword }` (`newPassword` min 8 chars).
- **Response 200**: `{ message }`. Revokes all existing sessions (forces re-login everywhere, including the app).
- **Errors**: `400` invalid/expired token or short password.

### `POST /api/auth/logout`
- **Auth**: Bearer (or cookie).
- **Response 200**: `{ message }`. Revokes just this session server-side. The app must also clear SecureStore — this endpoint does not "sign out" a stateless Bearer client by itself.

### `POST /api/auth/logout-all`
- **Auth**: Bearer required (401 if missing).
- **Response 200**: `{ message }`. Revokes every session for the user (e.g. "log out of all devices" in Settings).

### `POST /api/auth/send-mobile-otp`
- **Auth**: Bearer required.
- **Request**: `{ mobile: string }` (Indian mobile).
- **Response 200**: `{ message, expires: 10 }`. Saves/updates the user's mobile number, then sends a 6-digit OTP via SMS.
- **Errors**: `400` invalid number, `409` number already used by another account, `429` rate limits (5/min/IP; 5/hour/user resend cap), `500` SMS send failure.

### `POST /api/auth/verify-mobile`
- **Auth**: Bearer required.
- **Request**: `{ otp: string }`
- **Response 200**: `{ message }`. Marks `mobileVerified: true`.
- **Errors**: `400` already verified / wrong OTP, `404` user not found.

## 4. Products

### `GET /api/products`
Public (no auth). Query params:
- `category` — category slug.
- `search` — full-text-ish search (name/partNumber/brand/sku/compatibility).
- `vehicle`, `variant`, `section` — vehicle-compatibility filters (slugs); vehicle-fitment is a whole
  separate subsystem (`/api/admin/vehicles/*`) not otherwise needed for a basic product list.
- `page` (default 1), `pageSize` (default 12).
- **Response 200**: `{ products: Product[], total, page, pageSize }`. Each product includes `category` and
  `productImages` (sorted primary-first).
- Only `isActive: true` products are returned (admins can pass `adminAll=1` with a session to bypass — not
  usable from the app).
- **Product fields relevant to UI**: `price` (dealer price), `mrp`, `gstRate` (default 18), `stock`, `moq`
  (minimum order quantity — cart quantity must be a multiple of this), `brand`, `warranty`,
  `countryOfOrigin`, `compatibility: string[]`, `sku`, `partNumber`, `hsnCode`.
- **No pagination `totalPages` field** — compute `Math.ceil(total / pageSize)` client-side for infinite scroll / pagination UI.

### `GET /api/products/[id]`
Public.
- **Response 200**: full `Product` with `category`, `productImages`.
- **Errors**: `404` not found.
- **No related-products, no reviews field** — neither exists on this backend yet (see §7 gaps).

### `GET /api/products/search?q=...`
Public autocomplete/typeahead (min 2 chars).
- **Response 200**: `{ suggestions: [{ id, name, partNumber, brand, categoryName, imageUrl?, matchType: "name"|"partNumber"|"compatibility"|"brand" }] }` (max 8, ranked name/part/brand matches first, then vehicle-compatibility matches).
- This is a *different, lighter* shape than the full product list — use it only for the search bar's dropdown, then navigate to `GET /api/products?search=...` or `GET /api/products/[id]` for real results/details.

## 5. Categories

### `GET /api/categories`
Public.
- **Response 200**: `Category[]` directly (not wrapped) — `{ id, name, slug, description, image, sortOrder, isActive, _count: { products } }[]`, active-only, sorted by `sortOrder`.

## 6. Cart (dealer-only, Bearer required)

Cart is **per-dealer**, singular (`Cart` 1:1 `Dealer`), items reference `productId` + optional `variantId`.

### `GET /api/cart`
- **Response 200**: `{ items: [] }` if no cart yet, else `Cart` with `items[].product` (incl. `category`) and `items[].variant`.
- **Errors**: `401` unauthorized, `404` "Dealer not found" (account has no Dealer profile — see registration note above).

### `POST /api/cart`
Add or set-quantity for an item (upsert by product+variant).
- **Request**: `{ productId, quantity, variantId? }`
- **Response 200**: `{ success: true }` (does **not** return the updated cart — re-fetch `GET /api/cart` after, or update the React Query cache optimistically and reconcile).
- **Validation**: `quantity` must be `>= MOQ` and a **multiple of MOQ** (product's or variant's, whichever applies) — `400` with a message like `Quantity must be a multiple of MOQ (5)` otherwise. This is the #1 UX thing to surface in the cart quantity stepper (step by MOQ, not by 1).
- **Errors**: `400` invalid request/variant/MOQ, `404` product/dealer not found.

### `DELETE /api/cart`
- **Request**: `{ itemId }` (the `CartItem.id`, not the product id).
- **Response 200**: `{ success: true }`.
- **Errors**: `400` missing itemId, `404` dealer/cart not found.
- **No PATCH/quantity-decrement endpoint** — to change quantity, call `POST /api/cart` again with the new quantity (it's an upsert). There's no dedicated "increment/decrement by 1" endpoint; compute the new absolute quantity client-side (respecting MOQ) and POST it.

## 7. Orders (dealer-only unless noted)

### `GET /api/orders`
- Dealers see their own orders; `ADMIN`/`SUPER_ADMIN` (web only) see all. Query: `page` (pageSize fixed at 10).
- **Response 200**: `{ orders: Order[], total, page, pageSize }`. Each order includes `items.product`, `invoice`, `shipment`.

### `POST /api/orders`
Places an order from the current cart (server reads the dealer's cart — no items array in the request).
- **Request**: `{ paymentType: "ADVANCE_20"|"FULL_100"|"COD", notes?, deliveryName?, deliveryPhone?, deliveryAddress, deliveryCity?, deliveryState?, deliveryPincode }`
  - `deliveryPincode` required, 6 digits.
  - `deliveryName`/`Phone`/`City`/`State` fall back to the dealer's profile if omitted.
- **Response 200**: `{ order: Order, isCOD: boolean }`.
  - Server computes `subtotal`, `gstAmount` (per-item `gstRate`), `shippingCost` (5% of subtotal+GST, **free above ₹25,000**), `grandTotal`, and `amountDue` (20% of total for `ADVANCE_20`, full total otherwise).
  - `COD` orders are immediately `status: "CONFIRMED"` with an invoice generated and a Delhivery shipment auto-created (fire-and-forget). `ADVANCE_20`/`FULL_100` orders start `status: "PENDING"` — proceed to Razorpay flow (§8).
  - Cart is cleared server-side on success.
- **Errors**: `400` invalid paymentType/pincode/empty cart, `404` dealer not found.

### `GET /api/orders/[id]`
- **Response 200**: full `Order` incl. `items.product.category`, `payments`, `invoice`, `shipment.events`.
- **Errors**: `401`, `403` (dealer viewing someone else's order), `404`.

### `GET /api/orders/[id]/tracking`
- **Response 200**: `{ orderId, orderNumber, waybill, status, currentLocation, lastUpdate, estimatedDelivery, trackingUrl, events: [{ status, location, activity, timestamp }] }`.
- **Errors**: `403` forbidden (not your order), `404` order or "Shipment not created yet" (no shipment exists until payment/COD confirmation creates one).
- Backend auto-refreshes from Delhivery if its last sync was >30 min ago — no need for the app to poll aggressively; every 30–60s while a tracking screen is open is plenty.
- **No PATCH/cancel/return endpoint exists for dealers** — "Cancel Order" / "Return Request" from the original feature list have no backend support yet (order status can only be changed by an admin via a separate admin-only `PATCH /api/orders/[id]`, and there's no reorder/invoice-download endpoint either — `invoice` data comes back embedded in the order/tracking responses, so "download invoice" would need a client-side PDF render from that data, not a server endpoint).

## 8. Payments (Razorpay, dealer-only)

Two-step flow: create a Razorpay order, then verify the signature after the Razorpay SDK checkout completes.

### `POST /api/payments/create-order`
- **Request**: `{ orderId }` (the MotoXPlus order id from §7, not a Razorpay id).
- **Response 200** — ⚠️ uses the `{ data }` envelope (see §1): `{ data: { razorpayOrderId, amount (paise), currency: "INR", keyId, orderNumber } }`.
- **Errors** (also enveloped as `{ error, code }`): `400` bad body / no amount due, `401` unauthorized, `403` not your order, `404` order not found, `500` (Razorpay not configured or API failure).
- Feed `keyId`, `razorpayOrderId`, `amount`, `currency` directly into `react-native-razorpay`'s checkout options.

### `POST /api/payments/verify`
Call after the Razorpay SDK returns a successful payment.
- **Request**: `{ razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId }`
- **Response 200** — plain (not enveloped): `{ success: true, invoiceNumber }`.
- **Errors**: `400` invalid signature, `403` order doesn't belong to you, `404` order not found.
- On success the order flips to `CONFIRMED`, an invoice is generated, and a Delhivery shipment is auto-created.
- **COD orders skip this whole section entirely** — they're confirmed synchronously in `POST /api/orders`.

## 9. Shipping

### `POST /api/shipping/estimate`
- **Auth**: any authenticated user (Bearer works via the unified resolver, though this route wasn't in the original audit's "must-fix" list — verify with a real device request during integration; it still runs `getServerSession` only as of this audit, **not yet patched for Bearer**).
- **Request**: `{ destinationPincode, weightKg, paymentMode?: "Prepaid"|"COD", codAmount? }`
- **Response 200**: Delhivery rate-calculation result (pass-through, shape not modeled server-side beyond what Delhivery returns).
- ⚠️ **Not yet fixed for mobile JWT** — flagged as a follow-up, out of scope of the approved cart/orders/payments/account fix.

### `GET /api/shipping/serviceability?pincode=...`
- **Public**, no auth.
- **Response 200**: Delhivery serviceability pass-through for the pincode (use this for a pre-checkout "we deliver to your area" pincode check — no auth needed, call it as early as the address form).

## 10. Dealer account (Bearer required)

### `GET /api/dealer/account`
- **Response 200**: `{ ownerName, phone, address, city, state, pincode }`.
- **Errors**: `401`, `404`.
- **No PATCH/update-profile endpoint exists** — "Edit Profile" has nothing to save to yet on the backend.

### `DELETE /api/dealer/account`
- Deletes the dealer's invoices, orders, and user record (cascades to Dealer/Cart/CartItems). Irreversible — confirm hard in the UI before wiring this to a "Delete Account" button.
- **Response 200**: `{ success: true }`.

## 11. Confirmed gaps — nothing to call yet

No backend endpoints exist for these (confirmed by directory audit, not just missing docs). Per the
2026-07-13 decision, these ship **local-only** in the app for now (Zustand/AsyncStorage), not synced:

- **Wishlist** — no `/api/wishlist*` route at all.
- **Address book** — no `/api/addresses*` route; a dealer has exactly one address (`dealer.address`/`shopAddress`/`companyAddress`), not a list. "Address Selection" / "New Address" in checkout has nothing to select between server-side.
- **Product reviews** — only `/api/admin/reviews` (moderation) exists; no public submit/list-reviews endpoint. Drop the Reviews section from the product detail screen, or show a static "no reviews yet" state.
- **Notifications** — no endpoint. If built, must be local (push-only) for now.
- **Coupon / promo codes** — no field or endpoint anywhere in cart/order creation accepts a coupon code. Drop the coupon input from Cart/Checkout — it has nothing to validate against.

## 12. Rate limits summary

| Endpoint | Limit |
|---|---|
| `POST /api/mobile/auth/login`, `/api/auth/login` | 10/min per IP |
| `POST /api/dealer/register`, `/api/auth/register` | 5/min per IP |
| `POST /api/auth/forgot-password` | 5/min per IP, 1/hour per user (resend) |
| `POST /api/auth/send-mobile-otp` | 5/min per IP, 5/hour per user (resend) |
| Account lockout | 5 failed password attempts → 30 min lock (423) |

IP rate limiting is **in-memory, single-instance** (not Redis-backed) — fine for the current single-server
deployment, but don't be surprised if limits reset on a backend redeploy.

## 13. Fields the app will want but that need a dedicated read

Not documented in full above (would bloat this doc) but confirmed to exist and worth reading directly from
`prisma/schema.prisma` when building forms/types: full `Product`, `Category`, `Dealer`, `Order`, `OrderItem`,
`Shipment`, `ShipmentEvent`, `Invoice`, `Payment`, `ProductVariant`, `ProductImage` models. Generate/copy
TypeScript types from there rather than hand-writing interfaces, to avoid drift.
