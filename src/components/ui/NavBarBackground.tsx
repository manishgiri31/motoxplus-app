import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

// Translucent bar fill: rgba(255,255,255,0.8) plus a 20px blur and 180%
// saturation where the platform can do it.
//   iOS     real blur via expo-blur, with the 80% white wash on top.
//   web     CSS backdrop-filter (blur(20px) saturate(180%)).
//   Android expo-blur's Android path is not stable in SDK 54, so the bar is a
//           near-opaque white instead of a half-working blur.
// Used as the tab bar background; the stack headers use the same fill color
// (see app/_layout.tsx), since native-stack headers can't host a custom
// background view.
export const NAV_BAR_FILL = 'rgba(255,255,255,0.8)';

const webBlur = {
  backgroundColor: NAV_BAR_FILL,
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
} as unknown as ViewStyle;

export function NavBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill}>
        <View style={styles.wash} />
      </BlurView>
    );
  }
  if (Platform.OS === 'web') {
    return <View style={[StyleSheet.absoluteFill, webBlur]} />;
  }
  return <View style={[StyleSheet.absoluteFill, styles.androidFill]} />;
}

const styles = StyleSheet.create({
  wash: { ...StyleSheet.absoluteFillObject, backgroundColor: NAV_BAR_FILL },
  androidFill: { backgroundColor: 'rgba(255,255,255,0.96)' },
});
