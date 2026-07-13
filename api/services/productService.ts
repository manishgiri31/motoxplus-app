import { apiClient } from '../client';
import type { Product, ProductListResponse, ProductSearchResponse } from '../types';

export interface ProductListParams {
  category?: string;
  search?: string;
  vehicle?: string;
  variant?: string;
  section?: string;
  page?: number;
  pageSize?: number;
}

export const productService = {
  list: (params: ProductListParams = {}) =>
    apiClient.get<ProductListResponse>('/products', { params }).then((r) => r.data),

  getById: (id: string) => apiClient.get<Product>(`/products/${id}`).then((r) => r.data),

  search: (q: string) =>
    apiClient.get<ProductSearchResponse>('/products/search', { params: { q } }).then((r) => r.data),
};
