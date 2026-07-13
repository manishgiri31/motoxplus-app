import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { paymentService } from '../services/paymentService';
import type { VerifyPaymentPayload } from '../types';

export function useCreateRazorpayOrder() {
  return useMutation({
    mutationFn: (orderId: string) => paymentService.createRazorpayOrder(orderId),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VerifyPaymentPayload) => paymentService.verify(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
}
