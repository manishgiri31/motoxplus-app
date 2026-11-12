import { Platform, type TextStyle } from 'react-native';

import { motion } from './motion';

// Design tokens. The look follows a clean, product-store aesthetic: white and
// light-grey surfaces, near-black type, one red accent reserved for primary
// buttons, and links in a slightly deeper red.
//
// Key names are historical (the app shipped with a red brand), so `red*` now
// means "danger red" — errors, destructive actions, low-stock warnings — and
// the accent lives under `accent*` / `link*`.
export const colors = {
  // Surfaces
  bg: '#FFFFFF', // screen background (alias of paper)
  bgAlt: '#F5F5F7', // grouped lists and cards (alias of card)
  paper: '#FFFFFF', // page background
  white: '#FFFFFF', // sheets, inputs, anything that must stay white on a grey card
  card: '#F5F5F7', // alt sections and cards
  black: '#000000',
  dark: '#161617', // dark sections (pairs with black)
  inkSurface: '#1D1D1F', // dark cards (vehicle picker, promo banner)

  // Text
  ink: '#1D1D1F',
  ink2: '#6E6E73', // secondary text (alias of muted)
  ink3: '#86868B', // tertiary text and placeholders (alias of subtle)
  muted: '#6E6E73',
  subtle: '#86868B',
  onDark: '#F5F5F7',
  onDarkMuted: '#A1A1A6', // secondary text on the ink (#1D1D1F) card

  // Borders
  line: '#D2D2D7',
  lineSoft: '#E8E8ED',
  darkBorder: '#333336',

  // Accent — primary buttons only
  accent: '#D01F25',
  accentHover: '#DB2C32',
  accentActive: '#B5181E',

  // Links and inline actions
  link: '#C2191F',
  linkOnDark: '#FF6B70',

  // Focus ring (matches web :focus-visible in global.css)
  focusRing: 'rgba(208,31,37,0.25)', // accent @ 25%

  // Status
  red: '#E30000', // danger: errors and destructive actions only
  redPressed: '#BF0000',
  redSoft: '#FFF0F1',
  warning: '#F56300',
  success: '#008009',
  successSoft: '#EAF6EE',
  infoSoft: '#F5F5F7', // neutral: "info" no longer has a hue of its own
} as const;

export const radii = {
  sm: 12, // inputs, small tiles
  md: 18, // cards
  lg: 20, // sheets
  input: 12,
  card: 18,
  tile: 7, // 28px leading-icon tile in a list row
  pill: 999,
} as const;

// 4px base grid: xs, sm, md, lg, xl, 2xl, 3xl, 4xl.
export const spacing = [4, 8, 12, 16, 24, 32, 48, 64] as const;

// Named spacing scale for the app screens: 4, 8, 12, 16, 20, 24, 32, 40, 48.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, x3: 32, x4: 40, x5: 48 } as const;
// Screens pad 20px horizontally and separate sections by 32px.
export const screenPaddingX = space.xl;
export const sectionGap = space.x3;

// Vertical rhythm between page sections, and the breakpoints used to switch
// between the phone and wide layouts (useWindowDimensions().width >= value).
export const layout = {
  sectionPaddingY: { mobile: 48, tablet: 80, desktop: 96 },
  cardPadding: { mobile: 24, tablet: 32, desktop: 40 },
  breakpoints: { phone: 734, tablet: 834, desktop: 1068 },
  contentMaxWidth: 1260,
  minTouchTarget: 44,
  rowMinHeight: 52, // grouped-list row
  rowInset: 16, // horizontal padding inside a grouped row, and the separator inset
  // Dynamic Type is honoured up to 120% so fixed-height chrome doesn't break.
  maxFontScale: 1.2,
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
// The files are Inter subset to Latin, punctuation, arrows and the rupee sign
// (78 KB each instead of 342 KB); see scripts/subset-fonts.sh. Characters
// outside the subset fall back to the system font per glyph.
export const fontsToLoad = {
  Inter_400Regular: require('../../assets/fonts/Inter_400Regular.ttf'),
  Inter_500Medium: require('../../assets/fonts/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('../../assets/fonts/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('../../assets/fonts/Inter_700Bold.ttf'),
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

// ---------------------------------------------------------------------------
// Platform fonts. iOS uses the system font (SF Pro, resolved by the OS: no font
// files are bundled), selected by fontWeight. Android and web use Inter, where
// each weight is its own family. Spread the result into a text style:
//   { ...font(600), fontSize: 17 }
// Never combine this with a hardcoded fontFamily / `fonts.*` entry.
const INTER_BY_WEIGHT = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
} as const;

export type FontWeight = keyof typeof INTER_BY_WEIGHT;

export function font(weight: FontWeight): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (Platform.OS === 'ios') return { fontWeight: String(weight) as TextStyle['fontWeight'] };
  return { fontFamily: INTER_BY_WEIGHT[weight] };
}

// Ready-made text styles for the new components. Sizes follow the scale above;
// letter-spacing is -0.02em on sizes >= 17 and 0 below that. Headings are 600,
// body copy 400.
export const textStyles = {
  largeTitle: { ...font(600), fontSize: 34, lineHeight: 41, letterSpacing: -0.68, color: colors.ink },
  title: { ...font(600), fontSize: 28, lineHeight: 34, letterSpacing: -0.56, color: colors.ink },
  cardTitle: { ...font(600), fontSize: 21, lineHeight: 25, letterSpacing: -0.42, color: colors.ink },
  headline: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  body: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  callout: { ...font(400), fontSize: 14, lineHeight: 20, letterSpacing: 0, color: colors.ink2 },
  calloutStrong: { ...font(600), fontSize: 14, lineHeight: 20, letterSpacing: 0, color: colors.ink },
  caption: { ...font(400), fontSize: 12, lineHeight: 16, letterSpacing: 0, color: colors.ink2 },
} as const satisfies Record<string, TextStyle>;

/** "#RRGGBB" + opacity -> rgba(...). Used for tints such as accent @ 12%. */
export function alpha(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export type TypographyVariant = keyof typeof typography;
export type ThemeColor = keyof typeof colors;

export { motion };

export const theme = {
  colors,
  radii,
  spacing,
  space,
  layout,
  typeScale,
  tracking,
  fonts,
  typography,
  motion,
} as const;

export type Theme = typeof theme;

export default theme;
