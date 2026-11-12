import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

import { NAV_BAR_FILL } from './navBarFill';

export { NAV_BAR_FILL };

// iOS: real blur via expo-blur with the 80% white wash on top. Android and web
// use NavBarBackground.tsx, so expo-blur never ships in those bundles (and is
// left out of slim Android builds; see app.config.js).
export function NavBarBackground() {
  return (
    <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill}>
      <View style={styles.wash} />
    </BlurView>
  );
}

const styles = StyleSheet.create({
  wash: { ...StyleSheet.absoluteFillObject, backgroundColor: NAV_BAR_FILL },
});
