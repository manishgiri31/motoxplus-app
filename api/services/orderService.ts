import { IDEMPOTENCY_HEADER } from '../checkoutAttempt';
import { apiClient } from '../client';
import type {
  CreateOrderPayload,
  CreateOrderResponse,
  Order,
  OrderListResponse,
  OrderTrackingResponse,
} from '../types';

export const orderService = {
  list: (page = 1) =>
    apiClient.get<OrderListResponse>('/orders', { params: { page } }).then((r) => r.data),

  // idempotencyKey: see api/checkoutAttempt.ts. The same key on a retry makes
  // the server return the order it already created instead of a duplicate.
  create: (payload: CreateOrderPayload, idempotencyKey: string) =>
    apiClient
      .post<CreateOrderResponse>('/orders', payload, { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } })
      .then((r) => r.data),

  getById: (id: string) => apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),

  tracking: (id: string) =>
    apiClient.get<OrderTrackingResponse>(`/orders/${id}/tracking`).then((r) => r.data),
};
