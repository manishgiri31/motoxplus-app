import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { cancellationService } from '../services/cancellationService';
import type { CancelOrderPayload } from '../types';

export function useCancellationPreview(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.orders.cancellationPreview(orderId),
    queryFn: () => cancellationService.getPreview(orderId),
    enabled,
    retry: false,
  });
}

export function useCancelOrder(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CancelOrderPayload) => cancellationService.cancel(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.cancellationPreview(orderId) });
    },
  });
}
