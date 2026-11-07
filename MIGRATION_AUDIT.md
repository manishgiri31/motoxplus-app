# Migration Audit: Next.js + Prisma → Spring Boot

Generated 2026-11-05 from `E:\motoxplus\motoxplus-web`. **Read-only: no code in either repo was changed.** Method: static scan of every `src/app/api/**/route.ts`, `prisma/schema.prisma`, the 16 Prisma migrations, all `*.test.ts`, and every non-API file that imports Prisma. The mobile surface comes from `motoxplus-app/api/services/*`. Auth, model and surface columns are extracted by script and spot-checked by hand; where the script could not see the real guard it is corrected in the table (webhooks, NextAuth catch-all, the two public admin settings reads).

## Summary

| | |
|---|---|
| Route files / HTTP handlers | 163 / 238 |
| Mobile-facing | 36 paths / 42 handlers (called by the Expo app today; 5 more handlers share those paths but are admin-only methods such as `POST /categories`) |
| Server Actions (`"use server"`) | 0 |
| Route handlers outside `/api` | 0 (`robots.ts`, `sitemap.ts` only) |
| Prisma models / enums | 74 / 36 |
| Test files / cases | 44 / 415, **all lib-level unit tests; 0 route tests** |
| Frontend files reading the DB directly | 60 (54 import Prisma themselves) |

**How to read the route tables.** *Auth* is what the handler actually enforces. "Cookie or JWT" accepts the NextAuth cookie or a Bearer/`mx_access` JWT, so mobile can call it. "NextAuth session" accepts the web cookie only, so mobile cannot. *Models* lists Prisma models touched directly in the handler; *+lib* lists models reached only through shared `src/lib` modules. *Surface*: **Mobile** = called by the Expo app (the web UI may also call it); **Web** = not called by the app.

## Key findings (read these first)

1. **All money is stored as `double precision`, not `Decimal`.** The schema has 0 `Decimal` fields and 81 `Float` fields, 61 of them money-like (about 54 amounts, the rest percentages/rates such as `gstRate`). The exceptions are `Product.price` and `ProductVariant.price`, which are `INTEGER` whole rupees (charm-priced, migration `20260921010000`). A Java `BigDecimal` model is fine, but the *DB column stays a double*, so (a) reads convert double→BigDecimal, (b) JSON must serialise the way Node does (shortest round-trip number: `500`, not `500.00`), and (c) Node computes in IEEE doubles and rounds with `roundToPaise`; `BigDecimal` + `HALF_UP` can differ on exact-half cases (e.g. `1.005`, negatives). Treat every money module as needing characterization tests before porting.
2. **No executable API contract exists.** 0 of 44 test files call a route handler; 17 mock `@/lib/prisma`. Parity tests must be written from scratch against captured Node responses.
3. **Money/auth modules with no test at all:** `orders/cod`, `orders/stock`, `orders/cancellation-policy`, `shipping/quote` (golden test only), `invoicing/create-invoice`, `razorpay.ts`, `auth/session` (refresh-token rotation, which mobile depends on), `auth/rate-limit-budgets`, the Razorpay webhook route, `payments/create-order`, `payments/verify`, `admin/refunds/[id]/retry`. `orders/cancellation-gate` is tested only for the B2B branch (3 cases).
4. **No uniform response envelope.** `lib/api.ts` defines `{ data }` helpers, but only 1 route file imports it; 161 files return bare `NextResponse.json(...)` in route-specific shapes (arrays, `{ orders, total, page, pageSize }`, `{ error }` with `code` mostly absent). The Java side cannot implement one envelope; each route's shape must be captured individually.
5. **171 handlers accept only the NextAuth web cookie** (91 check `getServerSession` directly, 80 go through `requireAdmin`). They are web-only by construction. The existing Java port does not mint the NextAuth cookie, so login for web portals must stay on Node until the ~50 server-rendered pages stop depending on `getServerSession`.
6. **54 pages/components query Prisma directly** (section 3). Each needs an API or must stay on Node. Admin routes also call `revalidateTag` for catalog caches; a separate Java service will not invalidate Next's cache.
7. **Security observations to decide on during the port (not changed):**
   - `GET /api/admin/settings/upi` is intentionally public but returns bank account number, IFSC and UPI id, with real-looking values hard-coded as fallbacks in source.
   - `GET/POST /api/webhooks/delhivery` takes its shared secret in the query string (`?token=`), which ends up in proxy access logs.
   - `POST /api/dev/whatsapp-order-test` is a dev-only admin route that sends real WhatsApp messages; do not port it.
   - Public registration/OTP endpoints (`auth/register`, `dealer/register`, `vendor/register`, `auth/send-email-verification`, `contact`) are rate-limited per IP in Redis; the Java side must reuse the same Redis key space or limits reset at cutover.
8. **A Java port already exists** at `motoxplus-web/backend-java` (Maven, Java 17, Spring Boot 4.1; 9 routes + catalog in progress, uncommitted edits as of 2026-11-05 10:58). See section 4 for how that interacts with a new `/backend`.

---

## 1. API routes by domain

### Auth & sessions

25 handlers, 19 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| ? | `/api/auth/[...nextauth]` | NextAuth catch-all handler (credentials provider; exported as GET+POST) | - | - | - | Web |
| POST | `/api/auth/change-email` | Cookie or JWT · rate-limited | - | User | OtpCode | **Mobile** |
| POST | `/api/auth/customer/register` | Public · rate-limited | CUSTOMER | User | OtpCode | Web |
| POST | `/api/auth/forgot-password` | Public · rate-limited | - | User | OtpCode | **Mobile** |
| POST | `/api/auth/login` | Public: password login | - | - | LoginHistory, User | Web |
| POST | `/api/auth/login-otp` | Public: OTP proof · rate-limited | CUSTOMER | User | OtpCode | **Mobile** |
| POST | `/api/auth/logout` | JWT | - | - | User, UserSession | **Mobile** |
| POST | `/api/auth/logout-all` | JWT | - | - | User, UserSession | **Mobile** |
| GET | `/api/auth/me` | JWT | - | User | - | Web |
| POST | `/api/auth/refresh` | Public: refresh token | - | - | User, UserSession | Web |
| POST | `/api/auth/register` | Public · rate-limited | DEALER | Dealer, User | OtpCode | **Mobile** |
| POST | `/api/auth/reset-password` | Public · rate-limited | - | User, VerificationToken | UserSession | **Mobile** |
| POST | `/api/auth/send-email-verification` | Public · rate-limited | - | User | OtpCode | **Mobile** |
| POST | `/api/auth/send-mobile-otp` | Cookie or JWT · rate-limited | - | User | OtpCode | **Mobile** |
| DELETE | `/api/auth/sessions` | JWT | - | UserSession | User | **Mobile** |
| GET | `/api/auth/sessions` | JWT | - | - | User, UserSession | **Mobile** |
| POST | `/api/auth/verify-email` | Public: OTP proof | - | User | OtpCode | **Mobile** |
| POST | `/api/auth/verify-forgot-password-otp` | Public: OTP proof · rate-limited | - | User, VerificationToken | OtpCode | Web |
| POST | `/api/auth/verify-mobile` | Cookie or JWT + Public: OTP proof · rate-limited | - | User | OtpCode | **Mobile** |
| POST | `/api/mobile/auth/login` | Public: password login | - | - | LoginHistory, User, UserSession | **Mobile** |
| POST | `/api/mobile/auth/login-otp` | Public: OTP proof · rate-limited | - | User | OtpCode, UserSession | **Mobile** |
| GET | `/api/mobile/auth/me` | JWT | - | User | - | **Mobile** |
| POST | `/api/mobile/auth/refresh` | Public: refresh token | - | - | User, UserSession | **Mobile** |
| DELETE | `/api/mobile/push-token` | JWT · rate-limited | - | DeviceToken | User | **Mobile** |
| POST | `/api/mobile/push-token` | JWT · rate-limited | - | DeviceToken | User | **Mobile** |

