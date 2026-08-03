import type { Product } from '@/api/types';
import type { SelectedVehicle } from '@/stores/vehicleStore';

// Real matching logic against real product.compatibility strings — only the
// vehicle taxonomy feeding `vehicle` is stubbed (constants/vehicleTaxonomy.ts),
// so this will start finding real matches the moment that's replaced.
export function isCompatibleWithVehicle(product: Pick<Product, 'compatibility'>, vehicle: SelectedVehicle | null): boolean {
  if (!vehicle) return false;
  const model = vehicle.modelName.toLowerCase();
  return product.compatibility.some((entry) => entry.toLowerCase().includes(model));
}
