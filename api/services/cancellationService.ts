import { apiClient } from '../client';
import type { CancelOrderPayload, CancelOrderResponse, CancellationPreview } from '../types';

// Mirrors src/app/api/orders/[id]/cancel + cancellation-preview in
// motoxplus-web. The preview call always returns 200 (ineligibility is
// signalled via `allowed: false` in the body); the cancel call can 422
// (not cancellable) or 409 (order moved stage since the preview was shown).
export const cancellationService = {
  getPreview: (orderId: string) =>
    apiClient.get<CancellationPreview>(`/orders/${orderId}/cancellation-preview`).then((r) => r.data),

  cancel: (orderId: string, payload: CancelOrderPayload) =>
    apiClient.post<CancelOrderResponse>(`/orders/${orderId}/cancel`, payload).then((r) => r.data),
};
