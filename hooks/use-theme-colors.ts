import { semanticColors } from '@/constants/colors';
import { useColorScheme } from './use-color-scheme';

/**
 * Semantic color values for native `color` props that can't take a
 * className (icons, ActivityIndicator, StatusBar). For anything that takes
 * className, use the Tailwind tokens directly (bg-background, text-text,
 * ...) instead — those already react to theme changes automatically.
 */
export function useThemeColors() {
  const scheme = useColorScheme();
  return semanticColors[scheme];
}
