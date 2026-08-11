import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { upiService, type LocalImageFile } from '../services/upiService';
import type { SubmitUpiPaymentPayload } from '../types';

export function useUpiOrderDetails(orderId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.upi.orderDetails(orderId),
    queryFn: () => upiService.getOrderDetails(orderId),
    enabled: enabled && !!orderId,
  });
}

export function useUploadPaymentScreenshot() {
  return useMutation({
    mutationFn: ({ orderId, file }: { orderId: string; file: LocalImageFile }) =>
      upiService.uploadScreenshot(orderId, file),
  });
}

export function useSubmitUpiPayment(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitUpiPaymentPayload) => upiService.submitPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.upi.orderDetails(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
    },
  });
}
