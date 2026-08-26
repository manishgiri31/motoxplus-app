import { apiClient } from '../client';
import type { VehicleTaxonomyResponse } from '../types';

export const vehicleService = {
  // Public, unauthenticated, cached ~24h server-side — matches the
  // Cache-Control the backend sends (see GET /api/vehicles).
  list: () => apiClient.get<VehicleTaxonomyResponse>('/vehicles').then((r) => r.data),
};
