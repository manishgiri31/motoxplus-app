import { apiClient } from '../client';
import type { DealerAccount, SuccessResponse } from '../types';

export const dealerService = {
  getAccount: () => apiClient.get<DealerAccount>('/dealer/account').then((r) => r.data),

  // No PATCH endpoint exists yet — see docs/api.md §10, "Edit Profile" has
  // nothing to save to on the backend.
  deleteAccount: () => apiClient.delete<SuccessResponse>('/dealer/account').then((r) => r.data),
};
