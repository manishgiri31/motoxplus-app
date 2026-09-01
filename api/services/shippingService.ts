import { apiClient } from '../client';
import type { ShippingEstimatePayload, ShippingServiceabilityResponse } from '../types';

export const shippingService = {
  // POST /shipping/estimate — Delhivery rate calculation. Authenticated
  // (Bearer works via the unified resolver). Checkout does NOT hard-block on
  // this: the shipping charge shown is computed client-side by
  // utils/cartTotals and re-computed authoritatively by POST /orders, so a
  // slow/failed estimate never changes what the dealer is billed.
  estimate: (payload: ShippingEstimatePayload) =>
    apiClient.post('/shipping/estimate', payload).then((r) => r.data),

  // GET /shipping/serviceability?pincode=… — public, no auth. Always 200;
  // non-serviceable is signalled in the body, not an error status.
  serviceability: (pincode: string) =>
    apiClient
      .get<ShippingServiceabilityResponse>('/shipping/serviceability', { params: { pincode } })
      .then((r) => r.data),
};
