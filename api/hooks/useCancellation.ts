import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { cancellationService } from '../services/cancellationService';

export function useCancellationPreview(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['orders', orderId, 'cancellation-preview'] as const,
    queryFn: () => cancellationService.getPreview(orderId),
    enabled,
    retry: false,
  });
}

export function useCancelOrder(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { reason?: string }) => cancellationService.cancel(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
}
