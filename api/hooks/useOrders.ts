import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { checkoutAttempt } from '../checkoutAttempt';
import { queryKeys } from '../queryKeys';
import { orderService } from '../services/orderService';
import type { CreateOrderPayload } from '../types';

export function useOrders(page = 1) {
  return useQuery({
    queryKey: queryKeys.orders.list(page),
    queryFn: () => orderService.list(page),
  });
}

// The same GET /orders?page=N request as useOrders, walked page by page for the
// Orders tab's infinite scroll.
export function useInfiniteOrders() {
  return useInfiniteQuery({
    queryKey: queryKeys.orders.infinite(),
    queryFn: ({ pageParam }) => orderService.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.orders.length > 0 && last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: () => orderService.getById(id as string),
    enabled: !!id,
  });
}

export function useOrderTracking(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.tracking(id ?? ''),
    queryFn: () => orderService.tracking(id as string),
    enabled: !!id,
    // Backend only refreshes from Delhivery every 30 min (docs/api.md §7) —
    // polling faster just re-reads the same cached DB row.
    refetchInterval: 60_000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    // One key per checkout attempt, not per tap: every retry until success
    // sends the same key (api/checkoutAttempt.ts).
    mutationFn: (payload: CreateOrderPayload) => orderService.create(payload, checkoutAttempt.key()),
    onSuccess: () => {
      checkoutAttempt.clear();
      // Server clears the cart and creates the order as a side effect of this call.
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail() });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
}
