import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
} from '@expo-google-fonts/schibsted-grotesk';
import type { TextStyle } from 'react-native';

export const colors = {
  paper: '#FBFAF8',
  card: '#FFFFFF',
  ink: '#17181A',
  muted: '#6B6E73',
  line: '#E7E5E1',
  red: '#D01F25',
  redPressed: '#B5181E',
  redSoft: '#FCEFEF',
  dark: '#212226',
  darkBorder: '#33353A',
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

// 4px base grid: xs, sm, md, lg, xl, 2xl, 3xl, 4xl.
export const spacing = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export const fonts = {
  display: {
    medium: 'SchibstedGrotesk_500Medium',
    bold: 'SchibstedGrotesk_700Bold',
    extraBold: 'SchibstedGrotesk_800ExtraBold',
  },
  body: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
  },
  mono: {
    regular: 'IBMPlexMono_400Regular',
    medium: 'IBMPlexMono_500Medium',
  },
} as const;

// Passed straight to expo-font's useFonts() in the root layout — keeping the
// family-name -> asset mapping here means theme.fonts stays the single
// source of truth for the string values used in typography styles below.
export const fontsToLoad = {
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
};

type Variant = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'color' | 'textTransform' | 'letterSpacing'
>;

// Font weight lives in the family name (e.g. SchibstedGrotesk_800ExtraBold),
// not in a `fontWeight` style — setting fontWeight alongside a pre-weighted
// custom font makes RN try to synthesize a different weight and silently
// drop the custom font, falling back to system.
export const typography = {
  h1: { fontFamily: fonts.display.extraBold, fontSize: 32, lineHeight: 38, color: colors.ink },
  h2: { fontFamily: fonts.display.bold, fontSize: 24, lineHeight: 30, color: colors.ink },
  h3: { fontFamily: fonts.display.bold, fontSize: 18, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.body.regular, fontSize: 15.5, lineHeight: 22, color: colors.ink },
  bodySemibold: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.ink,
  },
  caption: { fontFamily: fonts.body.regular, fontSize: 13.5, lineHeight: 18, color: colors.muted },
  mono: { fontFamily: fonts.mono.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  eyebrow: {
    fontFamily: fonts.mono.medium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.red,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
} as const satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof typography;
export type ThemeColor = keyof typeof colors;

export const theme = {
  colors,
  radii,
  spacing,
  fonts,
  typography,
} as const;

export type Theme = typeof theme;

export default theme;
