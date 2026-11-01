import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, motion } from '@/src/theme';

const SIZE = 96;
const SCALE_IN_MS = 400;

// Large white check in an accent circle. Scales in over 400ms (jumps straight to
// the end state under Reduce Motion). Decorative: the screen's title carries the
// meaning for VoiceOver / TalkBack.
export function SuccessCheck() {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion ? 1 : withTiming(1, { duration: SCALE_IN_MS, easing: motion.easing });
  }, [reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + 0.6 * progress.value }],
  }));

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.circle, animatedStyle]}
    >
      <Feather name="check" size={SIZE / 2} color={colors.white} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
