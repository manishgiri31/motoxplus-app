import { apiClient } from '../client';
import type { CancelOrderResponse, CancellationPreview } from '../types';

// STUB: docs/api.md §7 confirms no cancel/return endpoint exists for dealers
// as of the 2026-07-13 backend audit. These call the endpoint shape the
// product spec described, so the client is real and ready to work the
// moment the backend ships it — today they'll fail with a real 404/network
// error, which the UI (CancellationSheet) surfaces honestly rather than faking success.
export const cancellationService = {
  getPreview: (orderId: string) =>
    apiClient.get<CancellationPreview>(`/orders/${orderId}/cancellation-preview`).then((r) => r.data),

  cancel: (orderId: string, payload: { reason?: string }) =>
    apiClient.post<CancelOrderResponse>(`/orders/${orderId}/cancel`, payload).then((r) => r.data),
};
