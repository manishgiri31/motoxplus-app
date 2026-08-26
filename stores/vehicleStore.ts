import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SelectedVehicle {
  brandId: string;
  brandName: string;
  modelId: string;
  modelName: string;
  // Slugs, not ids — GET /api/products' `vehicle`/`variant` filters match
  // against Vehicle.slug / VehicleVariant.slug (see GET /api/vehicles).
  modelSlug: string;
  variant: string;
  variantSlug: string;
}

interface VehicleState {
  selectedVehicle: SelectedVehicle | null;
  setSelectedVehicle: (vehicle: SelectedVehicle) => void;
  clearSelectedVehicle: () => void;
}

// No vehicle-selection state existed anywhere in the app before this — added
// as part of the vehicle-picker feature. Persisted so the choice survives
// app restarts, same pattern as stores/wishlistStore.ts.
export const useVehicleStore = create<VehicleState>()(
  persist(
    (set) => ({
      selectedVehicle: null,
      setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
      clearSelectedVehicle: () => set({ selectedVehicle: null }),
    }),
    {
      name: 'mx_vehicle',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
