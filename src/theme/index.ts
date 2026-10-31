import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import type { TextStyle } from 'react-native';

import { motion } from './motion';

// Design tokens. The look follows a clean, product-store aesthetic: white and
// light-grey surfaces, near-black type, one blue accent reserved for primary
// buttons, and links in a slightly deeper blue. global.css mirrors these values
// as CSS variables for NativeWind classNames and web — keep the two in sync.
//
// Key names are historical (the app shipped with a red brand), so `red*` now
// means "danger red" — errors, destructive actions, low-stock warnings — and
// the accent lives under `accent*` / `link*`.
export const colors = {
  // Surfaces
  paper: '#FFFFFF', // page background
  white: '#FFFFFF', // sheets, inputs, anything that must stay white on a grey card
  card: '#F5F5F7', // alt sections and cards
  black: '#000000',
  dark: '#161617', // dark sections (pairs with black)

  // Text
  ink: '#1D1D1F',
  muted: '#6E6E73',
  subtle: '#86868B',
  onDark: '#F5F5F7',

  // Borders
  line: '#D2D2D7',
  lineSoft: '#E8E8ED',
  darkBorder: '#333336',

  // Accent — primary buttons only
  accent: '#0071E3',
  accentHover: '#0077ED',
  accentActive: '#006EDB',

  // Links and inline actions
  link: '#0066CC',
  linkOnDark: '#2997FF',

  // Focus ring (matches web :focus-visible in global.css)
  focusRing: 'rgba(0,125,250,0.6)',

  // Status
  red: '#D70015',
  redPressed: '#B8000F',
  redSoft: '#FFF0F1',
  success: '#248A3D',
  successSoft: '#EAF6EE',
  infoSoft: '#E8F2FC',
} as const;

export const radii = {
  sm: 12, // inputs, small tiles
  md: 18, // cards
  lg: 20, // sheets
  input: 12,
  card: 18,
  pill: 999,
} as const;

// 4px base grid: xs, sm, md, lg, xl, 2xl, 3xl, 4xl.
export const spacing = [4, 8, 12, 16, 24, 32, 48, 64] as const;

// Vertical rhythm between page sections, and the breakpoints used to switch
// between the phone and wide layouts (useWindowDimensions().width >= value).
export const layout = {
  sectionPaddingY: { mobile: 48, tablet: 80, desktop: 96 },
  cardPadding: { mobile: 24, tablet: 32, desktop: 40 },
  breakpoints: { phone: 734, tablet: 834, desktop: 1068 },
  contentMaxWidth: 1260,
  minTouchTarget: 44,
} as const;

// Type scale (px): 12, 14, 17, 21, 28, 40, 56, 80.
export const typeScale = {
  caption: 12,
  small: 14,
  body: 17,
  title3: 21,
  title2: 28,
  title1: 40,
  display: 56,
  jumbo: 80,
} as const;

// Tracking in px, derived from em: headings -0.015em, body -0.022em.
export const tracking = {
  body: -0.374, // 17px * -0.022em
  small: -0.224, // 14px, -0.016em
  caption: -0.12, // 12px, -0.01em
  title3: -0.315, // 21px * -0.015em
  title2: -0.42, // 28px * -0.015em
  title1: -0.6, // 40px * -0.015em
  display: -0.84, // 56px * -0.015em
  jumbo: -1.2, // 80px * -0.015em
} as const;

// One family (Inter) across the app. The `display` and `mono` groups are kept
// as aliases so existing styles keep working: display.bold is Inter SemiBold
// (headings are weight 600), display.extraBold is Inter Bold (700), and mono
// is Inter too — pair it with tabular numerals where alignment matters.
export const fonts = {
  display: {
    medium: 'Inter_500Medium',
    bold: 'Inter_600SemiBold',
    extraBold: 'Inter_700Bold',
  },
  body: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  mono: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
  },
} as const;

// Passed straight to expo-font's useFonts() in the root layout — keeping the
// family-name -> asset mapping here means theme.fonts stays the single
// source of truth for the string values used in typography styles below.
export const fontsToLoad = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

type Variant = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'color' | 'textTransform' | 'letterSpacing' | 'fontVariant'
>;

// Font weight lives in the family name (e.g. Inter_600SemiBold), not in a
// `fontWeight` style — setting fontWeight alongside a pre-weighted custom
// font makes RN try to synthesize a different weight and silently drop the
// custom font, falling back to system.
//
// Headings: weight 600, line-height 1.05-1.1, tracking -0.015em.
// Body: 17px / 1.47, tracking -0.022em.
export const typography = {
  jumbo: { fontFamily: fonts.display.bold, fontSize: 80, lineHeight: 84, letterSpacing: tracking.jumbo, color: colors.ink },
  display: { fontFamily: fonts.display.bold, fontSize: 56, lineHeight: 59, letterSpacing: tracking.display, color: colors.ink },
  h1: { fontFamily: fonts.display.bold, fontSize: 40, lineHeight: 42, letterSpacing: tracking.title1, color: colors.ink },
  h2: { fontFamily: fonts.display.bold, fontSize: 28, lineHeight: 30, letterSpacing: tracking.title2, color: colors.ink },
  h3: { fontFamily: fonts.display.bold, fontSize: 21, lineHeight: 23, letterSpacing: tracking.title3, color: colors.ink },
  body: { fontFamily: fonts.body.regular, fontSize: 17, lineHeight: 25, letterSpacing: tracking.body, color: colors.ink },
  bodySemibold: {
    fontFamily: fonts.body.semiBold,
    fontSize: 17,
    lineHeight: 25,
    letterSpacing: tracking.body,
    color: colors.ink,
  },
  caption: { fontFamily: fonts.body.regular, fontSize: 14, lineHeight: 20, letterSpacing: tracking.small, color: colors.muted },
  mono: {
    fontFamily: fonts.mono.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: tracking.caption,
    fontVariant: ['tabular-nums'],
    color: colors.muted,
  },
  eyebrow: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
} as const satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof typography;
export type ThemeColor = keyof typeof colors;

export { motion };

export const theme = {
  colors,
  radii,
  spacing,
  layout,
  typeScale,
  tracking,
  fonts,
  typography,
  motion,
} as const;

export type Theme = typeof theme;

export default theme;
