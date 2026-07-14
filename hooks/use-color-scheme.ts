import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

// NativeWind's hook (not React Native's own `useColorScheme` from
// 'react-native') is required here: it's the one that's reactive to the
// manual theme override (colorScheme.set() in stores/settingsStore.ts), not
// just OS-level Appearance changes. RN's built-in hook would miss overrides.
export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useNativeWindColorScheme();
  return colorScheme ?? 'light';
}
