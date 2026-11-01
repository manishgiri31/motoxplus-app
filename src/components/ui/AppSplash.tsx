import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, motion } from '@/src/theme';

export interface AppSplashProps {
  /** Fired once the JS splash has been laid out, so the native splash can be hidden without a blank flash. */
  onShown?: () => void;
}

// The first screen of the app: plain white with only the wordmark, fading in
// over 240ms. No spinner. The native launch screen is the same plain white
// (see the expo-splash-screen entry in app.json), so the hand-off is seamless.
// Drawn in the platform's own bold font rather than a loaded one, because this
// shows while fonts are still loading.
export function AppSplash({ onShown }: AppSplashProps) {
  const reduceMotion = useReduceMotion();

  return (
    <View style={styles.screen} onLayout={onShown} accessibilityLabel="MotoXPlus" accessibilityRole="image">
      <Animated.Text
        entering={reduceMotion ? undefined : FadeIn.duration(motion.duration.fast).easing(motion.easing)}
        style={styles.wordmark}
        maxFontSizeMultiplier={1}
      >
        MotoXPlus
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontWeight: '700', fontSize: 40, lineHeight: 44, letterSpacing: -0.8, color: colors.ink },
});
