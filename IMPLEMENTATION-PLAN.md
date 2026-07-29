# MotoXplus Dealer App — Implementation Plan

Scope: everything from the roadmap **except** Razorpay integration (site verification pending) and mobile OTP verification UI (DLT ID pending). Phases are ordered by dependency — each phase assumes the previous one is merged.

---

## Phase 1 — Stop the bleeding (do first, smallest diffs)

### 1.1 Payment dead-end stopgap (finding #3) — DO NOT SKIP
Razorpay integration is deferred, but the bug is live: choosing any online payment option creates an order that can never be paid in-app.
- Add a config flag `ONLINE_PAYMENTS_ENABLED = false` (constants file or remote config if one exists).
- In the checkout payment-method selector, when the flag is off: hide online options entirely, or show them disabled with a "Coming soon" label. Credit/COD remain.
- Guard the order-creation call server-side too if possible (reject `paymentMethod: online` while flag is off) so stale app versions can't create unpayable orders.
- When Razorpay verification clears later, flipping the flag re-enables the flow.

### 1.2 Forgot-password OTP resend + back navigation (finding #4)
- Add "Resend OTP" with a 30–60s countdown before it becomes tappable.
- Add back navigation (header back + hardware back on Android) from the OTP entry screen to the phone/email entry screen without killing the flow state.

### 1.3 OTP nag softening (optional, since verify screen is deferred)
- Make the "verify your mobile" prompt on Account dismissible, or show it once per session instead of persistently, until the DLT ID arrives and the real verify screen ships.

---

## Phase 2 — Filters (foundation for later UI work)

### 2.1 FilterSheet component + filter state
Mirror the existing `sortProducts.ts` / `SortSheet.tsx` pattern:
- `filterProducts.ts` — pure function taking a product list + filter state.
- `FilterSheet.tsx` — bottom sheet with sections:
  - **Vehicle compatibility** (top of sheet — dealers shop by "what fits this bike"; source values from `Product.compatibility`)
  - Brand (multi-select, derived from result set)
  - Price range (min/max or preset bands)
  - In stock only (toggle)
- Filter state lives alongside sort state (same store/context pattern already used for sort).

### 2.2 Wire filters + sort into Search and Home results
- Category screen: add FilterSheet next to the existing SortSheet trigger.
- Search results: add both sort and filter triggers.
- Home results/listing surfaces: same.

### 2.3 Filter chips + result count
- Header row on Search/Category showing applied filters as removable chips + "N results".
- Tapping a chip removes that filter; "Clear all" chip when 2+ filters active.

---

## Phase 3 — Product card & cart polish (cheap, data already modeled)

### 3.1 Stock/MOQ badges on ProductCard
- MOQ badge (e.g. "MOQ 10") always shown when > 1.
- "Low stock" badge when stock below a threshold; "Out of stock" state if applicable.

### 3.2 Free-delivery progress bar in Cart
- Use existing `FREE_DELIVERY_THRESHOLD`.
- "₹X more for free delivery" + progress bar; success state when crossed.

### 3.3 Credit limit visibility
- Surface `Dealer.creditLimit`, used, and remaining:
  - Compact line in Cart summary.
  - Checkout: warn inline when order total exceeds remaining credit **before** order placement, not after.
  - Optional: small credit widget on Account.

---

## Phase 4 — Dealer repeat-purchase features (the core value adds)

### 4.1 One-tap reorder from order history
- "Reorder" button on OrderDetail and on each order card in history.
- Adds every line item to cart at ordered quantities.
- Handle per line: product discontinued (skip + report), out of stock (skip or add capped), price changed (add at current price, show notice), MOQ changed (bump to new MOQ).
- Show a result summary: "12 items added, 2 unavailable, 1 price changed."

### 4.2 Recently viewed tracking + Home rails
- Track last ~20 viewed product IDs (persisted locally, e.g. AsyncStorage).
- Home screen, above the banner carousel:
  - **"Reorder"** rail — line items from the most recent 1–2 orders (depends on 4.1's add-to-cart logic).
  - **"Recently viewed"** rail.
- Hide rails when empty (new dealer) so Home doesn't regress.

### 4.3 Paste-a-list quick add
- New screen (entry point from Cart and/or Home): multiline text box accepting `SKU, qty` per line (tolerate tabs/spaces/commas as separators).
- Parse → resolve SKUs (MX-prefixed part numbers and OEM numbers if searchable) → preview table with matched/unmatched rows and editable quantities → "Add all to cart".
- Unmatched rows: show inline with a search shortcut to resolve manually.
- CSV file import and photo-of-a-list OCR are v2 — ship text paste first.

### 4.4 Multi-branch delivery profiles
- Extend saved addresses beyond a single default: list, add, edit, delete, label ("Main counter", "Branch 2"), set default.
- Checkout: address picker instead of fixed default.
- Requires backend support for multiple addresses per dealer — check the API first; if it only stores one address, this becomes a backend task before UI.

---

## Phase 5 — New infrastructure (camera + push)

### 5.1 Barcode / OEM-number scanner
- `expo-camera` (barcode scanning API) — new Scan screen, entry points from Search bar and Home.
- On scan: look up by barcode → OEM number → part number, in that order; navigate straight to ProductDetail on single match, to filtered results on multiple.
- Manual-entry fallback field on the scan screen for damaged labels.
- Needs camera permission flow + graceful denial state.

### 5.2 Push notifications
- `expo-notifications`: token registration on login, token sent to backend, stored per dealer/device.
- Backend events to wire (server-side work required):
  - Order status changes (confirmed → dispatched → delivered)
  - Payment-due reminders
  - Low-credit alerts
- In-app: notification permission prompt at a sensible moment (after first order, not on first launch), and a notifications list screen or at least deep-linking from a tap to the relevant order.

### 5.3 Low-stock / restock alerts (depends on 5.2)
- "Notify me" toggle on out-of-stock/low-stock ProductDetail.
- Auto-suggest alerts for frequently-ordered SKUs (from order history).
- Backend: watchlist table + stock-change trigger → push.

---

## Phase 6 — Bigger bets (only after 1–5 are stable)

### 6.1 Spend analytics for dealers
- New "Insights" tab/screen: monthly spend chart, top-ordered parts, credit utilization trend.
- Can be computed client-side from order history initially; move to a backend aggregate endpoint if history pagination makes that slow.

### 6.2 In-app rep chat / support
- Decide build-vs-buy first (e.g. a hosted chat SDK vs. custom + backend). Scope is large; recommend a lightweight v1: a support screen that creates a ticket/message thread, not real-time chat.

### 6.3 Offline draft orders
- Pair with fixing finding #1 (no retry on mutations) — do the mutation retry/queue layer first, then offline drafts fall out of the same queue mechanism.
- Local draft cart persisted; sync + conflict handling (price/stock changes) on reconnect, reusing the reorder reconciliation logic from 4.1.

---

## Suggested Claude Code prompt per phase

Run one phase at a time, e.g.:

> Read IMPLEMENTATION-PLAN.md. Implement Phase 2 only. Follow the existing patterns in sortProducts.ts and SortSheet.tsx for the filter implementation. Don't touch anything from later phases. After implementing, list every file you changed and any backend/API gaps you found.

Deferred (revisit when unblocked):
- Razorpay in-app payment (`react-native-razorpay`) — after site verification. Flip `ONLINE_PAYMENTS_ENABLED` when live.
- Mobile OTP verification screen — after DLT ID; `authService.sendMobileOtp` / `verifyMobile` are already ready server-side.
