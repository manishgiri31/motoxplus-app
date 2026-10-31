import { apiClient } from '../client';
import type { ApplySchemePayload, EligibleSchemesResponse } from '../types';

export const schemeService = {
  // Read-only: which active GST Benefit schemes this cart value qualifies for.
  // `orderValue` is the regular (non-scheme) subtotal excluding GST.
  eligible: (orderValue: number) =>
    apiClient
      .get<EligibleSchemesResponse>('/schemes/eligible', { params: { orderValue } })
      .then((r) => r.data),

  // Full replace, not a merge: the server re-validates the whole selection
  // every call. `schemeId: null` clears the applied scheme.
  apply: (payload: ApplySchemePayload) =>
    apiClient.post<{ success: true; schemeId: string | null }>('/cart/scheme', payload).then((r) => r.data),
};
