import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// No "recently viewed" concept on the backend — this is purely a local,
// client-tracked list of product ids the dealer has opened, most recent first.
const MAX_ITEMS = 20;

interface RecentlyViewedState {
  productIds: string[];
  recordView: (productId: string) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      productIds: [],
      recordView: (productId) =>
        set((state) => ({
          productIds: [productId, ...state.productIds.filter((id) => id !== productId)].slice(0, MAX_ITEMS),
        })),
      clear: () => set({ productIds: [] }),
    }),
    {
      name: 'mx_recently_viewed',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
