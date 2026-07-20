import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// No /api/wishlist endpoint exists on the backend (confirmed in docs/api.md §11) —
// this is a device-local wishlist only, persisted across app restarts.
export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  mrp: number | null;
  imageUrl: string | null;
  brand: string;
  addedAt: number;
}

interface WishlistState {
  items: WishlistItem[];
  add: (item: Omit<WishlistItem, 'addedAt'>) => void;
  remove: (productId: string) => void;
  toggle: (item: Omit<WishlistItem, 'addedAt'>) => void;
  isWishlisted: (productId: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (item) =>
        set((state) => {
          if (state.items.some((i) => i.productId === item.productId)) return state;
          return { items: [...state.items, { ...item, addedAt: Date.now() }] };
        }),

      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      toggle: (item) => {
        const exists = get().items.some((i) => i.productId === item.productId);
        if (exists) {
          get().remove(item.productId);
        } else {
          get().add(item);
        }
      },

      isWishlisted: (productId) => get().items.some((i) => i.productId === productId),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'mx_wishlist',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// `items` reads as [] the instant the app opens, before persisted data has
// been read back from AsyncStorage — without this, a screen showing the
// wishlist can flash an "empty" state for a returning user who actually has
// saved items, right up until hydration finishes a moment later.
export function useWishlistHasHydrated() {
  const [hasHydrated, setHasHydrated] = useState(useWishlistStore.persist.hasHydrated());

  useEffect(() => {
    setHasHydrated(useWishlistStore.persist.hasHydrated());
    return useWishlistStore.persist.onFinishHydration(() => setHasHydrated(true));
  }, []);

  return hasHydrated;
}
