import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { productService, type ProductListParams } from '../services/productService';

// Catalog data (price/stock aside) changes far less often than cart/orders —
// a longer staleTime here means switching tabs/screens and coming back
// doesn't re-fetch the whole grid, it just reuses the cache.
const CATALOG_STALE_TIME = 2 * 60_000;

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productService.list(params),
    staleTime: CATALOG_STALE_TIME,
  });
}

const PAGE_SIZE = 12;

export function useInfiniteProducts(params: Omit<ProductListParams, 'page' | 'pageSize'> = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.products.list(params), 'infinite'] as const,
    queryFn: ({ pageParam }) => productService.list({ ...params, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: () => productService.getById(id as string),
    enabled: !!id,
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.products.search(query),
    queryFn: () => productService.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}
