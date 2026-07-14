import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { dealerService } from '../services/dealerService';

export function useDealerAccount() {
  return useQuery({
    queryKey: queryKeys.dealer.account(),
    queryFn: dealerService.getAccount,
    // Dealer profile rarely changes and there's no edit endpoint yet anyway.
    staleTime: 5 * 60_000,
  });
}
