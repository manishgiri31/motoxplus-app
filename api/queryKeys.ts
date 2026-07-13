import type { ProductListParams } from './services/productService';

export const queryKeys = {
  products: {
    list: (params: ProductListParams) => ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    search: (q: string) => ['products', 'search', q] as const,
  },
  categories: {
    list: () => ['categories', 'list'] as const,
  },
  cart: {
    detail: () => ['cart'] as const,
  },
  orders: {
    list: (page: number) => ['orders', 'list', page] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    tracking: (id: string) => ['orders', 'tracking', id] as const,
  },
  dealer: {
    account: () => ['dealer', 'account'] as const,
  },
  shipping: {
    serviceability: (pincode: string) => ['shipping', 'serviceability', pincode] as const,
  },
};
