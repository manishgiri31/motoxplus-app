import { apiClient } from '../client';
import type { ContactPayload, SuccessResponse } from '../types';

export const contactService = {
  // Emails the enquiry to the MotoXPlus team. Rate-limited per IP (5/min).
  send: (payload: ContactPayload) => apiClient.post<SuccessResponse>('/contact', payload).then((r) => r.data),
};
