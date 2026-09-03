// Types mirror the real backend responses documented in docs/api.md.
// The response envelope is NOT uniform across endpoints — see docs/api.md §1.

// Mirrors prisma/schema.prisma `UserRole` in motoxplus-web (the source of
// truth) member-for-member. The app only grants access to DEALER — every
// other role authenticates successfully against the backend but is rejected
// by auth/access.ts#canAccessDealerApp. Keeping the full enum (rather than a
// narrowed DEALER-only type) lets the client reason correctly about every
// value the API can actually return, instead of silently widening unknown
// roles to `string`.
export type UserRole =
  | 'GUEST'
  | 'DEALER'
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'VENDOR'
  | 'STAFF'
  | 'SALES'
  | 'SUPPORT'
  | 'PRODUCTION'
  | 'DISPATCH'
  | 'ACCOUNTS'
  | 'MARKETING';

// Mirrors prisma/schema.prisma `DealerStatus` exactly. Only 'ACTIVE' passes
// auth/access.ts#canAccessDealerApp.
export type DealerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  mobileVerified: boolean;
  isActive: boolean;
}

export interface Dealer {
  id: string;
  companyName: string;
  ownerName: string;
  phone: string;
  state: string;
  city: string;
  address: string | null;
  pincode: string | null;
  gstNumber: string | null;
  status: DealerStatus;
  creditLimit: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  dealer: Dealer | null;
}

