import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { schemeService } from '../services/schemeService';
import type { ApplySchemePayload } from '../types';

/** Schemes the cart's regular subtotal (excl. GST) currently qualifies for. */
export function useEligibleSchemes(orderValue: number) {
  return useQuery({
    queryKey: queryKeys.schemes.eligible(orderValue),
    queryFn: () => schemeService.eligible(orderValue),
    enabled: orderValue > 0,
    staleTime: 60_000,
  });
}

export function useApplyScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApplySchemePayload) => schemeService.apply(payload),
    // Applying or clearing a scheme rewrites the cart's scheme items server-side.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail() }),
  });
}