### Catalog (products, categories, vehicles)

9 handlers, 5 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| GET | `/api/categories` | Public | - | Category | - | **Mobile** |
| POST | `/api/categories` | NextAuth session | ADMIN, SUPER_ADMIN | Category | - | Web |
| GET | `/api/products` | Optional (cookie/JWT; anon allowed) | ADMIN, SUPER_ADMIN | Product, Vehicle, VehiclePartSection, VehicleVariant | (raw SQL), ProductCompatibility | **Mobile** |
| POST | `/api/products` | NextAuth session | ADMIN, SUPER_ADMIN | Product | (raw SQL), ProductCompatibility, Vehicle, VehiclePartSection, VehicleVariant | Web |
| DELETE | `/api/products/[id]` | NextAuth session | ADMIN, SUPER_ADMIN | Product, ProductImage | - | Web |
| GET | `/api/products/[id]` | Optional (cookie/JWT; anon allowed) | - | Product | - | **Mobile** |
| PATCH | `/api/products/[id]` | NextAuth session | ADMIN, SUPER_ADMIN | Product, ProductImage | - | Web |
| GET | `/api/products/search` | Public | - | (raw SQL), Product | - | **Mobile** |
| GET | `/api/vehicles` | Public · rate-limited | - | Vehicle, VehicleManufacturer, VehicleVariant | User | **Mobile** |

### Cart & schemes

5 handlers, 4 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| DELETE | `/api/cart` | Cookie or JWT + verified DEALER/CUSTOMER | - | Cart, CartItem | Scheme | **Mobile** |
| GET | `/api/cart` | Cookie or JWT + verified DEALER/CUSTOMER | - | Cart, CartItem | Scheme | **Mobile** |
| POST | `/api/cart` | Cookie or JWT + verified DEALER/CUSTOMER | - | Cart, CartItem, Product, ProductVariant | Scheme | **Mobile** |
| POST | `/api/cart/scheme` | Cookie or JWT · rate-limited | DEALER | Cart, CartItem, Product, User | Scheme | **Mobile** |
| GET | `/api/schemes/eligible` | Cookie or JWT | DEALER | Scheme, User | - | Web |

### Orders

8 handlers, 6 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| GET | `/api/orders` | Cookie or JWT · rate-limited | DEALER, CUSTOMER, ADMIN, SUPER_ADMIN | Customer, Dealer, Order, User | DeviceToken, Invoice, OrderEvent, ProductVariant, Scheme, Setting | **Mobile** |
| POST | `/api/orders` | Cookie or JWT + verified DEALER/CUSTOMER · rate-limited | - | Cart, CartItem, Order, SchemeRedemption | DeviceToken, Invoice, OrderEvent, ProductVariant, Scheme, Setting | **Mobile** |
| GET | `/api/orders/[id]` | Cookie or JWT | DEALER, STAFF dept: orders | Dealer, Order, User | DeviceToken, OrderEvent | **Mobile** |
| PATCH | `/api/orders/[id]` | NextAuth session | ADMIN, SUPER_ADMIN | Order | DeviceToken, OrderEvent | Web |
| POST | `/api/orders/[id]/cancel` | Cookie or JWT · rate-limited | DEALER, ADMIN | Dealer, DealerDuesEntry, Order, OrderCancellation, OrderEvent, SchemeRedemption, User | CancellationPolicy, DeviceToken, ProductVariant, Setting | **Mobile** |
| GET | `/api/orders/[id]/cancellation-preview` | Cookie or JWT | DEALER, ADMIN, SUPER_ADMIN | Dealer, Order, User | - | **Mobile** |
| POST | `/api/orders/[id]/confirm-cod` | Cookie or JWT + verified DEALER/CUSTOMER | - | Order | DeviceToken, Invoice, OrderEvent, ProductVariant | Web |
| GET | `/api/orders/[id]/tracking` | Cookie or JWT | DEALER, STAFF dept: orders | Dealer, Order, Shipment, User | - | **Mobile** |

### Payments

5 handlers, 2 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| POST | `/api/payments/create-order` | Cookie or JWT + verified DEALER/CUSTOMER | - | Order, Payment | - | **Mobile** |
| GET | `/api/payments/upi/[orderId]` | Cookie or JWT | DEALER, CUSTOMER | Customer, Dealer, Order, Setting, User | - | Web |
| GET | `/api/payments/upi/qr` | Public · rate-limited | - | Setting | User | Web |
| POST | `/api/payments/upi/submit` | Cookie or JWT + verified DEALER/CUSTOMER · rate-limited | - | Order, PaymentSubmission | User | Web |
| POST | `/api/payments/verify` | Cookie or JWT + verified DEALER/CUSTOMER | - | Order, Payment | DeviceToken, Invoice, OrderEvent, ProductVariant | **Mobile** |

### Shipping & carrier webhooks

5 handlers, 1 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| POST | `/api/shipping/estimate` | Cookie or JWT | - | - | - | **Mobile** |
| GET | `/api/shipping/serviceability` | Public | - | - | - | Web |
| GET | `/api/webhooks/delhivery` | Shared secret in `?token=` (constant-time compare) | - | - | - | Web |
| POST | `/api/webhooks/delhivery` | Shared secret (constant-time compare) | - | - | - | Web |
| POST | `/api/webhooks/razorpay` | Razorpay HMAC signature (`x-razorpay-signature`) | - | Order, OrderCancellation, OrderEvent, Payment | DeviceToken, Invoice, ProductVariant | Web |

### Dealer / customer / vendor accounts

24 handlers, 3 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| DELETE | `/api/dealer/account` | Cookie or JWT · rate-limited | DEALER | Dealer, Invoice, Order, User | - | **Mobile** |
| GET | `/api/dealer/account` | Cookie or JWT · rate-limited | DEALER | Dealer, User | - | **Mobile** |
| GET | `/api/dealer/documents` | Cookie or JWT | DEALER | Dealer, DealerDocument, User | - | **Mobile** |
| POST | `/api/dealer/register` | Public · rate-limited | DEALER | Dealer, User | OtpCode | Web |
| GET | `/api/vendor/products` | NextAuth session | VENDOR | Product, Vendor | - | Web |
| POST | `/api/vendor/products` | NextAuth session | VENDOR | Product, Setting, Vendor | - | Web |
| GET | `/api/vendor/profile` | NextAuth session | VENDOR | Vendor | - | Web |
| GET | `/api/vendor/purchase-orders` | NextAuth session | VENDOR | PurchaseOrder, Vendor | - | Web |
| PATCH | `/api/vendor/purchase-orders/[id]/accept` | NextAuth session | VENDOR | PurchaseOrder, Vendor | - | Web |
| PATCH | `/api/vendor/purchase-orders/[id]/reject` | NextAuth session | VENDOR | PurchaseOrder, Vendor | - | Web |
| POST | `/api/vendor/register` | Public · rate-limited | VENDOR | User, Vendor | OtpCode | Web |
| GET | `/api/vendors` | NextAuth session | - | Vendor | - | Web |
| POST | `/api/vendors` | NextAuth session | VENDOR | User, Vendor | - | Web |
| GET | `/api/vendors/[id]` | NextAuth session | - | Vendor | - | Web |
| PATCH | `/api/vendors/[id]` | NextAuth session | - | Vendor | - | Web |
| DELETE | `/api/vendors/[id]/contacts` | NextAuth session | - | VendorContact | - | Web |
| GET | `/api/vendors/[id]/contacts` | NextAuth session | - | VendorContact | - | Web |
| POST | `/api/vendors/[id]/contacts` | NextAuth session | - | VendorContact | - | Web |
| POST | `/api/vendors/[id]/gst-verify` | NextAuth session | - | Vendor | - | Web |
| GET | `/api/vendors/[id]/payments` | NextAuth session | - | VendorPayment | - | Web |
| POST | `/api/vendors/[id]/payments` | NextAuth session | - | VendorPayment | - | Web |
| GET | `/api/vendors/[id]/ratings` | NextAuth session | - | VendorRating | - | Web |
| POST | `/api/vendors/[id]/ratings` | NextAuth session | - | VendorRating | - | Web |
| PATCH | `/api/vendors/[id]/status` | NextAuth session | - | Vendor | - | Web |

