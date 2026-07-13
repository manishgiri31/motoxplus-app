import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { categoryService } from '../services/categoryService';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: categoryService.list,
    staleTime: 5 * 60_000,
  });
}
