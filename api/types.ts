// Types mirror the real backend responses documented in docs/api.md.
// The response envelope is NOT uniform across endpoints — see docs/api.md §1.

export type UserRole = 'DEALER' | 'ADMIN' | 'SUPER_ADMIN' | 'VENDOR' | 'STAFF';
export type DealerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  // Only returned by POST /mobile/auth/login — GET /mobile/auth/me omits it.
  // Don't default/fabricate this field; treat "unknown" as "don't show a
  // verification banner" rather than guessing true or false.
  emailVerified?: boolean;
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
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

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
