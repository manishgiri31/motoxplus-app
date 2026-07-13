import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { dealerService } from '../services/dealerService';

export function useDealerAccount() {
  return useQuery({
    queryKey: queryKeys.dealer.account(),
    queryFn: dealerService.getAccount,
  });
}
