import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { productService, type ProductListParams } from '../services/productService';

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productService.list(params),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: () => productService.getById(id as string),
    enabled: !!id,
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
