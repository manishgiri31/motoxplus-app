import { apiClient } from '../client';
import type { Category } from '../types';

export const categoryService = {
  list: () => apiClient.get<Category[]>('/categories').then((r) => r.data),
};
