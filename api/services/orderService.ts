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

  create: (payload: CreateOrderPayload) =>
    apiClient.post<CreateOrderResponse>('/orders', payload).then((r) => r.data),

  getById: (id: string) => apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),

  tracking: (id: string) =>
    apiClient.get<OrderTrackingResponse>(`/orders/${id}/tracking`).then((r) => r.data),
};
