import { apiClient } from '../client';
import type { ShippingEstimatePayload, ShippingServiceabilityResponse } from '../types';

export const shippingService = {
  // ⚠️ Not yet patched for the mobile JWT (docs/api.md §9) — still session-only
  // as of this audit, so this call will 401 from the app until the backend is
  // fixed. Checkout should not hard-block on it; POST /orders already returns
  // the authoritative shippingCost once the order is placed.
  estimate: (payload: ShippingEstimatePayload) =>
    apiClient.post('/shipping/estimate', payload).then((r) => r.data),

  serviceability: (pincode: string) =>
    apiClient
      .get<ShippingServiceabilityResponse>('/shipping/serviceability', { params: { pincode } })
      .then((r) => r.data),
};
