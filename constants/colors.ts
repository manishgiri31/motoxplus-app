/**
 * Brand palette — premium automotive: black / white / red, minimal & industrial.
 *
 * `palette` holds raw, mode-independent brand colors (the red ramp, gray
 * ramp). `semanticColors` mirrors the CSS custom properties defined in
 * global.css (:root / .dark:root) exactly — keep these two in sync by hand.
 * global.css drives NativeWind className-based styling (bg-background,
 * text-text, ...); this file exists for the cases that need a plain color
 * string in JS — native `color` props (icons, ActivityIndicator, StatusBar)
 * that don't accept a className. Use `useThemeColors()` for those.
 */

export const palette = {
  red: {
    50: '#FFF1F1',
    100: '#FFDCDC',
    200: '#FFB3B3',
    300: '#FF8080',
    400: '#F94D4D',
    500: '#E4111A', // primary brand red
    600: '#C10D16',
    700: '#9A0A11',
    800: '#73070D',
    900: '#4D0509',
  },
  gray: {
    50: '#FAFAFA',
    100: '#F2F2F2',
    200: '#E4E4E4',
    300: '#CBCBCB',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#3A3A3A',
    800: '#242424',
    900: '#141414',
  },
} as const;

export const semanticColors = {
  light: {
    background: '#FFFFFF',
    surface: '#FAFAFA',
    card: '#FFFFFF',
    border: '#E4E4E4',
    text: '#0A0A0A',
    muted: '#737373',
    primary: '#E4111A',
    primaryForeground: '#FFFFFF',
    secondary: '#0A0A0A',
    secondaryForeground: '#FFFFFF',
    success: '#1C8A4C',
    warning: '#B8760E',
    danger: '#C11E1E',
  },
  dark: {
    background: '#0A0A0A',
    surface: '#141414',
    card: '#242424',
    border: '#3A3A3A',
    text: '#FFFFFF',
    muted: '#A3A3A3',
    primary: '#E4111A',
    primaryForeground: '#FFFFFF',
    secondary: '#FFFFFF',
    secondaryForeground: '#0A0A0A',
    success: '#34C774',
    warning: '#D99822',
    danger: '#E04C4C',
  },
} as const;

export type ThemeMode = keyof typeof semanticColors;
export type SemanticColorToken = keyof typeof semanticColors.light;