export interface MeResponse {
  user: AuthUser;
  dealer: Dealer | null;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// Mirrors POST /api/dealer/register (docs/api.md §3) — the recommended
// one-shot dealer signup endpoint. Optional fields left out entirely (not
// sent as empty strings) when the dealer doesn't fill them in.
export interface DealerRegisterPayload {
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  password: string;
  state: string;
  city: string;
  gstNumber?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  companyAddress?: string;
  shopAddress?: string;
  pincode?: string;
}

// Creates a role: DEALER user with a linked Dealer record at status:
// PENDING — the account cannot sign in until an admin approves it (see
// auth/access.ts#canAccessDealerApp). No accessToken/refreshToken here,
// unlike login — registration does not start a session.
export interface DealerRegisterResponse {
  success: true;
  userId: string;
  email: string;
}

export interface ForgotPasswordPayload {
  email?: string;
  mobile?: string;
  method: 'email' | 'mobile';
}

export interface ForgotPasswordResponse {
  message: string;
  userId: string | null;
  method: 'email' | 'mobile';
  expires: number;
}

export interface VerifyForgotPasswordOtpPayload {
  userId: string;
  otp: string;
}

export interface VerifyForgotPasswordOtpResponse {
  resetToken: string;
  userId: string;
  expires: number;
}

export interface ResetPasswordPayload {
  userId: string;
  resetToken: string;
  newPassword: string;
}

export interface SendMobileOtpPayload {
  mobile: string;
}

export interface VerifyMobilePayload {
  otp: string;
}

export interface MessageResponse {
  message: string;
}

export interface SuccessResponse {
  success: true;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { products: number };
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  key: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  partNumber: string;
  description: string | null;
  categoryId: string;
  category: Category;
  price: number;
  mrp: number | null;
  gstRate: number;
  hsnCode: string;
  moq: number;
  stock: number;
  brand: string;
  oemNumber: string | null;
  warranty: string;
  countryOfOrigin: string;
  compatibility: string[];
  isActive: boolean;
  productImages: ProductImage[];
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductSuggestion {
  id: string;
  name: string;
  partNumber: string;
  brand: string;
  categoryName: string;
  imageUrl?: string;
  matchType: 'name' | 'partNumber' | 'compatibility' | 'brand';
}

export interface ProductSearchResponse {
  suggestions: ProductSuggestion[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  label: string;
  sku: string | null;
  price: number;
  isActive: boolean;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: Product;
  variant: ProductVariant | null;
}

export interface Cart {
  id?: string;
  dealerId?: string;
  items: CartItem[];
}

export type PaymentType = 'ADVANCE_20' | 'FULL_100' | 'COD';
// Mirrors prisma OrderStatus exactly. PROCESSING sits between CONFIRMED and
// SHIPPED (still cancellable, pre-shipment); RETURNED is a terminal
// post-delivery state distinct from CANCELLED.
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  variantId: string | null;
  variantLabel: string | null;
  variantSku: string | null;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  dealerId: string;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}

export interface ShipmentEvent {
  status: string;
  location: string;
  activity: string;
  timestamp: string;
}

export interface Shipment {
  id: string;
  waybill: string;
  status: string;
  trackingUrl: string;
  expectedDelivery: string | null;
  updatedAt: string;
  events: ShipmentEvent[];
}

export interface Payment {
  id: string;
  orderId: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  amount: number;
  paymentType: PaymentType;
  status: PaymentStatus;
}

export interface Order {
  id: string;
  orderNumber: string;
  dealerId: string;
  subtotal: number;
  gstAmount: number;
  shippingCost: number;
  grandTotal: number;
  paymentType: PaymentType;
  amountDue: number;
  amountPaid: number;
  notes: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: string | null;
  deliveryName: string | null;
  deliveryPhone: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryPincode: string;
  items: OrderItem[];
  invoice: Invoice | null;
  shipment: Shipment | null;
  payments?: Payment[];
  createdAt: string;
  // Present on GET /api/orders and /api/orders/[id] — true once stock has
  // been decremented for this order (COD immediately; prepaid on payment
  // confirmation). Cancellation restocks and flips this back to false.
  stockReserved: boolean;
}

// --- Order cancellation ---
// Mirrors src/app/api/orders/[id]/cancel + cancellation-preview in
// motoxplus-web exactly. The server is the sole source of truth for these
// numbers — the client never (re)computes a fee, it only displays what the
// preview/cancel endpoints return.
export type CancellationStage = 'PRE_SHIP' | 'POST_SHIP';
export type RefundStatus = 'NOT_APPLICABLE' | 'INITIATED' | 'PROCESSED' | 'FAILED';
export type CancelReasonCode =
  | 'CHANGED_MIND'
  | 'ORDERED_BY_MISTAKE'
  | 'FOUND_BETTER_PRICE'
  | 'DELIVERY_TOO_SLOW'
  | 'OTHER';

// GET .../cancellation-preview always returns 200 — ineligibility is signalled
// in the body via `allowed: false`, not an error status.
export type CancellationPreview =
  | {
      allowed: true;
      stage: CancellationStage;
      chargePercent: number;
      chargeAmount: number;
      grandTotal: number;
      amountPaid: number;
      refundAmount: number;
      waived: boolean;
    }
  | {
      allowed: false;
      grandTotal: number;
      amountPaid: number;
      reason: string;
    };

export interface CancelOrderPayload {
  reason?: string;
  reasonCode?: CancelReasonCode;
  // Stage shown in the confirmation UI (from the preview call). Sent back so
  // the server can reject with 409 if the order moved stage in between,
  // rather than silently charging a fee the dealer never saw.
  expectedStage?: CancellationStage;
}

export interface CancelOrderResponse {
  success: true;
  stage: CancellationStage;
  chargePercent: number;
  chargeAmount: number;
  refundAmount: number;
  refundStatus?: RefundStatus;
  waived: boolean;
}

// 409 body when the order's status changed between preview and confirm.
export interface CancellationStaleResponse {
  error: string;
  preview: CancellationPreview | null;
}

// 422 body when the order simply isn't cancellable (already cancelled,
// delivered, returned, or a shipped COD order).
export interface CancellationBlockedResponse {
  allowed: false;
  reason: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrderPayload {
  paymentType: PaymentType;
  notes?: string;
  deliveryName?: string;
  deliveryPhone?: string;
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPincode: string;
}

export interface CreateOrderResponse {
  order: Order;
  isCOD: boolean;
}

export interface OrderTrackingResponse {
  orderId: string;
  orderNumber: string;
  waybill: string;
  status: string;
  currentLocation: string;
  lastUpdate: string;
  estimatedDelivery: string | null;
  trackingUrl: string;
  events: ShipmentEvent[];
}

// payments/create-order uses the { data } / { error, code } envelope — the only endpoint that does.
export interface Envelope<T> {
  data: T;
}

export interface EnvelopeError {
  error: string;
  code?: string;
}

export interface CreateRazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: 'INR';
  keyId: string;
  orderNumber: string;
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  orderId: string;
}

export interface VerifyPaymentResponse {
  success: true;
  invoiceNumber: string;
}

export interface DealerAccount {
  ownerName: string;
  phone: string;
  address: string | null;
  city: string;
  state: string;
  pincode: string | null;
}

// DELETE /api/dealer/account re-authenticates with the current password
// rather than trusting a long-lived session alone (see backend comment on
// that route) — a bare Bearer token is not enough to destroy the account.
export interface DeleteAccountPayload {
  password: string;
}

export interface ShippingServiceabilityResponse {
  serviceable: boolean;
  [key: string]: unknown;
}

export interface ShippingEstimatePayload {
  destinationPincode: string;
  weightKg: number;
  paymentMode?: 'Prepaid' | 'COD';
  codAmount?: number;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

// --- Direct UPI / bank transfer payment ---
// The only online payment path that actually works from the app today —
// Razorpay is disabled server-side (NEXT_PUBLIC_RAZORPAY_ENABLED=false) and
// react-native-razorpay isn't installed (see constants/features.ts). This is
// a manual proof-of-payment flow: the dealer pays via any UPI app or bank
// transfer using the details shown, then submits the UTR + a screenshot for
// staff to verify.
export type UpiPaymentMethod = 'UPI' | 'BANK_TRANSFER';
export type UpiSubmissionStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface PaymentSubmission {
  id: string;
  orderId: string;
  paymentMethod: UpiPaymentMethod;
  utrNumber: string;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  screenshotUrl: string;
  amount: number;
  status: UpiSubmissionStatus;
  rejectionReason: string | null;
  submittedAt: string;
}

export interface UpiPaymentSettings {
  upiId: string;
  upiName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccountName: string;
  upiEnabled: boolean;
}

export interface UpiOrderDetailsResponse {
  // This endpoint embeds the dealer's most recent payment submission on the
  // order itself, unlike GET /orders and /orders/[id] which never do.
  order: Order & { paymentSubmissions: PaymentSubmission[] };
  paymentSettings: UpiPaymentSettings;
}

export interface UploadPaymentScreenshotResponse {
  url: string;
  key: string;
}

export interface SubmitUpiPaymentPayload {
  orderId: string;
  paymentMethod: UpiPaymentMethod;
  utrNumber: string;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  screenshotUrl: string;
  screenshotKey: string;
}

export interface SubmitUpiPaymentResponse {
  submission: PaymentSubmission;
  message: string;
}

// --- Active sessions ("sign out of all devices" already exists — this adds
// per-session visibility/revocation) ---
export interface UserSessionInfo {
  id: string;
  deviceInfo: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface SessionsResponse {
  sessions: UserSessionInfo[];
  currentSessionId: string;
}

// --- Email verification / change ---
// Backend now hard-requires emailVerified (alongside mobileVerified and
// dealer.status === ACTIVE) before POST /cart, POST /orders, or any payment
// endpoint will succeed — see getVerifiedDealer in motoxplus-web. This isn't
// optional account hygiene; an unverified dealer cannot order at all.
export interface SendEmailVerificationPayload {
  userId?: string;
  email?: string;
}

export interface VerifyEmailPayload {
  userId: string;
  otp: string;
}

export interface ChangeEmailPayload {
  newEmail: string;
}

export interface ChangeEmailResponse {
  message: string;
  userId: string;
}

// GET /api/vehicles — the real vehicle-fitment taxonomy (manufacturer -> model
// -> variant) backing the mobile app's vehicle picker. Reads the same
// VehicleManufacturer/Vehicle/VehicleVariant tables that GET /api/products'
// `vehicle`/`variant` filters match against — `vehicle` expects the model's
// slug, `variant` expects the variant's slug (scoped to that model), not ids.
export interface VehicleTaxonomyVariant {
  id: string;
  slug: string;
  name: string;
  generationName: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  engineCc: number | null;
}

export interface VehicleTaxonomyModel {
  id: string;
  name: string;
  slug: string;
  category: string;
  heroImage: string | null;
  variants: VehicleTaxonomyVariant[];
}

export interface VehicleTaxonomyBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  models: VehicleTaxonomyModel[];
}

export interface VehicleTaxonomyResponse {
  brands: VehicleTaxonomyBrand[];
  updatedAt: string;
}

// --- Push notifications ---
// Mirrors prisma/schema.prisma `DevicePlatform` in motoxplus-web. The app
// registers its Expo push token after login (POST /api/mobile/push-token) and
// removes it on logout (DELETE /api/mobile/push-token). There is no history
// endpoint — pushes are delivered live, not persisted server-side, so
// app/notifications.tsx stays an honest empty state.
export type DevicePlatform = 'IOS' | 'ANDROID';

export interface RegisterPushTokenPayload {
  token: string;
  platform: DevicePlatform;
}

// Data payload attached to every order notification, used for tap-to-navigate.
export interface OrderNotificationData {
  orderId: string;
  orderNumber: string;
  event: 'ORDER_CONFIRMED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED';
  url: string;
}
