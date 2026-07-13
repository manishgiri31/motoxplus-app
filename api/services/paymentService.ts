import { apiClient } from '../client';
import type {
  CreateRazorpayOrderResponse,
  Envelope,
  VerifyPaymentPayload,
  VerifyPaymentResponse,
} from '../types';

export const paymentService = {
  // The only endpoint using the { data } envelope — see docs/api.md §1.
  createRazorpayOrder: (orderId: string) =>
    apiClient
      .post<Envelope<CreateRazorpayOrderResponse>>('/payments/create-order', { orderId })
      .then((r) => r.data.data),

  verify: (payload: VerifyPaymentPayload) =>
    apiClient.post<VerifyPaymentResponse>('/payments/verify', payload).then((r) => r.data),
};