### Files & uploads

10 handlers, 1 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| GET | `/api/files/[id]` | Cookie or JWT | ADMIN, SUPER_ADMIN, DEALER | Dealer, DealerDocument, ProductImage, User | - | Web |
| GET | `/api/files/signed/[id]` | Cookie or JWT | DEALER, ADMIN, SUPER_ADMIN | Dealer, DealerDocument, User | - | **Mobile** |
| POST | `/api/upload` | NextAuth session | ADMIN, SUPER_ADMIN | - | - | Web |
| DELETE | `/api/upload/[id]` | NextAuth session | ADMIN, SUPER_ADMIN | DealerDocument, ProductImage | - | Web |
| POST | `/api/upload/company-asset` | NextAuth session | ADMIN, SUPER_ADMIN | - | - | Web |
| POST | `/api/upload/dealer-document` | Cookie or JWT | DEALER | Dealer, DealerDocument, User | - | Web |
| POST | `/api/upload/payment-screenshot` | Cookie or JWT | DEALER | User | - | Web |
| POST | `/api/upload/product-image` | NextAuth session | ADMIN, SUPER_ADMIN | - | - | Web |
| POST | `/api/upload/vehicle-image` | Admin (ADMIN/SUPER_ADMIN) | - | - | - | Web |
| POST | `/api/upload/vehicle-type-image` | Admin (ADMIN/SUPER_ADMIN) | - | - | - | Web |

### Contact, health, dev

5 handlers, 1 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| POST | `/api/contact` | Public · rate-limited | - | - | User | **Mobile** |
| POST | `/api/dev/whatsapp-order-test` | NextAuth session | ADMIN, SUPER_ADMIN | - | Order | Web |
| GET | `/api/health` | Public | - | (raw SQL) | - | Web |
| GET | `/api/health/live` | Public | - | - | - | Web |
| GET | `/api/health/ready` | Public | - | (raw SQL) | - | Web |

### Admin: dealers, payments, refunds, users, settings, shipments, stats, reviews, schemes

34 handlers, 0 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| GET | `/api/admin/dealers` | NextAuth session | ADMIN, SUPER_ADMIN | Dealer | - | Web |
| PATCH | `/api/admin/dealers/[id]` | NextAuth session | ADMIN, SUPER_ADMIN | Dealer | - | Web |
| POST | `/api/admin/dealers/[id]/gst-verify` | NextAuth session | - | Dealer | - | Web |
| POST | `/api/admin/dealers/[id]/request-documents` | NextAuth session | - | Dealer | - | Web |
| GET | `/api/admin/payments` | NextAuth session | - | PaymentSubmission | - | Web |
| POST | `/api/admin/payments/[id]/reject` | NextAuth session | - | Order, PaymentSubmission | - | Web |
| POST | `/api/admin/payments/[id]/review` | NextAuth session | - | PaymentSubmission | - | Web |
| POST | `/api/admin/payments/[id]/verify` | NextAuth session | - | Order, PaymentSubmission | DeviceToken, Invoice, OrderEvent, ProductVariant | Web |
| POST | `/api/admin/refunds/[id]/retry` | NextAuth session | - | OrderCancellation | - | Web |
| GET | `/api/admin/reviews` | Admin (ADMIN/SUPER_ADMIN) | - | Review | - | Web |
| DELETE | `/api/admin/reviews/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | Review | - | Web |
| PATCH | `/api/admin/reviews/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | Review | - | Web |
| GET | `/api/admin/schemes` | NextAuth session | - | Scheme | - | Web |
| POST | `/api/admin/schemes` | NextAuth session | - | Scheme | - | Web |
| GET | `/api/admin/schemes/[id]` | NextAuth session | - | Scheme | - | Web |
| PATCH | `/api/admin/schemes/[id]` | NextAuth session | - | Scheme, SchemeCategory | - | Web |
| GET | `/api/admin/schemes/redemptions` | NextAuth session | - | SchemeRedemption | - | Web |
| GET | `/api/admin/settings` | NextAuth session | ADMIN, SUPER_ADMIN | Setting | - | Web |
| PUT | `/api/admin/settings` | NextAuth session | ADMIN, SUPER_ADMIN | Setting | - | Web |
| GET | `/api/admin/settings/cancellation-policy` | PUBLIC by design (checkout + /cancellation-policy page read it) | - | - | CancellationPolicy, Setting | Web |
| POST | `/api/admin/settings/cancellation-policy` | NextAuth session | - | CancellationPolicy | Setting | Web |
| GET | `/api/admin/settings/upi` | PUBLIC by design (returns bank + UPI details; see Findings) | - | Setting | - | Web |
| POST | `/api/admin/settings/upi` | NextAuth session | - | Setting | - | Web |
| GET | `/api/admin/settings/verification` | NextAuth session | - | - | Setting | Web |
| POST | `/api/admin/settings/verification` | NextAuth session | SUPER_ADMIN | - | Setting | Web |
| GET | `/api/admin/shipments` | NextAuth session | ADMIN, SUPER_ADMIN | Shipment | - | Web |
| POST | `/api/admin/shipments` | NextAuth session | ADMIN, SUPER_ADMIN | - | - | Web |
| GET | `/api/admin/stats` | NextAuth session | ADMIN, SUPER_ADMIN | Dealer, Order, Payment, Product | - | Web |
| POST | `/api/admin/test-email` | NextAuth session · rate-limited | ADMIN, SUPER_ADMIN | - | User | Web |
| GET | `/api/admin/users/[id]` | NextAuth session | - | User | - | Web |
| POST | `/api/admin/users/[id]/disable` | NextAuth session | ADMIN, SUPER_ADMIN | User | UserSession | Web |
| POST | `/api/admin/users/[id]/reset-password` | NextAuth session | ADMIN, SUPER_ADMIN | User | UserSession | Web |
| POST | `/api/admin/users/[id]/unlock-login` | NextAuth session · rate-limited | ADMIN, SUPER_ADMIN | User | - | Web |
| POST | `/api/admin/users/[id]/verify` | NextAuth session | ADMIN, SUPER_ADMIN | User | - | Web |

### Admin: products

16 handlers, 0 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| GET | `/api/admin/products/[id]/compatibility` | Admin (ADMIN/SUPER_ADMIN) | - | ProductCompatibility | - | Web |
| POST | `/api/admin/products/[id]/compatibility` | Admin (ADMIN/SUPER_ADMIN) | - | ProductCompatibility | - | Web |
| DELETE | `/api/admin/products/[id]/compatibility/[compatId]` | Admin (ADMIN/SUPER_ADMIN) | - | ProductCompatibility | - | Web |
| PATCH | `/api/admin/products/[id]/compatibility/[compatId]` | Admin (ADMIN/SUPER_ADMIN) | - | ProductCompatibility | - | Web |
| GET | `/api/admin/products/[id]/model-images` | NextAuth session | ADMIN, SUPER_ADMIN | - | - | Web |
| PUT | `/api/admin/products/[id]/model-images` | NextAuth session | ADMIN, SUPER_ADMIN | - | - | Web |
| GET | `/api/admin/products/[id]/variants` | Admin (ADMIN/SUPER_ADMIN) | - | - | - | Web |
| POST | `/api/admin/products/[id]/variants` | Admin (ADMIN/SUPER_ADMIN) | - | Product | - | Web |
| DELETE | `/api/admin/products/[id]/variants/[variantId]` | Admin (ADMIN/SUPER_ADMIN) | - | ProductVariant | - | Web |
| PATCH | `/api/admin/products/[id]/variants/[variantId]` | Admin (ADMIN/SUPER_ADMIN) | - | ProductVariant | - | Web |
| GET | `/api/admin/products/auto-groups` | NextAuth session | ADMIN, SUPER_ADMIN | - | - | Web |
| PATCH | `/api/admin/products/bulk-stock-status` | NextAuth session | ADMIN, SUPER_ADMIN | Product | - | Web |
| GET | `/api/admin/products/consolidate` | NextAuth session | ADMIN, SUPER_ADMIN | Product | - | Web |
| POST | `/api/admin/products/consolidate` | NextAuth session | ADMIN, SUPER_ADMIN | Product, ProductVariant | - | Web |
| POST | `/api/admin/products/import` | NextAuth session | ADMIN, SUPER_ADMIN | - | Category, Product, ProductImage | Web |
| GET | `/api/admin/products/import/template` | NextAuth session | ADMIN, SUPER_ADMIN | - | Category, Product, ProductImage | Web |

