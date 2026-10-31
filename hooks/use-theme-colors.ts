import { semanticColors } from '@/constants/colors';

/**
 * Semantic color values for native `color` props that can't take a
 * className (icons, ActivityIndicator, StatusBar). For anything that takes
 * className, use the Tailwind tokens directly (bg-background, text-text,
 * ...) instead.
 *
 * The app is light-only, so this always returns the light set.
 */
export function useThemeColors() {
  return semanticColors.light;
}
