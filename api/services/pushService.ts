import { apiClient } from '../client';
import type { RegisterPushTokenPayload, SuccessResponse } from '../types';

// Mirrors src/app/api/mobile/push-token in motoxplus-web. Both calls require
// the dealer Bearer token (attached by api/client.ts) and are best-effort —
// the caller (AuthProvider) swallows failures so a flaky network never blocks
// login or logout.
export const pushService = {
  register: (payload: RegisterPushTokenPayload) =>
    apiClient.post<SuccessResponse>('/mobile/push-token', payload).then((r) => r.data),

  // The token is sent in the DELETE body (axios needs `data` for that) so the
  // server can scope the delete to the current dealer.
  unregister: (token: string) =>
    apiClient.delete<SuccessResponse>('/mobile/push-token', { data: { token } }).then((r) => r.data),
};
