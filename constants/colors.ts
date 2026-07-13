/**
 * Brand palette — premium automotive: black / white / red, minimal & industrial.
 * These are the raw brand tokens; tailwind.config.js maps them into NativeWind
 * utility classes (bg-brand-red, text-ink, etc.) for the design system.
 */

export const palette = {
  black: '#0A0A0A',
  white: '#FFFFFF',
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
  success: '#1C8A4C',
  warning: '#B8760E',
  danger: '#C11E1E',
} as const;

export const brandColors = {
  light: {
    background: palette.white,
    surface: palette.gray[50],
    surfaceElevated: palette.white,
    border: palette.gray[200],
    ink: palette.black,
    inkMuted: palette.gray[600],
    inkSubtle: palette.gray[400],
    primary: palette.red[500],
    primaryPressed: palette.red[600],
    onPrimary: palette.white,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
  },
  dark: {
    background: palette.black,
    surface: palette.gray[900],
    surfaceElevated: palette.gray[800],
    border: palette.gray[700],
    ink: palette.white,
    inkMuted: palette.gray[300],
    inkSubtle: palette.gray[500],
    primary: palette.red[500],
    primaryPressed: palette.red[400],
    onPrimary: palette.white,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
  },
} as const;

export type BrandColorScheme = keyof typeof brandColors;
export type BrandColorToken = keyof typeof brandColors.light;
