import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { shippingService } from '../services/shippingService';

const PINCODE_REGEX = /^\d{6}$/;

/**
 * GET /shipping/serviceability for a 6-digit pincode. Public endpoint, cached
 * per pincode (serviceability doesn't change minute-to-minute). Only fires
 * once `pincode` is a well-formed 6-digit string — the caller is responsible
 * for debouncing keystrokes before passing the value in.
 */
export function useServiceability(pincode: string | undefined) {
  const valid = !!pincode && PINCODE_REGEX.test(pincode);
  return useQuery({
    queryKey: queryKeys.shipping.serviceability(pincode ?? ''),
    queryFn: () => shippingService.serviceability(pincode as string),
    enabled: valid,
    staleTime: 30 * 60_000,
    retry: 1,
  });
}
