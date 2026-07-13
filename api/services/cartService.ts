import { apiClient } from '../client';
import type { Cart, SuccessResponse } from '../types';

export interface AddToCartPayload {
  productId: string;
  quantity: number;
  variantId?: string;
}

export const cartService = {
  get: () => apiClient.get<Cart>('/cart').then((r) => r.data),

  // Upsert by product+variant — also used to change an existing item's
  // quantity (send the new absolute quantity, there's no increment endpoint).
  addOrUpdate: (payload: AddToCartPayload) =>
    apiClient.post<SuccessResponse>('/cart', payload).then((r) => r.data),

  removeItem: (itemId: string) =>
    apiClient.delete<SuccessResponse>('/cart', { data: { itemId } }).then((r) => r.data),
};
