import { Platform } from 'react-native';

// System fonts for now — swap `sans` if/when a brand typeface is licensed;
// every other token stays valid since screens reference this scale, not
// hardcoded font names.
export const fontFamily = Platform.select({
  ios: { sans: 'System', mono: 'Menlo' },
  android: { sans: 'sans-serif', mono: 'monospace' },
  default: { sans: 'System', mono: 'monospace' },
})!;

export const typeScale = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.25 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0 },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, letterSpacing: 0 },
  bodyLarge: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const, letterSpacing: 0 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const, letterSpacing: 0 },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: 0 },
  label: { fontSize: 13, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.2 },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const, letterSpacing: 0.2 },
  price: { fontSize: 20, lineHeight: 24, fontWeight: '700' as const, letterSpacing: -0.2 },
} as const;

export type TypeScaleToken = keyof typeof typeScale;
