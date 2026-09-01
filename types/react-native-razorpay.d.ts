// react-native-razorpay@3.0.0 ships `src/types.ts` but no bundled `.d.ts` and
// no `types` field in its package.json, so TypeScript can't resolve it. This
// declaration mirrors that source (the New Architecture build — `src/newarch`)
// plus the checkout options we actually pass from app/order/[id]/pay.tsx.
declare module 'react-native-razorpay' {
  export interface RazorpayOptions {
    /** Razorpay public Key ID (rzp_live_… / rzp_test_…). Never the secret. */
    key: string;
    /** Amount in the smallest currency unit (paise). String or number. */
    amount: number | string;
    currency?: string;
    name?: string;
    description?: string;
    image?: string;
    /** Razorpay order id from POST /api/payments/create-order. */
    order_id?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
      hide_topbar?: boolean;
    };
    modal?: {
      backdropclose?: boolean;
      escape?: boolean;
      handleback?: boolean;
      confirm_close?: boolean;
      ondismiss?: () => void;
      animation?: boolean;
    };
    retry?: { enabled?: boolean; max_count?: number };
    timeout?: number;
    readonly?: { email?: boolean; contact?: boolean; name?: boolean };
    hidden?: { email?: boolean; contact?: boolean };
    // The SDK accepts more fields than this; keep it open-ended.
    [key: string]: unknown;
  }

  export interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    [key: string]: unknown;
  }

  export interface RazorpayErrorResponse {
    /** Numeric SDK error code. 0 = payment cancelled by user. */
    code: number;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface ExternalWalletData {
    external_wallet: string;
    [key: string]: unknown;
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpaySuccessResponse>;
    onExternalWalletSelection(callback: (data: ExternalWalletData) => void): void;
  };

  export default RazorpayCheckout;
}
