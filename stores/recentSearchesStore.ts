import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// No "recent searches" concept on the backend — this is purely a local,
// client-tracked list of terms the dealer has searched, most recent first.
const MAX_ITEMS = 10;

interface RecentSearchesState {
  queries: string[];
  record: (query: string) => void;
  clear: () => void;
}

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      queries: [],

      record: (query) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        set((state) => ({
          queries: [
            trimmed,
            ...state.queries.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
          ].slice(0, MAX_ITEMS),
        }));
      },

      clear: () => set({ queries: [] }),
    }),
    {
      name: 'mx_recent_searches',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
