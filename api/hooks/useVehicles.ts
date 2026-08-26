import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { vehicleService } from '../services/vehicleService';

// Server sends Cache-Control: s-maxage=86400 — mirror that staleTime so this
// isn't refetched more often than the backend actually recomputes it.
export function useVehicleTaxonomy() {
  return useQuery({
    queryKey: queryKeys.vehicles.taxonomy(),
    queryFn: vehicleService.list,
    staleTime: 24 * 60 * 60_000,
  });
}