### Admin: vehicles & vehicle types

67 handlers, 0 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| GET | `/api/admin/vehicle-types` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleType | - | Web |
| PATCH | `/api/admin/vehicle-types/[category]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleType | - | Web |
| GET | `/api/admin/vehicles` | Admin (ADMIN/SUPER_ADMIN) | - | Vehicle | - | Web |
| POST | `/api/admin/vehicles` | Admin (ADMIN/SUPER_ADMIN) | - | Vehicle | - | Web |
| DELETE | `/api/admin/vehicles/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | Vehicle | - | Web |
| GET | `/api/admin/vehicles/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | Vehicle | - | Web |
| PATCH | `/api/admin/vehicles/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | Vehicle | - | Web |
| GET | `/api/admin/vehicles/[id]/accessories` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleAccessory | - | Web |
| POST | `/api/admin/vehicles/[id]/accessories` | Admin (ADMIN/SUPER_ADMIN) | - | Product, VehicleAccessory | - | Web |
| DELETE | `/api/admin/vehicles/[id]/accessories/[accessoryId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleAccessory | - | Web |
| PATCH | `/api/admin/vehicles/[id]/accessories/[accessoryId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleAccessory | - | Web |
| GET | `/api/admin/vehicles/[id]/colors` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleColor | - | Web |
| POST | `/api/admin/vehicles/[id]/colors` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleColor | - | Web |
| DELETE | `/api/admin/vehicles/[id]/colors/[colorId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleColor | - | Web |
| PATCH | `/api/admin/vehicles/[id]/colors/[colorId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleColor | - | Web |
| GET | `/api/admin/vehicles/[id]/diagrams` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDiagram | - | Web |
| POST | `/api/admin/vehicles/[id]/diagrams` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDiagram | - | Web |
| DELETE | `/api/admin/vehicles/[id]/diagrams/[diagramId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDiagram | - | Web |
| PATCH | `/api/admin/vehicles/[id]/diagrams/[diagramId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDiagram | - | Web |
| GET | `/api/admin/vehicles/[id]/diagrams/[diagramId]/hotspots` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDiagramHotspot | - | Web |
| POST | `/api/admin/vehicles/[id]/diagrams/[diagramId]/hotspots` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDiagramHotspot | - | Web |
| DELETE | `/api/admin/vehicles/[id]/diagrams/[diagramId]/hotspots/[hotspotId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDiagramHotspot | - | Web |
| PATCH | `/api/admin/vehicles/[id]/diagrams/[diagramId]/hotspots/[hotspotId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDiagramHotspot | - | Web |
| GET | `/api/admin/vehicles/[id]/faqs` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleFAQ | - | Web |
| POST | `/api/admin/vehicles/[id]/faqs` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleFAQ | - | Web |
| DELETE | `/api/admin/vehicles/[id]/faqs/[faqId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleFAQ | - | Web |
| PATCH | `/api/admin/vehicles/[id]/faqs/[faqId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleFAQ | - | Web |
| GET | `/api/admin/vehicles/[id]/gallery` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleGallery | - | Web |
| POST | `/api/admin/vehicles/[id]/gallery` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleGallery | - | Web |
| DELETE | `/api/admin/vehicles/[id]/gallery/[imageId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleGallery | - | Web |
| PATCH | `/api/admin/vehicles/[id]/gallery/[imageId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleGallery | - | Web |
| GET | `/api/admin/vehicles/[id]/generations` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleGeneration | - | Web |
| POST | `/api/admin/vehicles/[id]/generations` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleGeneration | - | Web |
| DELETE | `/api/admin/vehicles/[id]/generations/[genId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleGeneration | - | Web |
| PATCH | `/api/admin/vehicles/[id]/generations/[genId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleGeneration | - | Web |
| GET | `/api/admin/vehicles/[id]/recommendations` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleProductRecommendation | - | Web |
| POST | `/api/admin/vehicles/[id]/recommendations` | Admin (ADMIN/SUPER_ADMIN) | - | Product, VehicleProductRecommendation | - | Web |
| DELETE | `/api/admin/vehicles/[id]/recommendations/[recId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleProductRecommendation | - | Web |
| PATCH | `/api/admin/vehicles/[id]/recommendations/[recId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleProductRecommendation | - | Web |
| GET | `/api/admin/vehicles/[id]/spins` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleSpin | - | Web |
| POST | `/api/admin/vehicles/[id]/spins` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleSpin | - | Web |
| DELETE | `/api/admin/vehicles/[id]/spins/[spinId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleSpin | - | Web |
| PATCH | `/api/admin/vehicles/[id]/spins/[spinId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleSpin | - | Web |
| GET | `/api/admin/vehicles/[id]/variants` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleVariant | - | Web |
| POST | `/api/admin/vehicles/[id]/variants` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleVariant | - | Web |
| DELETE | `/api/admin/vehicles/[id]/variants/[variantId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleVariant | - | Web |
| PATCH | `/api/admin/vehicles/[id]/variants/[variantId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleVariant | - | Web |
| GET | `/api/admin/vehicles/[id]/vin-patterns` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleVinPattern | - | Web |
| POST | `/api/admin/vehicles/[id]/vin-patterns` | Admin (ADMIN/SUPER_ADMIN) | - | Vehicle, VehicleVinPattern | - | Web |
| DELETE | `/api/admin/vehicles/[id]/vin-patterns/[vinId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleVinPattern | - | Web |
| PATCH | `/api/admin/vehicles/[id]/vin-patterns/[vinId]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleVinPattern | - | Web |
| GET | `/api/admin/vehicles/detection-log` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDetectionLog | - | Web |
| PATCH | `/api/admin/vehicles/detection-log/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleDetectionLog | - | Web |
| GET | `/api/admin/vehicles/manufacturers` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleManufacturer | - | Web |
| POST | `/api/admin/vehicles/manufacturers` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleManufacturer | - | Web |
| DELETE | `/api/admin/vehicles/manufacturers/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleManufacturer | - | Web |
| GET | `/api/admin/vehicles/manufacturers/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleManufacturer | - | Web |
| PATCH | `/api/admin/vehicles/manufacturers/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | VehicleManufacturer | - | Web |
| GET | `/api/admin/vehicles/manufacturers/[id]/colors` | Admin (ADMIN/SUPER_ADMIN) | - | OemColor | - | Web |
| POST | `/api/admin/vehicles/manufacturers/[id]/colors` | Admin (ADMIN/SUPER_ADMIN) | - | OemColor | - | Web |
| DELETE | `/api/admin/vehicles/manufacturers/[id]/colors/[colorId]` | Admin (ADMIN/SUPER_ADMIN) | - | OemColor | - | Web |
| PATCH | `/api/admin/vehicles/manufacturers/[id]/colors/[colorId]` | Admin (ADMIN/SUPER_ADMIN) | - | OemColor | - | Web |
| GET | `/api/admin/vehicles/options` | Admin (ADMIN/SUPER_ADMIN) | - | Vehicle, VehicleManufacturer, VehiclePartSection | - | Web |
| GET | `/api/admin/vehicles/sections` | Admin (ADMIN/SUPER_ADMIN) | - | VehiclePartSection | - | Web |
| POST | `/api/admin/vehicles/sections` | Admin (ADMIN/SUPER_ADMIN) | - | VehiclePartSection | - | Web |
| DELETE | `/api/admin/vehicles/sections/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | VehiclePartSection | - | Web |
| PATCH | `/api/admin/vehicles/sections/[id]` | Admin (ADMIN/SUPER_ADMIN) | - | VehiclePartSection | - | Web |

### Admin/staff management

7 handlers, 0 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| POST | `/api/admins` | NextAuth session | SUPER_ADMIN, ADMIN | Admin, User | - | Web |
| DELETE | `/api/admins/[id]` | NextAuth session | - | Admin, User | - | Web |
| PATCH | `/api/admins/[id]` | NextAuth session | SUPER_ADMIN, ADMIN | Admin, User | - | Web |
| GET | `/api/staff` | NextAuth session | STAFF | User | - | Web |
| POST | `/api/staff` | NextAuth session | STAFF | User | - | Web |
| DELETE | `/api/staff/[id]` | NextAuth session | STAFF | User | - | Web |
| PATCH | `/api/staff/[id]` | NextAuth session | STAFF | User | - | Web |

### CRM

8 handlers, 0 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| GET | `/api/crm/leads` | NextAuth session | STAFF dept: crm | Lead | - | Web |
| POST | `/api/crm/leads` | NextAuth session | STAFF dept: crm | Lead, LeadNote | - | Web |
| GET | `/api/crm/leads/[id]` | NextAuth session | STAFF dept: crm | Lead | - | Web |
| PATCH | `/api/crm/leads/[id]` | NextAuth session | STAFF dept: crm | Lead | - | Web |
| POST | `/api/crm/leads/[id]/activities` | NextAuth session | STAFF dept: crm | Lead, LeadActivity | - | Web |
| POST | `/api/crm/leads/[id]/convert` | NextAuth session | DEALER | Lead, LeadActivity, User | - | Web |
| POST | `/api/crm/leads/[id]/notes` | NextAuth session | STAFF dept: crm | LeadNote | - | Web |
| GET | `/api/crm/stats` | NextAuth session | STAFF dept: crm | Lead, LeadActivity | - | Web |

### Procurement

10 handlers, 0 mobile-facing.

| Method | Path | Auth | Roles referenced | Models (direct) | +lib | Surface |
|---|---|---|---|---|---|---|
| GET | `/api/procurement/grn` | NextAuth session | - | GoodsReceivedNote | - | Web |
| POST | `/api/procurement/grn` | NextAuth session | - | GoodsReceivedNote, PurchaseOrder | - | Web |
| GET | `/api/procurement/purchase-orders` | NextAuth session | - | PurchaseOrder | - | Web |
| POST | `/api/procurement/purchase-orders` | NextAuth session | - | PurchaseOrder, PurchaseRequest | - | Web |
| GET | `/api/procurement/purchase-orders/[id]` | NextAuth session | - | PurchaseOrder | - | Web |
| PATCH | `/api/procurement/purchase-orders/[id]` | NextAuth session | - | PurchaseOrder | - | Web |
| GET | `/api/procurement/requests` | NextAuth session | - | PurchaseRequest | - | Web |
| POST | `/api/procurement/requests` | NextAuth session | - | PurchaseRequest | - | Web |
| GET | `/api/procurement/requests/[id]` | NextAuth session | - | PurchaseRequest | - | Web |
| PATCH | `/api/procurement/requests/[id]` | NextAuth session | - | PurchaseRequest | - | Web |

---

## 2. Tests and what they cover

44 test files, 415 cases (Vitest). **Every test is a lib-level unit test. None calls a route handler, none checks an HTTP status or JSON body, and none runs against a real database** (those marked *mocks DB* stub `@/lib/prisma`). So there is no existing executable spec of the API contract: parity tests for the Java port have to be written, not ported.

### Orders / refunds / payments

| Test file | Cases | Covers | Routes that depend on the covered code | DB |
|---|---|---|---|---|
| `orders/cancellation-gate.b2b.test.ts` | 3 | orders/cancellation-gate (B2B branch only) | `orders/[id]/cancel`, `orders/[id]/cancellation-preview` | mocked |
| `orders/cancellation.test.ts` | 30 | orders/cancellation | `orders/[id]/cancel` | none |
| `payments/balances.test.ts` | 3 | payments/balances | `admin/payments/[id]/verify` | none |
| `payments/finalize.test.ts` | 4 | payments/finalize | `payments/verify`, `webhooks/razorpay` | mocked |

### Pricing / GST / schemes

| Test file | Cases | Covers | Routes that depend on the covered code | DB |
|---|---|---|---|---|
| `__tests__/golden-b2b-order.test.ts` | 5 | pricing/compute + shipping/quote + utils (end-to-end B2B order total) | `orders` | none |
| `__tests__/golden-b2c-pricing.test.ts` | 3 | pricing/compute + utils (B2C total) | `orders` | none |
| `pricing/channel.test.ts` | 4 | pricing/channel | (none directly; used by libs) | none |
| `pricing/public-visibility.test.ts` | 4 | pricing/public-visibility | `products`, `products/[id]` | none |
| `pricing/resolve.test.ts` | 6 | pricing/resolve | `cart`, `orders` | none |
| `schemes/adjustment.test.ts` | 17 | schemes/adjustment | `orders/[id]/cancel` | none |
| `schemes/cart-validation.test.ts` | 11 | schemes/cart-validation | `cart`, `cart/scheme`, `orders` | mocked |
| `schemes/pricing.test.ts` | 14 | schemes/pricing | `schemes/eligible` | none |
| `tax/gst-split.test.ts` | 8 | tax/gst-split | `orders` | none |
| `tax/seller-state.test.ts` | 4 | tax/seller-state | `orders` | mocked |
| `tax/state-codes.test.ts` | 6 | tax/state-codes | (none directly; used by libs) | none |

### Auth / identity

| Test file | Cases | Covers | Routes that depend on the covered code | DB |
|---|---|---|---|---|
| `auth/credentials.test.ts` | 8 | auth/credentials | `auth/login`, `mobile/auth/login` | mocked |
| `auth/jwt.test.ts` | 9 | auth/jwt | `auth/logout`, `auth/logout-all`, `auth/refresh` | none |
| `auth/login-rate-limit.test.ts` | 5 | auth/login-rate-limit | (none directly; used by libs) | mocked |
| `auth/middleware.test.ts` | 6 | auth/middleware | (none directly; used by libs) | mocked |
| `auth/otp.test.ts` | 13 | auth/otp | `auth/change-email`, `auth/customer/register`, `auth/forgot-password`, `auth/login-otp`, `auth/register`, `auth/send-email-verification` +7 | mocked |
| `auth/password-policy.test.ts` | 14 | auth/password-policy | (none directly; used by libs) | none |
| `auth/rate-limit.test.ts` | 10 | auth/rate-limit | (none directly; used by libs) | none |
| `phone.test.ts` | 15 | phone | (none directly; used by libs) | none |

### Shipping carriers

| Test file | Cases | Covers | Routes that depend on the covered code | DB |
|---|---|---|---|---|
| `delhivery/auto-pickup.test.ts` | 12 | delhivery/auto-pickup | (none directly; used by libs) | mocked |
| `delhivery/auto-shipment.test.ts` | 7 | delhivery/auto-shipment | (none directly; used by libs) | mocked |
| `delhivery/b2b/api.test.ts` | 30 | delhivery/b2b/api | (none directly; used by libs) | none |
| `delhivery/b2b/auth.test.ts` | 16 | delhivery/b2b/auth | (none directly; used by libs) | none |
| `delhivery/b2b/shipment.test.ts` | 10 | delhivery/b2b/shipment | (none directly; used by libs) | mocked |
| `delhivery/cancel.test.ts` | 6 | delhivery/cancel | (none directly; used by libs) | none |
| `delhivery/carrier-cancellation.test.ts` | 7 | delhivery/carrier-cancellation | (none directly; used by libs) | none |
| `delhivery/carrier-status.test.ts` | 10 | delhivery/carrier-status | (none directly; used by libs) | none |
| `delhivery/config.test.ts` | 4 | delhivery/config | (none directly; used by libs) | none |
| `delhivery/pickup-day.test.ts` | 8 | delhivery/pickup-day | (none directly; used by libs) | mocked |
| `delhivery/pickup.test.ts` | 13 | delhivery/pickup | (none directly; used by libs) | mocked |
| `delhivery/provider.test.ts` | 7 | delhivery/provider | (none directly; used by libs) | mocked |
| `delhivery/serviceability.test.ts` | 9 | delhivery/serviceability | (none directly; used by libs) | none |
| `delhivery/shipment.test.ts` | 15 | delhivery/shipment | (none directly; used by libs) | mocked |
| `delhivery/tracking.test.ts` | 11 | delhivery/tracking | (none directly; used by libs) | mocked |
| `shiprocket/auth.test.ts` | 9 | shiprocket/auth | (none directly; used by libs) | none |
| `shiprocket/client.test.ts` | 5 | shiprocket/client | (none directly; used by libs) | none |

### Notifications (SMS / WhatsApp)

| Test file | Cases | Covers | Routes that depend on the covered code | DB |
|---|---|---|---|---|
| `sms/index.test.ts` | 7 | sms/index | (none directly; used by libs) | none |
| `sms/providers/whatsapp.test.ts` | 12 | sms/providers/whatsapp | (none directly; used by libs) | none |
| `whatsapp/order-notifications.test.ts` | 10 | whatsapp/order-notifications | (none directly; used by libs) | mocked |
| `whatsapp/send-template.test.ts` | 5 | whatsapp/send-template | (none directly; used by libs) | none |

### Money-logic coverage map

Which routes run which money/auth logic, and whether that logic has a test. **Gap** = no test file for the module (indirect coverage noted).

| Logic | Module | Routes using it | Test status |
|---|---|---|---|
| Order total (subtotal, discount, GST, shipping) | `pricing/compute` | `orders` | Indirect only: 2 golden tests (5 B2B + 3 B2C cases). **Gap**: no unit tests for rounding/discount edge cases |
| Unit price resolution (dealer/B2C tier) | `pricing/resolve` | `cart`, `orders` | Tested (6) |
| Channel / public price visibility | `pricing/public-visibility` | `products`, `products/[id]` | Tested (4); `pricing/channel` tested (4) |
| GST split (CGST/SGST vs IGST) | `tax/gst-split` | `orders` | Tested (8) + `state-codes` (6) |
| Seller state | `tax/seller-state` | `orders` | Tested (4, DB mocked) |
| Shipping quote | `shipping/quote` | `orders` | Indirect only: golden B2B test. **Gap** |
| Scheme validation at cart/checkout | `schemes/cart-validation` | `cart`, `cart/scheme`, `orders` | Tested (11, DB mocked) |
| Scheme pricing | `schemes/pricing` | `schemes/eligible` | Tested (14) |
| Scheme adjustment on cancel/refund | `schemes/adjustment` | `orders/[id]/cancel` | Tested (17) |
| COD availability / confirmation | `orders/cod` | `orders`, `orders/[id]/confirm-cod` | **Gap**: no test |
| Stock reservation / decrement | `orders/stock` | `admin/payments/[id]/verify`, `orders`, `orders/[id]/cancel`, `orders/[id]/confirm-cod`, `payments/verify`, `webhooks/razorpay` | **Gap**: no test (insufficient-stock error path untested) |
| Cancellation charge + refund amount | `orders/cancellation` | `orders/[id]/cancel` | Tested (30), the best-covered money module |
| Cancellation gate (who may cancel when) | `orders/cancellation-gate` | `orders/[id]/cancel`, `orders/[id]/cancellation-preview` | Partial: 3 cases, B2B branch only. **Gap**: B2C / shipped states |
| Cancellation policy (percentages) | `orders/cancellation-policy` | `admin/settings/cancellation-policy`, `orders/[id]/cancel` | **Gap**: no test |
| Payment finalisation (idempotent mark-paid) | `payments/finalize` | `payments/verify`, `webhooks/razorpay` | Tested (4, DB mocked) |
| Payment balances (partial / advance) | `payments/balances` | `admin/payments/[id]/verify` | Tested (3) |
| Razorpay client (create order, signature, refund) | `razorpay` | `admin/refunds/[id]/retry`, `orders/[id]/cancel`, `payments/create-order`, `payments/verify` | **Gap**: no test |
| Invoice creation | `invoicing/create-invoice` | `admin/payments/[id]/verify` | **Gap**: no test |
| Razorpay webhook (signature, event routing, refund events) | route `webhooks/razorpay` | itself | **Gap**: no test |
| Refund retry | route `admin/refunds/[id]/retry` | itself | **Gap**: no test |
| Session create / rotate / revoke | `auth/session` | see usage | **Gap**: no test (refresh-token rotation is what mobile relies on) |
| JWT sign/verify | `auth/jwt` | see usage | Tested (9) |
| Password login | `auth/credentials` | `auth/login`, `mobile/auth/login` | Tested (8, DB mocked) |
| OTP create/verify | `auth/otp` | 13 routes | Tested (13, DB mocked) |
| Rate limiting | `auth/rate-limit`, `rate-limit-budgets` | most public + order routes | `rate-limit` tested (10), `login-rate-limit` (5); `rate-limit-budgets` **Gap** |

## 3. Frontend code that reads the database directly

60 files (54 import `@/lib/prisma` themselves; the rest reach it through `src/lib` helpers) are React Server Components or route-adjacent modules that query data without going through any `/api` route. **Each needs an API endpoint, or must stay on Node with Prisma, before Prisma can be removed.** A further 0 layouts/pages only touch `User`/`UserSession` through `getServerSession(authOptions)`; those need only a session check (see Findings), not a data API.

Server Actions: **none** (`"use server"` does not appear anywhere). `revalidateTag`/`revalidatePath` are used in 20+ admin routes (catalog caches: categories, products, vehicles); a standalone Java API does not invalidate Next's cache, so those tags need an explicit invalidation hook or a short TTL. Only 3 `dynamic`/`revalidate` exports exist, so most pages render per request.

### Public site (SEO pages; cacheable)

| File | Reads (direct) | Reads (via lib) | Notes |
|---|---|---|---|
| `app/(public)/cancellation-policy/page.tsx` | - | CancellationPolicy, Setting | server component; lib: orders/cancellation-policy |
| `app/(public)/products/[slug]/page.tsx` | Product, Vehicle, VehiclePartSection, VehicleVariant | (raw SQL), Category, ProductCompatibility, Review, VehicleAccessory, VehicleFAQ, VehicleManufacturer, VehicleProductRecommendation | server component; lib: vehicle/compatibility, catalog/queries |
| `app/(public)/products/page.tsx` | - | (raw SQL), Category, Product, ProductCompatibility, Review, Vehicle, VehicleAccessory, VehicleFAQ, … | server component; lib: catalog/queries |
| `app/(public)/terms/page.tsx` | - | CancellationPolicy, Setting | server component; lib: legal-settings, orders/cancellation-policy |
| `app/(public)/vehicles/[category]/[slug]/page.tsx` | Vehicle | (raw SQL), Category, Product, ProductCompatibility, Review, VehicleAccessory, VehicleFAQ, VehicleManufacturer, … | server component; lib: catalog/queries |
| `app/(public)/vehicles/[category]/page.tsx` | - | (raw SQL), Category, Product, ProductCompatibility, Review, Vehicle, VehicleAccessory, VehicleFAQ, … | server component; lib: catalog/queries |
| `app/(public)/vehicles/page.tsx` | Vehicle, VehicleType | - | server component |

### Public site: /[brand]/[vehicle]/[category]

| File | Reads (direct) | Reads (via lib) | Notes |
|---|---|---|---|
| `app/[brand]/[vehicle]/[category]/page.tsx` | - | (raw SQL), Category, Product, ProductCompatibility, Review, Vehicle, VehicleAccessory, VehicleFAQ, … | server component; lib: catalog/queries |

### Shared components

| File | Reads (direct) | Reads (via lib) | Notes |
|---|---|---|---|
| `components/products/related-products.tsx` | - | (raw SQL), Category, Product, ProductCompatibility, Review, Vehicle, VehicleAccessory, VehicleFAQ, … | server component; lib: vehicle/compatibility, catalog/queries |

### Root (sitemap)

| File | Reads (direct) | Reads (via lib) | Notes |
|---|---|---|---|
| `app/sitemap.ts` | Product | - | server component |

### Customer portal (/account)

| File | Reads (direct) | Reads (via lib) | Notes |
|---|---|---|---|
| `app/account/invoices/[id]/page.tsx` | Customer, Invoice | - | server component |
| `app/account/orders/[id]/page.tsx` | Customer, Order | - | server component |
| `app/account/orders/page.tsx` | Customer, Order | - | server component |

### Dealer portal (/dealer)

| File | Reads (direct) | Reads (via lib) | Notes |
|---|---|---|---|
| `app/dealer/dashboard/page.tsx` | CartItem, Dealer, Order, Payment | - | server component |
| `app/dealer/documents/page.tsx` | Dealer | - | server component |
| `app/dealer/invoices/[id]/page.tsx` | Dealer, Invoice | - | server component |
| `app/dealer/invoices/page.tsx` | Dealer, Invoice | - | server component |
| `app/dealer/orders/[id]/page.tsx` | Dealer, Order | - | server component |
| `app/dealer/orders/page.tsx` | Dealer, Order | - | server component |
| `app/dealer/products/page.tsx` | Category, Product | (raw SQL), ProductCompatibility, Vehicle, VehicleVariant | server component; lib: product-search |
| `app/dealer/profile/page.tsx` | Dealer | - | server component |

### Vendor portal (/vendor)

| File | Reads (direct) | Reads (via lib) | Notes |
|---|---|---|---|
| `app/vendor/dashboard/page.tsx` | Vendor | - | server component |
| `app/vendor/payments/page.tsx` | Vendor | - | server component |
| `app/vendor/products/new/page.tsx` | Category, Setting, Vendor | - | server component |
| `app/vendor/products/page.tsx` | Vendor | - | server component |
| `app/vendor/profile/page.tsx` | Vendor | - | server component |
| `app/vendor/purchase-orders/page.tsx` | PurchaseOrder, Vendor | - | server component |

### Admin portal (/admin)

| File | Reads (direct) | Reads (via lib) | Notes |
|---|---|---|---|
| `app/admin/admins/page.tsx` | Admin, User | - | server component |
| `app/admin/crm/leads/[id]/page.tsx` | Lead | - | server component |
| `app/admin/crm/leads/page.tsx` | Lead | - | server component |
| `app/admin/crm/pipeline/page.tsx` | Lead | - | server component |
| `app/admin/dashboard/page.tsx` | Dealer, Order, OrderCancellation, Payment, Product | - | server component |
| `app/admin/dealers/[id]/page.tsx` | Dealer | - | server component |
| `app/admin/dealers/page.tsx` | Dealer | - | server component |
| `app/admin/invoices/[id]/page.tsx` | Invoice | - | server component |
| `app/admin/invoices/page.tsx` | Invoice | - | server component |
| `app/admin/orders/[id]/page.tsx` | Order, User | - | server component |
| `app/admin/orders/page.tsx` | Order | - | server component |
| `app/admin/payments/page.tsx` | PaymentSubmission | - | server component |
| `app/admin/procurement/grn/page.tsx` | GoodsReceivedNote | - | server component |
| `app/admin/procurement/purchase-orders/[id]/page.tsx` | PurchaseOrder | - | server component |
| `app/admin/procurement/purchase-orders/page.tsx` | PurchaseOrder | - | server component |
| `app/admin/procurement/requests/[id]/page.tsx` | PurchaseRequest | - | server component |
| `app/admin/procurement/requests/page.tsx` | PurchaseRequest | - | server component |
| `app/admin/products/[id]/edit/page.tsx` | Category, Product | - | server component |
| `app/admin/products/new/page.tsx` | Category | - | server component |
| `app/admin/products/page.tsx` | Category, Product | (raw SQL), ProductCompatibility, Vehicle, VehicleVariant | server component; lib: product-search |
| `app/admin/refunds/page.tsx` | OrderCancellation | - | server component |
| `app/admin/schemes/[id]/edit/page.tsx` | Category, Scheme | - | server component |
| `app/admin/schemes/new/page.tsx` | Category | - | server component |
| `app/admin/schemes/page.tsx` | Scheme | - | server component |
| `app/admin/schemes/redemptions/page.tsx` | Scheme, SchemeRedemption | - | server component |
| `app/admin/settings/page.tsx` | CancellationPolicy, Product, Setting, User | - | server component; lib: orders/cancellation-policy |
| `app/admin/staff/page.tsx` | User | - | server component |
| `app/admin/vehicles/[id]/edit/page.tsx` | Vehicle, VehicleManufacturer, VehiclePartSection | - | server component |
| `app/admin/vehicles/manufacturers/[id]/page.tsx` | VehicleManufacturer | - | server component |
| `app/admin/vehicles/new/page.tsx` | VehicleManufacturer | - | server component |
| `app/admin/vehicles/page.tsx` | Vehicle | - | server component |
| `app/admin/vendors/[id]/page.tsx` | Vendor | - | server component |
| `app/admin/vendors/page.tsx` | Vendor | - | server component |

### Shared server-side modules that hide DB reads from pages

These are imported by pages and also by routes, so they are the natural seam for a Java API: `lib/catalog/queries` (public product/vehicle listing and detail, includes raw SQL), `lib/vehicle/compatibility`, `lib/product-search` (raw SQL search), `lib/orders/cancellation-policy`, `lib/legal-settings`, `lib/store/products`.

---

## 4. Schema → JPA entity plan (for review before any Java is written)

`prisma/schema.prisma`: **74 models, 36 enums, 826 scalar columns, 16 migrations.** Replaying every migration (tables, columns, enum values, column types) reproduces `schema.prisma` exactly: no missing or extra tables, columns or enum values. *This compares files only. The live/production database has not been inspected (no credentials were used), so `prisma db push` drift there is unverified.*

### Entities (one per model; names and table names identical, no `@map`/`@@map` anywhere)

| Domain | Models |
|---|---|
| Identity & auth (8) | `User`, `Customer`, `LoginHistory`, `OtpCode`, `UserSession`, `Account`, `Session`, `VerificationToken` (composite PK) |
| Accounts (5) | `Dealer`, `DealerDuesEntry`, `DealerDocument`, `Admin`, `DeviceToken` |
| Catalog (9) | `Category`, `Product`, `ProductVariant`, `VariantImage`, `ProductImage`, `Review`, `Setting`, `StorageAuditLog`, `ProductCompatibility` |
| Cart & schemes (6) | `Cart`, `CartItem`, `Scheme`, `SchemeCategory` (composite PK), `SchemeRedemption`, `CancellationPolicy` |
| Orders & payments (10) | `Order`, `OrderItem`, `OrderEvent`, `OrderCancellation`, `OrderItemCancellation`, `Payment`, `PaymentSubmission`, `Invoice`, `Shipment`, `ShipmentTrackingEvent` |
| Shipping (3) | `ShippingRate`, `Warehouse`, `PickupRequest` |
| Vendors & procurement (11) | `Vendor`, `VendorContact`, `VendorDocument`, `VendorRating`, `VendorPayment`, `PurchaseRequest`, `PurchaseRequestItem`, `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceivedNote`, `GoodsReceivedItem` |
| CRM (3) | `Lead`, `LeadActivity`, `LeadNote` |
| Vehicles (19) | `VehicleManufacturer`, `Vehicle`, `VehicleColor`, `VehicleGallery`, `VehicleType`, `VehiclePartSection`, `VehicleGeneration`, `VehicleVariant`, `OemColor`, `VehicleModel3D`, `VehicleSpin`, `VehicleDiagram`, `VehicleDiagramHotspot`, `VehicleVinPattern`, `VehicleDetectionLog`, `VehicleAccessory`, `VehicleProductRecommendation`, `VehicleFAQ`, `VehicleDownload` |

(8 + 5 + 9 + 6 + 10 + 3 + 11 + 3 + 19 = 74.)

Already mapped in `backend-java` (Maven): `User`, `Customer`, `Dealer`, `Vendor`, `Admin`, `LoginHistory`, `UserSession`. 67 remain.

### Money columns (all `double precision` in the DB; map to `BigDecimal`)

- **Order**: `subtotal`, `gstAmount`, `cgstAmount`, `sgstAmount`, `igstAmount`, `grandTotal`, `amountPaid`, `amountDue`, `shippingCost`, `schemeBenefitValue`, `schemeAdjustmentAmount`, `duesCollected`
- **OrderItem**: `unitPrice`, `gstRate`, `gstAmount`, `total`, `schemeDiscountAmount`, `dealerPriceAtOrder`
- **Invoice**: `subtotal`, `gstAmount`, `cgstAmount`, `sgstAmount`, `igstAmount`, `grandTotal`
- **Payment / PaymentSubmission / VendorPayment**: `amount`
- **OrderCancellation / OrderItemCancellation**: `feePercent`, `feeAmount`, `amountPaidAtCancellation`, `refundAmount`, `schemeAdjustmentAmount`
- **CancellationPolicy**: `preShipChargePercent`, `postShipChargePercent`
- **Product / ProductVariant**: `mrp`, `vendorCostPrice`, `gstRate` (**`price` is INTEGER**, whole rupees)
- **Dealer / DealerDuesEntry**: `creditLimit`, `outstandingDues`, `amount`, `balanceAfter`
- **Scheme / SchemeRedemption**: `minOrderValue`, `maxBenefitValue`, `benefitValue`, `itemsValue` (`Scheme.benefitPercent` is a percentage)
- **Procurement**: `PurchaseRequestItem.estimatedUnitPrice`, `PurchaseOrder.{subtotal,taxAmount,grandTotal}`, `PurchaseOrderItem.{unitPrice,gstRate,gstAmount,total}`
- **Other**: `Lead.estimatedValue`, `ShippingRate.{baseRate,perKgRate}`
- **Float but not money**: weights/dimensions (`Product.weight`, `package*`, `Shipment.weight`, `ShippingRate.{min,max,base}Weight`), `Product.markupPercent`, `engineCc`, scores (`VendorRating.*Score`, `confidenceScore`), diagram `x`/`y`. These should stay `Double`.

### Schema mismatches and mapping hazards

| # | Issue | Impact on Java | Proposed handling |
|---|---|---|---|
| 1 | Money is `double precision`, not `numeric` (0 `Decimal` in schema) | `BigDecimal` fields over `float8` columns; values like `0.1+0.2` artefacts may already be stored | Read via `BigDecimal.valueOf(double)`; never `new BigDecimal(double)`. Do **not** change the column type from here (Prisma owns the schema). Needs your decision: migrate to `NUMERIC(12,2)` later via Prisma, or keep float8 |
| 2 | `Product.price` / `ProductVariant.price` are `INTEGER`; `mrp` beside them is `Float` | Mixed scales on one entity | `BigDecimal` scale 0 for price, JSON `499` not `499.00` |
| 3 | JSON number format: Node emits `500`, `499.5`; Jackson emits `500.00` for scale-2 `BigDecimal` | Response diffs on every money field | Custom serializer: `stripTrailingZeros().toPlainString()` as a JSON number; assert in contract tests |
| 4 | Rounding: Node uses `Math.round`/`roundToPaise` on doubles; `HALF_UP` on `BigDecimal` differs for exact halves and negatives | GST, refund and fee calculations can differ by 1 paise | Read `src/lib/utils` + `tax/gst-split` + `orders/cancellation` first; characterization tests before porting |
| 5 | IDs are `String @default(cuid())` (72 models), generated in the Prisma client, **no DB default** | Inserts fail without an id | App-side `Cuid.next()` (already in `backend-java`); entities use assigned ids |
| 6 | `@updatedAt` on 38 fields is client-side only; no DB trigger | Rows written by Java would keep stale `updatedAt` | `@PreUpdate`/Hibernate `@UpdateTimestamp` on all 38 |
| 7 | 36 native PG enum types | Hibernate maps enums as varchar by default and fails on insert | `@JdbcType(PostgreSQLEnumJdbcType.class)` or `@Enumerated(STRING)` + `stringtype=unspecified`; one Java enum per type |
| 8 | 7 `String[]` columns (`Product.images`, `Product.compatibility`, `ShippingRate.states`, `Vehicle.searchAliases/aiLabels/ocrKeywords`, `VehicleSpin.frameUrls`) | Postgres `text[]` | `@JdbcTypeCode(SqlTypes.ARRAY)` with `String[]`/`List<String>` |
| 9 | 2 `Json` columns (`StorageAuditLog.metadata`, `VehicleDetectionLog.alternatives`) | `jsonb` | `@JdbcTypeCode(SqlTypes.JSON)` |
| 10 | `DateTime` = `timestamp(3)` **without** time zone, written as UTC by Prisma | Wrong instants if the JVM or driver applies a zone | `LocalDateTime` in UTC (`Time.utcNow()`), no `hibernate.jdbc.time_zone`; serialise as ISO-8601 with `Z` to match Prisma/JSON |
| 11 | Mixed-case, reserved-word table names (`"User"`, `"Order"`, `"Session"`, `"Account"`) and camelCase columns | Unquoted SQL fails | `globally_quoted_identifiers=true` + `PhysicalNamingStrategyStandardImpl` (already used in `backend-java`) |
| 12 | Composite PKs on `VerificationToken` and `SchemeCategory` | Need `@IdClass`/`@EmbeddedId` | Map explicitly |
| 13 | Implicit many-to-many tables | None found (74 tables = 74 models) | No action |
| 14 | `ddl-auto` must stay `none`; Flyway requested in the brief | Flyway would try to own a schema Prisma already owns | Flyway only for Java-owned objects if any, with `baseline-on-migrate` and an isolated history table, or omit; see open questions |

### Open questions blocking the `/backend` scaffold

1. **Where does `/backend` live, and what happens to `motoxplus-web/backend-java`?** The brief asks for Java 21 + Gradle; `backend-java` is Java 17 + Maven with 7 entities, JWT/session/rate-limit/auth done, and an in-progress catalog port with uncommitted edits (modified 2026-11-05 10:58). Options: (a) continue `backend-java` as is; (b) create `/backend` fresh and port its auth and platform code across; (c) create `/backend` and retire `backend-java`. Two parallel Java backends would double the Prisma-owned schema surface.
2. **Float money columns**: keep `double precision` indefinitely, or schedule a Prisma migration to `NUMERIC` (needs a plan that touches the Node app, which is out of scope for now)?
3. **Live database drift**: may I run a read-only `information_schema` query against the production or staging DB (credentials are in `production.env`; I have not used them)?
4. **Flyway**: confirm whether it should exist at all given Prisma owns the schema.

---

## 5. Suggested port order (mobile first)

Based on the mobile call list and test coverage: auth (done in `backend-java` except OTP/register/reset/mobile/\*), catalog (`products`, `categories`, `vehicles`, `products/search`), dealer (`dealer/account`, `dealer/documents`, `files/signed`), cart and schemes, then orders/payments last because that is where the money modules are and where tests are thinnest (finding 3). Every money route is gated behind characterization tests written against the Node implementation (without modifying it).
