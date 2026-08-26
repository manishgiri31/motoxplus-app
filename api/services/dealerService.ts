import { apiClient } from '../client';
import type { DealerAccount, DeleteAccountPayload, SuccessResponse } from '../types';

export const dealerService = {
  getAccount: () => apiClient.get<DealerAccount>('/dealer/account').then((r) => r.data),

  // No PATCH endpoint exists yet — see docs/api.md §10, "Edit Profile" has
  // nothing to save to on the backend.
  // Backend re-authenticates with the current password before destroying the
  // account — see the DeleteAccountPayload comment in api/types.ts.
  deleteAccount: (payload: DeleteAccountPayload) =>
    apiClient.delete<SuccessResponse>('/dealer/account', { data: payload }).then((r) => r.data),
};
