import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useCallback, useRef, useState } from 'react';

import { getErrorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { paymentService } from '@/api/services/paymentService';
import type { Order } from '@/api/types';
import { useAuth } from '@/auth/useAuth';
import { colors } from '@/src/theme';
import { normalizeMobileNumber } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

// react-native-razorpay ships no bundled types (see types/react-native-razorpay.d.ts).
// Top-level import matches the official Expo 54 sample; the native module is
// linked in every build channel this app ships on (dev-client / EAS), never
// Expo Go.
import RazorpayCheckout, {
  type RazorpayErrorResponse,
  type RazorpaySuccessResponse,
} from 'react-native-razorpay';

/**
 * The visible states of an in-app Razorpay payment. Drives the copy on
 * app/order/[id]/pay.tsx — never show "successful" before `verified`.
 */
export type RazorpayPhase =
  | 'idle'
  | 'preparing' // POST /payments/create-order
  | 'opening' // native Razorpay sheet is up
  | 'verifying' // POST /payments/verify (server is the source of truth)
  | 'verified' // backend confirmed — safe to show success
  | 'failed'
  | 'cancelled';

export interface RazorpayResult {
  phase: RazorpayPhase;
  /** Human-readable reason, set on 'failed'. */
  error: string | null;
  /** From POST /payments/verify, set on 'verified'. */
  invoiceNumber: string | null;
  /**
   * True once the customer's money has very likely been captured by Razorpay
   * but our backend hasn't confirmed it (verify failed / network dropped).
   * The screen must tell the dealer NOT to pay again and to contact support.
   */
  paidButUnconfirmed: boolean;
}

const INITIAL: RazorpayResult = {
  phase: 'idle',
  error: null,
  invoiceNumber: null,
  paidButUnconfirmed: false,
};

// react-native-razorpay's error `code` for a user-dismissed checkout.
const RAZORPAY_PAYMENT_CANCELLED = 0;

export function useRazorpayPayment() {
  const { user, dealer } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<RazorpayResult>(INITIAL);
  // Hard guard against a double-tap kicking off two create-order → checkout
  // sequences for the same order.
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    inFlight.current = false;
    setState(INITIAL);
  }, []);

  const pay = useCallback(
    async (order: Pick<Order, 'id' | 'orderNumber' | 'amountDue'>) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setState({ ...INITIAL, phase: 'preparing' });

      try {
        // 1. Backend creates the Razorpay order and the pending Payment row.
        //    amount/currency/keyId all come from the server — never the client.
        const rzpOrder = await paymentService.createRazorpayOrder(order.id);

        // 2. Open the native checkout sheet.
        setState((s) => ({ ...s, phase: 'opening' }));

        let paid: RazorpaySuccessResponse;
        try {
          paid = await RazorpayCheckout.open({
            key: rzpOrder.keyId,
            order_id: rzpOrder.razorpayOrderId,
            amount: rzpOrder.amount, // paise, server-computed
            currency: rzpOrder.currency,
            name: 'MotoXPlus India',
            description: `Order ${rzpOrder.orderNumber}`,
            theme: { color: colors.red },
            prefill: {
              name: dealer?.ownerName ?? user?.name ?? undefined,
              email: user?.email ?? undefined,
              contact: normalizeMobileNumber(dealer?.phone) || undefined,
            },
          });
        } catch (sdkError) {
          const err = sdkError as Partial<RazorpayErrorResponse>;
          if (err?.code === RAZORPAY_PAYMENT_CANCELLED) {
            inFlight.current = false;
            setState({ ...INITIAL, phase: 'cancelled' });
            HapticService.warning();
            return;
          }
          inFlight.current = false;
          setState({
            ...INITIAL,
            phase: 'failed',
            error: err?.description || 'The payment could not be completed. Please try again.',
          });
          HapticService.error();
          return;
        }

        // 3. Hand the signed response to the backend. The signature, captured
        //    amount, order match and currency are ALL re-checked server-side
        //    against the pending Payment row before anything is marked paid.
        if (!paid.razorpay_payment_id || !paid.razorpay_order_id || !paid.razorpay_signature) {
          inFlight.current = false;
          setState({
            ...INITIAL,
            phase: 'failed',
            error: 'Payment response was incomplete. If money was debited, contact support before retrying.',
            paidButUnconfirmed: true,
          });
          HapticService.error();
          return;
        }

        setState((s) => ({ ...s, phase: 'verifying' }));
        try {
          const { invoiceNumber } = await paymentService.verify({
            razorpayOrderId: paid.razorpay_order_id,
            razorpayPaymentId: paid.razorpay_payment_id,
            razorpaySignature: paid.razorpay_signature,
            orderId: order.id,
          });

          // Backend has flipped the order to CONFIRMED + generated the invoice
          // + kicked off the Delhivery shipment. Pull the fresh order state.
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order.id) });
          queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.tracking(order.id) });

          inFlight.current = false;
          setState({ ...INITIAL, phase: 'verified', invoiceNumber });
          HapticService.success();
        } catch (verifyError) {
          // Money is very likely already captured. A 409 means stock ran out
          // after payment (rare); anything else is a verification/transport
          // failure. Either way: do not retry payment, contact support.
          const is409 = isAxiosError(verifyError) && verifyError.response?.status === 409;
          inFlight.current = false;
          setState({
            ...INITIAL,
            phase: 'failed',
            paidButUnconfirmed: true,
            error: is409
              ? getErrorMessage(verifyError)
              : `We couldn't confirm your payment for order ${order.orderNumber}. Your payment is safe — please contact support with this order number and do not pay again.`,
          });
          HapticService.error();
        }
      } catch (createError) {
        // create-order failed (e.g. RAZORPAY_DISABLED, no amount due, network).
        // No checkout was opened, so nothing was charged — safe to retry.
        inFlight.current = false;
        setState({
          ...INITIAL,
          phase: 'failed',
          error: getErrorMessage(createError, 'Could not start the payment. Please try again.'),
        });
      }
    },
    [dealer?.ownerName, dealer?.phone, user?.email, user?.name, queryClient]
  );

  return { ...state, pay, reset };
}
