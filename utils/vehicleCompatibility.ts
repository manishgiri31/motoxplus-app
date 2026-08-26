import type { Product } from '@/api/types';
import type { SelectedVehicle } from '@/stores/vehicleStore';

// Client-side heuristic against the legacy Product.compatibility string
// array — used only as a secondary hint on unfiltered lists (Search,
// Category) to flag "this also fits your saved vehicle". Screens whose list
// is already server-filtered by the real vehicle taxonomy (vehicle-parts.tsx)
// don't rely on this — see CatalogProductCard's `guaranteedFit` prop.
export function isCompatibleWithVehicle(product: Pick<Product, 'compatibility'>, vehicle: SelectedVehicle | null): boolean {
  if (!vehicle) return false;
  const model = vehicle.modelName.toLowerCase();
  return product.compatibility.some((entry) => entry.toLowerCase().includes(model));
}
