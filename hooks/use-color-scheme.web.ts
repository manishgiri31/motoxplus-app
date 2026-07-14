import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';

/**
 * To support static rendering, this value needs to be re-calculated on the
 * client side for web. Wraps NativeWind's hook (not React Native's own) so
 * it's reactive to the manual theme override, same as the native version.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const { colorScheme } = useNativeWindColorScheme();

  if (hasHydrated) {
    return colorScheme ?? 'light';
  }

  return 'light';
}
