import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { NAV_BAR_FILL } from './navBarFill';

export { NAV_BAR_FILL };

// Translucent bar fill: rgba(255,255,255,0.8) plus a 20px blur and 180%
// saturation where the platform can do it.
//   iOS     NavBarBackground.ios.tsx (expo-blur).
//   web     CSS backdrop-filter (blur(20px) saturate(180%)).
//   Android expo-blur's Android path is not stable in SDK 54, so the bar is a
//           near-opaque white instead of a half-working blur.
const webBlur = {
  backgroundColor: NAV_BAR_FILL,
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
} as unknown as ViewStyle;

const fill = Platform.OS === 'web' ? webBlur : { backgroundColor: 'rgba(255,255,255,0.96)' };

export function NavBarBackground() {
  return <View style={[StyleSheet.absoluteFill, fill]} />;
}
