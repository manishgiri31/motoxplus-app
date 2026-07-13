import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { orderService } from '../services/orderService';
import type { CreateOrderPayload } from '../types';

export function useOrders(page = 1) {
  return useQuery({
    queryKey: queryKeys.orders.list(page),
    queryFn: () => orderService.list(page),
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
    mutationFn: (payload: CreateOrderPayload) => orderService.create(payload),
    onSuccess: () => {
      // Server clears the cart and creates the order as a side effect of this call.
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail() });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
}
