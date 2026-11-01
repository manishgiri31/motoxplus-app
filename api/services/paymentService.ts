import { apiClient } from '../client';
import type {
  CreateRazorpayOrderResponse,
  Envelope,
  PaymentType,
  VerifyPaymentPayload,
  VerifyPaymentResponse,
} from '../types';

export const paymentService = {
  // The only endpoint using the { data } envelope — see docs/api.md §1.
  // `paymentType` re-chooses Full vs 20% Advance on a still-unpaid order; the
  // server recomputes amountDue from it (never trusts a client amount).
  createRazorpayOrder: (orderId: string, paymentType?: Exclude<PaymentType, 'COD'>) =>
    apiClient
      .post<Envelope<CreateRazorpayOrderResponse>>('/payments/create-order', { orderId, paymentType })
      .then((r) => r.data.data),

  verify: (payload: VerifyPaymentPayload) =>
    apiClient.post<VerifyPaymentResponse>('/payments/verify', payload).then((r) => r.data),
};
