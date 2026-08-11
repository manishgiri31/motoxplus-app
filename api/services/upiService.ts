import { apiClient } from '../client';
import { env } from '@/config/env';
import type {
  SubmitUpiPaymentPayload,
  SubmitUpiPaymentResponse,
  UpiOrderDetailsResponse,
  UploadPaymentScreenshotResponse,
} from '../types';

export interface LocalImageFile {
  uri: string;
  name: string;
  type: string;
}

export const upiService = {
  // GET /payments/upi/[orderId] — order + dealer-facing bank/UPI settings.
  getOrderDetails: (orderId: string) =>
    apiClient.get<UpiOrderDetailsResponse>(`/payments/upi/${orderId}`).then((r) => r.data),

  // Public, no auth (see docs) — used directly as an <Image> source, but
  // exposed here so every caller builds the same URL shape.
  qrCodeUrl: (amount: number) => `${env.apiUrl}/payments/upi/qr?amount=${encodeURIComponent(amount)}`,

  uploadScreenshot: (orderId: string, file: LocalImageFile) => {
    const formData = new FormData();
    formData.append('orderId', orderId);
    // React Native's FormData accepts { uri, name, type } in place of a Blob —
    // axios/RN's networking layer knows how to stream it as a real file part.
    formData.append('file', file as unknown as Blob);
    return apiClient
      .post<UploadPaymentScreenshotResponse>('/upload/payment-screenshot', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  submitPayment: (payload: SubmitUpiPaymentPayload) =>
    apiClient.post<SubmitUpiPaymentResponse>('/payments/upi/submit', payload).then((r) => r.data),
};
