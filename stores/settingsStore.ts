import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

// App is locked to light mode (stopgap until dark mode is properly revisited
// — see app.json's userInterfaceStyle). themePreference is still recorded
// and the Settings UI for it still exists in code (just not rendered — see
// app/settings.tsx) so nothing is lost once dark mode comes back; the actual
// NativeWind colorScheme is always forced to 'light' regardless of pref,
// including for anyone who already had 'dark'/'system' persisted from
// before this lock.
//
// NativeWind throws if this runs outside a browser, which is what happens
// while the web dev server renders a page in Node. Uncaught, that killed
// `npm run web` on the first request. Native and the browser never throw here.
function forceLightScheme() {
  try {
    colorScheme.set('light');
  } catch {
    // Server-side web render: nothing to set.
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (pref) => {
        forceLightScheme();
        set({ themePreference: pref });
      },
    }),
    {
      name: 'mx_settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        forceLightScheme();
      },
    }
  )
);
