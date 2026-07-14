import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (pref) => {
        colorScheme.set(pref);
        set({ themePreference: pref });
      },
    }),
    {
      name: 'mx_settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Re-apply the saved preference to NativeWind's color scheme once
      // rehydrated from disk — colorScheme.set() itself isn't persisted.
      onRehydrateStorage: () => (state) => {
        if (state) colorScheme.set(state.themePreference);
      },
    }
  )
);
