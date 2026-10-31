/**
 * Palette — clean product-store look: white / light grey / near-black, with a
 * single blue accent for primary buttons.
 *
 * `palette` holds raw colors (gray ramp, accent blues). `semanticColors`
 * mirrors the CSS custom properties defined in global.css (:root) exactly — keep these two in sync by hand.
 * global.css drives NativeWind className-based styling (bg-background,
 * text-text, ...); this file exists for the cases that need a plain color
 * string in JS — native `color` props (icons, ActivityIndicator, StatusBar)
 * that don't accept a className. Use `useThemeColors()` for those.
 */

export const palette = {
  // Neutral ramp, light-only. Mirrors the product-store palette in src/theme.
  gray: {
    50: '#FBFBFD',
    100: '#F5F5F7',
    200: '#E8E8ED',
    300: '#D2D2D7',
    400: '#AEAEB2',
    500: '#86868B',
    600: '#6E6E73',
    700: '#424245',
    800: '#2C2C2E',
    900: '#1D1D1F',
  },
  blue: {
    500: '#0071E3',
    600: '#006EDB',
  },
} as const;

// Light-only: the app has no dark theme (see global.css), so there is a single
// set of semantic colors.
export const semanticColors = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F7',
    card: '#F5F5F7',
    border: '#D2D2D7',
    text: '#1D1D1F',
    muted: '#6E6E73',
    primary: '#0071E3',
    primaryForeground: '#FFFFFF',
    secondary: '#1D1D1F',
    secondaryForeground: '#FFFFFF',
    success: '#248A3D',
    warning: '#B76B00',
    danger: '#D70015',
  },
} as const;

export type ThemeMode = keyof typeof semanticColors;
export type SemanticColorToken = keyof typeof semanticColors.light;
