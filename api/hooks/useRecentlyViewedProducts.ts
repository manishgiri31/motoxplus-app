import { useQueries } from '@tanstack/react-query';

import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { queryKeys } from '../queryKeys';
import { productService } from '../services/productService';
import type { Product } from '../types';

/** Resolves the locally-tracked recently-viewed product ids into live Product data. */
export function useRecentlyViewedProducts() {
  const productIds = useRecentlyViewedStore((s) => s.productIds);

  const results = useQueries({
    queries: productIds.map((id) => ({
      queryKey: queryKeys.products.detail(id),
      queryFn: () => productService.getById(id),
      staleTime: 60_000,
    })),
  });

  const products = results
    .map((r) => r.data)
    .filter((p): p is Product => !!p);

  return { products, isLoading: results.some((r) => r.isLoading) };
}
